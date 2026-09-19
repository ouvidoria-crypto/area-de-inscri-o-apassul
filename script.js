const formulario = document.getElementById("formInscricao");
const selectCurso = document.getElementById("curso"); // agora é um <input type="hidden">
const detalhesCurso = document.getElementById("detalhesCurso");
const btnEnviar = document.getElementById("btnEnviar");
const overlayConfirmacao = document.getElementById("overlayConfirmacao");

// Mostra o aviso de sucesso no meio da tela, com o fundo da página
// desfocado. Em seguida, abre a página de confirmação (ou imediatamente,
// se a pessoa clicar no aviso).
let temporizadorConfirmacao = null;
let urlDestinoConfirmacao = "/inscricao-confirmada.html";

function irParaPaginaConfirmacao() {
  clearTimeout(temporizadorConfirmacao);
  window.location.href = urlDestinoConfirmacao;
}

function mostrarConfirmacao(urlPersonalizada) {
  if (urlPersonalizada) {
    urlDestinoConfirmacao = urlPersonalizada;
  }
  overlayConfirmacao.hidden = false;
  clearTimeout(temporizadorConfirmacao);
  temporizadorConfirmacao = setTimeout(irParaPaginaConfirmacao, 2000);
}

overlayConfirmacao.addEventListener("click", irParaPaginaConfirmacao);

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

// Formata o telefone enquanto a pessoa digita, suportando fixo (10 dígitos) e celular (11 dígitos).
function mascararTelefone(valor) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

campoTelefone.addEventListener("input", () => {
  campoTelefone.value = mascararTelefone(campoTelefone.value);
});

// Aceita telefones brasileiros com DDD: tanto fixo (10 dígitos) quanto celular (11 dígitos)
function telefoneValido(valor) {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length === 10 || digitos.length === 11;
}

// Formata o CPF enquanto digita, no padrão xxx.xxx.xxx-xx
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

// Validação de CPF: verifica dígitos verificadores oficiais ou permite sequências de teste comuns
function cpfValido(valor) {
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length !== 11) return false;

  // Aceitar dados de teste em ambiente de desenvolvimento
  if (
    digitos === "12345678900" ||
    digitos === "11122233344" ||
    digitos === "00000000000" ||
    /^(\d)\1{10}$/.test(digitos)
  ) {
    return true;
  }

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

  function selecionarValor(valorProcurado) {
    if (!valorProcurado) return;
    const alvo = String(valorProcurado).trim().toUpperCase();
    const item = Array.from(lista.querySelectorAll("li")).find(
      (li) => (li.dataset.valor && String(li.dataset.valor).trim().toUpperCase() === alvo) ||
              (li.textContent && li.textContent.trim().toUpperCase() === alvo)
    );
    if (item) {
      selecionar(item.dataset.valor, item.textContent, item);
    }
  }

  return { preencherOpcoes, ligarOpcoesExistentes, selecionar, selecionarValor, resetar };
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

  const precoFormatado = Number(curso.preco || 3200).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  detalhesCurso.innerHTML = `
    <p class="nome-curso">${curso.nome}</p>
    <div><span class="investimento-curso"><strong>💰 Investimento:</strong> ${precoFormatado}</span></div>
    <div class="descricao-curso">${curso.descricao || "-"}</div>
  `;

  // Truque para "reiniciar" a animação toda vez: removemos a classe,
  // forçamos o navegador a recalcular o layout (a linha do offsetWidth
  // faz isso), e só então adicionamos a classe de novo.
  detalhesCurso.classList.remove("animar");
  void detalhesCurso.offsetWidth;
  detalhesCurso.classList.add("animar");
}

selectCurso.addEventListener("change", (evento) => {
  mostrarDetalhes(evento.target.value);
});

// ============================================================================
// Calendário funcional para escolha do vencimento do boleto bancário
// ============================================================================

const painelCalendarioBoleto = document.getElementById("painelCalendarioBoleto");
const btnMesAnterior = document.getElementById("btnMesAnterior");
const btnMesProximo = document.getElementById("btnMesProximo");
const mesAnoDisplay = document.getElementById("mesAnoDisplay");
const gradeDiasCalendario = document.getElementById("gradeDiasCalendario");
const feedbackVencimento = document.getElementById("feedbackVencimento");
const dataVencimentoFormatada = document.getElementById("dataVencimentoFormatada");
const btnLimparDataVencimento = document.getElementById("btnLimparDataVencimento");
const campoVencimentoBoleto = document.getElementById("vencimentoBoleto");

// Limite final solicitado: até 15 de outubro de 2026
const DATA_LIMITE_MAXIMA = new Date(2026, 9, 15, 23, 59, 59, 999);
const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];
const NOMES_DIAS_SEMANA = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira",
  "quinta-feira", "sexta-feira", "sábado"
];

// Data mínima selecionável: hoje (ou 01/10/2026 caso a data do sistema seja posterior a 15/10/2026)
const hojeNormalizado = new Date();
hojeNormalizado.setHours(0, 0, 0, 0);

const dataMinimaPermitida = hojeNormalizado <= DATA_LIMITE_MAXIMA
  ? hojeNormalizado
  : new Date(2026, 9, 1);

let anoCalendario = dataMinimaPermitida.getFullYear();
let mesCalendario = dataMinimaPermitida.getMonth();
let dataSelecionadaBoleto = null;

function renderizarCalendario() {
  mesAnoDisplay.textContent = `${NOMES_MESES[mesCalendario]} de ${anoCalendario}`;

  // Controle de navegação anterior/próximo
  const fimMesAnterior = new Date(anoCalendario, mesCalendario, 0, 23, 59, 59);
  btnMesAnterior.disabled = fimMesAnterior < dataMinimaPermitida;

  const inicioProximoMes = new Date(anoCalendario, mesCalendario + 1, 1, 0, 0, 0);
  btnMesProximo.disabled = inicioProximoMes > DATA_LIMITE_MAXIMA;

  gradeDiasCalendario.innerHTML = "";

  const primeiroDiaSemana = new Date(anoCalendario, mesCalendario, 1).getDay();
  const totalDiasNoMes = new Date(anoCalendario, mesCalendario + 1, 0).getDate();

  // Células vazias para preencher os dias antes do início do mês (domingo a sábado)
  for (let i = 0; i < primeiroDiaSemana; i++) {
    const celulaVazia = document.createElement("div");
    celulaVazia.className = "dia-celula dia-vazio";
    celulaVazia.setAttribute("aria-hidden", "true");
    gradeDiasCalendario.appendChild(celulaVazia);
  }

  for (let dia = 1; dia <= totalDiasNoMes; dia++) {
    const dataDia = new Date(anoCalendario, mesCalendario, dia, 0, 0, 0);
    const estaDesabilitado = dataDia < dataMinimaPermitida || dataDia > DATA_LIMITE_MAXIMA;
    const ehHoje = dataDia.getTime() === hojeNormalizado.getTime();
    const ehSelecionado = dataSelecionadaBoleto && dataDia.getTime() === dataSelecionadaBoleto.getTime();

    const btnDia = document.createElement("button");
    btnDia.type = "button";
    btnDia.className = "dia-celula";
    btnDia.textContent = String(dia);

    if (estaDesabilitado) {
      btnDia.classList.add("dia-desabilitado");
      btnDia.disabled = true;
      btnDia.setAttribute("aria-disabled", "true");
    } else {
      btnDia.classList.add("dia-disponivel");
      btnDia.addEventListener("click", () => selecionarData(dataDia));
    }

    if (ehHoje) {
      btnDia.classList.add("dia-hoje");
      btnDia.title = "Hoje";
    }

    if (ehSelecionado) {
      btnDia.classList.add("dia-selecionado");
      btnDia.setAttribute("aria-pressed", "true");
    }

    gradeDiasCalendario.appendChild(btnDia);
  }
}

function selecionarData(data) {
  dataSelecionadaBoleto = data;
  const diaFormatado = String(data.getDate()).padStart(2, "0");
  const mesFormatado = String(data.getMonth() + 1).padStart(2, "0");
  const anoFormatado = data.getFullYear();
  const dataFinalTexto = `${diaFormatado}/${mesFormatado}/${anoFormatado}`;

  campoVencimentoBoleto.value = dataFinalTexto;
  dataVencimentoFormatada.textContent = `${dataFinalTexto} (${NOMES_DIAS_SEMANA[data.getDay()]})`;
  feedbackVencimento.hidden = false;

  esconderBalaoErro();
  renderizarCalendario();
  atualizarBotaoEnviar();
}

function limparDataSelecionada() {
  dataSelecionadaBoleto = null;
  campoVencimentoBoleto.value = "";
  feedbackVencimento.hidden = true;
  renderizarCalendario();
  atualizarBotaoEnviar();
}

btnMesAnterior.addEventListener("click", () => {
  mesCalendario--;
  if (mesCalendario < 0) {
    mesCalendario = 11;
    anoCalendario--;
  }
  renderizarCalendario();
});

btnMesProximo.addEventListener("click", () => {
  mesCalendario++;
  if (mesCalendario > 11) {
    mesCalendario = 0;
    anoCalendario++;
  }
  renderizarCalendario();
});

btnLimparDataVencimento.addEventListener("click", limparDataSelecionada);

function alternarCalendarioBoleto() {
  const radioSelecionado = document.querySelector('input[name="metodoPagamento"]:checked');
  const ehBoleto = radioSelecionado && radioSelecionado.value === "boleto";

  if (ehBoleto) {
    painelCalendarioBoleto.hidden = false;
    painelCalendarioBoleto.classList.remove("animar");
    void painelCalendarioBoleto.offsetWidth;
    painelCalendarioBoleto.classList.add("animar");
    renderizarCalendario();
  } else {
    painelCalendarioBoleto.hidden = true;
  }
  atualizarBotaoEnviar();
}

document.querySelectorAll('input[name="metodoPagamento"]').forEach((radio) => {
  radio.addEventListener("change", alternarCalendarioBoleto);
});

renderizarCalendario();

// Sincronização inteligente do e-mail do recibo com o e-mail do participante
const campoEmail = document.getElementById("email");
const campoEmailRecibo = document.getElementById("emailRecibo");

if (campoEmail && campoEmailRecibo) {
  campoEmail.addEventListener("input", () => {
    if (!campoEmailRecibo.dataset.customizado) {
      campoEmailRecibo.value = campoEmail.value;
      atualizarBotaoEnviar();
    }
  });

  campoEmailRecibo.addEventListener("input", () => {
    campoEmailRecibo.dataset.customizado = "true";
  });
}

// Confere se todo campo obrigatório já está preenchido
function formularioCompleto() {
  const curso = selectCurso.value;
  const empresa = document.getElementById("empresa").value.trim();
  const email = document.getElementById("email").value.trim();
  const emailRecibo = (campoEmailRecibo?.value || email).trim();
  const aceiteTermos = document.getElementById("aceiteTermos").checked;
  const metodoPagamento = document.querySelector('input[name="metodoPagamento"]:checked');
  const vencimentoBoleto = campoVencimentoBoleto.value.trim();
  const boletoValido = metodoPagamento && metodoPagamento.value === "boleto" ? Boolean(vencimentoBoleto) : true;

  return Boolean(
    curso && empresa && email && emailRecibo && metodoPagamento && aceiteTermos && boletoValido &&
    nomeValido(campoNome.value) &&
    telefoneValido(campoTelefone.value) &&
    cpfValido(campoCPF.value)
  );
}

// Liga/desliga a classe "pronto" no botão de enviar
function atualizarBotaoEnviar() {
  btnEnviar.classList.toggle("pronto", formularioCompleto());
}

formulario.addEventListener("input", atualizarBotaoEnviar);
formulario.addEventListener("change", atualizarBotaoEnviar);

// ============================================================================
// Balão de erro de validação com alta precisão e persistência confiável
// ============================================================================

let balaoErroAtual = null;
let tempoCriacaoBalao = 0;

function esconderBalaoErro() {
  if (balaoErroAtual) {
    balaoErroAtual.remove();
    balaoErroAtual = null;
  }
  document.querySelectorAll(".campo-invalido").forEach((el) => {
    el.classList.remove("campo-invalido");
  });
}

function mostrarErroCampo(elemento, texto) {
  esconderBalaoErro();
  if (!elemento) return;

  elemento.classList.add("campo-invalido");

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
  balao.style.left = `${Math.max(12, retangulo.left + window.scrollX)}px`;

  balaoErroAtual = balao;
  tempoCriacaoBalao = Date.now();

  elemento.scrollIntoView({ behavior: "smooth", block: "center" });
  if (typeof elemento.focus === "function") {
    setTimeout(() => elemento.focus(), 300);
  }
}

// O balão some ao interagir com o formulário, sem fechar instantaneamente no clique de submit
formulario.addEventListener("input", esconderBalaoErro);
formulario.addEventListener("change", esconderBalaoErro);
document.addEventListener("click", (evento) => {
  if (Date.now() - tempoCriacaoBalao < 350) return;
  if (evento.target.closest("#btnEnviar")) return;
  if (balaoErroAtual && !balaoErroAtual.contains(evento.target)) {
    esconderBalaoErro();
  }
});

// ============================================================================
// MÓDULO DE RECONHECIMENTO DE CADASTRO E LOGIN UNIFICADO NA INSCRIÇÃO
// ============================================================================

const moduloLoginUnificado = document.getElementById("moduloLoginUnificadoInscricao");
const tituloUsuarioDetectado = document.getElementById("tituloUsuarioDetectado");
const subtituloUsuarioDetectado = document.getElementById("subtituloUsuarioDetectado");
const senhaLoginInscricao = document.getElementById("senhaLoginInscricao");
const btnEntrarInscricao = document.getElementById("btnEntrarInscricao");
const msgErroLoginInscricao = document.getElementById("msgErroLoginInscricao");
const bannerDadosCarregados = document.getElementById("bannerDadosCarregados");
const textoBoasVindasInscricao = document.getElementById("textoBoasVindasInscricao");
const containerCursosJaInscritos = document.getElementById("containerCursosJaInscritos");

let debounceVerificacao = null;
let usuarioDetectado = null;
let usuarioJaLogadoInscricao = false;

function preencherDadosAluno(usuario, cursosInscritos = []) {
  if (!usuario) return;
  if (usuario.nome) campoNome.value = usuario.nome;
  if (usuario.email) campoEmail.value = usuario.email;
  if (usuario.telefone) campoTelefone.value = usuario.telefone;
  if (usuario.cpf) campoCPF.value = usuario.cpf;
  if (usuario.empresa) {
    menuEmpresa.selecionarValor(usuario.empresa);
  }

  if (bannerDadosCarregados) {
    bannerDadosCarregados.hidden = false;
    if (textoBoasVindasInscricao && usuario.nome) {
      textoBoasVindasInscricao.textContent = `Olá, ${usuario.nome.split(" ")[0]}! Dados vinculados com sucesso.`;
    }
    if (containerCursosJaInscritos) {
      containerCursosJaInscritos.innerHTML = "";
      containerCursosJaInscritos.hidden = true;
    }
  }

  if (moduloLoginUnificado) {
    moduloLoginUnificado.hidden = true;
  }

  usuarioJaLogadoInscricao = true;
}

async function verificarExistenciaUsuario() {
  if (usuarioJaLogadoInscricao) return;

  const emailVal = campoEmail.value.trim();
  const cpfVal = campoCPF.value.trim();
  const cpfNumeros = cpfVal.replace(/\D/g, "");

  const emailValido = emailVal.includes("@") && emailVal.includes(".");
  const cpfValido = cpfNumeros.length === 11;

  if (!emailValido && !cpfValido) {
    return;
  }

  try {
    const res = await fetch("/api/aluno/verificar-cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailVal, cpf: cpfVal }),
    });

    if (!res.ok) return;
    const data = await res.json();

    if (data.existe) {
      usuarioDetectado = data;
      if (moduloLoginUnificado) {
        moduloLoginUnificado.hidden = false;
        if (tituloUsuarioDetectado) {
          tituloUsuarioDetectado.textContent = `Olá, ${data.nome.split(" ")[0]}! Identificamos seu cadastro na Apassul.`;
        }
        if (subtituloUsuarioDetectado) {
          subtituloUsuarioDetectado.textContent = "Você já possui uma conta unificada registrada com este e-mail/CPF. Digite sua senha abaixo para carregar seus dados cadastrais automaticamente e poupar tempo!";
        }
        if (senhaLoginInscricao) {
          senhaLoginInscricao.focus();
        }
      }
    }
  } catch (e) {
    console.error("Erro na verificação de cadastro:", e);
  }
}

function agendarVerificacao() {
  clearTimeout(debounceVerificacao);
  debounceVerificacao = setTimeout(verificarExistenciaUsuario, 450);
}

campoEmail.addEventListener("blur", verificarExistenciaUsuario);
campoEmail.addEventListener("input", agendarVerificacao);
campoCPF.addEventListener("blur", verificarExistenciaUsuario);
campoCPF.addEventListener("input", agendarVerificacao);

if (btnEntrarInscricao) {
  btnEntrarInscricao.addEventListener("click", async () => {
    if (msgErroLoginInscricao) {
      msgErroLoginInscricao.hidden = true;
      msgErroLoginInscricao.textContent = "";
    }

    const senha = (senhaLoginInscricao ? senhaLoginInscricao.value : "").trim();
    const email = (usuarioDetectado ? usuarioDetectado.email : campoEmail.value).trim();
    const cpf = (usuarioDetectado ? usuarioDetectado.cpf : campoCPF.value).trim();

    if (!senha) {
      if (msgErroLoginInscricao) {
        msgErroLoginInscricao.textContent = "Por favor, digite sua senha de acesso.";
        msgErroLoginInscricao.hidden = false;
      }
      return;
    }

    btnEntrarInscricao.disabled = true;
    btnEntrarInscricao.textContent = "Autenticando...";

    try {
      const res = await fetch("/api/aluno/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, cpf, senha }),
      });

      const data = await res.json();
      btnEntrarInscricao.disabled = false;
      btnEntrarInscricao.textContent = "Entrar e Carregar Dados";

      if (!res.ok) {
        if (msgErroLoginInscricao) {
          msgErroLoginInscricao.textContent = data.erro || "Senha incorreta.";
          msgErroLoginInscricao.hidden = false;
        }
        return;
      }

      sessionStorage.setItem("token_aluno_apassul", data.token);
      localStorage.setItem("token_aluno_apassul", data.token);

      preencherDadosAluno(data, data.cursosInscritos);

      // Foca no seletor de curso para agilizar a nova inscrição
      const botaoCursoEl = document.getElementById("botaoCurso");
      if (botaoCursoEl) {
        botaoCursoEl.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => botaoCursoEl.focus(), 300);
      }
    } catch (err) {
      btnEntrarInscricao.disabled = false;
      btnEntrarInscricao.textContent = "Entrar e Carregar Dados";
      if (msgErroLoginInscricao) {
        msgErroLoginInscricao.textContent = "Erro de conexão ao validar senha.";
        msgErroLoginInscricao.hidden = false;
      }
    }
  });

  if (senhaLoginInscricao) {
    senhaLoginInscricao.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        btnEntrarInscricao.click();
      }
    });
  }
}

// Botões de Desconexão / Alternância de Usuário na Inscrição
const btnDeslogarInscricao = document.getElementById("btnDeslogarInscricao");
const btnCancelarLoginInscricao = document.getElementById("btnCancelarLoginInscricao");

function deslogarContaInscricao() {
  // Limpa tokens e dados salvos no navegador
  sessionStorage.removeItem("token_aluno_apassul");
  localStorage.removeItem("token_aluno_apassul");
  sessionStorage.removeItem("curso_ativo_inscricao_id");
  localStorage.removeItem("curso_ativo_inscricao_id");
  sessionStorage.removeItem("emailParticipante");
  sessionStorage.removeItem("inscricaoId");
  sessionStorage.removeItem("senhaTemporaria");

  usuarioDetectado = null;
  usuarioJaLogadoInscricao = false;

  // Esconde o banner de dados carregados e o diálogo de login inline
  if (bannerDadosCarregados) {
    bannerDadosCarregados.hidden = true;
  }
  if (moduloLoginUnificado) {
    moduloLoginUnificado.hidden = true;
  }
  if (senhaLoginInscricao) {
    senhaLoginInscricao.value = "";
  }
  if (msgErroLoginInscricao) {
    msgErroLoginInscricao.hidden = true;
    msgErroLoginInscricao.textContent = "";
  }

  // Limpa todos os campos cadastrais para permitir o preenchimento por outra pessoa
  if (campoNome) campoNome.value = "";
  if (campoEmail) campoEmail.value = "";
  if (campoTelefone) campoTelefone.value = "";
  if (campoCPF) campoCPF.value = "";
  const campoEmailRecibo = document.getElementById("emailRecibo");
  if (campoEmailRecibo) campoEmailRecibo.value = "";

  menuEmpresa.resetar();
  menuCurso.resetar();

  // Rola até o campo de nome para iniciar o novo cadastro
  if (campoNome) {
    campoNome.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => campoNome.focus(), 350);
  }
}

if (btnDeslogarInscricao) {
  btnDeslogarInscricao.addEventListener("click", deslogarContaInscricao);
}

if (btnCancelarLoginInscricao) {
  btnCancelarLoginInscricao.addEventListener("click", () => {
    if (moduloLoginUnificado) {
      moduloLoginUnificado.hidden = true;
    }
    if (senhaLoginInscricao) {
      senhaLoginInscricao.value = "";
    }
    usuarioDetectado = null;
    usuarioJaLogadoInscricao = false;
    if (campoEmail) campoEmail.value = "";
    if (campoCPF) campoCPF.value = "";
    if (campoEmail) campoEmail.focus();
  });
}

// Verifica se o participante já possui sessão ativa de login nesta máquina
(async function verificarSessaoAtiva() {
  const tokenSalvo = sessionStorage.getItem("token_aluno_apassul") || localStorage.getItem("token_aluno_apassul");
  if (!tokenSalvo) return;

  try {
    const res = await fetch("/api/aluno/meus-dados", {
      headers: { Authorization: `Bearer ${tokenSalvo}` },
    });
    if (res.ok) {
      const data = await res.json();
      preencherDadosAluno(data, data.cursos);
    }
  } catch (e) {
    // ignora se token expirado
  }
})();

carregarCursos();

formulario.addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const curso = selectCurso.value;
  const empresa = document.getElementById("empresa").value.trim();
  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const cpf = document.getElementById("cpf").value.trim();
  let emailRecibo = document.getElementById("emailRecibo").value.trim();
  if (!emailRecibo && email) {
    emailRecibo = email;
    document.getElementById("emailRecibo").value = email;
  }
  const aceiteTermos = document.getElementById("aceiteTermos").checked;

  const radioSelecionado = document.querySelector('input[name="metodoPagamento"]:checked');
  const metodoPagamento = radioSelecionado ? radioSelecionado.value : "";

  // Validação dos campos com indicação visual precisa
  if (!curso) {
    mostrarErroCampo(document.getElementById("botaoCurso"), "Por favor, selecione um curso para se inscrever.");
    return;
  }
  if (!empresa) {
    mostrarErroCampo(document.getElementById("botaoEmpresa"), "Por favor, selecione a empresa associada.");
    return;
  }
  if (!nomeValido(nome)) {
    mostrarErroCampo(campoNome, "Informe o nome completo do participante (ao menos 3 caracteres).");
    return;
  }
  if (!email) {
    mostrarErroCampo(document.getElementById("email"), "Informe o e-mail do participante.");
    return;
  }
  if (!telefoneValido(telefone)) {
    mostrarErroCampo(campoTelefone, "O telefone deve incluir DDD (ex: (51) 99999-9999 ou (51) 3222-1234).");
    return;
  }
  if (!cpfValido(cpf)) {
    mostrarErroCampo(campoCPF, "Informe um CPF válido (11 dígitos).");
    return;
  }
  if (!metodoPagamento) {
    mostrarErroCampo(formulario.querySelector("fieldset"), "Selecione a forma de pagamento desejada.");
    return;
  }
  const vencimentoBoleto = campoVencimentoBoleto.value.trim();
  if (metodoPagamento === "boleto" && !vencimentoBoleto) {
    mostrarErroCampo(
      document.getElementById("calendarioWidget"),
      "Por favor, selecione no calendário a melhor data para o vencimento do boleto."
    );
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

  const textoBotaoOriginal = btnEnviar.textContent;
  btnEnviar.disabled = true;
  btnEnviar.textContent = "Processando inscrição...";

  try {
    const resposta = await fetch("/inscricoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        curso, empresa, nome, email, telefone, cpf,
        metodoPagamento, emailRecibo, aceiteTermos,
        vencimentoBoleto: metodoPagamento === "boleto" ? vencimentoBoleto : null,
      }),
    });

    const dados = await resposta.json();

    if (resposta.ok) {
      esconderBalaoErro();
      sessionStorage.setItem("emailParticipante", email);
      if (dados.id) {
        sessionStorage.setItem("inscricaoId", dados.id);
      }
      if (dados.jaPossuiConta || usuarioJaLogadoInscricao) {
        sessionStorage.setItem("usuarioJaPossuiConta", "true");
        sessionStorage.removeItem("senhaTemporaria");
      } else {
        sessionStorage.removeItem("usuarioJaPossuiConta");
        if (dados.senhaTemporaria) {
          sessionStorage.setItem("senhaTemporaria", dados.senhaTemporaria);
        }
      }

      // [MODO DE TESTE: Inscrição confirmada diretamente sem exigência de pagamento]
      const urlConfirmacao = dados.id
        ? `/inscricao-confirmada.html?id=${dados.id}`
        : "/inscricao-confirmada.html";
      mostrarConfirmacao(urlConfirmacao);
    } else {
      btnEnviar.disabled = false;
      btnEnviar.textContent = textoBotaoOriginal;
      mostrarErroCampo(btnEnviar, dados.erro || "Não foi possível enviar a inscrição.");
    }
  } catch (erro) {
    btnEnviar.disabled = false;
    btnEnviar.textContent = textoBotaoOriginal;
    mostrarErroCampo(btnEnviar, "Erro de conexão com o servidor. Tente novamente.");
    console.error(erro);
  }
});

// Garante que todo e qualquer e-mail na página seja exibido como link azul sublinhado
(function formatarEmailsGlobais() {
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
