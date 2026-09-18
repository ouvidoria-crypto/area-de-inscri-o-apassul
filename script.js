const formulario = document.getElementById("formInscricao");
const mensagem = document.getElementById("mensagem");
const selectCurso = document.getElementById("curso"); // agora é um <input type="hidden">
const detalhesCurso = document.getElementById("detalhesCurso");
const btnEnviar = document.getElementById("btnEnviar");
const overlayConfirmacao = document.getElementById("overlayConfirmacao");

// Mostra o aviso de sucesso no meio da tela, com o fundo da página
// desfocado. Some sozinho depois de alguns segundos, ou assim que a pessoa
// clicar em qualquer lugar.
let temporizadorConfirmacao = null;

function mostrarConfirmacao() {
  overlayConfirmacao.hidden = false;
  clearTimeout(temporizadorConfirmacao);
  temporizadorConfirmacao = setTimeout(esconderConfirmacao, 3000);
}

function esconderConfirmacao() {
  overlayConfirmacao.hidden = true;
  clearTimeout(temporizadorConfirmacao);
}

overlayConfirmacao.addEventListener("click", esconderConfirmacao);

let cursosDisponiveis = [];

// Transforma um botão + uma lista (<ul>) num menu clicável, guardando o valor
// escolhido num <input type="hidden">. Existe porque o navegador não deixa
// estilizar a lista de opções de um <select> nativo do jeito que a página
// usa em todo o resto (cantos arredondados, separação entre opções etc.).
function criarSelectPersonalizado({ botao, lista, campoOculto }) {
  // Guarda o texto original do botão (o placeholder), pra poder voltar a ele
  // depois que o formulário for enviado e resetado.
  const textoInicial = botao.querySelector(".select-texto").textContent;

  function fechar() {
    lista.hidden = true;
    botao.setAttribute("aria-expanded", "false");
  }

  function abrir() {
    lista.hidden = false;
    botao.setAttribute("aria-expanded", "true");
  }

  botao.addEventListener("click", () => {
    if (lista.hidden) abrir();
    else fechar();
  });

  // Fecha o menu se a pessoa clicar em qualquer outro lugar da página
  document.addEventListener("click", (evento) => {
    if (!botao.contains(evento.target) && !lista.contains(evento.target)) {
      fechar();
    }
  });

  function selecionar(valor, texto, itemClicado) {
    campoOculto.value = valor;
    botao.querySelector(".select-texto").textContent = texto;
    botao.classList.add("selecionado");

    lista.querySelectorAll("li").forEach((li) => li.classList.remove("selecionado"));
    if (itemClicado) itemClicado.classList.add("selecionado");

    fechar();

    // Dispara um evento "change" no campo oculto, pra qualquer código que já
    // escute "change" nesse id (como acontecia com o <select> nativo)
    // continuar funcionando sem precisar mudar mais nada. "bubbles: true" faz
    // esse evento subir até o <form>, onde também escutamos "change" pra
    // saber quando habilitar o botão de enviar.
    campoOculto.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Usada pro Curso, cujas opções vêm do servidor (mudam dinamicamente)
  function preencherOpcoes(opcoes) {
    lista.innerHTML = "";
    opcoes.forEach((opcao) => {
      const item = document.createElement("li");
      item.setAttribute("role", "option");
      item.textContent = opcao.texto;
      item.dataset.valor = opcao.valor;
      item.addEventListener("click", () => selecionar(opcao.valor, opcao.texto, item));
      lista.appendChild(item);
    });
  }

  // Usada pra Empresa, cuja lista já vem pronta no HTML
  function ligarOpcoesExistentes() {
    lista.querySelectorAll("li").forEach((item) => {
      item.setAttribute("role", "option");
      item.addEventListener("click", () =>
        selecionar(item.dataset.valor, item.textContent, item)
      );
    });
  }

  // Volta o menu ao estado inicial (usado depois de enviar o formulário)
  function resetar() {
    campoOculto.value = "";
    botao.querySelector(".select-texto").textContent = textoInicial;
    botao.classList.remove("selecionado");
    lista.querySelectorAll("li").forEach((li) => li.classList.remove("selecionado"));
  }

  return { preencherOpcoes, ligarOpcoesExistentes, selecionar, resetar };
}

const menuCurso = criarSelectPersonalizado({
  botao: document.getElementById("botaoCurso"),
  lista: document.getElementById("listaCurso"),
  campoOculto: selectCurso,
});

const menuEmpresa = criarSelectPersonalizado({
  botao: document.getElementById("botaoEmpresa"),
  lista: document.getElementById("listaEmpresa"),
  campoOculto: document.getElementById("empresa"),
});
menuEmpresa.ligarOpcoesExistentes();

async function carregarCursos() {
  try {
    const resposta = await fetch("/cursos");
    cursosDisponiveis = await resposta.json();

    menuCurso.preencherOpcoes(
      cursosDisponiveis.map((curso) => ({ valor: curso.id, texto: curso.nome }))
    );

    // Diferente de antes, o curso NÃO vem mais pré-selecionado - o campo
    // começa em "Selecione um curso...", igual ao padrão do campo Empresa.
    document.querySelector("#botaoCurso .select-texto").textContent = "Selecione um curso...";
  } catch (erro) {
    document.querySelector("#botaoCurso .select-texto").textContent = "Erro ao carregar cursos";
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

// Confere se todo campo obrigatório já está preenchido (mesma checagem que
// já era feita só no momento de enviar, agora usada também pra controlar a
// aparência do botão em tempo real).
function formularioCompleto() {
  const curso = selectCurso.value;
  const empresa = document.getElementById("empresa").value.trim();
  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const cpf = document.getElementById("cpf").value.trim();
  const emailRecibo = document.getElementById("emailRecibo").value.trim();
  const aceiteTermos = document.getElementById("aceiteTermos").checked;
  const metodoPagamento = document.querySelector('input[name="metodoPagamento"]:checked');

  return Boolean(
    curso && empresa && nome && email && telefone && cpf &&
    metodoPagamento && emailRecibo && aceiteTermos
  );
}

// Liga/desliga a classe "pronto" no botão de enviar, que é o que troca a
// aparência dele de "apagado" para sólido (veja o CSS de ".botao-enviar").
function atualizarBotaoEnviar() {
  btnEnviar.classList.toggle("pronto", formularioCompleto());
}

// "input" cobre a digitação nos campos de texto, e "change" cobre os
// radio/checkbox nativos e os menus personalizados (que disparam "change"
// manualmente - veja a função "selecionar" lá em cima).
formulario.addEventListener("input", atualizarBotaoEnviar);
formulario.addEventListener("change", atualizarBotaoEnviar);

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
      mensagem.textContent = "";
      mostrarConfirmacao();
      formulario.reset();
      menuCurso.resetar();
      menuEmpresa.resetar();
      detalhesCurso.innerHTML = ""; // esvazia a caixa de descrição, que some (veja ":empty" no CSS)
      carregarCursos();
      // formulario.reset() não dispara "input"/"change" sozinho, então sem
      // esta linha o botão continuaria com a aparência de "pronto" mesmo
      // com os campos já vazios de novo.
      atualizarBotaoEnviar();
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