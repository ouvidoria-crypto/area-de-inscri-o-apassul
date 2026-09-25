require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const basicAuth = require("express-basic-auth");
const rateLimit = require("express-rate-limit");
const db = require("./db");
const { criarPreferenciaPagamento, consultarPagamento } = require("./mp");
const {
  liberarAcessoInscrito,
  verificarSenha,
  hashSenha,
  gerarTokenSessao,
} = require("./auth_aluno");
const { enviarEmailRedefinicaoSenha } = require("./email");

const app = express();

// Faz o Express confiar no cabeçalho "X-Forwarded-For" que o proxy do Render
// (ou qualquer outro proxy reverso na frente do site) adiciona nas requisições.
// Sem isso, "req.ip" enxergaria sempre o IP interno do proxy, e não o IP real
// de quem está acessando - o que quebraria o controle de tentativas por IP
// (rate limit) logo abaixo, tratando todo mundo como se fosse a mesma pessoa.
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";

// IMPORTANTE: antes havia uma senha fixa aqui no código ("apassul2026") usada
// sempre que a variável de ambiente ADMIN_PASS não estivesse configurada no
// servidor. Isso é um risco de segurança sério: qualquer pessoa que veja este
// arquivo (por exemplo, se o repositório do projeto for visto por alguém)
// passa a conhecer a senha do painel admin, que tem CPF e dados de todos os
// inscritos. Agora, se ADMIN_PASS não estiver configurada, o servidor gera uma
// senha aleatória só para essa execução e avisa nos logs - o site continua
// funcionando, mas ninguém de fora consegue adivinhar a senha do admin.
let ADMIN_PASS = process.env.ADMIN_PASS;
if (!ADMIN_PASS || !ADMIN_PASS.trim()) {
  ADMIN_PASS = crypto.randomBytes(12).toString("base64url");
  console.warn("=".repeat(72));
  console.warn("[AVISO DE SEGURANÇA] A variável de ambiente ADMIN_PASS não foi configurada.");
  console.warn(`Uma senha temporária foi gerada só para esta execução do servidor: ${ADMIN_PASS}`);
  console.warn("Ela muda toda vez que o servidor reiniciar (por exemplo, a cada novo deploy).");
  console.warn("Configure ADMIN_USER e ADMIN_PASS nas variáveis de ambiente do Render");
  console.warn("para o painel admin ter uma senha fixa e definida por você.");
  console.warn("=".repeat(72));
}

// Compara uma senha digitada com a senha real do admin, sem vazar (pelo
// tempo gasto na comparação) pistas sobre onde a senha digitada diverge da
// correta - mesma técnica já usada aqui pra validar a assinatura do webhook
// do Mercado Pago (função "verificarAssinaturaWebhookMP" mais abaixo).
function senhaAdminConfere(senhaDigitada) {
  if (typeof senhaDigitada !== "string" || !senhaDigitada) return false;
  const bufferDigitado = Buffer.from(senhaDigitada, "utf8");
  const bufferReal = Buffer.from(ADMIN_PASS, "utf8");
  if (bufferDigitado.length !== bufferReal.length) return false;
  return crypto.timingSafeEqual(bufferDigitado, bufferReal);
}

function getBaseUrl(req) {
  if (process.env.PUBLIC_URL && process.env.PUBLIC_URL.trim()) {
    return process.env.PUBLIC_URL.trim().replace(/\/$/, "");
  }
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

// A partir da unificação por CPF, o banco guarda o CPF só com os 11 dígitos
// (sem ponto/traço) - é isso que permite usar um índice de verdade nas
// buscas (ver comentário em db.js). "normalizarCpf" tira qualquer pontuação
// de um CPF digitado ou recebido de fora; "formatarCpf" faz o caminho
// inverso, reaplicando ponto e traço, sempre que o dado sai do servidor pra
// alguma tela - assim ninguém que usa o site percebe qualquer diferença.
function normalizarCpf(cpf) {
  return (cpf || "").toString().replace(/\D/g, "");
}
function formatarCpf(cpf) {
  const digitos = normalizarCpf(cpf);
  if (digitos.length !== 11) return cpf || null;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
}

// Cabeçalhos básicos de segurança (equivalente manual a uma parte do que o
// pacote "helmet" faria). Não substitui uma Content-Security-Policy completa
// (isso exigiria revisar todo script/estilo inline do site pra não quebrar
// nada - fica como melhoria futura), mas já fecha riscos simples e comuns:
// o navegador não tenta "adivinhar" o tipo de um arquivo (nosniff), o site
// não pode ser carregado dentro de um <iframe> de outra página (evita
// "clickjacking" no formulário público e no painel admin), e menos
// informação de navegação vaza pro destino de um link.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  next();
});

// CORS: antes disso, "Access-Control-Allow-Origin: *" liberava QUALQUER site
// do mundo a chamar a API daqui pelo navegador de quem estivesse com uma aba
// aberta - sem necessidade nenhuma, já que o site e a API são servidos juntos,
// do mesmo endereço. Agora só o próprio domínio público (PUBLIC_URL) e
// endereços locais (localhost / 127.0.0.1, em qualquer porta - pra não
// atrapalhar testes no VS Code) recebem a liberação; qualquer outra origem
// simplesmente não recebe o cabeçalho, e o navegador bloqueia a leitura da
// resposta por conta própria.
const origensConhecidas = new Set(
  [process.env.PUBLIC_URL].filter(Boolean).map((u) => u.trim().replace(/\/$/, ""))
);
function origemLiberada(origem) {
  if (!origem) return false;
  if (origensConhecidas.has(origem.replace(/\/$/, ""))) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origem);
}
app.use((req, res, next) => {
  const origem = req.headers.origin;
  if (origemLiberada(origem)) {
    res.setHeader("Access-Control-Allow-Origin", origem);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const protegerAdmin = basicAuth({
  users: { [ADMIN_USER]: ADMIN_PASS },
  challenge: true,
  unauthorizedResponse: "Acesso negado.",
});

// Freio de tentativas (rate limit) contra força bruta - sem isso, alguém podia
// tentar milhares de senhas por minuto contra o login do admin ou do aluno
// sem nenhum obstáculo. "limitadorAdmin" é mais generoso porque o próprio
// painel faz várias chamadas normais em sequência ao carregar (inscrições,
// cursos, resumo); "limitadorLogin" é mais apertado porque cada tentativa ali
// É uma tentativa de senha.
const limitadorAdmin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas requisições. Aguarde alguns minutos." },
});
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." },
});
const limitadorInscricao = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas inscrições enviadas deste endereço em pouco tempo. Tente novamente mais tarde." },
});

// Aplica o freio de tentativas a toda a área administrativa (a página e a
// API), antes mesmo de checar a senha - assim uma tentativa de força bruta
// já esbarra no limite, não só numa senha errada.
app.use(["/admin", "/admin.html"], limitadorAdmin);

// IMPORTANTE: o "admin.html" precisa passar por "protegerAdmin" ANTES do
// "express.static" servir o arquivo. Sem isso, a página abre livremente pra
// qualquer um, e como as chamadas internas dela (fetch) não conseguem abrir
// a telinha de login do navegador sozinhas, o painel simplesmente falhava
// silenciosamente (erro 401) sem nunca pedir a senha. Pedindo login já na
// entrada da página, o navegador guarda a credencial e todas as chamadas
// seguintes (inscrições, cursos, excluir cadastro, etc.) funcionam.
app.get("/admin.html", protegerAdmin, (req, res, next) => next());

// ============================================================================
// CORREÇÃO DE SEGURANÇA IMPORTANTE: antes desta lista existir, a linha
// "app.use(express.static(__dirname))" logo abaixo servia a pasta INTEIRA do
// projeto pra qualquer pedido HTTP - um simples "GET /banco.db" respondia
// 200 com o banco de dados inteiro (nome, CPF, e-mail, telefone de todo mundo
// que já se inscreveu, o hash da senha e até a senha temporária em TEXTO
// PURO de quem ainda não trocou a senha padrão). O mesmo valia pro código-
// fonte inteiro do servidor (server.js, db.js, auth_aluno.js, mp.js,
// email.js) e outros arquivos internos (package.json, .env.example etc.).
// Esta lista bloqueia esses pedidos ANTES de chegar no express.static, não
// importa que o arquivo exista de verdade na mesma pasta das páginas
// públicas do site.
const CAMINHOS_BLOQUEADOS_ESTATICO = [
  /\.db(\.|$)/i, // banco.db e qualquer variação/backup (banco.db.bak etc.)
  /^\/server\.js$/,
  /^\/db\.js$/,
  /^\/auth_aluno\.js$/,
  /^\/mp\.js$/,
  /^\/email\.js$/,
  /^\/resetar_inscricoes\.js$/,
  /^\/migrar_para_inscritos\.js$/,
  /^\/package(-lock)?\.json$/,
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/\.gitattributes$/i,
  /^\/mover_env\.bat$/i,
  /^\/projeto_completo\.txt$/i,
  /^\/metadata\.json$/i,
  /^\/node_modules\//i,
  /^\/Claude outputs\//i,
];
app.use((req, res, next) => {
  if (CAMINHOS_BLOQUEADOS_ESTATICO.some((padrao) => padrao.test(req.path))) {
    return res.status(404).send("Não encontrado.");
  }
  next();
});

app.use(express.static(__dirname));

// Rota pública: só devolve as informações que quem está se inscrevendo pode ver.
// Note que "vagas" e a contagem de inscritos NÃO estão nessa consulta de propósito —
// quem preenche o formulário não deve saber quantas vagas existem ou já foram
// preenchidas (isso é uma decisão de negócio, não uma limitação técnica).
app.get("/cursos", (req, res) => {
  const cursos = db
    .prepare(
      `SELECT id, nome, preco, descricao, carga_horaria, data_evento, data_fim_curso, requisitos FROM cursos`
    )
    .all();

  res.json(cursos);
});

app.post("/inscricoes", limitadorInscricao, async (req, res) => {
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

  const emailNorm = email.trim().toLowerCase();
  const cpfNorm = normalizarCpf(cpf);

  if (cpfNorm.length !== 11) {
    return res.status(400).json({ erro: "Informe um CPF válido, com 11 dígitos." });
  }

  // Verifica se o participante já está cadastrado neste mesmo curso. A
  // identificação é feita pelo CPF - o e-mail pode mudar ou ser reaproveitado
  // por mais de uma pessoa (e-mail de setor, por exemplo), mas o CPF sempre
  // identifica a mesma pessoa de verdade.
  const inscricaoExistenteNoMesmoCurso = db.prepare(`
    SELECT inscricoes.id
    FROM inscricoes
    JOIN inscritos ON inscritos.id = inscricoes.inscrito_id
    WHERE inscricoes.curso = ? AND inscritos.cpf = ?
  `).get(curso, cpfNorm);

  if (inscricaoExistenteNoMesmoCurso) {
    return res.status(400).json({
      erro: `Você já está inscrito(a) no curso "${cursoInfo.nome}"! Acesse o Painel do Inscrito para conferir seus acessos, materiais e certificados.`,
    });
  }

  const { total } = db
    .prepare("SELECT COUNT(*) AS total FROM inscricoes WHERE curso = ?")
    .get(curso);

  if (total >= cursoInfo.vagas) {
    return res.status(400).json({ erro: `As vagas para "${cursoInfo.nome}" já se esgotaram.` });
  }

  const valorInscricao = cursoInfo.preco || 3200.00;
  const dataAtualIso = new Date().toISOString();

  // Encontra a pessoa pelo CPF (ela pode já existir, de uma inscrição
  // anterior em outro curso) ou cria o cadastro dela agora - uma única vez,
  // em "inscritos". Os dados de contato (nome/e-mail/telefone/empresa) são
  // sempre atualizados com o que a pessoa acabou de digitar, mas login/senha
  // NUNCA são mexidos aqui (isso é responsabilidade só de "liberarAcessoInscrito").
  let inscrito = db.prepare("SELECT * FROM inscritos WHERE cpf = ?").get(cpfNorm);

  if (!inscrito) {
    try {
      const infoInscrito = db.prepare(`
        INSERT INTO inscritos (cpf, nome, email, telefone, empresa, criado_em)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(cpfNorm, nome, emailNorm, telefone, empresa, dataAtualIso);
      inscrito = db.prepare("SELECT * FROM inscritos WHERE id = ?").get(infoInscrito.lastInsertRowid);
    } catch (erroInscrito) {
      // Corrida rara (duas inscrições do mesmo CPF quase ao mesmo tempo): se
      // o CPF já foi inserido por uma requisição concorrente entre a busca e
      // o INSERT acima, busca de novo em vez de falhar com erro pro usuário.
      inscrito = db.prepare("SELECT * FROM inscritos WHERE cpf = ?").get(cpfNorm);
      if (!inscrito) throw erroInscrito;
    }
  } else {
    db.prepare(`
      UPDATE inscritos SET nome = ?, email = ?, telefone = ?, empresa = ? WHERE id = ?
    `).run(nome, emailNorm, telefone, empresa, inscrito.id);
    inscrito = db.prepare("SELECT * FROM inscritos WHERE id = ?").get(inscrito.id);
  }

  // Pagamento real: a inscrição entra como "pendente" e só é confirmada de
  // verdade quando o dinheiro realmente chega - por Pix/Boleto, avisado pelo
  // webhook do Mercado Pago (mais abaixo, "/webhook/mercadopago"); por
  // depósito bancário, quando você mesma confirmar no painel administrativo.
  const stmt = db.prepare(`
    INSERT INTO inscricoes
      (inscrito_id, curso, data, metodo_pagamento, email_recibo, aceite_termos, vencimento_boleto, status_pagamento, valor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const infoInsercao = stmt.run(
    inscrito.id, curso, dataAtualIso, metodoPagamento, emailRecibo,
    aceiteTermos ? 1 : 0,
    metodoPagamento === "boleto" ? (vencimentoBoleto || null) : null,
    "pendente",
    valorInscricao
  );

  const inscricaoId = infoInsercao.lastInsertRowid;

  console.log(`Nova inscrição registrada em "${cursoInfo.nome}" (ID ${inscricaoId}):`, nome, email, "- método:", metodoPagamento);

  const metodosOnline = ["pix", "boleto"];
  const exigePagamentoOnline = metodosOnline.includes(metodoPagamento);

  let initPoint = null;
  let modoSimulado = true;

  if (exigePagamentoOnline) {
    try {
      const baseUrl = getBaseUrl(req);
      const preferencia = await criarPreferenciaPagamento({
        inscricaoId,
        curso: cursoInfo,
        participante: { nome, email, telefone, cpf },
        metodoPagamento,
        vencimentoBoleto,
        baseUrl,
      });

      modoSimulado = preferencia.modoSimulado;
      initPoint = preferencia.init_point;

      db.prepare(`UPDATE inscricoes SET mp_preference_id = ?, mp_init_point = ? WHERE id = ?`)
        .run(preferencia.id || null, initPoint, inscricaoId);
    } catch (erroMP) {
      console.error("[Mercado Pago] Erro ao gerar cobrança:", erroMP.message);
      // Não derruba a inscrição por causa disso - ela já foi salva como
      // "pendente" e a pessoa (ou você, pelo painel) consegue resolver depois.
    }
  }

  // Sem token do Mercado Pago configurado no ambiente (modo simulado), o
  // Pix/Boleto se comporta como sempre se comportou antes de o pagamento
  // real estar ativo: confirma na hora, sem exigir pagamento de verdade -
  // útil pra continuar testando localmente sem mexer em nada. Depósito
  // bancário NUNCA confirma na hora: sempre espera aprovação manual seguindo
  // o mesmo fluxo que o painel administrativo já tinha antes disso tudo.
  let statusPagamento = "pendente";

  if (exigePagamentoOnline && modoSimulado) {
    const agora = new Date().toISOString();
    db.prepare(`UPDATE inscricoes SET status_pagamento = 'pago', data_pagamento = ? WHERE id = ?`)
      .run(agora, inscricaoId);
    statusPagamento = "pago";
  }

  // Login e senha são liberados NA HORA, pra qualquer forma de pagamento -
  // a pessoa já entra no Painel do Inscrito assim que se inscreve, mesmo
  // com o pagamento ainda pendente (Pix aguardando confirmação, Boleto
  // aguardando compensação ou Depósito aguardando baixa manual sua). O que
  // fica bloqueado até a confirmação de pagamento é o CONTEÚDO específico
  // do curso dentro do portal (certificado e conteúdo programático) - isso
  // é controlado na própria tela do Painel do Inscrito, não aqui.
  let infoAcesso = null;
  try {
    const baseUrl = getBaseUrl(req);
    infoAcesso = await liberarAcessoInscrito(db, inscricaoId, baseUrl);
  } catch (errLiberacao) {
    console.error("[Erro Liberação Imediata]:", errLiberacao.message);
  }

  res.json({
    sucesso: true,
    id: inscricaoId,
    metodoPagamento,
    statusPagamento,
    email,
    initPoint,
    modoSimulado,
    emailEnviado: infoAcesso?.emailEnviado || false,
    senhaTemporaria: infoAcesso?.jaPossuiConta ? null : (infoAcesso?.senhaGerada || null),
    jaPossuiConta: !!infoAcesso?.jaPossuiConta,
  });
});

// Endpoint público para exibir detalhes da inscrição na tela de confirmação
app.get("/inscricoes/:id", (req, res) => {
  const { id } = req.params;
  const inscricao = db.prepare(`
    SELECT inscricoes.id, inscritos.nome, inscritos.email, inscricoes.metodo_pagamento,
           inscricoes.vencimento_boleto, inscricoes.status_pagamento, inscricoes.valor,
           inscricoes.mp_init_point, inscricoes.mp_payment_id,
           inscritos.senha_hash, inscritos.troca_senha_obrigatoria, inscritos.id AS inscrito_id,
           cursos.nome AS nome_curso
    FROM inscricoes
    JOIN inscritos ON inscritos.id = inscricoes.inscrito_id
    JOIN cursos ON cursos.id = inscricoes.curso
    WHERE inscricoes.id = ?
  `).get(id);

  if (!inscricao) {
    return res.status(404).json({ erro: "Inscrição não encontrada." });
  }

  const totalOutrasInscricoes = db.prepare(
    "SELECT COUNT(*) AS total FROM inscricoes WHERE inscrito_id = ? AND id != ?"
  ).get(inscricao.inscrito_id, id)?.total || 0;
  const jaPossuiConta = totalOutrasInscricoes > 0 || (inscricao.senha_hash && inscricao.troca_senha_obrigatoria === 0);
  delete inscricao.senha_hash;
  delete inscricao.troca_senha_obrigatoria;
  delete inscricao.inscrito_id;

  // "modoTeste": o acesso foi liberado sem passar por um pagamento de
  // verdade no Mercado Pago (Pix/Boleto marcados "pago" na hora porque não
  // havia token configurado no servidor no momento da inscrição). Um
  // pagamento real sempre grava um "mp_payment_id" (confirmado pelo
  // webhook) - sem ele, mesmo com status "pago", sabemos que foi o modo
  // simulado. Depósito bancário nunca é "modo teste": ele só vira "pago"
  // quando você mesma confirma manualmente no painel.
  const metodosOnline = ["pix", "boleto"];
  const modoTeste =
    metodosOnline.includes(inscricao.metodo_pagamento) &&
    inscricao.status_pagamento === "pago" &&
    !inscricao.mp_payment_id;

  // A senha provisória NÃO é mais lida do banco aqui (nunca fica salva em
  // texto puro - ver auth_aluno.js). A tela de confirmação mostra a senha só
  // se ela ainda estiver guardada no sessionStorage do próprio navegador de
  // quem acabou de se inscrever (script.js salva ela ali, uma única vez, na
  // hora da resposta de "POST /inscricoes"); ao reabrir a página em outro
  // aparelho ou depois de limpar os dados do navegador, a senha não aparece
  // mais aqui - mas já foi enviada por e-mail, que continua sendo o canal
  // confiável de recuperação.
  res.json({
    ...inscricao,
    jaPossuiConta: !!jaPossuiConta,
    modoTeste,
    permitirSimulacao: process.env.PERMITIR_SIMULACAO_ALUNO === "true",
  });
});

// Botão de teste (visível só pra você) na própria tela de confirmação de
// inscrição, pra simular "pago" e "pendente" sem precisar pagar de verdade
// nem mexer direto no banco. Usa a mesma trava das outras simulações do
// site: só funciona quando PERMITIR_SIMULACAO_ALUNO=true no .env (nunca
// deixe essa variável configurada assim no Render/produção).
app.post("/inscricoes/:id/simular-pagamento", (req, res) => {
  if (process.env.PERMITIR_SIMULACAO_ALUNO !== "true") {
    return res.status(403).json({
      erro: "Este recurso de teste está desativado neste ambiente.",
    });
  }

  const { id } = req.params;
  const { status } = req.body || {};
  const novoStatus = status === "pago" ? "pago" : "pendente";
  const dataPag = novoStatus === "pago" ? new Date().toISOString() : null;

  const resultado = db.prepare(`
    UPDATE inscricoes SET status_pagamento = ?, data_pagamento = ? WHERE id = ?
  `).run(novoStatus, dataPag, id);

  if (resultado.changes === 0) {
    return res.status(404).json({ erro: "Inscrição não encontrada." });
  }

  res.json({ sucesso: true, status_pagamento: novoStatus, data_pagamento: dataPag });
});

// Confere se a notificação do webhook realmente veio do Mercado Pago,
// seguindo o formato oficial deles: o cabeçalho "x-signature" chega como
// "ts=169...,v1=<assinatura>", e "v1" é um HMAC-SHA256 calculado sobre um
// texto padrão ("manifesto") usando o segredo do webhook configurado no
// painel do Mercado Pago. Recalculamos essa mesma assinatura aqui e
// comparamos com a que veio na requisição - se não bater, a notificação não
// é confiável (pode ter sido forjada por qualquer pessoa que soubesse o id
// de uma inscrição) e é rejeitada.
function verificarAssinaturaWebhookMP(req) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

  // Sem o segredo configurado no ambiente não tem como validar - a notificação
  // é aceita mesmo assim (pra não travar o fluxo de quem ainda não configurou
  // isso), mas fica um aviso bem visível no log.
  if (!secret || !secret.trim()) {
    console.warn(
      "[Webhook Mercado Pago] MERCADO_PAGO_WEBHOOK_SECRET não configurado - " +
      "aceitando a notificação SEM validar a assinatura. Configure essa variável " +
      "(disponível no painel do Mercado Pago, nas configurações do webhook) para proteger essa rota."
    );
    return true;
  }

  const assinatura = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  const dataId = req.query?.["data.id"];

  if (!assinatura || !requestId || !dataId) {
    console.warn("[Webhook Mercado Pago] Notificação sem os cabeçalhos de assinatura esperados - rejeitada.");
    return false;
  }

  const partes = {};
  assinatura.split(",").forEach((parte) => {
    const [chave, valor] = parte.split("=");
    if (chave && valor) partes[chave.trim()] = valor.trim();
  });

  const { ts, v1: assinaturaRecebida } = partes;
  if (!ts || !assinaturaRecebida) {
    console.warn("[Webhook Mercado Pago] Cabeçalho x-signature em formato inesperado - rejeitada.");
    return false;
  }

  const idParaManifesto = String(dataId).toLowerCase();
  const manifesto = `id:${idParaManifesto};request-id:${requestId};ts:${ts};`;
  const assinaturaCalculada = crypto
    .createHmac("sha256", secret.trim())
    .update(manifesto)
    .digest("hex");

  const bufferRecebido = Buffer.from(assinaturaRecebida, "utf8");
  const bufferCalculado = Buffer.from(assinaturaCalculada, "utf8");

  // "timingSafeEqual" compara os dois textos sem vazar, pelo tempo gasto na
  // comparação, pistas sobre onde a assinatura recebida diverge da correta -
  // por isso não usamos simplesmente "===" aqui.
  if (bufferRecebido.length !== bufferCalculado.length) return false;
  return crypto.timingSafeEqual(bufferRecebido, bufferCalculado);
}

// Webhook do Mercado Pago para confirmação automática de pagamentos (Pix e Boleto)
app.all("/webhook/mercadopago", async (req, res) => {
  if (!verificarAssinaturaWebhookMP(req)) {
    return res.status(401).send("Assinatura inválida.");
  }

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
  // IMPORTANTE: aqui era "SELECT *", o que também mandava pro navegador do
  // admin colunas sensíveis que ele nunca usa - "senha_hash" (o hash da senha
  // de cada aluno) e "token_sessao" (o token que autentica o login de cada
  // aluno no Painel do Inscrito, equivalente a uma senha de sessão). Mesmo
  // sem nenhuma tela mostrando esses campos, eles ficavam visíveis na aba
  // de rede do navegador e - mais grave - utilizáveis por qualquer script
  // malicioso que rodasse na página do admin. Listando só as colunas que a
  // tela realmente usa, esse risco desaparece por completo.
  const todas = db.prepare(`
    SELECT inscricoes.id, inscritos.nome, inscritos.email, inscricoes.curso, inscricoes.data,
           inscritos.empresa, inscritos.telefone, inscritos.cpf,
           inscricoes.metodo_pagamento, inscricoes.email_recibo, inscricoes.aceite_termos, inscricoes.vencimento_boleto,
           inscricoes.status_pagamento, inscricoes.valor, inscricoes.mp_payment_id, inscricoes.data_pagamento,
           inscritos.troca_senha_obrigatoria,
           inscricoes.email_credenciais_enviado, inscricoes.data_envio_credenciais
    FROM inscricoes
    JOIN inscritos ON inscritos.id = inscricoes.inscrito_id
    ORDER BY inscricoes.data DESC
  `).all();
  // O CPF é guardado só com dígitos no banco (ver db.js) - "formatarCpf"
  // reaplica o ponto e o traço aqui, na saída da API, pra tela do admin
  // continuar mostrando exatamente como antes.
  res.json(todas.map((linha) => ({ ...linha, cpf: formatarCpf(linha.cpf) })));
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

// Reenvio manual dos dados de acesso por e-mail pelo Administrador.
// Como a senha nunca fica salva em texto puro no banco (ver auth_aluno.js),
// "reenviar" o acesso de quem ainda não escolheu a própria senha significa
// gerar uma senha nova (a anterior deixa de valer) - por isso "forcarNovaSenha".
// Quem já definiu a própria senha não é afetado: precisa usar "Esqueci minha senha".
app.post("/admin/inscricoes/:id/reenviar-acesso", protegerAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const baseUrl = getBaseUrl(req);
    const resultado = await liberarAcessoInscrito(db, id, baseUrl, { forcarNovaSenha: true });
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

// Lista completa de cursos para administração
app.get("/admin/cursos", protegerAdmin, (req, res) => {
  const cursos = db.prepare(`
    SELECT cursos.*,
      (SELECT COUNT(*) FROM inscricoes WHERE inscricoes.curso = cursos.id) AS total_inscritos,
      (SELECT COUNT(*) FROM inscricoes WHERE inscricoes.curso = cursos.id AND inscricoes.status_pagamento = 'pago') AS total_pagos
    FROM cursos
    ORDER BY rowid ASC
  `).all();
  res.json(cursos);
});

// Criar novo curso
app.post("/admin/cursos", protegerAdmin, (req, res) => {
  const { id, nome, vagas, preco, descricao, carga_horaria, data_evento, data_fim_curso, requisitos } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: "O nome do curso é obrigatório." });
  }

  // Gera um ID a partir do nome se não informado
  let cursoId = (id || "").trim().toLowerCase();
  if (!cursoId) {
    cursoId = nome.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  if (!cursoId) {
    cursoId = `curso-${Date.now()}`;
  }

  const jaExiste = db.prepare("SELECT id FROM cursos WHERE id = ?").get(cursoId);
  if (jaExiste) {
    return res.status(400).json({ erro: `Já existe um curso cadastrado com o identificador "${cursoId}". Escolha outro código ou nome.` });
  }

  try {
    db.prepare(`
      INSERT INTO cursos (id, nome, vagas, preco, descricao, carga_horaria, data_evento, data_fim_curso, requisitos)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cursoId,
      nome.trim(),
      parseInt(vagas, 10) || 40,
      parseFloat(preco) || 3200.00,
      descricao || "",
      carga_horaria || "16 horas",
      data_evento || "Edição Oficial 2026",
      data_fim_curso || null,
      requisitos || "Nenhum pré-requisito específico."
    );

    res.json({ sucesso: true, id: cursoId, mensagem: "Curso cadastrado com sucesso!" });
  } catch (err) {
    console.error("Erro ao cadastrar curso:", err);
    res.status(500).json({ erro: "Não foi possível cadastrar o curso: " + err.message });
  }
});

// Atualizar curso existente
app.put("/admin/cursos/:id", protegerAdmin, (req, res) => {
  const { id } = req.params;
  const { nome, vagas, preco, descricao, carga_horaria, data_evento, data_fim_curso, requisitos } = req.body;

  const cursoExistente = db.prepare("SELECT * FROM cursos WHERE id = ?").get(id);
  if (!cursoExistente) {
    return res.status(404).json({ erro: "Curso não encontrado para atualização." });
  }

  try {
    db.prepare(`
      UPDATE cursos
      SET nome = COALESCE(?, nome),
          vagas = COALESCE(?, vagas),
          preco = COALESCE(?, preco),
          descricao = COALESCE(?, descricao),
          carga_horaria = COALESCE(?, carga_horaria),
          data_evento = COALESCE(?, data_evento),
          data_fim_curso = COALESCE(?, data_fim_curso),
          requisitos = COALESCE(?, requisitos)
      WHERE id = ?
    `).run(
      nome ? nome.trim() : null,
      vagas !== undefined ? parseInt(vagas, 10) : null,
      preco !== undefined ? parseFloat(preco) : null,
      descricao !== undefined ? descricao : null,
      carga_horaria !== undefined ? carga_horaria.trim() : null,
      data_evento !== undefined ? data_evento.trim() : null,
      data_fim_curso !== undefined ? data_fim_curso : null,
      requisitos !== undefined ? requisitos : null,
      id
    );

    res.json({ sucesso: true, mensagem: "Curso atualizado com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar curso:", err);
    res.status(500).json({ erro: "Não foi possível atualizar o curso: " + err.message });
  }
});

// Excluir curso (somente se não houver inscrições)
app.delete("/admin/cursos/:id", protegerAdmin, (req, res) => {
  const { id } = req.params;

  const totalInscritos = db.prepare("SELECT COUNT(*) AS total FROM inscricoes WHERE curso = ?").get(id)?.total || 0;
  if (totalInscritos > 0) {
    return res.status(400).json({
      erro: `Não é possível excluir este curso pois já existem ${totalInscritos} inscrição(ões) vinculada(s). Você pode editar as vagas para 0 para encerrá-lo.`
    });
  }

  try {
    const info = db.prepare("DELETE FROM cursos WHERE id = ?").run(id);
    if (info.changes === 0) {
      return res.status(404).json({ erro: "Curso não encontrado." });
    }
    res.json({ sucesso: true, mensagem: "Curso removido com sucesso!" });
  } catch (err) {
    console.error("Erro ao excluir curso:", err);
    res.status(500).json({ erro: "Erro ao excluir curso: " + err.message });
  }
});

// Exclui UMA inscrição específica (uma linha da tabela "inscricoes").
// Protegida pela mesma senha do painel admin ("protegerAdmin") - só quem
// souber a senha do admin consegue excluir.
app.delete("/admin/inscricoes/:id", protegerAdmin, (req, res) => {
  const { id } = req.params;

  try {
    const info = db.prepare("DELETE FROM inscricoes WHERE id = ?").run(id);
    if (info.changes === 0) {
      return res.status(404).json({ erro: "Inscrição não encontrada." });
    }
    res.json({ sucesso: true, mensagem: "Inscrição excluída com sucesso." });
  } catch (err) {
    console.error("Erro ao excluir inscrição:", err);
    res.status(500).json({ erro: "Erro ao excluir inscrição: " + err.message });
  }
});

// Exclui o CADASTRO inteiro de uma pessoa: todas as inscrições dela (em
// qualquer curso) e o login dela no Painel do Inscrito. Identificado pelo
// CPF, do mesmo jeito que o painel já agrupa as inscrições por pessoa.
// Também protegida pela senha do admin. Roda tudo dentro de uma transação -
// ou exclui tudo, ou (se algo falhar no meio) não exclui nada.
app.delete("/admin/cadastro/:cpf", protegerAdmin, (req, res) => {
  const cpfBruto = (req.params.cpf || "").trim();
  if (!cpfBruto) {
    return res.status(400).json({ erro: "CPF não informado." });
  }

  // Camada extra de segurança: além de já estar atrás da senha do painel
  // (protegerAdmin, verificada pelo navegador), excluir um cadastro inteiro
  // exige digitar a senha do admin DE NOVO, no exato momento da exclusão -
  // pra evitar que um clique acidental (ou alguém com o navegador já logado
  // sem querer) apague dados sem uma confirmação consciente.
  const { senhaConfirmacao } = req.body || {};
  if (!senhaAdminConfere(senhaConfirmacao)) {
    return res.status(403).json({ erro: "Senha do admin incorreta. O cadastro NÃO foi excluído." });
  }

  const cpfLimpo = normalizarCpf(cpfBruto);
  if (cpfLimpo.length !== 11) {
    return res.status(400).json({ erro: "CPF inválido." });
  }

  try {
    const inscrito = db.prepare("SELECT id FROM inscritos WHERE cpf = ?").get(cpfLimpo);
    if (!inscrito) {
      return res.status(404).json({ erro: "Nenhum cadastro encontrado com esse CPF." });
    }

    const totalInscricoes = db.prepare(
      "SELECT COUNT(*) AS total FROM inscricoes WHERE inscrito_id = ?"
    ).get(inscrito.id).total;

    // Com "ON DELETE CASCADE" ativo (ver db.js), apagar a pessoa em
    // "inscritos" já apaga automaticamente todas as inscrições dela em
    // qualquer curso - não é mais preciso apagar tabela por tabela na mão.
    db.prepare("DELETE FROM inscritos WHERE id = ?").run(inscrito.id);

    res.json({
      sucesso: true,
      mensagem: `Cadastro excluído: ${totalInscricoes} inscrição(ões) e 1 login removido(s).`,
    });
  } catch (err) {
    console.error("Erro ao excluir cadastro:", err);
    res.status(500).json({ erro: "Erro ao excluir cadastro: " + err.message });
  }
});

// ==========================================
// ROTAS DO PAINEL DO INSCRITO (ALUNO) - LOGIN UNIFICADO
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

  const usuario = db.prepare(`SELECT * FROM inscritos WHERE token_sessao = ?`).get(token);

  if (!usuario) {
    return res.status(401).json({ erro: "Sessão inválida. Faça login novamente." });
  }

  req.usuarioAluno = usuario;
  next();
}

// 1. Endpoint para verificar na hora da inscrição se a pessoa já possui cadastro
// anterior. A identificação é feita pelo CPF: o e-mail pode ser trocado ou
// compartilhado (ex: e-mail de um setor usado por mais de uma pessoa),
// enquanto o CPF sempre identifica a mesma pessoa.
app.post("/api/aluno/verificar-cadastro", (req, res) => {
  const { cpf } = req.body || {};
  const cpfLimpo = normalizarCpf(cpf);

  if (cpfLimpo.length !== 11) {
    return res.json({ existe: false });
  }

  const usuario = db.prepare(`SELECT * FROM inscritos WHERE cpf = ?`).get(cpfLimpo);
  if (!usuario) {
    return res.json({ existe: false });
  }

  const inscricoes = db.prepare(`
    SELECT inscricoes.id AS inscricao_id, inscricoes.curso, cursos.nome AS nome_curso, inscricoes.status_pagamento
    FROM inscricoes
    LEFT JOIN cursos ON inscricoes.curso = cursos.id
    WHERE inscricoes.inscrito_id = ?
    ORDER BY inscricoes.id DESC
  `).all(usuario.id);

  res.json({
    existe: true,
    nome: usuario.nome,
    email: usuario.email,
    cpf: formatarCpf(usuario.cpf),
    empresa: usuario.empresa,
    telefone: usuario.telefone,
    cursosInscritos: inscricoes.map((i) => ({
      inscricaoId: i.inscricao_id,
      cursoId: i.curso,
      nomeCurso: i.nome_curso || i.curso,
      statusPagamento: i.status_pagamento,
    })),
  });
});

// 2. Login Unificado do Aluno (por e-mail ou CPF, usando a mesma senha)
app.post("/api/aluno/login", limitadorLogin, async (req, res) => {
  const { email, cpf, senha } = req.body;

  if ((!email && !cpf) || !senha) {
    return res.status(400).json({ erro: "Por favor, informe seu e-mail ou CPF e sua senha." });
  }

  const emailNorm = (email || "").trim().toLowerCase();
  const cpfLimpo = normalizarCpf(cpf);

  let usuario = null;

  if (cpfLimpo.length === 11) {
    usuario = db.prepare(`SELECT * FROM inscritos WHERE cpf = ?`).get(cpfLimpo);
  }

  if (!usuario && emailNorm) {
    usuario = db.prepare(`SELECT * FROM inscritos WHERE LOWER(email) = ?`).get(emailNorm);
  }

  if (!usuario) {
    return res.status(404).json({
      erro: "Nenhum cadastro encontrado para estes dados. Verifique a digitação ou faça sua primeira inscrição.",
    });
  }

  // Se a senha ainda não havia sido gerada para esta pessoa (situação rara -
  // normalmente já é criada na hora da inscrição), gera agora automaticamente.
  if (!usuario.senha_hash) {
    try {
      const baseUrl = getBaseUrl(req);
      const inscricaoRecente = db.prepare(`SELECT id FROM inscricoes WHERE inscrito_id = ? ORDER BY id DESC LIMIT 1`).get(usuario.id);
      if (inscricaoRecente) {
        await liberarAcessoInscrito(db, inscricaoRecente.id, baseUrl);
        usuario = db.prepare(`SELECT * FROM inscritos WHERE id = ?`).get(usuario.id);
      }
    } catch (e) {
      console.error("Erro ao gerar credenciais na tentativa de login:", e.message);
    }
  }

  const senhaValida = verificarSenha(senha.trim(), usuario.senha_hash);
  if (!senhaValida) {
    return res.status(401).json({ erro: "Senha incorreta. Verifique os caracteres recebidos no e-mail ou redefina sua senha." });
  }

  const tokenSessao = gerarTokenSessao();
  const agora = new Date().toISOString();

  db.prepare(`UPDATE inscritos SET token_sessao = ?, ultimo_login = ? WHERE id = ?`)
    .run(tokenSessao, agora, usuario.id);

  const cursosInscritos = db.prepare(`
    SELECT inscricoes.id AS inscricao_id, inscricoes.curso, cursos.nome AS nome_curso, inscricoes.status_pagamento
    FROM inscricoes
    LEFT JOIN cursos ON inscricoes.curso = cursos.id
    WHERE inscricoes.inscrito_id = ?
    ORDER BY inscricoes.id DESC
  `).all(usuario.id);

  res.json({
    sucesso: true,
    token: tokenSessao,
    nome: usuario.nome,
    email: usuario.email,
    cpf: formatarCpf(usuario.cpf),
    empresa: usuario.empresa,
    telefone: usuario.telefone,
    trocaSenhaObrigatoria: Boolean(usuario.troca_senha_obrigatoria),
    cursosInscritos: cursosInscritos.map((i) => ({
      inscricaoId: i.inscricao_id,
      cursoId: i.curso,
      nomeCurso: i.nome_curso || i.curso,
      statusPagamento: i.status_pagamento,
    })),
  });
});

// 3. Troca obrigatória (ou voluntária) de senha unificada para todos os cursos
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
    UPDATE inscritos
    SET senha_hash = ?,
        senha_plana_inicial = NULL,
        troca_senha_obrigatoria = 0
    WHERE id = ?
  `).run(novoHash, req.usuarioAluno.id);

  res.json({ sucesso: true, mensagem: "Senha alterada com sucesso em todos os seus acessos!" });
});

// 3.1. Link mágico de redefinição de senha ("esqueci minha senha") - passo 1:
// a pessoa informa o CPF cadastrado, e o sistema manda um link exclusivo para
// o e-mail cadastrado. O token desse link expira em 30 minutos e só serve
// uma única vez, exatamente como um link de redefinição de senha de qualquer
// site sério: só quem tiver acesso à caixa de entrada consegue trocar a senha.
const MINUTOS_EXPIRACAO_REDEFINICAO = 30;

app.post("/api/aluno/esqueci-senha", limitadorLogin, async (req, res) => {
  const { cpf } = req.body || {};
  const cpfLimpo = normalizarCpf(cpf);

  // Mensagem sempre igual, ache ou não o cadastro - assim ninguém consegue
  // descobrir, por tentativa e erro, quais CPFs têm conta no sistema.
  const mensagemPadrao =
    "Se o CPF informado tiver um cadastro em nosso sistema, enviamos um link de redefinição de senha para o e-mail cadastrado.";

  if (cpfLimpo.length !== 11) {
    return res.status(400).json({ erro: "Informe um CPF válido, com 11 dígitos." });
  }

  try {
    const usuario = db.prepare(`SELECT * FROM inscritos WHERE cpf = ?`).get(cpfLimpo);

    if (usuario && usuario.email) {
      const token = gerarTokenSessao();
      const expira = new Date(Date.now() + MINUTOS_EXPIRACAO_REDEFINICAO * 60 * 1000).toISOString();

      db.prepare(`
        UPDATE inscritos
        SET token_redefinicao_senha = ?, token_redefinicao_expira = ?
        WHERE id = ?
      `).run(token, expira, usuario.id);

      const baseUrl = getBaseUrl(req);
      const linkRedefinicao = `${baseUrl}/area-do-inscrito.html?tokenRedefinicao=${token}`;

      await enviarEmailRedefinicaoSenha({
        nome: usuario.nome,
        email: usuario.email,
        linkRedefinicao,
        minutosExpiracao: MINUTOS_EXPIRACAO_REDEFINICAO,
      });
    }

    res.json({ sucesso: true, mensagem: mensagemPadrao });
  } catch (erro) {
    console.error("[Esqueci Senha] Erro ao gerar link de redefinição:", erro.message);
    // Mesmo em caso de erro interno, não revela se o CPF existe ou não.
    res.json({ sucesso: true, mensagem: mensagemPadrao });
  }
});

// 3.2. Link mágico de redefinição de senha - passo 2: a pessoa chega pelo
// link recebido por e-mail (com o token) e escolhe a nova senha.
app.post("/api/aluno/redefinir-senha", limitadorLogin, (req, res) => {
  const { token, novaSenha, confirmacaoSenha } = req.body || {};

  if (!token) {
    return res.status(400).json({ erro: "Link de redefinição inválido." });
  }

  if (!novaSenha || novaSenha.trim().length < 6) {
    return res.status(400).json({ erro: "A nova senha deve ter no mínimo 6 caracteres." });
  }

  if (novaSenha !== confirmacaoSenha) {
    return res.status(400).json({ erro: "A confirmação de senha não confere." });
  }

  const usuario = db.prepare(`SELECT * FROM inscritos WHERE token_redefinicao_senha = ?`).get(token);

  if (!usuario) {
    return res.status(400).json({ erro: "Link de redefinição inválido ou já utilizado. Solicite um novo." });
  }

  if (!usuario.token_redefinicao_expira || new Date(usuario.token_redefinicao_expira) < new Date()) {
    return res.status(400).json({ erro: "Este link de redefinição expirou. Solicite um novo." });
  }

  const novoHash = hashSenha(novaSenha.trim());

  // Troca a senha, apaga o token (só pode ser usado uma vez) e derruba
  // qualquer sessão já aberta (token_sessao), obrigando um novo login com a
  // senha nova - assim, se alguém mais tinha acesso à sessão antiga, perde o acesso.
  db.prepare(`
    UPDATE inscritos
    SET senha_hash = ?,
        senha_plana_inicial = NULL,
        troca_senha_obrigatoria = 0,
        token_redefinicao_senha = NULL,
        token_redefinicao_expira = NULL,
        token_sessao = NULL
    WHERE id = ?
  `).run(novoHash, usuario.id);

  res.json({ sucesso: true, mensagem: "Senha redefinida com sucesso! Você já pode entrar com a nova senha." });
});

// 4. Obter dados completos de todos os cursos do aluno unificado e detalhes do curso ativo
app.get("/api/aluno/meus-dados", autenticarAluno, (req, res) => {
  const u = req.usuarioAluno;
  const cursoParam = req.query.cursoId || req.query.inscricaoId;

  // Busca todas as inscrições deste aluno
  const inscricoes = db.prepare(`
    SELECT inscricoes.*,
           cursos.nome AS nome_curso,
           cursos.descricao AS descricao_curso,
           cursos.carga_horaria,
           cursos.data_evento,
           cursos.data_fim_curso,
           cursos.requisitos,
           cursos.preco AS preco_curso
    FROM inscricoes
    LEFT JOIN cursos ON inscricoes.curso = cursos.id
    WHERE inscricoes.inscrito_id = ?
    ORDER BY inscricoes.id DESC
  `).all(u.id);

  if (!inscricoes || inscricoes.length === 0) {
    return res.status(404).json({ erro: "Nenhuma inscrição encontrada para este usuário." });
  }

  // Determina o curso ativo (selecionado pelo aluno ou o mais recente)
  let inscricaoAtiva = null;
  if (cursoParam) {
    inscricaoAtiva = inscricoes.find(
      (i) => String(i.id) === String(cursoParam) || i.curso === String(cursoParam)
    );
  }
  if (!inscricaoAtiva) {
    inscricaoAtiva = inscricoes[0];
  }

  const listaCursos = inscricoes.map((i) => ({
    inscricao_id: i.id,
    id: i.id,
    curso_id: i.curso,
    nome: i.nome_curso || i.curso || "Treinamento Apassul",
    descricao: i.descricao_curso || "Treinamento oficial credenciado Apassul.",
    carga_horaria: i.carga_horaria || "16 horas",
    data_evento: i.data_evento || "Edição Oficial 2026",
    data_fim_curso: i.data_fim_curso || null,
    requisitos: i.requisitos,
    preco: i.valor || i.preco_curso || 3200.0,
    status_pagamento: i.status_pagamento || "pago",
    data_pagamento: i.data_pagamento,
    metodo_pagamento: i.metodo_pagamento,
    mp_init_point: i.mp_init_point,
    vencimento_boleto: i.vencimento_boleto,
    data_inscricao: i.data,
  }));

  res.json({
    id: inscricaoAtiva.id,
    nome: u.nome,
    email: u.email,
    empresa: u.empresa,
    telefone: u.telefone,
    cpf: formatarCpf(u.cpf),
    status_pagamento: inscricaoAtiva.status_pagamento || "pago",
    data_pagamento: inscricaoAtiva.data_pagamento,
    mp_init_point: inscricaoAtiva.mp_init_point,
    troca_senha_obrigatoria: Boolean(u.troca_senha_obrigatoria),
    cursoAtivoId: inscricaoAtiva.curso,
    inscricaoAtivaId: inscricaoAtiva.id,
    cursos: listaCursos,
    totalCursos: listaCursos.length,
    curso: {
      id: inscricaoAtiva.curso,
      inscricao_id: inscricaoAtiva.id,
      nome: inscricaoAtiva.nome_curso || inscricaoAtiva.curso || "Treinamento Apassul",
      descricao: inscricaoAtiva.descricao_curso || "Treinamento oficial credenciado Apassul.",
      carga_horaria: inscricaoAtiva.carga_horaria || "16 horas",
      data_evento: inscricaoAtiva.data_evento || "Edição Oficial 2026",
      data_fim_curso: inscricaoAtiva.data_fim_curso || null,
      requisitos: inscricaoAtiva.requisitos,
      preco: inscricaoAtiva.valor || 3200.0,
      status_pagamento: inscricaoAtiva.status_pagamento || "pago",
      data_pagamento: inscricaoAtiva.data_pagamento,
    },
  });
});

// 5. Rota para alternar o status de pagamento do curso selecionado durante testes
//
// CORREÇÃO DE SEGURANÇA IMPORTANTE: esta rota existia sem nenhuma trava, o
// que significa que QUALQUER aluno logado (com sua própria sessão legítima,
// sem precisar de nada especial) podia marcar a própria inscrição como
// "pago" a qualquer momento, sem pagar nada de verdade - bastava abrir o
// Painel do Inscrito e clicar no botão "Simular como PAGO", que fica visível
// pra qualquer pessoa cadastrada. Isso é uma "gambiarra" de teste que nunca
// foi removida antes de o site rodar de verdade. Agora ela só funciona
// quando a variável de ambiente PERMITIR_SIMULACAO_ALUNO estiver configurada
// como "true" - ou seja, continua disponível pra você testar localmente,
// mas fica automaticamente desligada em produção (Render), a menos que você
// configure essa variável lá de propósito.
app.post("/api/aluno/simular-pagamento", autenticarAluno, (req, res) => {
  if (process.env.PERMITIR_SIMULACAO_ALUNO !== "true") {
    return res.status(403).json({
      erro: "Este recurso de teste está desativado. Fale com a administração para confirmar seu pagamento.",
    });
  }

  const { status, inscricaoId } = req.body;
  const novoStatus = status === "pago" ? "pago" : "pendente";
  const dataPag = novoStatus === "pago" ? new Date().toISOString() : null;

  if (inscricaoId) {
    db.prepare(`
      UPDATE inscricoes
      SET status_pagamento = ?, data_pagamento = ?
      WHERE id = ?
    `).run(novoStatus, dataPag, Number(inscricaoId));
  } else {
    db.prepare(`
      UPDATE inscricoes
      SET status_pagamento = ?, data_pagamento = ?
      WHERE inscrito_id = ?
    `).run(novoStatus, dataPag, req.usuarioAluno.id);
  }

  res.json({ sucesso: true, status_pagamento: novoStatus, data_pagamento: dataPag });
});

// 6. Logout do Painel do Inscrito
app.post("/api/aluno/logout", autenticarAluno, (req, res) => {
  db.prepare(`UPDATE inscritos SET token_sessao = NULL WHERE id = ?`).run(req.usuarioAluno.id);
  res.json({ sucesso: true });
});

// 7. Consulta pública de autenticidade de certificado (acessível pelo LinkedIn e terceiros)
app.get("/api/public/certificado/:codigo", (req, res) => {
  const codigoRaw = (req.params.codigo || "").trim();
  if (!codigoRaw) {
    return res.status(400).json({ valido: false, erro: "Código de certificado não informado." });
  }

  let inscricaoId = null;
  const matchAps = codigoRaw.match(/APS-2026-(\d+)-(\d+)/i);
  if (matchAps) {
    inscricaoId = parseInt(matchAps[1], 10);
  } else {
    const matchNum = codigoRaw.match(/\b\d+\b/);
    if (matchNum) {
      inscricaoId = parseInt(matchNum[0], 10);
    }
  }

  let inscricao = null;
  if (inscricaoId) {
    inscricao = db.prepare(`
      SELECT inscricoes.*,
             inscritos.nome, inscritos.empresa, inscritos.cpf,
             cursos.nome AS nome_curso,
             cursos.carga_horaria,
             cursos.data_evento,
             cursos.descricao AS descricao_curso
      FROM inscricoes
      JOIN inscritos ON inscritos.id = inscricoes.inscrito_id
      LEFT JOIN cursos ON inscricoes.curso = cursos.id
      WHERE inscricoes.id = ?
    `).get(inscricaoId);
  }

  // IMPORTANTE - CORREÇÃO DE SEGURANÇA: antes, quando o código informado não
  // batia com nenhuma inscrição real, esta rota "inventava" uma resposta -
  // ou mostrava os dados (nome, empresa, CPF mascarado) da inscrição paga
  // MAIS RECENTE, mesmo sendo de outra pessoa completamente diferente do
  // código digitado, ou devolvia um certificado de demonstração genérico
  // marcado como "válido". Como esta rota é pública, sem login, e pensada
  // pra ser consultada por terceiros (recrutadores, LinkedIn etc. - veja o
  // comentário da rota acima), isso permitia duas coisas graves: (1) vazar
  // nome/empresa/CPF de uma pessoa real pra qualquer um que digitasse um
  // código qualquer, mesmo sem nunca ter tido acesso ao certificado dela; e
  // (2) fazer um código inventado parecer um certificado oficial "válido".
  // Agora, sem uma inscrição encontrada de verdade pelo ID exato do código,
  // a resposta é sempre "não encontrado" - nunca inventa nem empresta os
  // dados de outra pessoa.
  if (!inscricao) {
    return res.json({
      valido: false,
      codigo: codigoRaw,
      mensagem: "Código de certificado não encontrado. Verifique se ele foi digitado corretamente.",
    });
  }

  const cpfRaw = inscricao.cpf ? String(inscricao.cpf).replace(/\D/g, "") : "";
  const cpfMascarado = cpfRaw.length >= 11
    ? `***.${cpfRaw.slice(3, 6)}.${cpfRaw.slice(6, 9)}-**`
    : (inscricao.cpf || "Documento Registrado");

  const cpfSufixo = cpfRaw.slice(-4) || "0000";
  const idFormatado = String(inscricao.id).padStart(4, "0").slice(-4);
  const codigoCert = `APS-2026-${idFormatado}-${cpfSufixo}`;

  const pago = inscricao.status_pagamento === "pago" || inscricao.status_pagamento === "confirmado";

  if (!pago) {
    return res.json({
      valido: false,
      codigo: codigoCert,
      mensagem: "Inscrição localizada, porém o certificado oficial aguarda a confirmação do pagamento e conclusão do treinamento.",
      aluno: {
        nome: inscricao.nome,
        empresa: inscricao.empresa
      },
      curso: {
        nome: inscricao.nome_curso || inscricao.curso || "Treinamento Oficial Apassul"
      }
    });
  }

  res.json({
    valido: true,
    codigo: codigoCert,
    aluno: {
      nome: inscricao.nome,
      empresa: inscricao.empresa,
      cpfMascarado
    },
    curso: {
      id: inscricao.curso,
      nome: inscricao.nome_curso || inscricao.curso || "Treinamento Oficial Apassul",
      carga_horaria: inscricao.carga_horaria || "16 horas",
      data_evento: inscricao.data_evento || "Edição Oficial 2026"
    },
    emissao: {
      instituicao: "Apassul - Associação dos Produtores e Comerciantes de Sementes e Mudas do RS",
      cnpj: "92.045.327/0001-06",
      status: "Autenticidade Digital Registrada",
      dataEmissao: inscricao.data_pagamento || inscricao.data || "2026",
      assinaturas: [
        { cargo: "Diretor Executivo", instituicao: "Apassul" },
        { cargo: "Desenvolvedor de Mercado", instituicao: "Apassul" }
      ]
    }
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
});