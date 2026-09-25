// ============================================================================
// SCRIPT DE RESET - "começar do zero" nas inscrições, SEM mexer na estrutura
// do banco (usa o modelo atual: "inscritos" + "inscricoes", unificado por CPF).
//
// O QUE ELE FAZ:
//   1. Mostra quantas inscrições e pessoas cadastradas existem agora.
//   2. Pede confirmação digitada ("SIM") antes de fazer qualquer coisa.
//   3. Apaga TODAS as linhas de "inscricoes" e "inscritos" (os dados - as
//      tabelas continuam existindo, só ficam vazias).
//   4. NÃO mexe na tabela "cursos" - os cursos cadastrados continuam lá.
//   5. Reinicia a contagem de ID, pra próxima inscrição começar do #1 de novo.
//
// O QUE ELE NÃO FAZ:
//   - Não apaga nem recria nenhuma tabela (estrutura 100% preservada).
//   - Não mexe no .env (usuário/senha do painel admin continuam os mesmos).
//   - Não roda sozinho: só executa depois que VOCÊ digitar "SIM".
//
// COMO RODAR (no terminal, dentro da pasta do projeto):
//   node resetar_inscricoes.js
// ============================================================================

const readline = require("readline");
const Database = require("better-sqlite3");

const db = new Database("banco.db");

function confirmar(pergunta) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(pergunta, (resposta) => {
      rl.close();
      resolve(resposta.trim().toUpperCase() === "SIM");
    });
  });
}

async function main() {
  const colunas = db.prepare("PRAGMA table_info(inscricoes)").all().map((c) => c.name);
  if (!colunas.includes("inscrito_id")) {
    console.error('[ERRO] Este banco ainda está no formato ANTIGO (sem a tabela "inscritos").');
    console.error("Rode primeiro: node migrar_para_inscritos.js");
    process.exit(1);
  }

  const totalInscricoes = db.prepare("SELECT COUNT(*) AS total FROM inscricoes").get().total;
  const totalInscritos = db.prepare("SELECT COUNT(*) AS total FROM inscritos").get().total;

  console.log(`\nHoje existem ${totalInscricoes} inscrição(ões) e ${totalInscritos} pessoa(s) cadastrada(s).`);
  console.log("Este script vai APAGAR PERMANENTEMENTE todos esses dados.");
  console.log('A tabela "cursos" NÃO será alterada - seus cursos cadastrados continuam intactos.');
  console.log("O usuário e a senha do painel administrativo (no .env) também não mudam.\n");

  const confirmado = await confirmar('Digite "SIM" (em maiúsculas) para confirmar e continuar: ');
  if (!confirmado) {
    console.log("\nOperação cancelada. Nada foi alterado no banco.");
    process.exit(0);
  }

  const executarLimpeza = db.transaction(() => {
    // A ordem importa: "inscricoes" tem uma chave estrangeira pra "inscritos"
    // (com ON DELETE CASCADE) - apagar "inscritos" primeiro já levaria as
    // inscrições junto, mas apagamos as duas explicitamente por clareza.
    db.exec(`DELETE FROM inscricoes`);
    db.exec(`DELETE FROM inscritos`);
    // Reinicia o contador de ID (AUTOINCREMENT), pra próxima inscrição
    // começar do #1 de novo, como se o banco fosse novo.
    db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('inscricoes', 'inscritos')`);
  });

  executarLimpeza();

  console.log("\nPronto! Todas as inscrições e pessoas cadastradas foram apagadas.");
  console.log('A tabela "cursos" continua com todos os cursos cadastrados.');
  console.log("O painel administrativo agora vai mostrar a lista de inscritos vazia.");
}

main().catch((erro) => {
  console.error("\n[ERRO] Não foi possível limpar o banco:", erro.message);
  process.exit(1);
});
