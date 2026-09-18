require("dotenv").config();
const express = require("express");
const basicAuth = require("express-basic-auth");
const db = require("./db");
const { criarPreferenciaPagamento, consultarPagamento } = require("./mp");

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

  const stmt = db.prepare(`
    INSERT INTO inscricoes
      (nome, email, curso, data, empresa, telefone, cpf, metodo_pagamento, email_recibo, aceite_termos, vencimento_boleto, status_pagamento, valor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const infoInsercao = stmt.run(
    nome, email, curso, new Date().toISOString(),
    empresa, telefone, cpf, metodoPagamento, emailRecibo,
    aceiteTermos ? 1 : 0,
    metodoPagamento === "boleto" ? (vencimentoBoleto || null) : null,
    "pendente",
    valorInscricao
  );

  const inscricaoId = infoInsercao.lastInsertRowid;

  console.log(`Nova inscrição em "${cursoInfo.nome}" (ID ${inscricaoId}):`, nome, email);

  // Integração com Mercado Pago: criação de preferência e redirecionamento direto
  let initPoint = null;
  let modoSimulado = false;

  if (metodoPagamento === "pix" || metodoPagamento === "boleto") {
    try {
      const baseUrl = getBaseUrl(req);
      const resultadoMP = await criarPreferenciaPagamento({
        inscricaoId,
        curso: cursoInfo,
        participante: { nome, email, telefone, cpf },
        metodoPagamento,
        vencimentoBoleto,
        baseUrl,
      });

      modoSimulado = Boolean(resultadoMP.modoSimulado);
      initPoint = resultadoMP.init_point || resultadoMP.sandbox_init_point;

      if (resultadoMP.id || initPoint) {
        db.prepare(`
          UPDATE inscricoes
          SET mp_preference_id = ?, mp_init_point = ?
          WHERE id = ?
        `).run(resultadoMP.id || null, initPoint || null, inscricaoId);
      }
    } catch (errMP) {
      console.error("Aviso: Falha ao gerar preferência do Mercado Pago:", errMP.message);
    }
  }

  res.json({
    sucesso: true,
    id: inscricaoId,
    metodoPagamento,
    initPoint,
    modoSimulado,
  });
});

// Endpoint público para exibir detalhes da inscrição na tela de confirmação
app.get("/inscricoes/:id", (req, res) => {
  const { id } = req.params;
  const inscricao = db.prepare(`
    SELECT inscricoes.id, inscricoes.nome, inscricoes.email, inscricoes.metodo_pagamento,
           inscricoes.vencimento_boleto, inscricoes.status_pagamento, inscricoes.valor,
           inscricoes.mp_init_point, cursos.nome AS nome_curso
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
        }
      }
    } catch (err) {
      console.error("[Webhook Mercado Pago] Erro no processamento do webhook:", err.message);
    }
  }

  // Mercado Pago espera status 200/201 como confirmação de recebimento
  res.status(200).send("OK");
});

app.get("/admin/inscricoes", protegerAdmin, (req, res) => {
  const todas = db.prepare("SELECT * FROM inscricoes ORDER BY data DESC").all();
  res.json(todas);
});

// Atualização manual do status de pagamento pelo administrador (ex: confirmação de depósito bancário)
app.patch("/admin/inscricoes/:id/status", protegerAdmin, (req, res) => {
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

  res.json({ sucesso: true, id, status_pagamento });
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
});