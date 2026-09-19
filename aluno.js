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
  const overlayBloqueioCertificado = document.getElementById("overlayBloqueioCertificado");
  const overlayBloqueioDataFim = document.getElementById("overlayBloqueioDataFim");
  const certNomeAluno = document.getElementById("certNomeAluno");
  const certCpfAluno = document.getElementById("certCpfAluno");
  const certNomeCurso = document.getElementById("certNomeCurso");
  const certCargaHoraria = document.getElementById("certCargaHoraria");
  const certDataCurso = document.getElementById("certDataCurso");
  const certCodigoAutenticidade = document.getElementById("certCodigoAutenticidade");
  const btnCopiarCodigoCertificado = document.getElementById("btnCopiarCodigoCertificado");
  const btnAdicionarLinkedIn = document.getElementById("btnAdicionarLinkedIn");
  const btnBaixarPDFCertificado = document.getElementById("btnBaixarPDFCertificado");
  const btnImprimirCertificado = document.getElementById("btnImprimirCertificado");
  const selectCursoCertificado = document.getElementById("selectCursoCertificado");
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
    const moduloCursoTopbar = document.getElementById("moduloCursoTopbar");
    if (moduloCursoTopbar) moduloCursoTopbar.hidden = true;
    sessionStorage.removeItem("curso_ativo_inscricao_id");
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
    sessionStorage.removeItem("curso_ativo_inscricao_id");
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

  async function carregarPainel(inscricaoIdAlvo = null) {
    if (modalTrocaSenha) {
      modalTrocaSenha.hidden = true;
      modalTrocaSenha.style.display = "none";
    }

    if (!tokenAtual) {
      irParaLogin();
      return;
    }

    try {
      const idParaBuscar = inscricaoIdAlvo || sessionStorage.getItem("curso_ativo_inscricao_id");
      let url = "/api/aluno/meus-dados";
      if (idParaBuscar) {
        url += "?inscricaoId=" + encodeURIComponent(idParaBuscar);
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${tokenAtual}` },
      });

      if (!res.ok) {
        // Sessão inválida ou expirada
        irParaLogin();
        return;
      }

      const dados = await res.json();
      dadosAlunoCache = dados;

      if (dados.id) {
        sessionStorage.setItem("curso_ativo_inscricao_id", dados.id);
      }

      // Configuração do Módulo da Barra Superior Horizontal (Escolha do Curso Ativo)
      const moduloCursoTopbar = document.getElementById("moduloCursoTopbar");
      const selectCursoAtivoTopbar = document.getElementById("selectCursoAtivoTopbar");
      const badgeStatusCursoTopbar = document.getElementById("badgeStatusCursoTopbar");

      if (moduloCursoTopbar && selectCursoAtivoTopbar && dados.cursos && dados.cursos.length > 0) {
        selectCursoAtivoTopbar.innerHTML = "";
        dados.cursos.forEach((c) => {
          const opt = document.createElement("option");
          opt.value = c.id;
          const statusTag = c.status_pagamento === "pago" ? "✓ Pago" : "⏳ Pendente";
          opt.textContent = `${c.nome} (${statusTag})`;
          if (String(c.id) === String(dados.inscricaoAtivaId || dados.id)) {
            opt.selected = true;
          }
          selectCursoAtivoTopbar.appendChild(opt);
        });

        if (badgeStatusCursoTopbar) {
          const isPagoAtual = dados.status_pagamento === "pago";
          badgeStatusCursoTopbar.textContent = isPagoAtual ? "✓ Liberado" : "Aguardando Pagamento";
          badgeStatusCursoTopbar.className = `badge-status-topbar ${isPagoAtual ? "badge-pago" : "badge-pendente"}`;
        }

        moduloCursoTopbar.hidden = false;

        if (!selectCursoAtivoTopbar.dataset.ouvinteConfigurado) {
          selectCursoAtivoTopbar.dataset.ouvinteConfigurado = "true";
          selectCursoAtivoTopbar.addEventListener("change", (e) => {
            const novoId = e.target.value;
            sessionStorage.setItem("curso_ativo_inscricao_id", novoId);
            carregarPainel(novoId).then(() => {
              if (modalCertificados && !modalCertificados.hidden && modalCertificados.style.display !== "none") {
                renderizarCertificado(dadosAlunoCache);
              }
            });
          });
        }
      }

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
      subtitulo.textContent = "Digite sua nova senha para atualizar seu acesso ao Painel do Inscrito.";
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

  function renderizarCertificado(dados, cursoSelecionadoId = null) {
    if (!dados) {
      dados = dadosAlunoCache || {
        nome: "Participante Concluinte",
        cpf: "000.000.000-00",
        curso: {
          nome: "Treinamento de Amostragem de Sementes",
          carga_horaria: "16 horas",
          data_evento: "Edição Oficial 2026",
          status_pagamento: "pago"
        },
        cursos: [
          {
            id: "amostragem-2026",
            nome: "Treinamento de Amostragem de Sementes",
            carga_horaria: "16 horas",
            data_evento: "Edição Oficial 2026",
            status_pagamento: "pago"
          },
          {
            id: "analistas-2026",
            nome: "Curso de Formação de Analistas de Sementes",
            carga_horaria: "40 horas",
            data_evento: "Edição Oficial 2026",
            status_pagamento: "pago"
          }
        ]
      };
    }

    // Lista de todos os cursos inscritos do aluno (suporta todos os cursos atuais e futuros)
    const listaCursos = Array.isArray(dados.cursos) && dados.cursos.length > 0 ? dados.cursos : [dados.curso || {
      id: dados.id || "curso-apassul",
      nome: dados.curso?.nome || "Treinamento Apassul",
      carga_horaria: dados.curso?.carga_horaria || "16 horas",
      data_evento: dados.curso?.data_evento || "Edição Oficial 2026",
      status_pagamento: "pago"
    }];

    // O curso ativo no modal de certificados é SEMPRE sincronizado com o curso selecionado na barra horizontal superior
    const cursoAtivo = dados.curso || listaCursos[0];

    // Garante que o container do certificado esteja ativo
    if (blocoCertificadoDisponivel) {
      blocoCertificadoDisponivel.hidden = false;
      blocoCertificadoDisponivel.removeAttribute("hidden");
      blocoCertificadoDisponivel.style.display = "block";
    }
    if (blocoCertificadoPendente) {
      blocoCertificadoPendente.hidden = true;
      blocoCertificadoPendente.setAttribute("hidden", "hidden");
      blocoCertificadoPendente.style.display = "none";
    }

    // Preenchimento automatizado das informações no certificado
    if (certNomeAluno) certNomeAluno.textContent = (dados.nome || "Participante Concluinte").trim();
    if (certCpfAluno) certCpfAluno.textContent = dados.cpf || "000.000.000-00";

    const nomeCursoFinal = cursoAtivo.nome || cursoAtivo.nome_curso || dados.curso?.nome || "Treinamento Oficial Apassul";
    if (certNomeCurso) certNomeCurso.textContent = nomeCursoFinal;

    const cargaHorariaFinal = cursoAtivo.carga_horaria || dados.curso?.carga_horaria || "16 horas";
    if (certCargaHoraria) certCargaHoraria.textContent = cargaHorariaFinal;

    const dataCursoFinal = cursoAtivo.data_evento || dados.curso?.data_evento || "Edição Oficial 2026";
    if (certDataCurso) certDataCurso.textContent = dataCursoFinal;

    // Código oficial de autenticidade único e automatizado
    const idInsc = cursoAtivo.inscricao_id || cursoAtivo.id || dados.id || "0001";
    const cpfSufixo = dados.cpf ? String(dados.cpf).replace(/\D/g, "").slice(-4) : "0000";
    const idFormatado = String(idInsc).padStart(4, "0").slice(-4);
    if (certCodigoAutenticidade) {
      certCodigoAutenticidade.textContent = `APS-2026-${idFormatado}-${cpfSufixo}`;
    }

    // ==========================================================
    // VERIFICAÇÃO DE BLOQUEIO DE CERTIFICADO DE CURSO EM ANDAMENTO
    // Se houver data_fim_curso e a data atual for anterior ao término, o certificado fica bloqueado
    // ==========================================================
    const dataFimStr = cursoAtivo.data_fim_curso || dados.curso?.data_fim_curso;
    let cursoBloqueado = false;
    let dataFimFormatada = "";

    if (dataFimStr) {
      try {
        const partes = dataFimStr.split("-");
        if (partes.length === 3) {
          const ano = parseInt(partes[0], 10);
          const mes = parseInt(partes[1], 10) - 1;
          const dia = parseInt(partes[2], 10);
          const dataFim = new Date(ano, mes, dia, 23, 59, 59, 999);
          const agora = new Date();
          if (agora < dataFim) {
            cursoBloqueado = true;
            dataFimFormatada = `${String(dia).padStart(2, '0')}/${String(mes + 1).padStart(2, '0')}/${ano}`;
          }
        }
      } catch (errData) {
        console.warn("Erro ao processar data_fim_curso:", errData);
      }
    }

    // Aplica o overlay opaco com cadeado e mensagem oficial se estiver bloqueado
    const blocoBotoesAcaoCertificado = document.getElementById("blocoBotoesAcaoCertificado");

    if (cursoBloqueado) {
      if (overlayBloqueioCertificado) {
        overlayBloqueioCertificado.hidden = false;
        overlayBloqueioCertificado.removeAttribute("hidden");
        overlayBloqueioCertificado.style.display = "flex";
      }
      if (overlayBloqueioDataFim) {
        overlayBloqueioDataFim.textContent = dataFimFormatada 
          ? `⏳ Término previsto para ${dataFimFormatada} • Curso em andamento` 
          : `⏳ Curso em andamento`;
      }
      if (blocoBotoesAcaoCertificado) {
        blocoBotoesAcaoCertificado.style.display = "none";
      }
      // Desabilita botões de download e impressão por segurança
      if (btnBaixarPDFCertificado) btnBaixarPDFCertificado.disabled = true;
      if (btnImprimirCertificado) btnImprimirCertificado.disabled = true;
      if (btnAdicionarLinkedIn) btnAdicionarLinkedIn.disabled = true;
      if (btnCopiarCodigoCertificado) btnCopiarCodigoCertificado.disabled = true;
    } else {
      if (overlayBloqueioCertificado) {
        overlayBloqueioCertificado.hidden = true;
        overlayBloqueioCertificado.setAttribute("hidden", "hidden");
        overlayBloqueioCertificado.style.display = "none";
      }
      if (blocoBotoesAcaoCertificado) {
        blocoBotoesAcaoCertificado.style.display = "flex";
      }
      if (btnBaixarPDFCertificado) btnBaixarPDFCertificado.disabled = false;
      if (btnImprimirCertificado) btnImprimirCertificado.disabled = false;
      if (btnAdicionarLinkedIn) btnAdicionarLinkedIn.disabled = false;
      if (btnCopiarCodigoCertificado) btnCopiarCodigoCertificado.disabled = false;
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
    renderizarCertificado(dadosAlunoCache);
    if (modalCertificados) {
      modalCertificados.hidden = false;
      modalCertificados.removeAttribute("hidden");
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
        btnEntrarAluno.textContent = "Entrar no Painel do Inscrito";
        return;
      }

      tokenAtual = resposta.token;
      sessionStorage.setItem("token_aluno_apassul", tokenAtual);
      localStorage.setItem("token_aluno_apassul", tokenAtual);

      btnEntrarAluno.disabled = false;
      btnEntrarAluno.textContent = "Entrar no Painel do Inscrito";

      await carregarPainel();

      if (resposta.trocaSenhaObrigatoria) {
        abrirModalTrocaSenha(true);
      }
    } catch (erro) {
      mostrarErro(msgErroLogin, "Erro ao conectar com o servidor. Tente novamente.");
      btnEntrarAluno.disabled = false;
      btnEntrarAluno.textContent = "Entrar no Painel do Inscrito";
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

  function criarElementoCertificadoImpressao({
    nomeAluno,
    cpfAluno,
    nomeCurso,
    cargaHoraria,
    dataCurso,
    codigoAutenticidade
  }) {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    container.style.width = "278mm";
    container.style.height = "190mm";
    container.style.margin = "0";
    container.style.padding = "0";
    container.style.zIndex = "-9999";
    container.style.background = "#ffffff";

    container.innerHTML = `
      <div style="background: #ffffff; border: 2mm solid #2e6b3e; border-radius: 4px; padding: 4mm; margin: 0; width: 278mm; max-width: 278mm; height: 190mm; max-height: 190mm; box-sizing: border-box; font-family: 'Public Sans', system-ui, -apple-system, sans-serif;">
        <div style="border: 1mm dashed #2e6b3e; border-radius: 3px; padding: 7mm 11mm 6mm; background: #ffffff; text-align: center; display: flex; flex-direction: column; justify-content: space-between; height: 100%; box-sizing: border-box;">
          
          <div style="margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            <img src="logo-apassul.png" alt="Apassul" style="height: 44px; width: auto; object-fit: contain; margin-bottom: 3px; display: inline-block;">
            <div style="font-size: 10.5px; font-weight: 700; color: #2e6b3e; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 3px;">
              Apassul &bull; Associação dos Produtores e Comerciantes de Sementes e Mudas do RS
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: 1.2px; text-transform: uppercase; margin: 0;">
              CERTIFICADO DE CONCLUSÃO
            </div>
          </div>

          <div style="padding: 10px 0; flex: 1; display: flex; flex-direction: column; justify-content: center;">
            <p style="font-size: 14px; color: #334155; line-height: 1.55; margin: 0 auto; max-width: 740px;">
              Certificamos que <strong style="color: #0f172a; font-size: 16px; font-weight: 700;">${nomeAluno}</strong>,
              inscrito(a) sob o CPF nº <strong>${cpfAluno}</strong>,
              concluiu com êxito e aproveitamento técnico o treinamento de capacitação:
            </p>
            <div style="font-size: 16px; font-weight: 700; color: #1e522d; margin: 10px auto; padding: 7px 20px; background: #f0fdf4; border-radius: 6px; display: inline-block; border: 1px solid #bbf7d0; line-height: 1.35; max-width: 92%;">
              ${nomeCurso}
            </div>
            <p style="font-size: 13.5px; color: #64748b; margin: 4px 0 0;">
              Carga horária total de <strong>${cargaHoraria}</strong> &bull;
              Realizado em <strong>${dataCurso}</strong>.
            </p>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0; gap: 16px;">
            <div style="text-align: center; display: flex; flex-direction: column; align-items: center; min-width: 175px;">
              <div style="width: 175px; height: 1.5px; background: #0f172a; margin-bottom: 5px;"></div>
              <div style="font-size: 11px; font-weight: 700; color: #0f172a; letter-spacing: 0.3px; text-transform: uppercase;">Diretor Executivo</div>
              <div style="font-size: 10px; font-weight: 600; color: #475569; margin-top: 1px;">Apassul</div>
            </div>
            <div style="text-align: center; display: flex; flex-direction: column; align-items: center; min-width: 175px;">
              <div style="width: 175px; height: 1.5px; background: #0f172a; margin-bottom: 5px;"></div>
              <div style="font-size: 11px; font-weight: 700; color: #0f172a; letter-spacing: 0.3px; text-transform: uppercase;">Desenvolvedor de Mercado</div>
              <div style="font-size: 10px; font-weight: 600; color: #475569; margin-top: 1px;">Apassul</div>
            </div>
            <div style="text-align: right; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 14px; border-radius: 6px; white-space: nowrap; min-width: 155px;">
              <div style="font-size: 16px; margin-bottom: 2px;">🛡️</div>
              <div style="font-size: 9px; font-weight: 700; color: #2e6b3e; text-transform: uppercase; letter-spacing: 0.5px;">Autenticidade Digital Registrada</div>
              <div style="font-size: 11.5px; font-weight: 700; color: #0f172a; font-family: monospace; letter-spacing: 0.5px; margin-top: 2px;">${codigoAutenticidade}</div>
            </div>
          </div>

        </div>
      </div>
    `;
    return container;
  }

  async function baixarCertificadoPDF() {
    const docElemento = document.getElementById("documentoCertificado");
    if (!docElemento) return;

    renderizarCertificado(dadosAlunoCache);

    if (overlayBloqueioCertificado && !overlayBloqueioCertificado.hidden && overlayBloqueioCertificado.style.display !== "none") {
      return;
    }

    const btn = btnBaixarPDFCertificado;
    const txtOriginal = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "⏳ Gerando PDF Oficial A4...";
    }

    const nomeRaw = (certNomeAluno?.textContent || "Participante").trim();
    const cursoRaw = (certNomeCurso?.textContent || "Curso").trim();
    const cpfRaw = (certCpfAluno?.textContent || "000.000.000-00").trim();
    const cargaRaw = (certCargaHoraria?.textContent || "16 horas").trim();
    const dataRaw = (certDataCurso?.textContent || "Edição Oficial 2026").trim();
    const codigoRaw = (certCodigoAutenticidade?.textContent || "APS-2026-CERT-0001").trim();

    const nomeLimpo = nomeRaw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_");
    const cursoLimpo = cursoRaw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .slice(0, 30);

    const nomeArquivo = `Certificado_Apassul_${cursoLimpo}_${nomeLimpo || "Aluno"}.pdf`;

    if (window.html2pdf) {
      // Elemento dedicado com o modelo exato de impressão A4 Paisagem (278mm x 190mm)
      const container = criarElementoCertificadoImpressao({
        nomeAluno: nomeRaw,
        cpfAluno: cpfRaw,
        nomeCurso: cursoRaw,
        cargaHoraria: cargaRaw,
        dataCurso: dataRaw,
        codigoAutenticidade: codigoRaw
      });
      document.body.appendChild(container);

      // Configuração A4 Paisagem (297mm x 210mm) com margens otimizadas para preencher mais a folha (278mm x 190mm)
      const opt = {
        margin: [9, 9, 9, 9],
        filename: nomeArquivo,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: "#ffffff",
          logging: false
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "landscape",
          compress: true
        }
      };

      try {
        await window.html2pdf().set(opt).from(container.firstElementChild).toPdf().get("pdf").then((pdf) => {
          // Garante que NUNCA exista uma segunda página cortada ou em branco
          while (pdf.internal.getNumberOfPages() > 1) {
            pdf.deletePage(2);
          }
        }).save();

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
      } finally {
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    }

    // Fallback caso html2pdf não execute no ambiente: impressão nativa em A4 Paisagem
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = txtOriginal;
    }
    executarImpressaoCertificado();
  }

  function executarImpressaoCertificado() {
    renderizarCertificado(dadosAlunoCache);

    if (overlayBloqueioCertificado && !overlayBloqueioCertificado.hidden && overlayBloqueioCertificado.style.display !== "none") {
      return;
    }

    const docCert = document.getElementById("documentoCertificado");
    if (!docCert) {
      dispararImpressaoDireta();
      return;
    }

    try {
      let iframe = document.getElementById("iframeImpressaoCertificado");
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "iframeImpressaoCertificado";
        iframe.style.position = "fixed";
        iframe.style.top = "-9999px";
        iframe.style.left = "-9999px";
        iframe.style.width = "297mm";
        iframe.style.height = "210mm";
        iframe.style.border = "none";
        document.body.appendChild(iframe);
      }

      const cloneCert = docCert.cloneNode(true);
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Certificado - APASSUL</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: 'Public Sans', system-ui, -apple-system, sans-serif;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .certificado-visual-card {
              background: #ffffff;
              border: 2mm solid #2e6b3e;
              border-radius: 4px;
              padding: 4mm;
              margin: auto;
              width: 278mm;
              max-width: 278mm;
              height: 190mm;
              max-height: 190mm;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .certificado-moldura {
              border: 1mm dashed #2e6b3e;
              border-radius: 3px;
              padding: 7mm 11mm 6mm;
              background: #ffffff;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              height: 100%;
              box-sizing: border-box;
            }
            .certificado-cabecalho {
              margin-bottom: 8px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
            }
            .certificado-logo {
              height: 44px;
              width: auto;
              object-fit: contain;
              margin-bottom: 3px;
              display: inline-block;
            }
            .certificado-instituicao {
              font-size: 10.5px;
              font-weight: 700;
              color: #2e6b3e;
              letter-spacing: 0.8px;
              text-transform: uppercase;
              margin-bottom: 3px;
            }
            .certificado-titulo {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: 1.2px;
              text-transform: uppercase;
            }
            .certificado-corpo {
              padding: 10px 0;
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .certificado-texto-declaracao {
              font-size: 14px;
              color: #334155;
              line-height: 1.55;
              margin: 0 auto;
              max-width: 740px;
            }
            .destaque-aluno {
              color: #0f172a;
              font-size: 16px;
              font-weight: 700;
            }
            .certificado-nome-curso {
              font-size: 16px;
              font-weight: 700;
              color: #1e522d;
              margin: 10px auto;
              padding: 7px 20px;
              background: #f0fdf4;
              border-radius: 6px;
              display: inline-block;
              border: 1px solid #bbf7d0;
              line-height: 1.35;
            }
            .certificado-detalhes-texto {
              font-size: 13.5px;
              color: #64748b;
              margin: 4px 0 0;
            }
            .certificado-rodape {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 14px;
              padding-top: 12px;
              border-top: 1px solid #e2e8f0;
              gap: 16px;
            }
            .certificado-assinatura-bloco {
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
              min-width: 175px;
            }
            .linha-assinatura {
              width: 175px;
              height: 1.5px;
              background: #0f172a;
              margin-bottom: 5px;
            }
            .cargo-assinatura {
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
              letter-spacing: 0.3px;
              text-transform: uppercase;
            }
            .inst-assinatura {
              font-size: 10px;
              font-weight: 600;
              color: #475569;
              margin-top: 1px;
            }
            .certificado-selo-bloco {
              text-align: right;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 6px 14px;
              border-radius: 6px;
              white-space: nowrap;
              min-width: 155px;
            }
            .selo-icone {
              font-size: 16px;
              margin-bottom: 2px;
            }
            .selo-texto {
              font-size: 9px;
              font-weight: 700;
              color: #2e6b3e;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .selo-codigo {
              font-size: 11.5px;
              font-weight: 700;
              color: #0f172a;
              font-family: monospace;
              letter-spacing: 0.5px;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          ${cloneCert.outerHTML}
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (errIframe) {
          console.warn("Falha no print por iframe, usando modo padrão:", errIframe);
          dispararImpressaoDireta();
        }
      }, 250);
    } catch (e) {
      console.warn("Erro ao instanciar iframe de impressão:", e);
      dispararImpressaoDireta();
    }
  }

  function dispararImpressaoDireta() {
    if (modalCertificados) {
      modalCertificados.hidden = false;
      modalCertificados.removeAttribute("hidden");
      modalCertificados.style.display = "block";
    }
    if (blocoCertificadoDisponivel) {
      blocoCertificadoDisponivel.hidden = false;
      blocoCertificadoDisponivel.removeAttribute("hidden");
      blocoCertificadoDisponivel.style.display = "block";
    }

    document.body.classList.add("imprimindo-somente-certificado");

    const limparModoImpressao = () => {
      document.body.classList.remove("imprimindo-somente-certificado");
      window.removeEventListener("afterprint", limparModoImpressao);
    };

    window.addEventListener("afterprint", limparModoImpressao, { once: true });

    setTimeout(() => {
      try {
        window.print();
      } catch (errPrint) {
        console.error("Erro na chamada window.print():", errPrint);
      }
      setTimeout(limparModoImpressao, 2500);
    }, 150);
  }

  function exportarParaLinkedIn() {
    const nomeCurso = (certNomeCurso?.textContent || dadosAlunoCache?.curso?.nome || "Treinamento Oficial Apassul").trim();
    const codigoCert = (certCodigoAutenticidade?.textContent || dadosAlunoCache?.inscricao?.codigo_autenticidade || "APS-2026-CERT").trim();
    
    // URL pública oficial onde o LinkedIn e qualquer terceiro pode verificar e visualizar o certificado sem login:
    const urlCertificado = `${window.location.origin}/validar-certificado.html?codigo=${encodeURIComponent(codigoCert)}`;
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();
    const mesAtual = dataAtual.getMonth() + 1;

    // Integração oficial com a página verificada da APASSUL no LinkedIn:
    // - URL da empresa: https://www.linkedin.com/company/apassul
    // - ID numérico da organização no LinkedIn: 65313822
    // - Nome da empresa na busca do LinkedIn: APASSUL
    const params = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: nomeCurso,
      organizationId: "65313822",
      organizationName: "APASSUL",
      issueYear: String(anoAtual),
      issueMonth: String(mesAtual),
      certUrl: urlCertificado,
      certId: codigoCert
    });

    const urlLinkedIn = `https://www.linkedin.com/profile/add?${params.toString()}`;
    window.open(urlLinkedIn, "_blank", "noopener,noreferrer");
  }

  if (btnBaixarPDFCertificado) {
    btnBaixarPDFCertificado.addEventListener("click", baixarCertificadoPDF);
  }

  if (btnImprimirCertificado) {
    btnImprimirCertificado.addEventListener("click", executarImpressaoCertificado);
  }

  if (btnAdicionarLinkedIn) {
    btnAdicionarLinkedIn.addEventListener("click", exportarParaLinkedIn);
  }

  const btnVisualizarLinkPublico = document.getElementById("btnVisualizarLinkPublico");
  if (btnVisualizarLinkPublico) {
    btnVisualizarLinkPublico.addEventListener("click", () => {
      const codigoCert = (certCodigoAutenticidade?.textContent || dadosAlunoCache?.inscricao?.codigo_autenticidade || "APS-2026-CERT").trim();
      const urlCert = `/validar-certificado.html?codigo=${encodeURIComponent(codigoCert)}`;
      window.open(urlCert, "_blank");
    });
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
        body: JSON.stringify({
          status: novoStatus,
          inscricaoId: dadosAlunoCache?.id,
        }),
      });
      if (res.ok) {
        await carregarPainel(dadosAlunoCache?.id);
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
