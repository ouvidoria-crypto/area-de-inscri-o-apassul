const resumoCorpo = document.querySelector("#tabelaResumo tbody");
const inscritosCorpo = document.querySelector("#tabelaInscritos tbody");
const mensagem = document.getElementById("mensagemAdmin");
const btnExportarCSV = document.getElementById("btnExportarCSV");

// Traduz o código interno do método de pagamento para um texto legível
const nomesPagamento = {
  pix: "Pix",
  deposito: "Depósito Bancário",
  boleto: "Boleto Bancário",
};

const titulosStatus = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
  rejeitado: "Rejeitado",
  estornado: "Estornado",
};

function formatarMoeda(valor) {
  const numero = Number(valor) || 3200;
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Guarda a última lista de inscritos carregada, pra poder gerar o CSV
// sem precisar buscar tudo de novo no servidor.
let inscritosAtuais = [];

async function alterarStatus(id, novoStatus) {
  try {
    const resposta = await fetch(`/admin/inscricoes/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status_pagamento: novoStatus }),
    });

    if (resposta.ok) {
      mensagem.textContent = `Status da inscrição #${id} atualizado para "${titulosStatus[novoStatus] || novoStatus}" com sucesso.`;
      mensagem.className = "msg-sucesso";
      setTimeout(() => { mensagem.textContent = ""; }, 4000);
      carregarPainel();
    } else {
      const err = await resposta.json();
      alert(err.erro || "Não foi possível alterar o status.");
    }
  } catch (erro) {
    console.error(erro);
    alert("Erro de conexão ao atualizar o status.");
  }
}

async function carregarPainel() {
  try {
    const [respostaResumo, respostaInscritos] = await Promise.all([
      fetch("/admin/resumo", { credentials: "include" }),
      fetch("/admin/inscricoes", { credentials: "include" }),
    ]);

    if (!respostaResumo.ok || !respostaInscritos.ok) {
      mensagem.textContent = "Não foi possível carregar os dados. Você está logado?";
      mensagem.className = "msg-erro";
      return;
    }

    const resumo = await respostaResumo.json();
    const inscritos = await respostaInscritos.json();
    inscritosAtuais = inscritos;

    resumoCorpo.innerHTML = "";
    resumo.forEach((curso) => {
      const restantes = curso.vagas - curso.inscritos;
      const linha = document.createElement("tr");
      linha.innerHTML = `
        <td><strong>${curso.nome}</strong></td>
        <td>${formatarMoeda(curso.preco || 3200)}</td>
        <td>${curso.vagas}</td>
        <td>${curso.inscritos}</td>
        <td><strong style="color: #2e6b3e;">${curso.pagos || 0}</strong></td>
        <td>${restantes}</td>
      `;
      resumoCorpo.appendChild(linha);
    });

    inscritosCorpo.innerHTML = "";
    inscritos.forEach((inscricao) => {
      const dataFormatada = new Date(inscricao.data).toLocaleString("pt-BR");
      let pagamento = nomesPagamento[inscricao.metodo_pagamento] || inscricao.metodo_pagamento || "-";
      if (inscricao.metodo_pagamento === "boleto" && inscricao.vencimento_boleto) {
        pagamento += `<br><small class="tag-vencimento">Venc: ${inscricao.vencimento_boleto}</small>`;
      }

      const statusAtual = inscricao.status_pagamento || "pendente";
      const statusLabel = titulosStatus[statusAtual] || statusAtual;

      const linha = document.createElement("tr");
      linha.innerHTML = `
        <td><strong>${inscricao.nome}</strong></td>
        <td>${inscricao.empresa || "-"}</td>
        <td><a href="mailto:${inscricao.email}">${inscricao.email}</a></td>
        <td>${inscricao.telefone || "-"}</td>
        <td>${inscricao.cpf || "-"}</td>
        <td>${inscricao.curso}</td>
        <td>${formatarMoeda(inscricao.valor || 3200)}</td>
        <td>${pagamento}</td>
        <td>
          <span class="badge-status ${statusAtual}">${statusLabel}</span>
          ${inscricao.mp_payment_id ? `<br><small class="texto-mp-id">MP #${inscricao.mp_payment_id}</small>` : ""}
        </td>
        <td>${inscricao.email_recibo || "-"}</td>
        <td>${dataFormatada}</td>
        <td>
          <select class="select-status-admin" data-id="${inscricao.id}" aria-label="Alterar status de pagamento">
            <option value="pendente" ${statusAtual === "pendente" ? "selected" : ""}>Pendente</option>
            <option value="pago" ${statusAtual === "pago" ? "selected" : ""}>Pago</option>
            <option value="cancelado" ${statusAtual === "cancelado" ? "selected" : ""}>Cancelado</option>
          </select>
        </td>
      `;
      inscritosCorpo.appendChild(linha);
    });

    // Conecta eventos dos selects de status
    document.querySelectorAll(".select-status-admin").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const id = e.target.dataset.id;
        const novoStatus = e.target.value;
        alterarStatus(id, novoStatus);
      });
    });

  } catch (erro) {
    mensagem.textContent = "Erro de conexão com o servidor.";
    mensagem.className = "msg-erro";
    console.error(erro);
  }
}

carregarPainel();

function escaparCampoCSV(valor) {
  const texto = String(valor ?? "");
  if (/[";\n]/.test(texto)) {
    return '"' + texto.replace(/"/g, '""') + '"';
  }
  return texto;
}

function paraCSV(inscritos) {
  const cabecalho = [
    "ID", "Nome", "Empresa", "E-mail", "Telefone", "CPF",
    "Curso", "Valor (R$)", "Forma de Pagamento", "Vencimento Boleto",
    "Status Pagamento", "ID Mercado Pago", "Data Pagamento", "E-mail Recibo", "Data Inscrição",
  ];

  const linhas = inscritos.map((inscricao) => {
    const dataFormatada = new Date(inscricao.data).toLocaleString("pt-BR");
    const dataPagamentoFormatada = inscricao.data_pagamento
      ? new Date(inscricao.data_pagamento).toLocaleString("pt-BR")
      : "-";
    const formaPagamento = nomesPagamento[inscricao.metodo_pagamento] || inscricao.metodo_pagamento || "-";

    return [
      inscricao.id,
      inscricao.nome,
      inscricao.empresa || "-",
      inscricao.email,
      inscricao.telefone || "-",
      inscricao.cpf || "-",
      inscricao.curso,
      (Number(inscricao.valor) || 3200).toFixed(2).replace(".", ","),
      formaPagamento,
      inscricao.vencimento_boleto || "-",
      titulosStatus[inscricao.status_pagamento] || inscricao.status_pagamento || "Pendente",
      inscricao.mp_payment_id || "-",
      dataPagamentoFormatada,
      inscricao.email_recibo || "-",
      dataFormatada,
    ];
  });

  return [cabecalho, ...linhas]
    .map((linha) => linha.map(escaparCampoCSV).join(";"))
    .join("\r\n");
}

function exportarCSV() {
  if (!inscritosAtuais.length) {
    mensagem.textContent = "Nenhuma inscrição para exportar ainda.";
    return;
  }

  const csv = paraCSV(inscritosAtuais);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const dataHoje = new Date().toISOString().slice(0, 10);
  link.download = `inscritos-apassul-${dataHoje}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

btnExportarCSV.addEventListener("click", exportarCSV);
