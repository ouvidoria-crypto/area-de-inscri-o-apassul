// ============================================================================
// MIGRAÇÃO PARA O MODELO UNIFICADO POR CPF - roda UMA VEZ, na mão, quando
// você decidir migrar para o novo modelo de dados ("inscritos" + "inscricoes").
//
// POR QUE ISSO EXISTE: até aqui, os dados de cada pessoa (nome, CPF, e-mail,
// telefone, senha) ficavam duplicados em cada linha de "inscricoes" - se
// alguém se inscrevia em 3 cursos, os mesmos dados apareciam 3 vezes, e uma
// tabela paralela ("usuarios_aluno") tentava manter tudo sincronizado a cada
// login/inscrição/troca de senha. Isso foi a causa raiz de alguns bugs reais
// que o site já teve (cadastro "não reconhecido" na hora de logar, por
// exemplo). O modelo novo guarda os dados de cada PESSOA uma única vez (na
// tabela "inscritos", identificada pelo CPF) e cada CURSO em que ela se
// inscreveu vira uma linha em "inscricoes", que só aponta pra pessoa.
//
// O QUE ESTE SCRIPT FAZ (e o que ele NUNCA faz):
//   1. Confere se a migração já não foi feita antes (se sim, para sem mexer em nada).
//   2. Confere se TODAS as inscrições atuais têm um CPF válido (11 dígitos).
//      Se alguma não tiver, o script para ANTES de mudar qualquer coisa e
//      mostra exatamente quais inscrições precisam ser corrigidas primeiro
//      (pelo painel admin, por exemplo) - use "node migrar_para_inscritos.js --checar"
//      pra só conferir isso, sem pedir confirmação de migração de verdade.
//   3. Pede confirmação digitada ("SIM") antes de fazer qualquer alteração.
//   4. NUNCA apaga as tabelas antigas: renomeia "inscricoes" e "usuarios_aluno"
//      para "inscricoes_legado_<data>" e "usuarios_aluno_legado_<data>" - elas
//      continuam no banco, intactas, como backup, e você pode consultá-las a
//      qualquer momento com qualquer visualizador de SQLite.
//   5. Cria as tabelas novas ("inscritos" e "inscricoes") já com o schema
//      definido em db.js, e copia todos os dados pra elas.
//   6. Preserva o ID original de cada inscrição (importante: o código do
//      certificado de conclusão, tipo "APS-2026-0007-1234", é gerado a
//      partir do ID da inscrição - se os IDs mudassem, certificados já
//      emitidos ou enviados por e-mail parariam de bater com o certificado
//      exibido no site).
//   7. Roda tudo dentro de uma única transação: ou a migração toda funciona,
//      ou (se algo falhar no meio) nada é alterado.
//
// COMO RODAR (no terminal, dentro da pasta do projeto):
//   node migrar_para_inscritos.js --checar     (só confere, não muda nada)
//   node migrar_para_inscritos.js              (migração de verdade, pede "SIM")
//
// DEPOIS DE RODAR: o servidor (node server.js) passa a usar automaticamente
// o novo formato - não precisa fazer mais nada além de rodar este script uma vez.
// ============================================================================

const readline = require("readline");
const Database = require("better-sqlite3");

const db = new Database("banco.db");
const apenasChecar = process.argv.includes("--checar");

function normalizarCpf(cpf) {
  return (cpf || "").toString().replace(/\D/g, "");
}

function confirmar(pergunta) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(pergunta, (resposta) => {
      rl.close();
      resolve(resposta.trim().toUpperCase() === "SIM");
    });
  });
}

function tabelaExiste(nome) {
  return db.prepare(
    "SELECT COUNT(*) AS total FROM sqlite_master WHERE type='table' AND name = ?"
  ).get(nome).total > 0;
}

function colunasDe(tabela) {
  return db.prepare(`PRAGMA table_info(${tabela})`).all().map((c) => c.name);
}

async function main() {
  if (!tabelaExiste("inscricoes")) {
    console.log('Não existe nenhuma tabela "inscricoes" neste banco ainda - nada para migrar.');
    console.log('O servidor vai criar o schema novo sozinho, na primeira vez que rodar (node server.js).');
    process.exit(0);
  }

  const colunasInscricoes = colunasDe("inscricoes");
  const jaEstaNoFormatoNovo = colunasInscricoes.includes("inscrito_id");

  if (jaEstaNoFormatoNovo) {
    console.log('Este banco já está no formato novo (a tabela "inscricoes" já tem "inscrito_id").');
    console.log("Nada foi alterado - a migração já tinha sido feita antes.");
    process.exit(0);
  }

  if (!colunasInscricoes.includes("cpf")) {
    console.error('[ERRO] A tabela "inscricoes" não tem coluna "cpf" nem "inscrito_id" - formato desconhecido.');
    console.error("Este script não sabe migrar esse formato. Fale com quem fez a última alteração no banco antes de continuar.");
    process.exit(1);
  }

  // ==========================================================================
  // PASSO 1: pré-checagem - toda inscrição precisa ter um CPF válido (11
  // dígitos) pra virar uma pessoa em "inscritos" (que exige CPF único e
  // obrigatório). Se alguma não tiver, paramos aqui, SEM alterar nada, e
  // mostramos exatamente o que precisa ser corrigido antes.
  // ==========================================================================
  const todasInscricoes = db.prepare("SELECT * FROM inscricoes ORDER BY id ASC").all();
  const semCpfValido = todasInscricoes.filter((i) => normalizarCpf(i.cpf).length !== 11);

  console.log(`\nTotal de inscrições encontradas: ${todasInscricoes.length}`);

  if (semCpfValido.length > 0) {
    console.error(`\n[ERRO] ${semCpfValido.length} inscrição(ões) não têm um CPF válido (11 dígitos) e por isso não podem virar uma "pessoa" no modelo novo:\n`);
    semCpfValido.forEach((i) => {
      console.error(`  - Inscrição #${i.id}: nome="${i.nome}", email="${i.email}", cpf="${i.cpf || "(vazio)"}"`);
    });
    console.error("\nCorrija essas inscrições primeiro (pelo painel admin, editando/completando o CPF, ou excluindo a inscrição se for teste/lixo) e rode este script de novo.");
    console.error("Nenhuma alteração foi feita no banco.");
    process.exit(1);
  }

  console.log("Todas as inscrições têm um CPF válido - pode prosseguir.");

  // Agrupa por CPF pra ver quantas PESSOAS distintas existem (uma pessoa pode
  // ter mais de uma inscrição, em cursos diferentes).
  const cpfsUnicos = new Set(todasInscricoes.map((i) => normalizarCpf(i.cpf)));
  console.log(`Isso corresponde a ${cpfsUnicos.size} pessoa(s) distinta(s) pelo CPF.`);

  const existeUsuariosAluno = tabelaExiste("usuarios_aluno");
  const totalUsuariosAluno = existeUsuariosAluno
    ? db.prepare("SELECT COUNT(*) AS total FROM usuarios_aluno").get().total
    : 0;
  console.log(`Contas de login existentes (tabela antiga "usuarios_aluno"): ${totalUsuariosAluno}`);

  // Avisa (sem bloquear) quando o mesmo CPF aparece com nomes diferentes em
  // inscrições diferentes - pode ser um apelido/grafia levemente diferente,
  // ou um erro de digitação de CPF numa das inscrições. A migração usa os
  // dados da inscrição MAIS RECENTE nesse caso; vale conferir depois no painel.
  const nomesPorCpf = new Map();
  todasInscricoes.forEach((i) => {
    const cpfNorm = normalizarCpf(i.cpf);
    if (!nomesPorCpf.has(cpfNorm)) nomesPorCpf.set(cpfNorm, new Set());
    nomesPorCpf.get(cpfNorm).add((i.nome || "").trim().toLowerCase());
  });
  const cpfsComNomesDivergentes = [...nomesPorCpf.entries()].filter(([, nomes]) => nomes.size > 1);
  if (cpfsComNomesDivergentes.length > 0) {
    console.log(`\n[AVISO] ${cpfsComNomesDivergentes.length} CPF(s) aparecem com nomes diferentes em inscrições diferentes:`);
    cpfsComNomesDivergentes.forEach(([cpfNorm, nomes]) => {
      console.log(`  - CPF ${cpfNorm}: ${[...nomes].join(" / ")}`);
    });
    console.log("A migração vai usar os dados da inscrição mais recente de cada CPF. Vale conferir esses casos depois no painel admin.\n");
  }

  if (apenasChecar) {
    console.log("\n(Rodado com --checar: só a conferência acima foi feita, nada foi alterado no banco.)");
    process.exit(0);
  }

  console.log("\nEste script vai:");
  console.log('  1. Renomear as tabelas atuais "inscricoes" e "usuarios_aluno" (backup, nada é apagado).');
  console.log('  2. Criar as tabelas novas "inscritos" e "inscricoes".');
  console.log(`  3. Migrar ${todasInscricoes.length} inscrição(ões) de ${cpfsUnicos.size} pessoa(s) para o formato novo.`);
  console.log('  4. Manter os mesmos números de ID em "inscricoes" (importante para os certificados já emitidos).\n');

  const confirmado = await confirmar('Digite "SIM" (em maiúsculas) para confirmar e migrar: ');
  if (!confirmado) {
    console.log("\nOperação cancelada. Nada foi alterado no banco.");
    process.exit(0);
  }

  const agora = new Date().toISOString();
  const sufixoBackup = agora.replace(/[^0-9]/g, "").slice(0, 14); // ex: 20260924154500

  const executarMigracao = db.transaction(() => {
    // ---- 1. Backup: renomeia as tabelas antigas (nunca apaga) ----
    db.exec(`ALTER TABLE inscricoes RENAME TO inscricoes_legado_${sufixoBackup}`);
    if (existeUsuariosAluno) {
      db.exec(`ALTER TABLE usuarios_aluno RENAME TO usuarios_aluno_legado_${sufixoBackup}`);
    }

    // Quando uma tabela é renomeada, os ÍNDICES dela continuam existindo com
    // o MESMO NOME de antes (só passam a apontar pra tabela renomeada) - por
    // isso, antes de criar os índices novos (mais abaixo), removemos os
    // índices antigos que tinham o mesmo nome de um índice novo. Isso NUNCA
    // apaga dado nenhum - um índice é só um atalho de busca, não guarda
    // informação própria; a tabela de backup continua com todos os dados.
    ["idx_inscricoes_cpf", "idx_inscricoes_curso", "idx_inscricoes_token_sessao", "idx_inscricoes_email_lower",
     "idx_usuarios_aluno_cpf", "idx_usuarios_aluno_token_sessao", "idx_usuarios_aluno_email_lower"]
      .forEach((nomeIndice) => db.exec(`DROP INDEX IF EXISTS ${nomeIndice}`));

    // ---- 2. Cria as tabelas novas (mesmo schema do db.js) ----
    db.exec(`
      CREATE TABLE inscritos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cpf TEXT NOT NULL UNIQUE,
        nome TEXT NOT NULL,
        email TEXT NOT NULL,
        telefone TEXT,
        empresa TEXT,
        senha_hash TEXT,
        senha_plana_inicial TEXT,
        troca_senha_obrigatoria INTEGER DEFAULT 1,
        token_sessao TEXT,
        token_redefinicao_senha TEXT,
        token_redefinicao_expira TEXT,
        ultimo_login TEXT,
        criado_em TEXT NOT NULL
      )
    `);

    db.exec(`
      CREATE TABLE inscricoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inscrito_id INTEGER NOT NULL,
        curso TEXT NOT NULL,
        data TEXT NOT NULL,
        metodo_pagamento TEXT,
        email_recibo TEXT,
        aceite_termos INTEGER,
        vencimento_boleto TEXT,
        status_pagamento TEXT DEFAULT 'pendente',
        valor REAL DEFAULT 3200.00,
        mp_preference_id TEXT,
        mp_payment_id TEXT,
        mp_init_point TEXT,
        data_pagamento TEXT,
        email_credenciais_enviado INTEGER DEFAULT 0,
        data_envio_credenciais TEXT,
        FOREIGN KEY (inscrito_id) REFERENCES inscritos(id) ON DELETE CASCADE,
        FOREIGN KEY (curso) REFERENCES cursos(id)
      )
    `);

    db.exec(`CREATE UNIQUE INDEX idx_inscritos_cpf ON inscritos(cpf)`);
    db.exec(`CREATE INDEX idx_inscritos_token_sessao ON inscritos(token_sessao)`);
    db.exec(`CREATE INDEX idx_inscritos_email_lower ON inscritos(LOWER(email))`);
    db.exec(`CREATE INDEX idx_inscricoes_inscrito ON inscricoes(inscrito_id)`);
    db.exec(`CREATE INDEX idx_inscricoes_curso ON inscricoes(curso)`);

    // ---- 3. Monta o "perfil" de cada pessoa (uma vez por CPF), preferindo
    // os dados de "usuarios_aluno" (a tabela que já fazia esse papel
    // unificado) e completando com a inscrição mais recente daquele CPF. ----
    const usuariosAlunoAntigos = existeUsuariosAluno
      ? db.prepare(`SELECT * FROM usuarios_aluno_legado_${sufixoBackup}`).all()
      : [];
    const usuarioAlunoPorCpf = new Map();
    usuariosAlunoAntigos.forEach((u) => {
      const cpfNorm = normalizarCpf(u.cpf);
      if (cpfNorm.length === 11) usuarioAlunoPorCpf.set(cpfNorm, u);
    });

    const inscricoesAntigas = db.prepare(`SELECT * FROM inscricoes_legado_${sufixoBackup} ORDER BY id ASC`).all();
    const inscricoesPorCpf = new Map();
    inscricoesAntigas.forEach((i) => {
      const cpfNorm = normalizarCpf(i.cpf);
      if (!inscricoesPorCpf.has(cpfNorm)) inscricoesPorCpf.set(cpfNorm, []);
      inscricoesPorCpf.get(cpfNorm).push(i);
    });

    const inserirInscrito = db.prepare(`
      INSERT INTO inscritos
        (cpf, nome, email, telefone, empresa, senha_hash, senha_plana_inicial, troca_senha_obrigatoria,
         token_sessao, token_redefinicao_senha, token_redefinicao_expira, ultimo_login, criado_em)
      VALUES
        (@cpf, @nome, @email, @telefone, @empresa, @senha_hash, @senha_plana_inicial, @troca_senha_obrigatoria,
         @token_sessao, @token_redefinicao_senha, @token_redefinicao_expira, @ultimo_login, @criado_em)
    `);

    const idInscritoPorCpf = new Map();

    for (const [cpfNorm, inscricoesDaPessoa] of inscricoesPorCpf.entries()) {
      const usuarioAluno = usuarioAlunoPorCpf.get(cpfNorm);
      // A inscrição mais recente dessa pessoa - usada pra completar qualquer
      // dado que não estivesse em "usuarios_aluno".
      const maisRecente = inscricoesDaPessoa[inscricoesDaPessoa.length - 1];

      const info = inserirInscrito.run({
        cpf: cpfNorm,
        nome: usuarioAluno?.nome || maisRecente.nome,
        email: (usuarioAluno?.email || maisRecente.email || "").trim().toLowerCase(),
        telefone: usuarioAluno?.telefone || maisRecente.telefone || null,
        empresa: usuarioAluno?.empresa || maisRecente.empresa || null,
        senha_hash: usuarioAluno?.senha_hash || maisRecente.senha_hash || null,
        // A senha em texto puro não é mais migrada pra cá de propósito (o
        // sistema não guarda mais senha em texto puro - só o hash acima, que
        // já é suficiente pra pessoa continuar logando normalmente).
        senha_plana_inicial: null,
        troca_senha_obrigatoria:
          usuarioAluno?.troca_senha_obrigatoria != null
            ? usuarioAluno.troca_senha_obrigatoria
            : (maisRecente.troca_senha_obrigatoria != null ? maisRecente.troca_senha_obrigatoria : 1),
        token_sessao: usuarioAluno?.token_sessao || maisRecente.token_sessao || null,
        token_redefinicao_senha: usuarioAluno?.token_redefinicao_senha || null,
        token_redefinicao_expira: usuarioAluno?.token_redefinicao_expira || null,
        ultimo_login: usuarioAluno?.ultimo_login || maisRecente.ultimo_login || null,
        criado_em: usuarioAluno?.criado_em || maisRecente.data || agora,
      });

      idInscritoPorCpf.set(cpfNorm, info.lastInsertRowid);
    }

    // Cobre o caso raro de uma conta de login (em "usuarios_aluno") que não
    // tenha NENHUMA inscrição atual correspondente àquele CPF (por exemplo,
    // se a última inscrição da pessoa foi excluída, mas a conta nunca foi
    // limpa) - sem isso, essa pessoa perderia o login no modelo novo, mesmo
    // com a tabela antiga preservada como backup. Aqui ela também vira uma
    // linha em "inscritos", só que sem nenhuma inscrição associada ainda.
    for (const [cpfNorm, usuarioAluno] of usuarioAlunoPorCpf.entries()) {
      if (idInscritoPorCpf.has(cpfNorm)) continue;

      const info = inserirInscrito.run({
        cpf: cpfNorm,
        nome: usuarioAluno.nome,
        email: (usuarioAluno.email || "").trim().toLowerCase(),
        telefone: usuarioAluno.telefone || null,
        empresa: usuarioAluno.empresa || null,
        senha_hash: usuarioAluno.senha_hash || null,
        senha_plana_inicial: null, // idem: não migramos mais senha em texto puro
        troca_senha_obrigatoria: usuarioAluno.troca_senha_obrigatoria != null ? usuarioAluno.troca_senha_obrigatoria : 1,
        token_sessao: usuarioAluno.token_sessao || null,
        token_redefinicao_senha: usuarioAluno.token_redefinicao_senha || null,
        token_redefinicao_expira: usuarioAluno.token_redefinicao_expira || null,
        ultimo_login: usuarioAluno.ultimo_login || null,
        criado_em: usuarioAluno.criado_em || agora,
      });

      idInscritoPorCpf.set(cpfNorm, info.lastInsertRowid);
    }

    // ---- 4. Migra cada inscrição, preservando o ID original ----
    const inserirInscricao = db.prepare(`
      INSERT INTO inscricoes
        (id, inscrito_id, curso, data, metodo_pagamento, email_recibo, aceite_termos, vencimento_boleto,
         status_pagamento, valor, mp_preference_id, mp_payment_id, mp_init_point, data_pagamento,
         email_credenciais_enviado, data_envio_credenciais)
      VALUES
        (@id, @inscrito_id, @curso, @data, @metodo_pagamento, @email_recibo, @aceite_termos, @vencimento_boleto,
         @status_pagamento, @valor, @mp_preference_id, @mp_payment_id, @mp_init_point, @data_pagamento,
         @email_credenciais_enviado, @data_envio_credenciais)
    `);

    inscricoesAntigas.forEach((i) => {
      const cpfNorm = normalizarCpf(i.cpf);
      inserirInscricao.run({
        id: i.id,
        inscrito_id: idInscritoPorCpf.get(cpfNorm),
        curso: i.curso,
        data: i.data,
        metodo_pagamento: i.metodo_pagamento || null,
        email_recibo: i.email_recibo || null,
        aceite_termos: i.aceite_termos != null ? i.aceite_termos : null,
        vencimento_boleto: i.vencimento_boleto || null,
        status_pagamento: i.status_pagamento || "pendente",
        valor: i.valor != null ? i.valor : 3200.0,
        mp_preference_id: i.mp_preference_id || null,
        mp_payment_id: i.mp_payment_id || null,
        mp_init_point: i.mp_init_point || null,
        data_pagamento: i.data_pagamento || null,
        email_credenciais_enviado: i.email_credenciais_enviado != null ? i.email_credenciais_enviado : 0,
        data_envio_credenciais: i.data_envio_credenciais || null,
      });
    });

    // ---- 5. Corrige o contador de autoincremento de "inscricoes", já que
    // inserimos com IDs explícitos - sem isso, a PRÓXIMA inscrição nova
    // tentaria reusar um ID já existente. ----
    const maiorId = db.prepare("SELECT MAX(id) AS maior FROM inscricoes").get().maior || 0;
    const jaTemSequencia = db.prepare("SELECT COUNT(*) AS total FROM sqlite_sequence WHERE name = 'inscricoes'").get().total > 0;
    if (jaTemSequencia) {
      db.prepare("UPDATE sqlite_sequence SET seq = ? WHERE name = 'inscricoes'").run(maiorId);
    } else {
      db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES ('inscricoes', ?)").run(maiorId);
    }

    return { totalPessoas: idInscritoPorCpf.size, totalInscricoes: inscricoesAntigas.length };
  });

  try {
    const resultado = executarMigracao();
    console.log("\n✅ Migração concluída com sucesso!");
    console.log(`   ${resultado.totalPessoas} pessoa(s) criada(s) em "inscritos".`);
    console.log(`   ${resultado.totalInscricoes} inscrição(ões) migrada(s) para o novo formato de "inscricoes", com os mesmos IDs de antes.`);
    console.log(`   As tabelas antigas continuam no banco, como backup, com os nomes:`);
    console.log(`     - inscricoes_legado_${sufixoBackup}`);
    if (existeUsuariosAluno) console.log(`     - usuarios_aluno_legado_${sufixoBackup}`);
    console.log("\nPronto - já pode rodar o servidor normalmente (node server.js).");
  } catch (erro) {
    console.error("\n[ERRO] A migração falhou e foi revertida por completo (nada foi alterado):", erro.message);
    process.exit(1);
  }
}

main().catch((erro) => {
  console.error("\n[ERRO] Não foi possível concluir a migração:", erro.message);
  process.exit(1);
});
