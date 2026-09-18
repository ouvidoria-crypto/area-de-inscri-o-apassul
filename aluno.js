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
  const dadoStatusInscricao = document.getElementById("dadoStatusInscricao");
  const dadoStatusPagamentoTexto = document.getElementById("dadoStatusPagamentoTexto");

  const badgeMatriculaConfirmada = document.getElementById("badgeMatriculaConfirmada");
  const badgeAcessoCurso = document.getElementById("badgeAcessoCurso");
  const blocoCursoPendente = document.getElementById("blocoCursoPendente");
  const blocoCursoLiberado = document.getElementById("blocoCursoLiberado");
  const btnIrMPPainel = document.getElementById("btnIrMPPainel");
  const btnSimularPago = document.getElementById("btnSimularPago");
  const btnSimularPendente = document.getElementById("btnSimularPendente");
  const textoStatusAtualTeste = document.getElementById("textoStatusAtualTeste");

  const dadoNomeParticipante = document.getElementById("dadoNomeParticipante");
  const dadoCpfParticipante = document.getElementById("dadoCpfParticipante");
  const dadoEmailParticipante = document.getElementById("dadoEmailParticipante");
  const dadoTelefoneParticipante = document.getElementById("dadoTelefoneParticipante");
  const dadoEmpresaParticipante = document.getElementById("dadoEmpresaParticipante");
  const bannerSenhaProvisoria = document.getElementById("bannerSenhaProvisoria");
  const btnCadastrarSenhaDefinitivaBanner = document.getElementById("btnCadastrarSenhaDefinitivaBanner");
  const btnFecharModalX = document.getElementById("btnFecharModalX");
  const btnVoltarLoginModal = document.getElementById("btnVoltarLoginModal");

  // Sessão ativa: usa apenas sessionStorage para que novas abas sempre peçam login primeiro
  let tokenAtual = sessionStorage.getItem("token_aluno_apassul");
  // Limpa resíduos anteriores de localStorage para garantir que a tela de login apareça primeiro
  localStorage.removeItem("token_aluno_apassul");
  let dadosAlunoCache = null;

  // Garante que o modal de troca de senha esteja fechado ao iniciar a página
  if (modalTrocaSenha) {
    modalTrocaSenha.hidden = true;
  }

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

  function irParaLogin(mensagemErro = "") {
    if (modalTrocaSenha) modalTrocaSenha.hidden = true;
    tokenAtual = null;
    sessionStorage.removeItem("token_aluno_apassul");
    localStorage.removeItem("token_aluno_apassul");
    secaoPainelAluno.hidden = true;
    secaoLogin.hidden = false;
    ocultarMensagens();
    if (mensagemErro) {
      mostrarErro(msgErroLogin, mensagemErro);
    }
    if (inputSenhaAluno) inputSenhaAluno.value = "";
    if (inputEmailAluno) inputEmailAluno.focus();
  }

  async function carregarPainel() {
    if (modalTrocaSenha) modalTrocaSenha.hidden = true;

    if (!tokenAtual) {
      irParaLogin();
      return;
    }

    try {
      const res = await fetch("/api/aluno/meus-dados", {
        headers: { Authorization: `Bearer ${tokenAtual}` },
      });

      if (!res.ok) {
        // Sessão inválida ou expirada
        irParaLogin();
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

      const isPago = dados.status_pagamento === "pago";

      // Status da Inscrição (SEMPRE CONFIRMADA)
      if (dadoStatusInscricao) {
        dadoStatusInscricao.textContent = "Confirmada no Sistema";
        dadoStatusInscricao.style.color = "#2e6b3e";
      }

      // Status do Pagamento
      if (dadoStatusPagamentoTexto) {
        if (isPago) {
          dadoStatusPagamentoTexto.textContent = `Pago e Compensado (${formatarDataHora(dados.data_pagamento)})`;
          dadoStatusPagamentoTexto.style.color = "#166534";
        } else {
          dadoStatusPagamentoTexto.textContent = "Aguardando Compensação Bancária";
          dadoStatusPagamentoTexto.style.color = "#b45309";
        }
      }

      if (badgeMatriculaConfirmada) {
        badgeMatriculaConfirmada.textContent = "✓ Inscrição Confirmada";
      }

      // Configura a ÁREA DO CURSO dependendo se está Pago ou Pendente
      if (isPago) {
        blocoCursoLiberado.hidden = false;
        blocoCursoPendente.hidden = true;
        badgeAcessoCurso.textContent = "✓ Acesso Liberado";
        badgeAcessoCurso.className = "badge-confirmado";
        if (textoStatusAtualTeste) {
          textoStatusAtualTeste.innerHTML = `<span style="color: #166534; font-weight: 700;">Status Atual: PAGO</span> (Área do Curso 100% liberada com links e materiais)`;
        }
      } else {
        blocoCursoLiberado.hidden = true;
        blocoCursoPendente.hidden = false;
        badgeAcessoCurso.textContent = "🔒 Aguardando Pagamento";
        badgeAcessoCurso.className = "badge-pendente";

        if (dados.mp_init_point && btnIrMPPainel) {
          btnIrMPPainel.href = dados.mp_init_point;
          btnIrMPPainel.hidden = false;
        } else if (btnIrMPPainel) {
          btnIrMPPainel.href = "/";
        }

        if (textoStatusAtualTeste) {
          textoStatusAtualTeste.innerHTML = `<span style="color: #b45309; font-weight: 700;">Status Atual: PENDENTE</span> (Inscrição confirmada, mas Área do Curso travada)`;
        }
      }

      dadoNomeParticipante.textContent = dados.nome || "-";
      dadoCpfParticipante.textContent = dados.cpf || "-";
      dadoEmailParticipante.textContent = dados.email || "-";
      dadoTelefoneParticipante.textContent = dados.telefone || "-";
      dadoEmpresaParticipante.textContent = dados.empresa || "Pessoa Física / Não informada";

      secaoLogin.hidden = true;
      secaoPainelAluno.hidden = false;

      // Se for primeiro acesso com senha provisória, exibe o aviso em destaque no painel
      if (bannerSenhaProvisoria) {
        bannerSenhaProvisoria.hidden = !dados.troca_senha_obrigatoria;
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
    // O botão Cancelar fica sempre disponível para nunca bloquear a tela do usuário
    btnCancelarTrocaSenha.hidden = false;

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
        btnSalvarNovaSenha.disabled = false;
        btnSalvarNovaSenha.textContent = "Salvar e Continuar";

        // Se a sessão expirou ou é inválida, fecha o modal e volta imediatamente para a tela de login
        if (res.status === 401) {
          irParaLogin("Sua sessão expirou ou é inválida. Por favor, faça login com seu e-mail e senha provisória.");
          return;
        }

        mostrarErro(msgErroModalSenha, resposta.erro || "Erro ao atualizar a senha.");
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

  btnCancelarTrocaSenha.addEventListener("click", () => {
    fecharModalTrocaSenha();
    // Se o aluno ainda não estava no painel, retorna para a tela de login
    if (secaoPainelAluno.hidden) {
      irParaLogin();
    }
  });

  if (btnFecharModalX) {
    btnFecharModalX.addEventListener("click", () => {
      fecharModalTrocaSenha();
      if (secaoPainelAluno.hidden) {
        irParaLogin();
      }
    });
  }

  if (btnVoltarLoginModal) {
    btnVoltarLoginModal.addEventListener("click", () => {
      irParaLogin();
    });
  }

  btnAbrirTrocaSenha.addEventListener("click", () => abrirModalTrocaSenha(false));
  if (btnCadastrarSenhaDefinitivaBanner) {
    btnCadastrarSenhaDefinitivaBanner.addEventListener("click", () => abrirModalTrocaSenha(true));
  }

  // Imprimir Comprovante
  btnImprimirComprovante.addEventListener("click", () => {
    window.print();
  });

  // Botões de teste rápido (Simular Pago / Simular Pendente)
  async function alternarStatusTeste(novoStatus) {
    if (!tokenAtual) return;
    try {
      const res = await fetch("/api/aluno/simular-pagamento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAtual}`,
        },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (res.ok) {
        await carregarPainel();
      }
    } catch (e) {
      console.error("Erro ao simular status:", e);
    }
  }

  if (btnSimularPago) {
    btnSimularPago.addEventListener("click", () => alternarStatusTeste("pago"));
  }
  if (btnSimularPendente) {
    btnSimularPendente.addEventListener("click", () => alternarStatusTeste("pendente"));
  }

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
