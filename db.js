const Database = require("better-sqlite3");
const db = new Database("banco.db");

// Ativa a checagem de chaves estrangeiras. Sem isso, o "ON DELETE CASCADE"
// declarado lá embaixo (a ligação entre "inscritos" e "inscricoes") não tem
// efeito nenhum - o SQLite ignora silenciosamente qualquer FOREIGN KEY se
// essa opção não for ligada em cada conexão aberta com o banco.
db.pragma("foreign_keys = ON");

// ============================================================================
// TRAVA DE SEGURANÇA - MODELO ANTIGO DETECTADO
// ============================================================================
// Até aqui, o banco guardava os dados de cada pessoa (nome, CPF, e-mail,
// senha) DUPLICADOS em cada linha de "inscricoes" - se alguém se inscrevesse
// em 3 cursos, os mesmos dados apareciam 3 vezes, em 3 linhas diferentes, e
// nada garantia que ficassem sempre iguais entre si. A partir de agora, esses
// dados vivem uma única vez na tabela "inscritos" (identificada pelo CPF), e
// "inscricoes" só aponta pra ela.
//
// Se o banco já existir e ainda estiver no formato ANTIGO, o servidor recusa
// iniciar em vez de rodar código novo contra um formato que ele não entende
// mais (o que geraria erros confusos, ou pior, dados incoerentes). O jeito de
// resolver é rodar, uma única vez, o script abaixo:
//
//     node migrar_para_inscritos.js
//
// Esse script NUNCA apaga dados - ele reorganiza as tabelas antigas nas
// tabelas novas e guarda as antigas com outro nome, como backup, dentro do
// próprio banco (veja os comentários do arquivo pra entender cada passo).
// ============================================================================
function bancoEstaNoFormatoAntigo() {
  const tabelaExiste =
    db
      .prepare("SELECT COUNT(*) AS total FROM sqlite_master WHERE type='table' AND name='inscricoes'")
      .get().total > 0;
  if (!tabelaExiste) return false; // banco novo, do zero - não existe formato antigo pra detectar

  const colunas = db.prepare("PRAGMA table_info(inscricoes)").all().map((c) => c.name);
  const temColunaCpfAntiga = colunas.includes("cpf");
  const temColunaInscritoId = colunas.includes("inscrito_id");
  return temColunaCpfAntiga && !temColunaInscritoId;
}

if (bancoEstaNoFormatoAntigo()) {
  console.error("=".repeat(78));
  console.error("[ERRO] O banco de dados ainda está no formato ANTIGO (pré-unificação por CPF).");
  console.error("O servidor não pode continuar, porque o código atual espera o formato novo.");
  console.error("");
  console.error("Rode uma vez, na pasta do projeto:");
  console.error("    node migrar_para_inscritos.js");
  console.error("");
  console.error("Esse script NUNCA apaga dados - ele reorganiza as tabelas antigas em novas");
  console.error("tabelas e guarda as antigas com outro nome, como backup, dentro do mesmo banco.");
  console.error("=".repeat(78));
  process.exit(1);
}

// ============================================================================
// "inscritos" - UMA LINHA POR PESSOA, identificada pelo CPF (que é único: o
// próprio banco recusa duas linhas com o mesmo CPF, em vez de depender só do
// código pra garantir isso). Substitui a antiga tabela "usuarios_aluno" e os
// dados de pessoa que antes ficavam duplicados em cada linha de "inscricoes".
// O CPF é guardado só com os 11 dígitos (sem ponto/traço) - é isso que
// permite um índice de verdade nas buscas por CPF (login, "esqueci minha
// senha", verificação de cadastro duplicado etc.); a formatação com ponto e
// traço é reaplicada na hora de responder pro navegador (função
// "formatarCpf", em server.js), então visualmente nada muda pra quem usa o site.
// ============================================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS inscritos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cpf TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    empresa TEXT,
    senha_hash TEXT,
    -- Este campo existe só por compatibilidade com bancos migrados de antes
    -- (coluna antiga). A partir de agora o sistema NUNCA mais grava senha em
    -- texto puro aqui - só o hash (acima) é salvo. Manter a coluna (sempre
    -- NULL daqui pra frente) evita precisar reconstruir a tabela; ela não é
    -- lida nem devolvida por nenhuma rota.
    senha_plana_inicial TEXT,
    troca_senha_obrigatoria INTEGER DEFAULT 1,
    token_sessao TEXT,
    token_redefinicao_senha TEXT,
    token_redefinicao_expira TEXT,
    ultimo_login TEXT,
    criado_em TEXT NOT NULL
  )
`);

// ============================================================================
// "inscricoes" - UMA LINHA POR CURSO EM QUE A PESSOA SE INSCREVEU. Não guarda
// mais nenhum dado da pessoa (isso agora vive só em "inscritos") - só aponta
// pra ela através de "inscrito_id". "ON DELETE CASCADE" garante que, se uma
// pessoa inteira for excluída de "inscritos" (exclusão de cadastro no painel
// admin), todas as inscrições dela em qualquer curso somem automaticamente
// junto - sem precisar apagar tabela por tabela na mão.
// ============================================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS inscricoes (
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

db.exec(`
  CREATE TABLE IF NOT EXISTS cursos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    vagas INTEGER NOT NULL,
    preco REAL DEFAULT 3200.00,
    descricao TEXT,
    carga_horaria TEXT,
    data_evento TEXT,
    requisitos TEXT
  )
`);

function adicionarColuna(tabela, coluna, tipo) {
  try {
    db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${tipo}`);
  } catch (erro) {
    if (!erro.message.includes("duplicate column")) throw erro;
  }
}

adicionarColuna("cursos", "preco", "REAL DEFAULT 3200.00");
adicionarColuna("cursos", "descricao", "TEXT");
adicionarColuna("cursos", "carga_horaria", "TEXT");
adicionarColuna("cursos", "data_evento", "TEXT");
adicionarColuna("cursos", "data_fim_curso", "TEXT");
adicionarColuna("cursos", "requisitos", "TEXT");

// ============================================================================
// Índices - só ACELERAM buscas que já existem, nunca alteram ou apagam
// nenhum dado ("CREATE INDEX IF NOT EXISTS" não faz nada se o índice já
// existir). Como o CPF agora é guardado normalizado (só dígitos), a busca
// "WHERE cpf = ?" usa o índice de verdade - antes disso, o código precisava
// tirar pontuação na hora da busca (REPLACE(REPLACE(REPLACE(...)))), o que
// IMPEDIA o SQLite de usar qualquer índice na coluna.
// ============================================================================
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_inscritos_cpf ON inscritos(cpf)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_inscritos_token_sessao ON inscritos(token_sessao)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_inscritos_email_lower ON inscritos(LOWER(email))`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_inscricoes_inscrito ON inscricoes(inscrito_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_inscricoes_curso ON inscricoes(curso)`);

const upsertCurso = db.prepare(`
  INSERT INTO cursos (id, nome, vagas, preco, descricao, carga_horaria, data_evento, data_fim_curso, requisitos)
  VALUES (@id, @nome, @vagas, @preco, @descricao, @carga_horaria, @data_evento, @data_fim_curso, @requisitos)
  ON CONFLICT(id) DO UPDATE SET
    nome = excluded.nome,
    vagas = excluded.vagas,
    preco = excluded.preco,
    descricao = excluded.descricao,
    carga_horaria = excluded.carga_horaria,
    data_evento = excluded.data_evento,
    data_fim_curso = excluded.data_fim_curso,
    requisitos = excluded.requisitos
`);

const cursos = [
  {
    id: "viveiristas",
    nome: "Encontro de Viveiristas",
    vagas: 2,
    preco: 3200.00,
    descricao: "Encontro voltado a produtores de mudas de videira, com palestras técnicas e troca de experiências.<br><br><strong>💰 Investimento:</strong> R$ 3.200,00",
    carga_horaria: "8 horas",
    data_evento: "15/10/2026",
    data_fim_curso: "2026-10-15",
    requisitos: "Ser produtor ou colaborador de viveiro associado à Apassul.",
  },
  {
    id: "sementes",
    nome: "Legislação de Sementes e Mudas",
    vagas: 50,
    preco: 3200.00,
    descricao: "Curso sobre a legislação brasileira de produção e comercialização de sementes e mudas.<br><br><strong>💰 Investimento:</strong> R$ 3.200,00",
    carga_horaria: "16 horas",
    data_evento: "20/10/2026",
    data_fim_curso: "2026-10-20",
    requisitos: "Nenhum pré-requisito.",
  },
  {
    id: "rastreabilidade",
    nome: "Rastreabilidade da Aveia",
    vagas: 50,
    preco: 3200.00,
    descricao: "Apresenta o Programa de Rastreabilidade e Valorização da Origem da Aveia Granífera.<br><br><strong>💰 Investimento:</strong> R$ 3.200,00",
    carga_horaria: "4 horas",
    data_evento: "05/11/2026",
    data_fim_curso: "2026-11-05",
    requisitos: "Nenhum pré-requisito.",
  },
  {
    id: "lideranca-basaglia",
    nome: "Treinamento - Liderança na Prática: O que separa quem Lidera de quem só Ocupa o Cargo",
    vagas: 30,
    preco: 3200.00,
    descricao: `Treinamento exclusivo com <strong>Ricardo Basaglia</strong>, Mestre em Administração de Empresas pela FGV/EAESP com extensão em Behavioral Science of Management pela Universidade de Yale, iniciou sua carreira na tecnologia, destacando-se em projetos de transformação digital. Seu currículo também conta com formações na Harvard Business School e na Yale School of Management.

<strong>CEO Brasil da Michael Page, maior empresa de recrutamento de executivos do Brasil e América Latina,</strong> é reconhecido como o maior nome em recrutamento e seleção profissional do país. Além de ser colunista do Estadão e da Rádio Eldorado. Impacta mensalmente mais de 7 milhões de pessoas compartilhando lições de carreira, liderança e desenvolvimento diariamente.

<strong>Conteúdo programático</strong>

<strong>Encontro 1. O que mudou no trabalho e o que isso cobra de quem lidera</strong>
Contexto das transformações recentes no ambiente de trabalho: inteligência artificial, velocidade de mudança, novas expectativas dos profissionais e convivência entre gerações. Diagnóstico individual das práticas de liderança de cada participante, distinguindo as que ainda operam sob o modelo do gestor detentor de todas as respostas e as que já operam sob o modelo de contexto, prioridade e decisão sob incerteza.

<strong>Encontro 2. Decidir e delegar quando não existe resposta pronta</strong>
Tomada de decisão com informação incompleta e sua comunicação ao time. Definição de prioridades em cenário de múltiplas urgências. Delegação efetiva e os dois extremos a evitar: o controle excessivo e a ausência. Diferença entre autonomia e abandono.

<strong>Encontro 3. As conversas que a maioria dos gestores evita</strong>
Feedback, cobrança de resultado, alinhamento de expectativas e gestão de conflitos. Condução de conversas difíceis com preservação da relação. Discordância produtiva. Construção de ambiente em que o time comunica a verdade ao gestor.

<strong>Encontro 4. Construir um time que performa sem depender do líder</strong>
Transição do papel de melhor executor para o de criador de condições de performance. Desenvolvimento e reconhecimento de pessoas. Cultura no cotidiano: comportamentos que o gestor reforça e comportamentos que tolera.

<strong>📍 Treinamento Online</strong>

<strong>🕑 Data e horário dos encontros:</strong>
17 de Novembro, das 16h30 às 18h
15 de Dezembro, das 16h30 às 18h
16 de Fevereiro, das 16h30 às 18h
16 de Março, das 16h30 às 18h

<strong>💰 Investimento:</strong> R$ 3.200,00

<strong>✅ Para confirmar sua inscrição, o comprovante de pagamento deve ser encaminhado para:</strong> liliane@apassul.com.br

<strong>🚨 Vagas limitadas!</strong>

<strong>🗓️ Data limite para inscrições:</strong> 15 de outubro

<strong>Para mais informações:</strong>
👤 Arthur Machado - Desenvolvedor de Mercado Soja e Trigo
arthurmachado@apassul.com.br | (55) 9.9720-6633`,
    carga_horaria: "6 horas (4 encontros de 1h30)",
    data_evento: "17/11, 15/12, 16/02 e 16/03 - 16h30 às 18h",
    data_fim_curso: "2027-03-16",
    requisitos: "Nenhum pré-requisito específico.",
  },
];

cursos.forEach((curso) => upsertCurso.run(curso));

module.exports = db;
