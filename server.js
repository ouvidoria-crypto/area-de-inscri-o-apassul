const express = require("express");
const basicAuth = require("express-basic-auth");
const db = require("./db");

const app = express();

// process.env são "variáveis de ambiente": valores configurados FORA do código,
// no próprio serviço onde o programa roda. Em vez de escrever a porta ou a senha
// direto aqui, lemos daqui — e se não existir (como no seu PC agora), usamos um valor padrão.
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

app.post("/inscricoes", (req, res) => {
  const { nome, email, curso } = req.body;

  if (!nome || !email || !curso) {
    return res.status(400).json({ erro: "Preencha nome, e-mail e curso." });
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

  const stmt = db.prepare(
    "INSERT INTO inscricoes (nome, email, curso, data) VALUES (?, ?, ?, ?)"
  );
  stmt.run(nome, email, curso, new Date().toISOString());

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