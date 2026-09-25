// ============================================================================
// Proteção contra XSS armazenado: todo texto que aparece aqui e que foi
// digitado por quem se inscreveu (nome, empresa, telefone, CPF, e-mail...)
// precisa passar por aqui antes de entrar em qualquer "innerHTML". Sem isso,
// alguém poderia se inscrever com um nome do tipo "<img src=x onerror=...>"
// e esse código rodaria no navegador do administrador assim que a tabela
// fosse aberta - com acesso à mesma sessão autenticada do admin. Escapar os
// caracteres especiais de HTML (<, >, &, aspas) faz esse conteúdo ser
// exibido como texto puro, nunca interpretado como tag/atributo.
function escaparHTML(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

// ----------------------------------------------------------------------
// Agrupamento da tabela "Lista de inscritos" por CPF (accordion)
// ----------------------------------------------------------------------
// A rota /admin/inscricoes continua devolvendo uma linha por INSCRIÇÃO
// (não por pessoa) - isso não muda. O agrupamento abaixo é só visual: pega
// essa lista "achatada" e organiza em uma lista de pessoas, cada uma com
// suas próprias inscrições dentro, pra pessoa com mais de 1 inscrição
// aparecer em uma única linha na tabela, com uma seta pra expandir.
function agruparInscritosPorCpf(inscricoes) {
  const porChave = new Map();

  inscricoes.forEach((inscricao) => {
    const cpfLimpo = (inscricao.cpf || "").trim();
    // Sem CPF cadastrado (registros antigos, por exemplo): cada inscrição
    // vira seu próprio grupo, pra não misturar pessoas diferentes por engano.
    const chave = cpfLimpo || `sem-cpf-${inscricao.id}`;

    if (!porChave.has(chave)) {
      porChave.set(chave, {
        cpf: cpfLimpo,
        nome: inscricao.nome,
        empresa: inscricao.empresa,
        email: inscricao.email,
        telefone: inscricao.telefone,
        inscricoes: [],
      });
    }
    porChave.get(chave).inscricoes.push(inscricao);
  });

  return Array.from(porChave.values());
}

// Gera as 8 células (Curso, Valor, Pagamento, Status, Acesso Aluno, E-mail
// recibo, Data, Ação) de UMA inscrição específica. Usada tanto na linha
// única (pessoa com 1 inscrição só) quanto dentro da sub-tabela expandida
// (pessoa com várias inscrições) - o conteúdo de cada inscrição é sempre
// montado da mesma forma, só muda onde ele aparece.
function celulasDaInscricao(inscricao) {
  const dataFormatada = new Date(inscricao.data).toLocaleString("pt-BR");
  let pagamento = nomesPagamento[inscricao.metodo_pagamento] || inscricao.metodo_pagamento || "-";
  if (inscricao.metodo_pagamento === "boleto" && inscricao.vencimento_boleto) {
    pagamento += `<br><small class="tag-vencimento">Venc: ${escaparHTML(inscricao.vencimento_boleto)}</small>`;
  }

  const statusAtual = inscricao.status_pagamento || "pendente";
  const statusLabel = titulosStatus[statusAtual] || statusAtual;

  return `
    <td>${escaparHTML(inscricao.curso)}</td>
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
              ${inscricao.troca_senha_obrigatoria === 0 ? '<br><small style="color: #2e6b3e;">(Senha alterada)</small>' : '<br><small style="color: #64748b;">(Ainda na senha provisória)</small>'}
              <br><button type="button" class="btn-reenviar-acesso" data-id="${inscricao.id}" style="margin-top: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff;">Reenviar Acesso</button>
             </div>`
          : '<span style="color: #94a3b8; font-size: 12px;">Liberado após pgto</span>'
      }
    </td>
    <td>${inscricao.email_recibo ? `<a href="mailto:${escaparHTML(inscricao.email_recibo)}" class="link-email">${escaparHTML(inscricao.email_recibo)}</a>` : "-"}</td>
    <td>${dataFormatada}</td>
    <td>
      <select class="select-status-admin" data-id="${inscricao.id}" aria-label="Alterar status de pagamento">
        <option value="pendente" ${statusAtual === "pendente" ? "selected" : ""}>Pendente</option>
        <option value="pago" ${statusAtual === "pago" ? "selected" : ""}>Pago</option>
        <option value="cancelado" ${statusAtual === "cancelado" ? "selected" : ""}>Cancelado</option>
      </select>
      <br>
      <button type="button" class="btn-excluir-inscricao" data-id="${inscricao.id}" data-curso="${escaparHTML(inscricao.curso)}" style="margin-top: 6px;">🗑️ Excluir</button>
    </td>
  `;
}

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

// Exclui uma única inscrição (um curso de uma pessoa). Pede confirmação
// antes, porque não tem como desfazer depois.
async function excluirInscricao(id, nomeCurso) {
  if (!confirm(`Excluir a inscrição no curso "${nomeCurso}"?\n\nEsta ação não pode ser desfeita.`)) {
    return;
  }
  try {
    const res = await fetch(`/admin/inscricoes/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const dados = await res.json();
    if (!res.ok) {
      alert(dados.erro || "Não foi possível excluir a inscrição.");
      return;
    }
    mensagem.textContent = dados.mensagem || "Inscrição excluída com sucesso.";
    mensagem.className = "msg-sucesso";
    setTimeout(() => { mensagem.textContent = ""; }, 4000);
    carregarPainel();
  } catch (erro) {
    console.error("Erro ao excluir inscrição:", erro);
    alert("Erro de conexão ao excluir a inscrição.");
  }
}

// Exclui o cadastro inteiro de uma pessoa (todas as inscrições dela, em
// qualquer curso, e o login dela no Painel do Inscrito). Pede confirmação
// reforçada, já que apaga mais de uma coisa de uma vez só.
async function excluirCadastro(cpf, nome) {
  if (!confirm(`Excluir TODO o cadastro de "${nome}"?\n\nIsso remove TODAS as inscrições dessa pessoa (em qualquer curso) e o login dela no Painel do Inscrito.\n\nEsta ação não pode ser desfeita.`)) {
    return;
  }

  // Camada extra: além de já estar logada no painel, precisa digitar a
  // senha do admin de novo, aqui e agora, pra confirmar a exclusão. Se
  // errar ou cancelar, nada é apagado.
  const senhaConfirmacao = prompt("Para confirmar a exclusão, digite novamente a senha do painel administrativo:");
  if (senhaConfirmacao === null) {
    return; // Cancelou a caixa de diálogo
  }
  if (!senhaConfirmacao.trim()) {
    alert("É necessário informar a senha do admin para excluir o cadastro.");
    return;
  }

  try {
    const res = await fetch(`/admin/cadastro/${encodeURIComponent(cpf)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ senhaConfirmacao }),
    });
    const dados = await res.json();
    if (!res.ok) {
      alert(dados.erro || "Não foi possível excluir o cadastro.");
      return;
    }
    mensagem.textContent = dados.mensagem || "Cadastro excluído com sucesso.";
    mensagem.className = "msg-sucesso";
    setTimeout(() => { mensagem.textContent = ""; }, 4000);
    carregarPainel();
  } catch (erro) {
    console.error("Erro ao excluir cadastro:", erro);
    alert("Erro de conexão ao excluir o cadastro.");
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
            <td><strong>${escaparHTML(curso.nome)}</strong></td>
            <td>${escaparHTML(curso.carga_horaria) || "16 horas"}</td>
            <td>${escaparHTML(curso.data_evento) || "Edição Oficial 2026"}</td>
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
                <button type="button" class="btn-acao-tabela btn-perigo btn-excluir-curso" data-id="${curso.id}" data-nome="${escaparHTML(curso.nome)}" title="Excluir curso">
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
        <td><strong>${escaparHTML(curso.nome)}</strong></td>
        <td>${formatarMoeda(curso.preco || 3200)}</td>
        <td>${curso.vagas}</td>
        <td>${curso.inscritos}</td>
        <td><strong style="color: #2e6b3e;">${curso.pagos || 0}</strong></td>
        <td>${restantes}</td>
      `;
      resumoCorpo.appendChild(linha);
    });

    inscritosCorpo.innerHTML = "";
    const pessoas = agruparInscritosPorCpf(inscritos);

    pessoas.forEach((pessoa, indice) => {
      const temMultiplasInscricoes = pessoa.inscricoes.length > 1;

      if (!temMultiplasInscricoes) {
        // Pessoa com 1 inscrição só: linha única, sem seta - comportamento
        // idêntico ao de sempre.
        const linha = document.createElement("tr");
        linha.innerHTML = `
          <td>
            <div class="celula-nome">
              <strong>${escaparHTML(pessoa.nome)}</strong>
              ${pessoa.cpf ? `<button type="button" class="btn-excluir-cadastro" data-cpf="${escaparHTML(pessoa.cpf)}" data-nome="${escaparHTML(pessoa.nome)}">Excluir cadastro</button>` : ""}
            </div>
          </td>
          <td>${escaparHTML(pessoa.empresa) || "-"}</td>
          <td><a href="mailto:${escaparHTML(pessoa.email)}" class="link-email">${escaparHTML(pessoa.email)}</a></td>
          <td>${escaparHTML(pessoa.telefone) || "-"}</td>
          <td>${escaparHTML(pessoa.cpf) || "-"}</td>
          ${celulasDaInscricao(pessoa.inscricoes[0])}
        `;
        inscritosCorpo.appendChild(linha);
        return;
      }

      // Pessoa com mais de 1 inscrição: linha compacta com seta "›" ao lado
      // do nome. Os detalhes de cada inscrição ficam escondidos até o clique.
      const idLinhaExpandida = `linha-expandida-${indice}`;
      const linha = document.createElement("tr");
      linha.className = "linha-inscrito";
      linha.innerHTML = `
        <td class="celula-com-seta">
          <button type="button" class="botao-expandir" aria-expanded="false" aria-controls="${idLinhaExpandida}">›</button>
          <div class="celula-nome">
            <strong>${escaparHTML(pessoa.nome)}</strong>
            ${pessoa.cpf ? `<button type="button" class="btn-excluir-cadastro" data-cpf="${escaparHTML(pessoa.cpf)}" data-nome="${escaparHTML(pessoa.nome)}">Excluir cadastro</button>` : ""}
          </div>
        </td>
        <td>${escaparHTML(pessoa.empresa) || "-"}</td>
        <td><a href="mailto:${escaparHTML(pessoa.email)}" class="link-email">${escaparHTML(pessoa.email)}</a></td>
        <td>${escaparHTML(pessoa.telefone) || "-"}</td>
        <td>${escaparHTML(pessoa.cpf) || "-"}</td>
        <td colspan="8"><span class="badge-inscricoes">${pessoa.inscricoes.length} inscrições — clique na seta para ver os cursos</span></td>
      `;
      inscritosCorpo.appendChild(linha);

      // Linha expandida (oculta por padrão) com uma sub-tabela contendo o
      // detalhe completo de cada inscrição dessa pessoa.
      const linhaExpandida = document.createElement("tr");
      linhaExpandida.className = "linha-expandida";
      linhaExpandida.id = idLinhaExpandida;
      linhaExpandida.hidden = true;

      const linhasInternas = pessoa.inscricoes
        .map((inscricao) => `<tr>${celulasDaInscricao(inscricao)}</tr>`)
        .join("");

      linhaExpandida.innerHTML = `
        <td colspan="13">
          <div class="painel-expandido">
            <table class="tabela-inscricoes-aninhada">
              <thead>
                <tr>
                  <th>Curso</th><th>Valor</th><th>Pagamento</th><th>Status</th>
                  <th>Acesso Aluno</th><th>E-mail recibo</th><th>Data</th><th>Ação</th>
                </tr>
              </thead>
              <tbody>${linhasInternas}</tbody>
            </table>
          </div>
        </td>
      `;
      inscritosCorpo.appendChild(linhaExpandida);

      // Clique na seta abre/fecha a linha expandida (efeito accordion,
      // animando o max-height do painel - ver style.css).
      const botao = linha.querySelector(".botao-expandir");
      botao.addEventListener("click", () => {
        const painel = linhaExpandida.querySelector(".painel-expandido");
        const estaAberta = !linhaExpandida.hidden;

        if (estaAberta) {
          painel.classList.remove("aberto");
          botao.setAttribute("aria-expanded", "false");
          painel.addEventListener("transitionend", () => { linhaExpandida.hidden = true; }, { once: true });
        } else {
          linhaExpandida.hidden = false;
          botao.setAttribute("aria-expanded", "true");
          void painel.offsetWidth; // força o navegador a reconhecer o max-height:0 antes de animar
          painel.classList.add("aberto");
        }
      });
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
            const { email, senhaGerada, jaTinhaSenhaDefinitiva } = dados.resultado;
            if (senhaGerada) {
              alert(`Nova senha gerada e enviada por e-mail para ${email}.\nSenha: ${senhaGerada}\n\n(A senha anterior dela deixou de valer.)`);
            } else if (jaTinhaSenhaDefinitiva) {
              alert(`${email} já definiu a própria senha - não é possível reenviá-la ou reiniciá-la por aqui.\nOriente a pessoa a usar "Esqueci minha senha" na tela de login do Painel do Inscrito.`);
            } else {
              alert(`Acesso processado para ${email} (nenhuma senha nova foi necessária).`);
            }
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

    // Conecta botão de excluir UMA inscrição
    document.querySelectorAll(".btn-excluir-inscricao").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        const curso = e.target.dataset.curso;
        excluirInscricao(id, curso);
      });
    });

    // Conecta botão de excluir o CADASTRO inteiro (todas as inscrições da pessoa + login dela)
    document.querySelectorAll(".btn-excluir-cadastro").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const cpf = e.target.dataset.cpf;
        const nome = e.target.dataset.nome;
        excluirCadastro(cpf, nome);
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
