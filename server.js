const express = require("express");
const basicAuth = require("express-basic-auth");
const db = require("./db");

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "apassul2026";

app.use(express.static(__dirname));
app.use(express.json());

const protegerAdmin = basicAuth({
  users: { [ADMIN_USER]: ADMIN_PASS },
  challenge: true,
  unauthorizedResponse: "Acesso negado.",
});

app.get("/cursos", (req, res) => {
  const cursos = db
    .prepare(
      `SELECT id, nome, descricao, carga_horaria, data_evento, requisitos, vagas,
        (SELECT COUNT(*) FROM inscricoes WHERE inscricoes.curso = cursos.id) AS inscritos
       FROM cursos`
    )
    .all();

  const comVagasRestantes = cursos.map((curso) => ({
    ...curso,
    vagasRestantes: curso.vagas - curso.inscritos,
  }));

  res.json(comVagasRestantes);
});

app.post("/inscricoes", (req, res) => {
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

  const stmt = db.prepare(`
    INSERT INTO inscricoes
      (nome, email, curso, data, empresa, telefone, cpf, metodo_pagamento, email_recibo, aceite_termos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    nome, email, curso, new Date().toISOString(),
    empresa, telefone, cpf, metodoPagamento, emailRecibo,
    aceiteTermos ? 1 : 0
  );

  console.log(`Nova inscrição em "${cursoInfo.nome}":`, nome, email);

  res.json({ sucesso: true });
});

app.get("/admin/inscricoes", protegerAdmin, (req, res) => {
  const todas = db.prepare("SELECT * FROM inscricoes ORDER BY data DESC").all();
  res.json(todas);
});

app.get("/admin/resumo", protegerAdmin, (req, res) => {
  const resumo = db
    .prepare(
      `SELECT cursos.id, cursos.nome, cursos.vagas,
        (SELECT COUNT(*) FROM inscricoes WHERE inscricoes.curso = cursos.id) AS inscritos
       FROM cursos`
    )
    .all();
  res.json(resumo);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});