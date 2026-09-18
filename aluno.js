document.addEventListener("DOMContentLoaded", () => {
  const secaoLogin = document.getElementById("secaoLogin");
  const secaoPainelAluno = document.getElementById("secaoPainelAluno");
  const modalTrocaSenha = document.getElementById("modalTrocaSenha");

  const formLoginAluno = document.getElementById("formLoginAluno");
  const inputEmailAluno = document.getElementById("inputEmailAluno");
  const inputSenhaAluno = document.getElementById("inputSenhaAluno");
  const btnEntrarAluno = document.getElementById("btnEntrarAluno");
  const msgErroLogin = document.getElementById("msgErroLogin");
  const msgSucessoLogin = document.getElementById("msgSucessoLogin");

  const formTrocaSenha = document.getElementById("formTrocaSenha");
  const inputNovaSenha = document.getElementById("inputNovaSenha");
  const inputConfirmaSenha = document.getElementById("inputConfirmaSenha");
  const btnSalvarNovaSenha = document.getElementById("btnSalvarNovaSenha");
  const btnCancelarTrocaSenha = document.getElementById("btnCancelarTrocaSenha");
  const msgErroModalSenha = document.getElementById("msgErroModalSenha");
  const msgSucessoModalSenha = document.getElementById("msgSucessoModalSenha");

  const btnAbrirTrocaSenha = document.getElementById("btnAbrirTrocaSenha");
  const btnImprimirComprovante = document.getElementById("btnImprimirComprovante");
  const btnSairAluno = document.getElementById("btnSairAluno");

  const saudacaoNomeAluno = document.getElementById("saudacaoNomeAluno");
  const tituloNomeCurso = document.getElementById("tituloNomeCurso");
  const descricaoCursoAluno = document.getElementById("descricaoCursoAluno");
  const dadoDataCurso = document.getElementById("dadoDataCurso");
  const dadoCargaHoraria = document.getElementById("dadoCargaHoraria");
  const dadoValorCurso = document.getElementById("dadoValorCurso");
  const dadoDataPagamento = document.getElementById("dadoDataPagamento");

  const dadoNomeParticipante = document.getElementById("dadoNomeParticipante");
  const dadoCpfParticipante = document.getElementById("dadoCpfParticipante");
  const dadoEmailParticipante = document.getElementById("dadoEmailParticipante");
  const dadoTelefoneParticipante = document.getElementById("dadoTelefoneParticipante");
  const dadoEmpresaParticipante = document.getElementById("dadoEmpresaParticipante");

  let tokenAtual = localStorage.getItem("token_aluno_apassul") || sessionStorage.getItem("token_aluno_apassul");
  let dadosAlunoCache = null;

  function formatarDataHora(iso) {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  }

  function mostrarErro(elemento, texto) {
    elemento.textContent = texto;
    elemento.hidden = false;
  }

  function ocultarMensagens() {
    msgErroLogin.hidden = true;
    msgSucessoLogin.hidden = true;
    msgErroModalSenha.hidden = true;
    msgSucessoModalSenha.hidden = true;
  }

  async function carregarPainel() {
    if (!tokenAtual) {
      secaoLogin.hidden = false;
      secaoPainelAluno.hidden = true;
      return;
    }

    try {
      const res = await fetch("/api/aluno/meus-dados", {
        headers: { Authorization: `Bearer ${tokenAtual}` },
      });

      if (!res.ok) {
        // Sessão inválida ou expirada
        tokenAtual = null;
        localStorage.removeItem("token_aluno_apassul");
        sessionStorage.removeItem("token_aluno_apassul");
        secaoLogin.hidden = false;
        secaoPainelAluno.hidden = true;
        return;
      }

      const dados = await res.json();
      dadosAlunoCache = dados;

      // Renderiza os dados no painel
      saudacaoNomeAluno.textContent = `Olá, ${dados.nome.split(" ")[0]}!`;
      tituloNomeCurso.textContent = dados.curso?.nome || "Treinamento Apassul";
      descricaoCursoAluno.innerHTML = dados.curso?.descricao || "Treinamento oficial credenciado Apassul.";
      dadoDataCurso.textContent = dados.curso?.data_evento || "A definir";
      dadoCargaHoraria.textContent = dados.curso?.carga_horaria || "Não especificada";
      dadoValorCurso.textContent = dados.curso?.preco ? `R$ ${Number(dados.curso.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "R$ 3.200,00";
      dadoDataPagamento.textContent = formatarDataHora(dados.data_pagamento);

      dadoNomeParticipante.textContent = dados.nome || "-";
      dadoCpfParticipante.textContent = dados.cpf || "-";
      dadoEmailParticipante.textContent = dados.email || "-";
      dadoTelefoneParticipante.textContent = dados.telefone || "-";
      dadoEmpresaParticipante.textContent = dados.empresa || "Pessoa Física / Não informada";

      secaoLogin.hidden = true;
      secaoPainelAluno.hidden = false;

      // Se for primeiro acesso e ainda precisa trocar de senha obrigatoriamente
      if (dados.troca_senha_obrigatoria) {
        abrirModalTrocaSenha(true);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do aluno:", err);
      secaoLogin.hidden = false;
      secaoPainelAluno.hidden = true;
    }
  }

  function abrirModalTrocaSenha(obrigatoria = false) {
    ocultarMensagens();
    inputNovaSenha.value = "";
    inputConfirmaSenha.value = "";
    btnCancelarTrocaSenha.hidden = obrigatoria;

    const titulo = document.getElementById("tituloModalSenha");
    const subtitulo = document.getElementById("subtituloModalSenha");

    if (obrigatoria) {
      titulo.textContent = "Primeiro Acesso: Cadastre sua Nova Senha";
      subtitulo.textContent = "Por motivos de segurança, substitua a senha temporária por uma nova senha pessoal definitiva de sua preferência.";
    } else {
      titulo.textContent = "Alterar Senha";
      subtitulo.textContent = "Digite sua nova senha para atualizar seu acesso à Área do Inscrito.";
    }

    modalTrocaSenha.hidden = false;
    inputNovaSenha.focus();
  }

  function fecharModalTrocaSenha() {
    modalTrocaSenha.hidden = true;
  }

  // Submit Login
  formLoginAluno.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarMensagens();

    const email = inputEmailAluno.value.trim();
    const senha = inputSenhaAluno.value.trim();

    if (!email || !senha) {
      mostrarErro(msgErroLogin, "Por favor, preencha o e-mail e a senha.");
      return;
    }

    btnEntrarAluno.disabled = true;
    btnEntrarAluno.textContent = "Verificando...";

    try {
      const res = await fetch("/api/aluno/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const resposta = await res.json();

      if (!res.ok) {
        mostrarErro(msgErroLogin, resposta.erro || "Não foi possível realizar o login.");
        btnEntrarAluno.disabled = false;
        btnEntrarAluno.textContent = "Entrar na Área do Inscrito";
        return;
      }

      tokenAtual = resposta.token;
      sessionStorage.setItem("token_aluno_apassul", tokenAtual);
      localStorage.setItem("token_aluno_apassul", tokenAtual);

      btnEntrarAluno.disabled = false;
      btnEntrarAluno.textContent = "Entrar na Área do Inscrito";

      await carregarPainel();

      if (resposta.trocaSenhaObrigatoria) {
        abrirModalTrocaSenha(true);
      }
    } catch (erro) {
      mostrarErro(msgErroLogin, "Erro ao conectar com o servidor. Tente novamente.");
      btnEntrarAluno.disabled = false;
      btnEntrarAluno.textContent = "Entrar na Área do Inscrito";
    }
  });

  // Submit Troca de Senha
  formTrocaSenha.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarMensagens();

    const novaSenha = inputNovaSenha.value;
    const confirmacaoSenha = inputConfirmaSenha.value;

    if (!novaSenha || novaSenha.length < 6) {
      mostrarErro(msgErroModalSenha, "A nova senha deve possuir pelo menos 6 dígitos.");
      return;
    }

    if (novaSenha !== confirmacaoSenha) {
      mostrarErro(msgErroModalSenha, "As senhas informadas não conferem. Digite novamente.");
      return;
    }

    btnSalvarNovaSenha.disabled = true;
    btnSalvarNovaSenha.textContent = "Salvando...";

    try {
      const res = await fetch("/api/aluno/trocar-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAtual}`,
        },
        body: JSON.stringify({ novaSenha, confirmacaoSenha }),
      });

      const resposta = await res.json();

      if (!res.ok) {
        mostrarErro(msgErroModalSenha, resposta.erro || "Erro ao atualizar a senha.");
        btnSalvarNovaSenha.disabled = false;
        btnSalvarNovaSenha.textContent = "Salvar e Continuar";
        return;
      }

      msgSucessoModalSenha.textContent = "Senha alterada com sucesso!";
      msgSucessoModalSenha.hidden = false;

      setTimeout(() => {
        fecharModalTrocaSenha();
        btnSalvarNovaSenha.disabled = false;
        btnSalvarNovaSenha.textContent = "Salvar e Continuar";
        carregarPainel();
      }, 1000);
    } catch (err) {
      mostrarErro(msgErroModalSenha, "Erro de comunicação ao salvar a nova senha.");
      btnSalvarNovaSenha.disabled = false;
      btnSalvarNovaSenha.textContent = "Salvar e Continuar";
    }
  });

  btnCancelarTrocaSenha.addEventListener("click", fecharModalTrocaSenha);
  btnAbrirTrocaSenha.addEventListener("click", () => abrirModalTrocaSenha(false));

  // Imprimir Comprovante
  btnImprimirComprovante.addEventListener("click", () => {
    window.print();
  });

  // Logout
  btnSairAluno.addEventListener("click", async () => {
    if (tokenAtual) {
      try {
        await fetch("/api/aluno/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${tokenAtual}` },
        });
      } catch (e) {
        // ignora
      }
    }
    tokenAtual = null;
    localStorage.removeItem("token_aluno_apassul");
    sessionStorage.removeItem("token_aluno_apassul");
    secaoPainelAluno.hidden = true;
    secaoLogin.hidden = false;
    inputSenhaAluno.value = "";
  });

  // Inicializa
  carregarPainel();
});
