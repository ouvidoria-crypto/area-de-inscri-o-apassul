const resumoCorpo = document.querySelector("#tabelaResumo tbody");
const inscritosCorpo = document.querySelector("#tabelaInscritos tbody");
const corpoTabelaCursos = document.getElementById("corpoTabelaCursos");
const mensagem = document.getElementById("mensagemAdmin");
const btnExportarCSV = document.getElementById("btnExportarCSV");

// Elementos do formulário de curso
const formCursoCard = document.getElementById("formCursoCard");
const formCurso = document.getElementById("formCurso");
const formCursoTitulo = document.getElementById("formCursoTitulo");
const cursoModo = document.getElementById("cursoModo");
const cursoId = document.getElementById("cursoId");
const cursoNome = document.getElementById("cursoNome");
const cursoCargaHoraria = document.getElementById("cursoCargaHoraria");
const cursoDataEvento = document.getElementById("cursoDataEvento");
const cursoDataFim = document.getElementById("cursoDataFim");
const cursoVagas = document.getElementById("cursoVagas");
const cursoPreco = document.getElementById("cursoPreco");
const cursoDescricao = document.getElementById("cursoDescricao");
const cursoRequisitos = document.getElementById("cursoRequisitos");

let cursosCache = [];

function abrirFormularioCurso(cursoParaEditar = null) {
  if (cursoParaEditar) {
    formCursoTitulo.textContent = "Editar Curso / Certificado Oficial";
    cursoModo.value = "editar";
    cursoId.value = cursoParaEditar.id;
    cursoId.disabled = true;
    cursoNome.value = cursoParaEditar.nome || "";
    cursoCargaHoraria.value = cursoParaEditar.carga_horaria || "16 horas";
    cursoDataEvento.value = cursoParaEditar.data_evento || "Edição Oficial 2026";
    cursoDataFim.value = cursoParaEditar.data_fim_curso ? cursoParaEditar.data_fim_curso.slice(0, 10) : "";
    cursoVagas.value = cursoParaEditar.vagas || 40;
    cursoPreco.value = cursoParaEditar.preco || 3200.00;
    cursoDescricao.value = cursoParaEditar.descricao || "";
    cursoRequisitos.value = cursoParaEditar.requisitos || "";
  } else {
    formCursoTitulo.textContent = "Cadastrar Novo Curso e Certificado Oficial";
    cursoModo.value = "criar";
    formCurso.reset();
    cursoId.disabled = false;
    cursoId.value = "";
    cursoCargaHoraria.value = "16 horas";
    cursoDataEvento.value = "Edição Oficial 2026";
    cursoDataFim.value = "";
    cursoVagas.value = 40;
    cursoPreco.value = 3200.00;
  }
  formCursoCard.classList.add("ativo");
  cursoNome.focus();
}

function fecharFormularioCurso() {
  formCursoCard.classList.remove("ativo");
  formCurso.reset();
}

async function salvarCurso(e) {
  e.preventDefault();

  const modo = cursoModo.value;
  const idAtual = cursoId.value.trim();
  const dados = {
    id: idAtual,
    nome: cursoNome.value.trim(),
    carga_horaria: cursoCargaHoraria.value.trim(),
    data_evento: cursoDataEvento.value.trim(),
    data_fim_curso: cursoDataFim.value ? cursoDataFim.value.trim() : null,
    vagas: parseInt(cursoVagas.value, 10),
    preco: parseFloat(cursoPreco.value),
    descricao: cursoDescricao.value.trim(),
    requisitos: cursoRequisitos.value.trim(),
  };

  const btnSalvar = document.getElementById("btnSalvarCurso");
  const textoOriginal = btnSalvar.textContent;
  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando...";

  try {
    const url = modo === "editar" ? `/admin/cursos/${encodeURIComponent(idAtual)}` : "/admin/cursos";
    const method = modo === "editar" ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(dados),
    });

    const respostaJson = await res.json();

    if (!res.ok) {
      alert(respostaJson.erro || "Erro ao salvar curso.");
      return;
    }

    fecharFormularioCurso();
    mensagem.textContent = modo === "editar" 
      ? `Curso "${dados.nome}" atualizado com sucesso!` 
      : `Novo curso "${dados.nome}" cadastrado com sucesso! Certificados no modelo oficial prontos.`;
    mensagem.className = "msg-sucesso";
    setTimeout(() => { mensagem.textContent = ""; }, 4500);

    carregarPainel();
  } catch (err) {
    console.error("Erro ao salvar curso:", err);
    alert("Erro de conexão ao salvar o curso.");
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = textoOriginal;
  }
}

async function excluirCurso(id, nome) {
  if (!confirm(`Deseja realmente excluir o curso "${nome}"?\n\nEsta operação só é permitida se não houver inscrições vinculadas.`)) {
    return;
  }

  try {
    const res = await fetch(`/admin/cursos/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });

    const dados = await res.json();
    if (!res.ok) {
      alert(dados.erro || "Não foi possível excluir o curso.");
      return;
    }

    mensagem.textContent = `Curso "${nome}" removido com sucesso.`;
    mensagem.className = "msg-sucesso";
    setTimeout(() => { mensagem.textContent = ""; }, 4000);
    carregarPainel();
  } catch (err) {
    console.error("Erro ao excluir curso:", err);
    alert("Erro de conexão ao excluir o curso.");
  }
}

// Expõe globalmente para botões inline
window.abrirFormularioCurso = abrirFormularioCurso;
window.fecharFormularioCurso = fecharFormularioCurso;
window.salvarCurso = salvarCurso;
window.excluirCurso = excluirCurso;

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
    const [respostaResumo, respostaInscritos, respostaCursos] = await Promise.all([
      fetch("/admin/resumo", { credentials: "include" }),
      fetch("/admin/inscricoes", { credentials: "include" }),
      fetch("/admin/cursos", { credentials: "include" }),
    ]);

    if (!respostaResumo.ok || !respostaInscritos.ok) {
      mensagem.textContent = "Não foi possível carregar os dados. Você está logado?";
      mensagem.className = "msg-erro";
      return;
    }

    const resumo = await respostaResumo.json();
    const inscritos = await respostaInscritos.json();
    inscritosAtuais = inscritos;

    let cursos = [];
    if (respostaCursos.ok) {
      cursos = await respostaCursos.json();
      cursosCache = cursos;
    }

    // Renderiza Gerenciador de Cursos
    if (corpoTabelaCursos) {
      corpoTabelaCursos.innerHTML = "";
      if (cursos.length === 0) {
        corpoTabelaCursos.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #64748b; padding: 18px;">Nenhum curso cadastrado ainda.</td></tr>`;
      } else {
        cursos.forEach((curso) => {
          const restantes = Math.max(0, (curso.vagas || 0) - (curso.total_inscritos || 0));
          let dataFimFormatada = "-";
          let statusBadge = `<span class="badge-status pago">Liberado</span>`;

          if (curso.data_fim_curso) {
            try {
              const partes = curso.data_fim_curso.split("-");
              if (partes.length === 3) {
                const ano = parseInt(partes[0], 10);
                const mes = parseInt(partes[1], 10) - 1;
                const dia = parseInt(partes[2], 10);
                const dataFim = new Date(ano, mes, dia, 23, 59, 59, 999);
                const agora = new Date();
                dataFimFormatada = `${String(dia).padStart(2, "0")}/${String(mes + 1).padStart(2, "0")}/${ano}`;
                if (agora < dataFim) {
                  statusBadge = `<span class="badge-status pendente">Em Andamento</span>`;
                } else {
                  statusBadge = `<span class="badge-status pago">Concluído</span>`;
                }
              }
            } catch (errData) {
              dataFimFormatada = curso.data_fim_curso;
            }
          }

          const linha = document.createElement("tr");
          linha.innerHTML = `
            <td><strong>${curso.nome}</strong></td>
            <td>${curso.carga_horaria || "16 horas"}</td>
            <td>${curso.data_evento || "Edição Oficial 2026"}</td>
            <td>${dataFimFormatada}</td>
            <td>${statusBadge}</td>
            <td>${formatarMoeda(curso.preco || 3200)}</td>
            <td>${curso.vagas}</td>
            <td>${curso.total_inscritos || 0}</td>
            <td><strong style="color: #2e6b3e;">${curso.total_pagos || 0}</strong></td>
            <td>${restantes}</td>
            <td style="white-space: nowrap;">
              <button type="button" class="btn-acao-tabela btn-editar-curso" data-id="${curso.id}" title="Editar curso e modelo de certificado">
                Editar
              </button>
              ${(curso.total_inscritos || 0) === 0 ? `
                <button type="button" class="btn-acao-tabela btn-perigo btn-excluir-curso" data-id="${curso.id}" data-nome="${curso.nome}" title="Excluir curso">
                  Excluir
                </button>
              ` : `
                <span style="font-size: 11.5px; color: #94a3b8; font-weight: 500;">Inscritos vinculados</span>
              `}
            </td>
          `;
          corpoTabelaCursos.appendChild(linha);
        });

        // Eventos dos botões de edição e exclusão
        corpoTabelaCursos.querySelectorAll(".btn-editar-curso").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            const c = cursosCache.find((item) => item.id === id);
            if (c) abrirFormularioCurso(c);
          });
        });

        corpoTabelaCursos.querySelectorAll(".btn-excluir-curso").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            const nome = btn.dataset.nome;
            excluirCurso(id, nome);
          });
        });
      }
    }

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
        <td><a href="mailto:${inscricao.email}" class="link-email">${inscricao.email}</a></td>
        <td>${inscricao.telefone || "-"}</td>
        <td>${inscricao.cpf || "-"}</td>
        <td>${inscricao.curso}</td>
        <td>${formatarMoeda(inscricao.valor || 3200)}</td>
        <td>${pagamento}</td>
        <td>
          <span class="badge-status ${statusAtual}">${statusLabel}</span>
          ${inscricao.mp_payment_id ? `<br><small class="texto-mp-id">MP #${inscricao.mp_payment_id}</small>` : ""}
        </td>
        <td>
          ${
            statusAtual === "pago"
              ? `<div style="font-size: 12px; line-height: 1.4;">
                  ${inscricao.email_credenciais_enviado ? '<span style="color: #166534; font-weight:600;">✉️ E-mail enviado</span>' : '<span style="color: #ca8a04; font-weight:600;">⚠️ E-mail pendente</span>'}
                  ${inscricao.senha_plana_inicial ? `<br><small>Senha inicial: <code>${inscricao.senha_plana_inicial}</code></small>` : ""}
                  ${inscricao.troca_senha_obrigatoria === 0 ? '<br><small style="color: #2e6b3e;">(Senha alterada)</small>' : ""}
                  <br><button type="button" class="btn-reenviar-acesso" data-id="${inscricao.id}" style="margin-top: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff;">Reenviar Acesso</button>
                 </div>`
              : '<span style="color: #94a3b8; font-size: 12px;">Liberado após pgto</span>'
          }
        </td>
        <td>${inscricao.email_recibo ? `<a href="mailto:${inscricao.email_recibo}" class="link-email">${inscricao.email_recibo}</a>` : "-"}</td>
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

    // Conecta botão de reenvio de credenciais
    document.querySelectorAll(".btn-reenviar-acesso").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        btn.disabled = true;
        btn.textContent = "Enviando...";
        try {
          const res = await fetch(`/admin/inscricoes/${id}/reenviar-acesso`, {
            method: "POST",
            credentials: "include",
          });
          const dados = await res.json();
          if (res.ok) {
            alert(`Acesso processado com sucesso para ${dados.resultado.email}! Senha: ${dados.resultado.senhaGerada}`);
            carregarPainel();
          } else {
            alert(dados.erro || "Falha ao reenviar acesso.");
            btn.disabled = false;
            btn.textContent = "Reenviar Acesso";
          }
        } catch (err) {
          alert("Erro de comunicação com o servidor.");
          btn.disabled = false;
          btn.textContent = "Reenviar Acesso";
        }
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

// Garante que todo e qualquer e-mail na página seja exibido como link azul sublinhado
(function formatarEmailsGlobaisAdmin() {
  function formatarEmails(container = document.body) {
    if (!container) return;
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue || !emailRegex.test(node.nodeValue)) {
            return NodeFilter.FILTER_REJECT;
          }
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'textarea', 'input', 'a'].includes(tag) || parent.closest('a')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    for (const node of nodes) {
      const parent = node.parentNode;
      if (!parent) continue;
      const span = document.createElement('span');
      span.innerHTML = node.nodeValue.replace(
        emailRegex,
        '<a href="mailto:$1" class="link-email">$1</a>'
      );
      parent.replaceChild(span, node);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => formatarEmails());
  } else {
    formatarEmails();
  }
})();
