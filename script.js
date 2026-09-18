const formulario = document.getElementById("formInscricao");
const mensagem = document.getElementById("mensagem");
const selectCurso = document.getElementById("curso");
const detalhesCurso = document.getElementById("detalhesCurso");

let cursosDisponiveis = [];

async function carregarCursos() {
  try {
    const resposta = await fetch("/cursos");
    cursosDisponiveis = await resposta.json();

    selectCurso.innerHTML = "";

    cursosDisponiveis.forEach((curso) => {
      const opcao = document.createElement("option");
      opcao.value = curso.id;
      opcao.textContent = curso.nome;
      selectCurso.appendChild(opcao);
    });

    if (cursosDisponiveis.length > 0) {
      mostrarDetalhes(selectCurso.value);
    }
  } catch (erro) {
    selectCurso.innerHTML = '<option value="">Erro ao carregar cursos</option>';
    console.error(erro);
  }
}

function mostrarDetalhes(idCurso) {
  const curso = cursosDisponiveis.find((c) => c.id === idCurso);
  if (!curso) {
    detalhesCurso.innerHTML = "";
    return;
  }
  detalhesCurso.innerHTML = `
    <p class="nome-curso">${curso.nome}</p>
    <p class="descricao-curso">${curso.descricao || "-"}</p>
  `;

  // Truque para "reiniciar" a animação toda vez: removemos a classe,
  // forçamos o navegador a recalcular o layout (a linha do offsetWidth
  // faz isso), e só então adicionamos a classe de novo. Sem esse truque,
  // a animação só rodaria na primeira vez, porque o navegador ignora
  // adicionar uma classe que já estava lá.
  detalhesCurso.classList.remove("animar");
  void detalhesCurso.offsetWidth;
  detalhesCurso.classList.add("animar");
}

selectCurso.addEventListener("change", (evento) => {
  mostrarDetalhes(evento.target.value);
});

carregarCursos();

formulario.addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const curso = selectCurso.value;
  const empresa = document.getElementById("empresa").value.trim();
  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const cpf = document.getElementById("cpf").value.trim();
  const emailRecibo = document.getElementById("emailRecibo").value.trim();
  const aceiteTermos = document.getElementById("aceiteTermos").checked;

  // "querySelector" com ':checked' busca, dentro do grupo de radio buttons
  // (todos com o mesmo "name"), qual deles está marcado no momento.
  const radioSelecionado = document.querySelector('input[name="metodoPagamento"]:checked');
  const metodoPagamento = radioSelecionado ? radioSelecionado.value : "";

  // Validação de todos os campos obrigatórios, um por um, com mensagens específicas
  if (!curso) {
    mostrarErro("Selecione um curso.");
    return;
  }
  if (!empresa || !nome || !email || !telefone || !cpf) {
    mostrarErro("Preencha todos os dados do participante.");
    return;
  }
  if (!metodoPagamento) {
    mostrarErro("Selecione um método de pagamento.");
    return;
  }
  if (!emailRecibo) {
    mostrarErro("Informe o e-mail para envio do recibo.");
    return;
  }
  if (!aceiteTermos) {
    mostrarErro("Você precisa aceitar os termos de inscrição para continuar.");
    return;
  }

  try {
    const resposta = await fetch("/inscricoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        curso, empresa, nome, email, telefone, cpf,
        metodoPagamento, emailRecibo, aceiteTermos,
      }),
    });

    const dados = await resposta.json();

    if (resposta.ok) {
      mensagem.textContent = "Inscrição enviada com sucesso, " + nome + "!";
      mensagem.style.color = "green";
      formulario.reset();
      carregarCursos();
    } else {
      mostrarErro(dados.erro || "Não foi possível enviar a inscrição.");
    }
  } catch (erro) {
    mostrarErro("Erro de conexão com o servidor. Tente novamente.");
    console.error(erro);
  }
});

function mostrarErro(texto) {
  mensagem.textContent = texto;
  mensagem.style.color = "red";
}