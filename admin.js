const resumoCorpo = document.querySelector("#tabelaResumo tbody");
const inscritosCorpo = document.querySelector("#tabelaInscritos tbody");
const mensagem = document.getElementById("mensagemAdmin");

async function carregarPainel() {
  try {
    // Promise.all roda as duas buscas ao mesmo tempo, em vez de uma esperar a outra.
    // "credentials: include" garante que o login (usuário/senha) seja enviado nessas requisições.
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

    // Monta a tabela de resumo: uma linha <tr> por curso
    resumoCorpo.innerHTML = "";
    resumo.forEach((curso) => {
      const restantes = curso.vagas - curso.inscritos;
      const linha = document.createElement("tr");
      // Template literal (crase `` em vez de aspas) permite misturar texto e variáveis com ${}
      linha.innerHTML = `
        <td>${curso.nome}</td>
        <td>${curso.vagas}</td>
        <td>${curso.inscritos}</td>
        <td>${restantes}</td>
      `;
      resumoCorpo.appendChild(linha);
    });

    // Monta a tabela de inscritos: uma linha <tr> por pessoa inscrita
    inscritosCorpo.innerHTML = "";
    inscritos.forEach((inscricao) => {
      const dataFormatada = new Date(inscricao.data).toLocaleString("pt-BR");
      const linha = document.createElement("tr");
      linha.innerHTML = `
        <td>${inscricao.nome}</td>
        <td>${inscricao.email}</td>
        <td>${inscricao.curso}</td>
        <td>${dataFormatada}</td>
      `;
      inscritosCorpo.appendChild(linha);
    });
  } catch (erro) {
    mensagem.textContent = "Erro de conexão com o servidor.";
    console.error(erro);
  }
}

// Roda assim que a página abre
carregarPainel();