const formulario = document.getElementById("formInscricao");
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

// ============================================================================
// Barra "congelada" no topo (mesma ideia da linha congelada do Excel): fica
// sempre visível (é "position: fixed" no CSS) e encolhe conforme a página é
// rolada para baixo, voltando a crescer - e se estabilizando no tamanho
// cheio - conforme se rola de volta para cima. O tamanho é recalculado a
// cada pedacinho da rolagem, não é só um "liga/desliga" entre dois tamanhos.
// ============================================================================

const barraLogo = document.getElementById("barraLogo");
const espacoBarraLogo = document.getElementById("espacoBarraLogo");
const logo = document.querySelector(".logo");

const LOGO_TAMANHO_MAXIMO = 440; // igual ao "max-width" original definido no CSS
const LOGO_TAMANHO_MINIMO = 140; // tamanho do logo já totalmente encolhido
const BARRA_PADDING_MAXIMO = 16; // padding vertical da barra no topo da página
const BARRA_PADDING_MINIMO = 6; // padding vertical da barra já encolhida
const DISTANCIA_ROLAGEM = 250; // depois de rolar essa distância (em pixels), a barra já está no tamanho mínimo

function atualizarBarraLogo() {
  // "progresso" vai de 0 (topo da página) até 1 (rolou 250px ou mais para baixo)
  const progresso = Math.min(window.scrollY / DISTANCIA_ROLAGEM, 1);

  const tamanhoLogo = LOGO_TAMANHO_MAXIMO - progresso * (LOGO_TAMANHO_MAXIMO - LOGO_TAMANHO_MINIMO);
  logo.style.maxWidth = `${tamanhoLogo}px`;

  const paddingVertical = BARRA_PADDING_MAXIMO - progresso * (BARRA_PADDING_MAXIMO - BARRA_PADDING_MINIMO);
  barraLogo.style.paddingTop = `${paddingVertical}px`;
  barraLogo.style.paddingBottom = `${paddingVertical}px`;

  barraLogo.classList.toggle("comprimida", progresso > 0);

  // A barra é "position: fixed", então o navegador não reserva espaço pra
  // ela sozinho - é por isso que existe o "espacoBarraLogo" logo abaixo dela
  // no HTML. Como a altura da barra muda a cada rolagem (a logo e o padding
  // estão encolhendo), lemos a altura real que o navegador acabou de
  // desenhar ("offsetHeight") e aplicamos esse mesmo valor no espaço
  // reservado, pra o resto da página sempre começar exatamente onde a barra termina.
  espacoBarraLogo.style.height = `${barraLogo.offsetHeight}px`;
}

// O navegador dispara o evento "scroll" dezenas de vezes por segundo -
// "requestAnimationFrame" agrupa isso para recalcular no máximo uma vez por
// quadro de tela, o que deixa a animação leve e sem travadas.
let barraAtualizacaoAgendada = false;
window.addEventListener("scroll", () => {
  if (!barraAtualizacaoAgendada) {
    barraAtualizacaoAgendada = true;
    requestAnimationFrame(() => {
      atualizarBarraLogo();
      barraAtualizacaoAgendada = false;
    });
  }
});

atualizarBarraLogo(); // já aplica o tamanho certo ao carregar (caso a página recarregue com a rolagem no meio)

// ============================================================================
// Máscaras e validações específicas de cada campo (Nome, Telefone e CPF)
// ============================================================================

const campoNome = document.getElementById("nome");
const campoTelefone = document.getElementById("telefone");
const campoCPF = document.getElementById("cpf");

// Formata o telefone enquanto a pessoa digita, no padrão (xx) xxxxx-xxxx.
// "replace(/\D/g, '')" remove tudo que não for dígito, então não importa se
// a pessoa digitar parênteses, espaço ou colar um número já formatado - o
// resultado final sempre segue o mesmo padrão.
function mascararTelefone(valor) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

campoTelefone.addEventListener("input", () => {
  campoTelefone.value = mascararTelefone(campoTelefone.value);
});

// Telefone precisa bater exatamente com o padrão "(xx) xxxxx-xxxx"
// (DDD de 2 dígitos + celular de 9 dígitos, com o "9" na frente).
function telefoneValido(valor) {
  return /^\(\d{2}\) \d{5}-\d{4}$/.test(valor);
}

// Formata o CPF enquanto digita, no padrão xxx.xxx.xxx-xx usado em
// praticamente todo site brasileiro.
function mascararCPF(valor) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

campoCPF.addEventListener("input", () => {
  campoCPF.value = mascararCPF(campoCPF.value);
});

// Confere se o CPF é MATEMATICAMENTE válido - o mesmo cálculo dos dois
// "dígitos verificadores" que a Receita Federal usa. Não basta ter 11
// números: eles precisam se encaixar nessa conta.
function cpfValido(valor) {
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length !== 11) return false;

  // CPFs com todos os dígitos iguais (111.111.111-11, por exemplo) passariam
  // na conta abaixo, mas não são números emitidos de verdade.
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  function calcularDigitoVerificador(base) {
    let soma = 0;
    let peso = base.length + 1;
    for (const numero of base) {
      soma += Number(numero) * peso;
      peso--;
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  }

  const primeiros9 = digitos.slice(0, 9);
  const digito1 = calcularDigitoVerificador(primeiros9);
  const primeiros10 = primeiros9 + digito1;
  const digito2 = calcularDigitoVerificador(primeiros10);

  return digitos === primeiros10 + String(digito2);
}

// Nome completo precisa ter mais de 3 caracteres (sem contar espaços nas
// pontas, por isso o ".trim()").
function nomeValido(valor) {
  return valor.trim().length > 3;
}

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
  const email = document.getElementById("email").value.trim();
  const emailRecibo = document.getElementById("emailRecibo").value.trim();
  const aceiteTermos = document.getElementById("aceiteTermos").checked;
  const metodoPagamento = document.querySelector('input[name="metodoPagamento"]:checked');

  return Boolean(
    curso && empresa && email && emailRecibo && metodoPagamento && aceiteTermos &&
    nomeValido(campoNome.value) &&
    telefoneValido(campoTelefone.value) &&
    cpfValido(campoCPF.value)
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

// ============================================================================
// Balão de erro de validação (mesmo modelo do aviso nativo do navegador,
// tipo "Inclua um @ no endereço de e-mail" - só que aqui a gente monta o
// balão na mão, pra funcionar também nos campos personalizados que o
// navegador não sabe validar sozinho: curso, empresa, pagamento e aceite).
// ============================================================================

let balaoErroAtual = null;

function esconderBalaoErro() {
  if (balaoErroAtual) {
    balaoErroAtual.remove();
    balaoErroAtual = null;
  }
}

// "elemento" é o campo (ou caixa) que está com problema - o balão é
// posicionado logo abaixo dele. Usamos coordenadas absolutas da página
// (getBoundingClientRect + scroll atual) em vez de CSS puro porque assim o
// balão funciona igual não importa onde o elemento esteja no formulário, sem
// risco de ficar cortado por alguma caixa com "overflow" no meio do caminho.
function mostrarErroCampo(elemento, texto) {
  esconderBalaoErro();

  const balao = document.createElement("div");
  balao.className = "balao-erro";
  balao.innerHTML = `
    <div class="balao-erro-cabecalho">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M12 3 L22.5 21 H1.5 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <line x1="12" y1="10" x2="12" y2="14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="17.5" r="1.1" fill="currentColor"/>
      </svg>
      <span>${texto}</span>
    </div>
  `;
  document.body.appendChild(balao);

  const retangulo = elemento.getBoundingClientRect();
  balao.style.top = `${retangulo.bottom + window.scrollY + 8}px`;
  balao.style.left = `${retangulo.left + window.scrollX}px`;

  balaoErroAtual = balao;

  // Rola a página até o campo com erro ficar visível, igual o navegador faz
  // sozinho quando bloqueia o envio de um formulário nativo.
  elemento.scrollIntoView({ behavior: "smooth", block: "center" });
  if (typeof elemento.focus === "function") {
    setTimeout(() => elemento.focus(), 300);
  }
}

// O balão some assim que a pessoa mexe em algum campo, clica fora dele, ou
// quando um novo balão precisa aparecer no lugar - mesmo comportamento do
// aviso nativo do navegador.
formulario.addEventListener("input", esconderBalaoErro);
formulario.addEventListener("change", esconderBalaoErro);
document.addEventListener("click", (evento) => {
  if (balaoErroAtual && !balaoErroAtual.contains(evento.target)) {
    esconderBalaoErro();
  }
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

  // Validação de todos os campos obrigatórios, um por um, cada uma mostrando
  // o balão de erro bem embaixo do campo específico que precisa ser corrigido.
  if (!curso) {
    mostrarErroCampo(document.getElementById("botaoCurso"), "Selecione um curso.");
    return;
  }
  if (!empresa) {
    mostrarErroCampo(document.getElementById("botaoEmpresa"), "Selecione a empresa.");
    return;
  }
  if (!nomeValido(nome)) {
    mostrarErroCampo(campoNome, "O nome completo deve ter mais de 3 caracteres.");
    return;
  }
  if (!email) {
    mostrarErroCampo(document.getElementById("email"), "Informe o e-mail do participante.");
    return;
  }
  if (!telefoneValido(telefone)) {
    mostrarErroCampo(campoTelefone, "O telefone deve estar no formato (xx) xxxxx-xxxx, com o DDD.");
    return;
  }
  if (!cpfValido(cpf)) {
    mostrarErroCampo(campoCPF, "Informe um CPF válido.");
    return;
  }
  if (!metodoPagamento) {
    mostrarErroCampo(formulario.querySelector("fieldset"), "Selecione um método de pagamento.");
    return;
  }
  if (!emailRecibo) {
    mostrarErroCampo(document.getElementById("emailRecibo"), "Informe o e-mail para envio do recibo.");
    return;
  }
  if (!aceiteTermos) {
    mostrarErroCampo(
      document.querySelector(".aceite"),
      "Você precisa aceitar os termos de inscrição para continuar."
    );
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
      esconderBalaoErro();
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
      mostrarErroCampo(btnEnviar, dados.erro || "Não foi possível enviar a inscrição.");
    }
  } catch (erro) {
    mostrarErroCampo(btnEnviar, "Erro de conexão com o servidor. Tente novamente.");
    console.error(erro);
  }
});
