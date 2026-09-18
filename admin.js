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

// Guarda a última lista de inscritos carregada, pra poder gerar o CSV
// sem precisar buscar tudo de novo no servidor.
let inscritosAtuais = [];

async function carregarPainel() {
  try {
    const [respostaResumo, respostaInscritos] = await Promise.all([
      fetch("/admin/resumo", { credentials: "include" }),
      fetch("/admin/inscricoes", { credentials: "include" }),
    ]);

    if (!respostaResumo.ok || !respostaInscritos.ok) {
      mensagem.textContent = "Não foi possível carregar os dados. Você está logado?";
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
        <td>${curso.nome}</td>
        <td>${curso.vagas}</td>
        <td>${curso.inscritos}</td>
        <td>${restantes}</td>
      `;
      resumoCorpo.appendChild(linha);
    });

    inscritosCorpo.innerHTML = "";
    inscritos.forEach((inscricao) => {
      const dataFormatada = new Date(inscricao.data).toLocaleString("pt-BR");
      const pagamento = nomesPagamento[inscricao.metodo_pagamento] || inscricao.metodo_pagamento || "-";
      const linha = document.createElement("tr");
      linha.innerHTML = `
        <td>${inscricao.nome}</td>
        <td>${inscricao.empresa || "-"}</td>
        <td>${inscricao.email}</td>
        <td>${inscricao.telefone || "-"}</td>
        <td>${inscricao.cpf || "-"}</td>
        <td>${inscricao.curso}</td>
        <td>${pagamento}</td>
        <td>${inscricao.email_recibo || "-"}</td>
        <td>${dataFormatada}</td>
      `;
      inscritosCorpo.appendChild(linha);
    });
  } catch (erro) {
    mensagem.textContent = "Erro de conexão com o servidor.";
    console.error(erro);
  }
}

carregarPainel();

// Coloca aspas em volta de um campo quando ele contém ponto e vírgula, aspas
// ou quebra de linha, pra não bagunçar as colunas do CSV. Aspas dentro do
// texto viram aspas duplicadas (""), que é a forma padrão de "escapar" aspas
// dentro de um campo de CSV.
function escaparCampoCSV(valor) {
  const texto = String(valor ?? "");
  if (/[";\n]/.test(texto)) {
    return '"' + texto.replace(/"/g, '""') + '"';
  }
  return texto;
}

// Monta o texto do CSV inteiro: uma linha de cabeçalho, depois uma linha por
// inscrição. Usa ";" como separador (em vez de ","), porque é o que o Excel
// em português espera para abrir o arquivo já dividido em colunas.
function paraCSV(inscritos) {
  const cabecalho = [
    "Nome", "Empresa", "E-mail", "Telefone", "CPF",
    "Curso", "Pagamento", "E-mail recibo", "Data",
  ];

  const linhas = inscritos.map((inscricao) => {
    const dataFormatada = new Date(inscricao.data).toLocaleString("pt-BR");
    const pagamento = nomesPagamento[inscricao.metodo_pagamento] || inscricao.metodo_pagamento || "-";
    return [
      inscricao.nome, inscricao.empresa || "-", inscricao.email,
      inscricao.telefone || "-", inscricao.cpf || "-", inscricao.curso,
      pagamento, inscricao.email_recibo || "-", dataFormatada,
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

  // "\uFEFF" no início (chamado de BOM) avisa o Excel que o arquivo está em
  // UTF-8, senão acentos e "ç" aparecem corrompidos ao abrir.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // Truque padrão pra baixar um arquivo gerado no navegador: cria um link
  // invisível apontando pro arquivo, "clica" nele via código, e remove em
  // seguida. O atributo "download" faz o navegador salvar em vez de navegar.
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