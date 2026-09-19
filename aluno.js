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

  // Módulos: Status da Inscrição e Dados Cadastrais
  const modalStatusInscricao = document.getElementById("modalStatusInscricao");
  const modalDadosCadastrais = document.getElementById("modalDadosCadastrais");
  const btnFecharModalStatusX = document.getElementById("btnFecharModalStatusX");
  const btnFecharModalStatus = document.getElementById("btnFecharModalStatus");
  const btnFecharModalDadosX = document.getElementById("btnFecharModalDadosX");
  const btnFecharModalDados = document.getElementById("btnFecharModalDados");
  const statusTreinamentoTexto = document.getElementById("statusTreinamentoTexto");
  const statusAcessoAulasTexto = document.getElementById("statusAcessoAulasTexto");

  // Módulo: Certificados de Conclusão
  const modalCertificados = document.getElementById("modalCertificados");
  const blocoCertificadoDisponivel = document.getElementById("blocoCertificadoDisponivel");
  const blocoCertificadoPendente = document.getElementById("blocoCertificadoPendente");
  const certNomeAluno = document.getElementById("certNomeAluno");
  const certCpfAluno = document.getElementById("certCpfAluno");
  const certNomeCurso = document.getElementById("certNomeCurso");
  const certCargaHoraria = document.getElementById("certCargaHoraria");
  const certDataCurso = document.getElementById("certDataCurso");
  const certCodigoAutenticidade = document.getElementById("certCodigoAutenticidade");
  const btnCopiarCodigoCertificado = document.getElementById("btnCopiarCodigoCertificado");
  const btnImprimirCertificado = document.getElementById("btnImprimirCertificado");
  const btnBaixarPDFCertificado = document.getElementById("btnBaixarPDFCertificado");
  const btnFecharModalCertificadosX = document.getElementById("btnFecharModalCertificadosX");
  const btnFecharModalCertificados = document.getElementById("btnFecharModalCertificados");
  const btnFecharModalCertificadosPendente = document.getElementById("btnFecharModalCertificadosPendente");
  const btnSidebarCertificados = document.getElementById("btnSidebarCertificados");

  // Sessão ativa: usa apenas sessionStorage para que novas abas sempre peçam login primeiro
  let tokenAtual = sessionStorage.getItem("token_aluno_apassul");
  // Limpa resíduos anteriores de localStorage para garantir que a tela de login apareça primeiro
  localStorage.removeItem("token_aluno_apassul");
  let dadosAlunoCache = null;

  // Garante que o modal de troca de senha esteja fechado ao iniciar a página
  if (modalTrocaSenha) {
    modalTrocaSenha.hidden = true;
    modalTrocaSenha.style.display = "none";
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

  function configurarEstadoLogado() {
    document.body.classList.remove("usuario-deslogado");
    document.body.classList.add("usuario-logado");
    if (sidebarYoutube) {
      sidebarYoutube.hidden = false;
      // A barra lateral inicia SEMPRE fechada (mantém apenas os ícones)
      sidebarYoutube.classList.add("recolhida");
      sidebarYoutube.classList.remove("aberta-mobile");
      if (conteudoPrincipalApp) {
        conteudoPrincipalApp.classList.add("expandido");
      }
    }
    if (btnToggleSidebar) {
      btnToggleSidebar.hidden = false;
      btnToggleSidebar.setAttribute("aria-expanded", "false");
    }
    if (overlaySidebarBackdrop) {
      overlaySidebarBackdrop.classList.remove("visivel");
    }
  }

  function configurarEstadoDeslogado() {
    document.body.classList.remove("usuario-logado");
    document.body.classList.add("usuario-deslogado");
    if (sidebarYoutube) {
      sidebarYoutube.hidden = true;
      sidebarYoutube.classList.remove("aberta-mobile");
      sidebarYoutube.classList.add("recolhida");
    }
    if (conteudoPrincipalApp) {
      conteudoPrincipalApp.classList.remove("expandido");
    }
    if (btnToggleSidebar) {
      btnToggleSidebar.hidden = true;
      btnToggleSidebar.setAttribute("aria-expanded", "false");
    }
    if (overlaySidebarBackdrop) {
      overlaySidebarBackdrop.classList.remove("visivel");
    }
  }

  function irParaLogin(mensagemErro = "") {
    if (modalTrocaSenha) {
      modalTrocaSenha.hidden = true;
      modalTrocaSenha.style.display = "none";
    }
    tokenAtual = null;
    sessionStorage.removeItem("token_aluno_apassul");
    localStorage.removeItem("token_aluno_apassul");
    secaoPainelAluno.hidden = true;
    secaoLogin.hidden = false;
    configurarEstadoDeslogado();
    ocultarMensagens();
    if (mensagemErro) {
      mostrarErro(msgErroLogin, mensagemErro);
    }
    if (inputSenhaAluno) inputSenhaAluno.value = "";
    if (inputEmailAluno) inputEmailAluno.focus();
  }

  async function carregarPainel() {
    if (modalTrocaSenha) {
      modalTrocaSenha.hidden = true;
      modalTrocaSenha.style.display = "none";
    }

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
      const avatarAlunoTopo = document.getElementById("avatarAlunoTopo");
      if (avatarAlunoTopo) {
        const primeiroNome = dados.nome.trim();
        avatarAlunoTopo.textContent = primeiroNome ? primeiroNome.charAt(0).toUpperCase() : "🎓";
      }
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

      if (statusTreinamentoTexto) {
        statusTreinamentoTexto.textContent = dados.curso?.nome || "Treinamento Apassul";
      }

      if (statusAcessoAulasTexto) {
        statusAcessoAulasTexto.textContent = isPago ? "✓ Liberado (Sala ao vivo ativa)" : "🔒 Bloqueado (Aguardando compensação)";
        statusAcessoAulasTexto.style.color = isPago ? "#2e6b3e" : "#b45309";
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
      if (dados.email) {
        dadoEmailParticipante.innerHTML = `<a href="mailto:${dados.email}" class="link-email">${dados.email}</a>`;
      } else {
        dadoEmailParticipante.textContent = "-";
      }
      dadoTelefoneParticipante.textContent = dados.telefone || "-";
      dadoEmpresaParticipante.textContent = dados.empresa || "Pessoa Física / Não informada";

      secaoLogin.hidden = true;
      secaoPainelAluno.hidden = false;
      configurarEstadoLogado();

      // Atualiza os dados do módulo de certificado
      renderizarCertificado(dados);

      // Se for primeiro acesso com senha provisória, exibe o aviso em destaque no painel
      if (bannerSenhaProvisoria) {
        bannerSenhaProvisoria.hidden = !dados.troca_senha_obrigatoria;
      }
    } catch (err) {
      console.error("Erro ao carregar dados do aluno:", err);
      secaoLogin.hidden = false;
      secaoPainelAluno.hidden = true;
      configurarEstadoDeslogado();
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
    modalTrocaSenha.style.display = "flex";
    inputNovaSenha.focus();
  }

  function fecharModalTrocaSenha() {
    if (modalTrocaSenha) {
      modalTrocaSenha.hidden = true;
      modalTrocaSenha.style.display = "none";
    }
  }

  function abrirModalStatusInscricao() {
    if (modalStatusInscricao) {
      modalStatusInscricao.hidden = false;
      modalStatusInscricao.style.display = "flex";
    }
  }

  function fecharModalStatusInscricao() {
    if (modalStatusInscricao) {
      modalStatusInscricao.hidden = true;
      modalStatusInscricao.style.display = "none";
    }
  }

  function abrirModalDadosCadastrais() {
    if (modalDadosCadastrais) {
      modalDadosCadastrais.hidden = false;
      modalDadosCadastrais.style.display = "flex";
    }
  }

  function fecharModalDadosCadastrais() {
    if (modalDadosCadastrais) {
      modalDadosCadastrais.hidden = true;
      modalDadosCadastrais.style.display = "none";
    }
  }

  function renderizarCertificado(dados) {
    if (!dados) return;
    const isPago = dados.status_pagamento === "pago";

    if (isPago) {
      if (blocoCertificadoDisponivel) {
        blocoCertificadoDisponivel.hidden = false;
        blocoCertificadoDisponivel.style.display = "block";
      }
      if (blocoCertificadoPendente) {
        blocoCertificadoPendente.hidden = true;
        blocoCertificadoPendente.style.display = "none";
      }

      if (certNomeAluno) certNomeAluno.textContent = (dados.nome || "Participante").trim();
      if (certCpfAluno) certCpfAluno.textContent = dados.cpf || "000.000.000-00";
      if (certNomeCurso) certNomeCurso.textContent = dados.curso?.nome || "Treinamento Apassul";
      if (certCargaHoraria) certCargaHoraria.textContent = dados.curso?.carga_horaria || "Carga horária oficial";
      if (certDataCurso) certDataCurso.textContent = dados.curso?.data_evento || "Edição Oficial 2026";

      const idSufixo = dados.id ? String(dados.id).slice(0, 4).toUpperCase() : "2026";
      const cpfSufixo = dados.cpf ? String(dados.cpf).replace(/\D/g, "").slice(-4) : "0000";
      if (certCodigoAutenticidade) {
        certCodigoAutenticidade.textContent = `APS-2026-${idSufixo}-${cpfSufixo}`;
      }
    } else {
      if (blocoCertificadoDisponivel) {
        blocoCertificadoDisponivel.hidden = true;
        blocoCertificadoDisponivel.style.display = "none";
      }
      if (blocoCertificadoPendente) {
        blocoCertificadoPendente.hidden = false;
        blocoCertificadoPendente.style.display = "block";
      }
    }
  }

  async function abrirModalCertificados() {
    if (!dadosAlunoCache && tokenAtual) {
      try {
        await carregarPainel();
      } catch (e) {
        console.error("Erro ao carregar dados para o certificado:", e);
      }
    }
    if (dadosAlunoCache) {
      renderizarCertificado(dadosAlunoCache);
    }
    if (modalCertificados) {
      modalCertificados.hidden = false;
      modalCertificados.style.display = "flex";
    }
  }

  function fecharModalCertificados() {
    if (modalCertificados) {
      modalCertificados.hidden = true;
      modalCertificados.style.display = "none";
    }
  }

  window.abrirModuloStatusInscricao = abrirModalStatusInscricao;
  window.fecharModalStatusInscricao = fecharModalStatusInscricao;
  window.abrirModuloDadosCadastrais = abrirModalDadosCadastrais;
  window.fecharModalDadosCadastrais = fecharModalDadosCadastrais;
  window.abrirModuloCertificados = abrirModalCertificados;
  window.fecharModuloCertificados = fecharModalCertificados;

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
      fecharModalTrocaSenha();
      irParaLogin();
    });
  }

  // Fechar ao clicar no fundo escuro (fora da caixinha do modal)
  if (modalTrocaSenha) {
    modalTrocaSenha.addEventListener("click", (e) => {
      if (e.target === modalTrocaSenha) {
        fecharModalTrocaSenha();
        if (secaoPainelAluno.hidden) {
          irParaLogin();
        }
      }
    });
  }

  if (modalStatusInscricao) {
    modalStatusInscricao.addEventListener("click", (e) => {
      if (e.target === modalStatusInscricao) {
        fecharModalStatusInscricao();
      }
    });
  }

  if (modalDadosCadastrais) {
    modalDadosCadastrais.addEventListener("click", (e) => {
      if (e.target === modalDadosCadastrais) {
        fecharModalDadosCadastrais();
      }
    });
  }

  if (modalCertificados) {
    modalCertificados.addEventListener("click", (e) => {
      if (e.target === modalCertificados) {
        fecharModalCertificados();
      }
    });
  }

  if (btnFecharModalStatusX) btnFecharModalStatusX.addEventListener("click", fecharModalStatusInscricao);
  if (btnFecharModalStatus) btnFecharModalStatus.addEventListener("click", fecharModalStatusInscricao);
  if (btnFecharModalDadosX) btnFecharModalDadosX.addEventListener("click", fecharModalDadosCadastrais);
  if (btnFecharModalDados) btnFecharModalDados.addEventListener("click", fecharModalDadosCadastrais);
  if (btnFecharModalCertificadosX) btnFecharModalCertificadosX.addEventListener("click", fecharModalCertificados);
  if (btnFecharModalCertificados) btnFecharModalCertificados.addEventListener("click", fecharModalCertificados);
  if (btnFecharModalCertificadosPendente) btnFecharModalCertificadosPendente.addEventListener("click", fecharModalCertificados);

  // Fechar ao apertar a tecla ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modalTrocaSenha && !modalTrocaSenha.hidden && modalTrocaSenha.style.display !== "none") {
        fecharModalTrocaSenha();
        if (secaoPainelAluno.hidden) {
          irParaLogin();
        }
      }
      if (modalStatusInscricao && !modalStatusInscricao.hidden && modalStatusInscricao.style.display !== "none") {
        fecharModalStatusInscricao();
      }
      if (modalDadosCadastrais && !modalDadosCadastrais.hidden && modalDadosCadastrais.style.display !== "none") {
        fecharModalDadosCadastrais();
      }
      if (modalCertificados && !modalCertificados.hidden && modalCertificados.style.display !== "none") {
        fecharModalCertificados();
      }
    }
  });

  if (btnSidebarCertificados) {
    btnSidebarCertificados.addEventListener("click", abrirModalCertificados);
  }

  if (btnCopiarCodigoCertificado) {
    btnCopiarCodigoCertificado.addEventListener("click", () => {
      const cod = certCodigoAutenticidade ? certCodigoAutenticidade.textContent.trim() : "";
      if (cod) {
        navigator.clipboard.writeText(cod).then(() => {
          const textoOriginal = btnCopiarCodigoCertificado.innerHTML;
          btnCopiarCodigoCertificado.innerHTML = "✓ Código Copiado!";
          setTimeout(() => {
            btnCopiarCodigoCertificado.innerHTML = textoOriginal;
          }, 2000);
        }).catch(() => {
          // Fallback se clipboard api falhar
        });
      }
    });
  }

  async function baixarCertificadoPDF() {
    const docElemento = document.getElementById("documentoCertificado");
    if (!docElemento) return;

    if (dadosAlunoCache) {
      renderizarCertificado(dadosAlunoCache);
    }

    const btn = btnBaixarPDFCertificado;
    const txtOriginal = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "⏳ Gerando PDF Oficial A4...";
    }

    const nomeRaw = (certNomeAluno?.textContent || "Participante").trim();
    const nomeLimpo = nomeRaw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_");

    const nomeArquivo = `Certificado_Apassul_${nomeLimpo || "Aluno"}.pdf`;

    if (window.html2pdf) {
      // Medidas Oficiais de Certificado A4 Horizontal:
      // Formato A4 Paisagem (297mm x 210mm) com margem uniforme de 10mm (1cm)
      // Enquadramento simétrico perfeito garantindo que todo o conteúdo e as bordas caibam em 1 única folha
      const opt = {
        margin: [10, 10, 10, 10],
        filename: nomeArquivo,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
      };

      try {
        await window.html2pdf().set(opt).from(docElemento).save();
        if (btn) {
          btn.innerHTML = "✓ Download Concluído!";
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = txtOriginal;
          }, 2500);
        }
        return;
      } catch (err) {
        console.error("Erro ao gerar PDF via html2pdf:", err);
      }
    }

    // Fallback caso html2pdf não execute no ambiente
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = txtOriginal;
    }
    executarImpressaoCertificado();
  }

  function executarImpressaoCertificado() {
    if (dadosAlunoCache) {
      renderizarCertificado(dadosAlunoCache);
    }

    if (modalCertificados) {
      modalCertificados.hidden = false;
      modalCertificados.style.display = "block";
    }
    if (blocoCertificadoDisponivel) {
      blocoCertificadoDisponivel.hidden = false;
      blocoCertificadoDisponivel.style.display = "block";
    }

    document.body.classList.add("imprimindo-somente-certificado");

    const limparModoImpressao = () => {
      document.body.classList.remove("imprimindo-somente-certificado");
      window.removeEventListener("afterprint", limparModoImpressao);
    };

    window.addEventListener("afterprint", limparModoImpressao, { once: true });

    // Pequeno atraso para garantir que a estilização de impressão seja aplicada
    setTimeout(() => {
      window.print();
      setTimeout(limparModoImpressao, 2500);
    }, 150);
  }

  if (btnBaixarPDFCertificado) {
    btnBaixarPDFCertificado.addEventListener("click", baixarCertificadoPDF);
  }

  if (btnImprimirCertificado) {
    btnImprimirCertificado.addEventListener("click", executarImpressaoCertificado);
  }

  if (btnAbrirTrocaSenha) {
    btnAbrirTrocaSenha.addEventListener("click", () => abrirModalTrocaSenha(false));
  }
  const btnSidebarTrocarSenha = document.getElementById("btnSidebarTrocarSenha");
  if (btnSidebarTrocarSenha) {
    btnSidebarTrocarSenha.addEventListener("click", () => abrirModalTrocaSenha(false));
  }

  if (btnCadastrarSenhaDefinitivaBanner) {
    btnCadastrarSenhaDefinitivaBanner.addEventListener("click", () => abrirModalTrocaSenha(true));
  }

  // Imprimir Comprovante
  if (btnImprimirComprovante) {
    btnImprimirComprovante.addEventListener("click", () => {
      window.print();
    });
  }
  const btnSidebarComprovante = document.getElementById("btnSidebarComprovante");
  if (btnSidebarComprovante) {
    btnSidebarComprovante.addEventListener("click", () => {
      window.print();
    });
  }

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
  async function fazerLogout() {
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
    fecharModalStatusInscricao();
    fecharModalDadosCadastrais();
    fecharModalCertificados();
    fecharModalTrocaSenha();
    configurarEstadoDeslogado();
  }

  if (btnSairAluno) {
    btnSairAluno.addEventListener("click", fazerLogout);
  }
  const btnSidebarSair = document.getElementById("btnSidebarSair");
  if (btnSidebarSair) {
    btnSidebarSair.addEventListener("click", fazerLogout);
  }

  window.fazerLogout = fazerLogout;
  window.abrirModalTrocaSenha = abrirModalTrocaSenha;

  // ==========================================================
  // CONTROLE DA BARRA LATERAL ESTILO YOUTUBE (3 BARRINHAS)
  // E DA LINHA HORIZONTAL CONGELADA
  // ==========================================================
  const btnToggleSidebar = document.getElementById("btnToggleSidebar");
  const sidebarYoutube = document.getElementById("sidebarYoutube");
  const conteudoPrincipalApp = document.getElementById("conteudoPrincipalApp");
  const overlaySidebarBackdrop = document.getElementById("overlaySidebarBackdrop");
  const topbarCongelada = document.getElementById("topbarCongelada");

  function alternarSidebar() {
    const isMobile = window.innerWidth <= 900;
    if (isMobile) {
      const aberta = sidebarYoutube.classList.toggle("aberta-mobile");
      overlaySidebarBackdrop.classList.toggle("visivel", aberta);
      if (btnToggleSidebar) {
        btnToggleSidebar.setAttribute("aria-expanded", String(aberta));
      }
    } else {
      const recolhida = sidebarYoutube.classList.toggle("recolhida");
      conteudoPrincipalApp.classList.toggle("expandido", recolhida);
      if (btnToggleSidebar) {
        btnToggleSidebar.setAttribute("aria-expanded", String(!recolhida));
      }
    }
  }

  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener("click", alternarSidebar);
  }

  if (overlaySidebarBackdrop) {
    overlaySidebarBackdrop.addEventListener("click", () => {
      sidebarYoutube.classList.remove("aberta-mobile");
      overlaySidebarBackdrop.classList.remove("visivel");
    });
  }

  // Linha horizontal congelada com sombra adaptativa ao rolar
  window.addEventListener("scroll", () => {
    if (topbarCongelada) {
      topbarCongelada.classList.toggle("comprimida", window.scrollY > 10);
    }
  }, { passive: true });

  // Função global para navegar suavemente entre os cards pelo menu lateral
  window.navegarParaSecao = function(idAlvo) {
    if (window.innerWidth <= 900) {
      sidebarYoutube.classList.remove("aberta-mobile");
      overlaySidebarBackdrop.classList.remove("visivel");
    }

    if (idAlvo === "cardDadosParticipante" || idAlvo === "modalDadosCadastrais") {
      abrirModalDadosCadastrais();
      return;
    }

    if (idAlvo === "cardStatusInscricao" || idAlvo === "modalStatusInscricao") {
      abrirModalStatusInscricao();
      return;
    }

    // Atualiza classe ativa dos botões do menu
    document.querySelectorAll(".item-nav-btn").forEach(btn => btn.classList.remove("ativo"));
    const btnAtivo = typeof event !== "undefined" && event && event.currentTarget;
    if (btnAtivo) {
      btnAtivo.classList.add("ativo");
    }

    const elemento = document.getElementById(idAlvo);
    if (elemento) {
      elemento.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Inicializa
  const emailParam = new URLSearchParams(window.location.search).get("email") || sessionStorage.getItem("emailParticipante");
  if (emailParam && inputEmailAluno && !inputEmailAluno.value) {
    inputEmailAluno.value = emailParam;
  }
  const senhaParam = sessionStorage.getItem("senhaTemporaria");
  if (senhaParam && inputSenhaAluno && !inputSenhaAluno.value) {
    inputSenhaAluno.value = senhaParam;
  }

  if (tokenAtual) {
    carregarPainel();
  } else {
    configurarEstadoDeslogado();
  }

  // Formata automaticamente qualquer e-mail encontrado em texto como link azul sublinhado
  function formatarEmailsTexto(container = document.body) {
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

  formatarEmailsTexto();
  const observerEmails = new MutationObserver(() => formatarEmailsTexto());
  observerEmails.observe(document.body, { childList: true, subtree: true });
});
