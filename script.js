const formulario = document.getElementById("formInscricao");
const mensagem = document.getElementById("mensagem");

// "async" permite usar "await" dentro da função, que serve pra "esperar"
// uma operação demorada terminar (como uma requisição de rede) antes de continuar.
formulario.addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;
  const curso = document.getElementById("curso").value;

  if (nome.trim() === "" || email.trim() === "") {
    mensagem.textContent = "Por favor, preencha nome e e-mail antes de enviar.";
    mensagem.style.color = "red";
    return;
  }

  // "try/catch" existe porque pedidos de rede podem falhar (servidor desligado,
  // sem internet, etc). O que está no "try" a gente tenta fazer; se der erro,
  // o "catch" pega o problema em vez de travar a página.
  try {
    // fetch() é a função do navegador para fazer requisições HTTP.
    // Aqui mandamos um POST (enviar dados) para a rota que criamos no server.js.
    const resposta = await fetch("/inscricoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // JSON.stringify transforma o objeto JavaScript num texto que pode viajar pela rede
      body: JSON.stringify({ nome, email, curso }),
    });

    // A resposta também vem em JSON; JSON.parse (feito por .json()) transforma de volta em objeto
    const dados = await resposta.json();

    if (resposta.ok) {
      mensagem.textContent = "Inscrição enviada com sucesso, " + nome + "!";
      mensagem.style.color = "green";
      formulario.reset();
    } else {
      // O servidor respondeu, mas recusou (ex: campo faltando)
      mensagem.textContent = dados.erro || "Não foi possível enviar a inscrição.";
      mensagem.style.color = "red";
    }
  } catch (erro) {
    // Isso roda se nem chegou a falar com o servidor (ex: servidor desligado)
    mensagem.textContent = "Erro de conexão com o servidor. Tente novamente.";
    mensagem.style.color = "red";
    console.error(erro);
  }
});