const Database = require("better-sqlite3");
const db = new Database("banco.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS inscricoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    curso TEXT NOT NULL,
    data TEXT NOT NULL
  )
`);

// Tabela nova: cada curso tem um identificador (usado no <option value="...">
// do formulário), um nome para exibir, e um número de vagas.
db.exec(`
  CREATE TABLE IF NOT EXISTS cursos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    vagas INTEGER NOT NULL
  )
`);

// "INSERT OR IGNORE" tenta inserir, mas se já existir uma linha com esse "id"
// (chave primária), simplesmente ignora em vez de dar erro. Isso deixa seguro
// rodar este arquivo toda vez que o servidor liga, sem duplicar cursos.
const inserirCurso = db.prepare(
  "INSERT OR IGNORE INTO cursos (id, nome, vagas) VALUES (?, ?, ?)"
);

// Coloquei um número baixo de vagas em "viveiristas" (2) só para
// facilitar testar o que acontece quando um curso lota.
inserirCurso.run("viveiristas", "Encontro de Viveiristas", 2);
inserirCurso.run("sementes", "Legislação de Sementes e Mudas", 50);
inserirCurso.run("rastreabilidade", "Rastreabilidade da Aveia", 50);

module.exports = db;