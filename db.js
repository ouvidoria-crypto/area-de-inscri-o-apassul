const Database = require("better-sqlite3");
const db = new Database("banco.db");

// Schema completo (usado quando a tabela é criada do zero, ex: banco novo no Render)
db.exec(`
  CREATE TABLE IF NOT EXISTS inscricoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    curso TEXT NOT NULL,
    data TEXT NOT NULL,
    empresa TEXT,
    telefone TEXT,
    cpf TEXT,
    metodo_pagamento TEXT,
    email_recibo TEXT,
    aceite_termos INTEGER,
    vencimento_boleto TEXT,
    status_pagamento TEXT DEFAULT 'pendente',
    valor REAL DEFAULT 3200.00,
    mp_preference_id TEXT,
    mp_payment_id TEXT,
    mp_init_point TEXT,
    data_pagamento TEXT
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

adicionarColuna("inscricoes", "empresa", "TEXT");
adicionarColuna("inscricoes", "telefone", "TEXT");
adicionarColuna("inscricoes", "cpf", "TEXT");
adicionarColuna("inscricoes", "metodo_pagamento", "TEXT");
adicionarColuna("inscricoes", "email_recibo", "TEXT");
adicionarColuna("inscricoes", "aceite_termos", "INTEGER");
adicionarColuna("inscricoes", "vencimento_boleto", "TEXT");
adicionarColuna("inscricoes", "status_pagamento", "TEXT DEFAULT 'pendente'");
adicionarColuna("inscricoes", "valor", "REAL DEFAULT 3200.00");
adicionarColuna("inscricoes", "mp_preference_id", "TEXT");
adicionarColuna("inscricoes", "mp_payment_id", "TEXT");
adicionarColuna("inscricoes", "mp_init_point", "TEXT");
adicionarColuna("inscricoes", "data_pagamento", "TEXT");
adicionarColuna("inscricoes", "senha_hash", "TEXT");
adicionarColuna("inscricoes", "senha_plana_inicial", "TEXT");
adicionarColuna("inscricoes", "troca_senha_obrigatoria", "INTEGER DEFAULT 1");
adicionarColuna("inscricoes", "email_credenciais_enviado", "INTEGER DEFAULT 0");
adicionarColuna("inscricoes", "data_envio_credenciais", "TEXT");
adicionarColuna("inscricoes", "ultimo_login", "TEXT");
adicionarColuna("inscricoes", "token_sessao", "TEXT");

adicionarColuna("cursos", "preco", "REAL DEFAULT 3200.00");
adicionarColuna("cursos", "descricao", "TEXT");
adicionarColuna("cursos", "carga_horaria", "TEXT");
adicionarColuna("cursos", "data_evento", "TEXT");
adicionarColuna("cursos", "requisitos", "TEXT");

const upsertCurso = db.prepare(`
  INSERT INTO cursos (id, nome, vagas, preco, descricao, carga_horaria, data_evento, requisitos)
  VALUES (@id, @nome, @vagas, @preco, @descricao, @carga_horaria, @data_evento, @requisitos)
  ON CONFLICT(id) DO UPDATE SET
    nome = excluded.nome,
    vagas = excluded.vagas,
    preco = excluded.preco,
    descricao = excluded.descricao,
    carga_horaria = excluded.carga_horaria,
    data_evento = excluded.data_evento,
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
    requisitos: "Nenhum pré-requisito específico.",
  },
];

cursos.forEach((curso) => upsertCurso.run(curso));

module.exports = db;