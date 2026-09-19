require("dotenv").config();
const express = require("express");
const basicAuth = require("express-basic-auth");
const db = require("./db");
const { criarPreferenciaPagamento, consultarPagamento } = require("./mp");
const {
  liberarAcessoInscrito,
  verificarSenha,
  hashSenha,
  gerarTokenSessao,
} = require("./auth_aluno");

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "apassul2026";

function getBaseUrl(req) {
  if (process.env.PUBLIC_URL && process.env.PUBLIC_URL.trim()) {
    return process.env.PUBLIC_URL.trim().replace(/\/$/, "");
  }
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const protegerAdmin = basicAuth({
  users: { [ADMIN_USER]: ADMIN_PASS },
  challenge: true,
  unauthorizedResponse: "Acesso negado.",
});

// Rota pública: só devolve as informações que quem está se inscrevendo pode ver.
// Note que "vagas" e a contagem de inscritos NÃO estão nessa consulta de propósito —
// quem preenche o formulário não deve saber quantas vagas existem ou já foram
// preenchidas (isso é uma decisão de negócio, não uma limitação técnica).
app.get("/cursos", (req, res) => {
  const cursos = db
    .prepare(
      `SELECT id, nome, preco, descricao, carga_horaria, data_evento, requisitos FROM cursos`
    )
    .all();

  res.json(cursos);
});

app.post("/inscricoes", async (req, res) => {
  const {
    curso,
    empresa,
    nome,
    email,
    telefone,
    cpf,
    metodoPagamento,
    emailRecibo,
    aceiteTermos,
    vencimentoBoleto,
  } = req.body;

  // Validação de todos os campos obrigatórios, incluindo o aceite dos termos.
  // "!aceiteTermos" cobre tanto "false" quanto "undefined" (campo nem enviado).
  if (
    !curso || !empresa || !nome || !email || !telefone || !cpf ||
    !metodoPagamento || !emailRecibo || !aceiteTermos
  ) {
    return res.status(400).json({
      erro: "Preencha todos os campos obrigatórios e aceite os termos de inscrição.",
    });
  }

  if (metodoPagamento === "boleto" && !vencimentoBoleto) {
    return res.status(400).json({
      erro: "Por favor, selecione o dia para o vencimento do boleto bancário.",
    });
  }

  const cursoInfo = db.prepare("SELECT * FROM cursos WHERE id = ?").get(curso);
  if (!cursoInfo) {
    return res.status(400).json({ erro: "Curso não encontrado." });
  }

  const { total } = db
    .prepare("SELECT COUNT(*) AS total FROM inscricoes WHERE curso = ?")
    .get(curso);

  if (total >= cursoInfo.vagas) {
    return res.status(400).json({ erro: `As vagas para "${cursoInfo.nome}" já se esgotaram.` });
  }

  const valorInscricao = cursoInfo.preco || 3200.00;
  const dataAtualIso = new Date().toISOString();

  // [MODO DE TESTE: Inscrição confirmada automaticamente com status 'pago' ao preencher o formulário]
  const stmt = db.prepare(`
    INSERT INTO inscricoes
      (nome, email, curso, data, empresa, telefone, cpf, metodo_pagamento, email_recibo, aceite_termos, vencimento_boleto, status_pagamento, valor, data_pagamento)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const infoInsercao = stmt.run(
    nome, email, curso, dataAtualIso,
    empresa, telefone, cpf, metodoPagamento, emailRecibo,
    aceiteTermos ? 1 : 0,
    metodoPagamento === "boleto" ? (vencimentoBoleto || null) : null,
    "pago", // CONFIRMADO IMEDIATAMENTE PARA FINS DE TESTE
    valorInscricao,
    dataAtualIso
  );

  const inscricaoId = infoInsercao.lastInsertRowid;

  console.log(`[TESTE] Inscrição confirmada em "${cursoInfo.nome}" (ID ${inscricaoId}):`, nome, email);

  // [ENVIO IMEDIATO DE LOGIN E SENHA ALFANUMÉRICA PARA O E-MAIL CADASTRADO]
  let infoAcesso = null;
  try {
    const baseUrl = getBaseUrl(req);
    infoAcesso = await liberarAcessoInscrito(db, inscricaoId, baseUrl);
    console.log(`[TESTE - Inscrição ID ${inscricaoId}] Login (${email}) e senha alfanumérica (${infoAcesso.senhaGerada}) disparados para ${email}. Status: ${infoAcesso.emailEnviado ? "ENVIADO VIA SMTP" : "REGISTRADO NO SISTEMA"}`);
  } catch (errLiberacao) {
    console.error("[Erro Liberação Imediata]:", errLiberacao.message);
  }

  res.json({
    sucesso: true,
    id: inscricaoId,
    metodoPagamento,
    statusPagamento: "pago",
    email,
    initPoint: null,
    modoSimulado: true,
    emailEnviado: infoAcesso?.emailEnviado || false,
    senhaTemporaria: infoAcesso?.senhaGerada || null,
  });
});

// Endpoint público para exibir detalhes da inscrição na tela de confirmação
app.get("/inscricoes/:id", (req, res) => {
  const { id } = req.params;
  const inscricao = db.prepare(`
    SELECT inscricoes.id, inscricoes.nome, inscricoes.email, inscricoes.metodo_pagamento,
           inscricoes.vencimento_boleto, inscricoes.status_pagamento, inscricoes.valor,
           inscricoes.mp_init_point, inscricoes.senha_plana_inicial, cursos.nome AS nome_curso
    FROM inscricoes
    JOIN cursos ON cursos.id = inscricoes.curso
    WHERE inscricoes.id = ?
  `).get(id);

  if (!inscricao) {
    return res.status(404).json({ erro: "Inscrição não encontrada." });
  }

  res.json(inscricao);
});

// Webhook do Mercado Pago para confirmação automática de pagamentos (Pix e Boleto)
app.all("/webhook/mercadopago", async (req, res) => {
  const paymentId =
    req.body?.data?.id ||
    req.body?.id ||
    req.query?.["data.id"] ||
    req.query?.id;

  const topic = req.body?.type || req.body?.topic || req.query?.topic;

  console.log(`[Webhook Mercado Pago] Notificação recebida: topic=${topic}, paymentId=${paymentId}`);

  if (paymentId) {
    try {
      const payment = await consultarPagamento(paymentId);
      if (payment) {
        console.log(`[Webhook Mercado Pago] Pagamento ${paymentId}: status=${payment.status}, ref=${payment.external_reference}`);

        let statusMapeado = "pendente";
        if (payment.status === "approved") {
          statusMapeado = "pago";
        } else if (payment.status === "rejected") {
          statusMapeado = "rejeitado";
        } else if (["cancelled", "refunded", "charged_back"].includes(payment.status)) {
          statusMapeado = "cancelado";
        }

        const inscricaoId = Number(payment.external_reference);
        if (inscricaoId) {
          db.prepare(`
            UPDATE inscricoes
            SET status_pagamento = ?,
                mp_payment_id = ?,
                data_pagamento = COALESCE(?, data_pagamento)
            WHERE id = ?
          `).run(
            statusMapeado,
            String(payment.id),
            payment.date_approved || new Date().toISOString(),
            inscricaoId
          );

          // Se o pagamento foi aprovado (Pix ou Boleto), gera as credenciais e envia o e-mail automaticamente
          if (statusMapeado === "pago") {
            const baseUrl = getBaseUrl(req);
            liberarAcessoInscrito(db, inscricaoId, baseUrl).catch((errEmail) => {
              console.error("[Acesso Aluno] Falha ao disparar e-mail de credenciais:", errEmail.message);
            });
          }
        }
      }
    } catch (err) {
      console.error("[Webhook Mercado Pago] Erro no processamento do webhook:", err.message);
    }
  }

  // Mercado Pago espera status 200/201 como confirmação de recebimento
  res.status(200).send("OK");
});

app.get("/admin", (req, res) => {
  res.redirect("/admin.html");
});

app.get("/admin/inscricoes", protegerAdmin, (req, res) => {
  const todas = db.prepare("SELECT * FROM inscricoes ORDER BY data DESC").all();
  res.json(todas);
});

// Atualização manual do status de pagamento pelo administrador (ex: confirmação de depósito bancário)
app.patch("/admin/inscricoes/:id/status", protegerAdmin, async (req, res) => {
  const { id } = req.params;
  const { status_pagamento } = req.body;

  const statusPermitidos = ["pendente", "pago", "cancelado", "rejeitado"];
  if (!statusPermitidos.includes(status_pagamento)) {
    return res.status(400).json({ erro: "Status de pagamento inválido." });
  }

  const inscricao = db.prepare("SELECT * FROM inscricoes WHERE id = ?").get(id);
  if (!inscricao) {
    return res.status(404).json({ erro: "Inscrição não encontrada." });
  }

  const dataPagamento = status_pagamento === "pago" ? new Date().toISOString() : null;

  db.prepare(`
    UPDATE inscricoes
    SET status_pagamento = ?,
        data_pagamento = ?
    WHERE id = ?
  `).run(status_pagamento, dataPagamento, id);

  // Se marcado como pago manualmente, gera a senha e envia o e-mail de acesso
  let dadosAcesso = null;
  if (status_pagamento === "pago") {
    try {
      const baseUrl = getBaseUrl(req);
      dadosAcesso = await liberarAcessoInscrito(db, id, baseUrl);
    } catch (e) {
      console.error("[Acesso Aluno] Erro ao liberar acesso manual:", e.message);
    }
  }

  res.json({ sucesso: true, id, status_pagamento, dadosAcesso });
});

// Reenvio manual dos dados de acesso por e-mail pelo Administrador
app.post("/admin/inscricoes/:id/reenviar-acesso", protegerAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const baseUrl = getBaseUrl(req);
    const resultado = await liberarAcessoInscrito(db, id, baseUrl);
    res.json({ sucesso: true, resultado });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/admin/resumo", protegerAdmin, (req, res) => {
  const resumo = db
    .prepare(
      `SELECT cursos.id, cursos.nome, cursos.vagas, cursos.preco,
        (SELECT COUNT(*) FROM inscricoes WHERE inscricoes.curso = cursos.id) AS inscritos,
        (SELECT COUNT(*) FROM inscricoes WHERE inscricoes.curso = cursos.id AND inscricoes.status_pagamento = 'pago') AS pagos
       FROM cursos`
    )
    .all();
  res.json(resumo);
});

// ==========================================
// ROTAS DA ÁREA DO INSCRITO (ALUNO)
// ==========================================

function extrairTokenAluno(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return null;
}

function autenticarAluno(req, res, next) {
  const token = extrairTokenAluno(req);
  if (!token) {
    return res.status(401).json({ erro: "Sessão não informada ou expirada. Faça login novamente." });
  }

  const aluno = db.prepare(`
    SELECT inscricoes.*, cursos.nome AS nome_curso, cursos.descricao AS descricao_curso,
           cursos.carga_horaria, cursos.data_evento, cursos.requisitos
    FROM inscricoes
    LEFT JOIN cursos ON inscricoes.curso = cursos.id
    WHERE inscricoes.token_sessao = ?
  `).get(token);

  if (!aluno) {
    return res.status(401).json({ erro: "Sessão inválida. Faça login novamente." });
  }

  req.aluno = aluno;
  next();
}

// Login na Área do Inscrito (Login é o e-mail, senha é a enviada ou redefinida)
app.post("/api/aluno/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: "Por favor, preencha o e-mail e a senha." });
  }

  const emailNormalizado = email.trim().toLowerCase();

  // Busca inscrições deste e-mail (permite acesso em modo teste independente de pagamento)
  let inscricao = db.prepare(`
    SELECT * FROM inscricoes
    WHERE LOWER(email) = ?
    ORDER BY id DESC LIMIT 1
  `).get(emailNormalizado);

  if (!inscricao) {
    return res.status(404).json({
      erro: "Nenhuma inscrição encontrada para este e-mail. Verifique a digitação.",
    });
  }

  // Se a senha ainda não havia sido gerada para esta inscrição antiga, gera agora automaticamente
  if (!inscricao.senha_hash) {
    try {
      const baseUrl = getBaseUrl(req);
      await liberarAcessoInscrito(db, inscricao.id, baseUrl);
      inscricao = db.prepare("SELECT * FROM inscricoes WHERE id = ?").get(inscricao.id);
    } catch (e) {
      console.error("Erro ao gerar credenciais na tentativa de login:", e.message);
    }
  }

  const senhaValida = verificarSenha(senha.trim(), inscricao.senha_hash);
  if (!senhaValida) {
    return res.status(401).json({ erro: "Senha incorreta. Verifique os caracteres recebidos no e-mail." });
  }

  const tokenSessao = gerarTokenSessao();
  const agora = new Date().toISOString();

  db.prepare(`
    UPDATE inscricoes
    SET token_sessao = ?, ultimo_login = ?
    WHERE id = ?
  `).run(tokenSessao, agora, inscricao.id);

  res.json({
    sucesso: true,
    token: tokenSessao,
    nome: inscricao.nome,
    email: inscricao.email,
    trocaSenhaObrigatoria: Boolean(inscricao.troca_senha_obrigatoria),
  });
});

// Troca obrigatória (ou voluntária) de senha
app.post("/api/aluno/trocar-senha", autenticarAluno, (req, res) => {
  const { novaSenha, confirmacaoSenha } = req.body;

  if (!novaSenha || novaSenha.trim().length < 6) {
    return res.status(400).json({ erro: "A nova senha deve ter no mínimo 6 caracteres." });
  }

  if (novaSenha !== confirmacaoSenha) {
    return res.status(400).json({ erro: "A confirmação de senha não confere." });
  }

  const novoHash = hashSenha(novaSenha.trim());

  db.prepare(`
    UPDATE inscricoes
    SET senha_hash = ?,
        senha_plana_inicial = NULL,
        troca_senha_obrigatoria = 0
    WHERE id = ?
  `).run(novoHash, req.aluno.id);

  res.json({ sucesso: true, mensagem: "Senha alterada com sucesso!" });
});

// Obter dados completos da inscrição e do curso do aluno logado
app.get("/api/aluno/meus-dados", autenticarAluno, (req, res) => {
  const a = req.aluno;
  res.json({
    id: a.id,
    nome: a.nome,
    email: a.email,
    empresa: a.empresa,
    telefone: a.telefone,
    cpf: a.cpf,
    status_pagamento: a.status_pagamento,
    data_pagamento: a.data_pagamento,
    mp_init_point: a.mp_init_point,
    troca_senha_obrigatoria: Boolean(a.troca_senha_obrigatoria),
    curso: {
      id: a.curso,
      nome: a.nome_curso || a.curso,
      descricao: a.descricao_curso,
      carga_horaria: a.carga_horaria,
      data_evento: a.data_evento,
      requisitos: a.requisitos,
      preco: a.valor,
    },
  });
});

// Rota para alternar o status de pagamento do próprio aluno logado durante os testes
app.post("/api/aluno/simular-pagamento", autenticarAluno, (req, res) => {
  const { status } = req.body; // 'pago' ou 'pendente'
  const novoStatus = status === "pago" ? "pago" : "pendente";
  const dataPag = novoStatus === "pago" ? new Date().toISOString() : null;

  db.prepare(`
    UPDATE inscricoes
    SET status_pagamento = ?, data_pagamento = ?
    WHERE id = ?
  `).run(novoStatus, dataPag, req.aluno.id);

  res.json({ sucesso: true, status_pagamento: novoStatus, data_pagamento: dataPag });
});

// Logout da Área do Inscrito
app.post("/api/aluno/logout", autenticarAluno, (req, res) => {
  db.prepare("UPDATE inscricoes SET token_sessao = NULL WHERE id = ?").run(req.aluno.id);
  res.json({ sucesso: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
});