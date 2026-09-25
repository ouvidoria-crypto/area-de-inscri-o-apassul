const crypto = require("crypto");
const { enviarEmailAcessoInscrito } = require("./email");

// Caracteres alfanuméricos legíveis (sem 0/O e 1/l para evitar confusão na digitação)
const CARACTERES_SENHA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function gerarSenhaAlfanumerica(tamanho = 8) {
  let senha = "";
  const bytes = crypto.randomBytes(tamanho);
  for (let i = 0; i < tamanho; i++) {
    senha += CARACTERES_SENHA[bytes[i] % CARACTERES_SENHA.length];
  }
  return senha;
}

function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(senha, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verificarSenha(senhaDigitada, hashSalvo) {
  if (!hashSalvo || !hashSalvo.includes(":")) return false;
  const [salt, hashOriginal] = hashSalvo.split(":");
  const hashTentativa = crypto.scryptSync(senhaDigitada, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hashOriginal, "hex"), Buffer.from(hashTentativa, "hex"));
}

function gerarTokenSessao() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Libera o acesso do participante quando o pagamento é confirmado (Pix, Boleto ou manual)
 * Gera a senha alfanumérica de 8 caracteres (se a pessoa ainda não tiver uma) e envia o
 * e-mail de acesso automaticamente.
 *
 * A partir da unificação por CPF, os dados de login (senha_hash, troca_senha_obrigatoria)
 * vivem só na tabela "inscritos" - não existe mais uma tabela separada ("usuarios_aluno")
 * pra manter sincronizada a cada chamada. Isso elimina uma classe inteira de bugs que o
 * projeto já teve (duas cópias dos mesmos dados podendo divergir quando algum caminho de
 * código esquecia de atualizar as duas).
 *
 * IMPORTANTE (segurança): a senha em texto puro (antes do hash) NUNCA é salva no banco -
 * ela só existe na memória do servidor pelo tempo necessário pra mandar o e-mail, e depois
 * desaparece. Isso significa que não existe mais como "recuperar" uma senha já gerada -
 * só como gerar uma nova (que invalida a anterior). Por isso o parâmetro "forcarNovaSenha":
 * quando o Administrador pede explicitamente pra reenviar o acesso de alguém que ainda não
 * definiu a própria senha, a única forma seliza de "reenviar" é gerar uma senha nova.
 */
async function liberarAcessoInscrito(db, inscricaoId, baseUrl, opcoes = {}) {
  const { forcarNovaSenha = false } = opcoes;

  const inscricao = db.prepare(`
    SELECT inscricoes.id, inscricoes.status_pagamento,
           inscritos.id AS inscrito_id, inscritos.nome, inscritos.email,
           inscritos.senha_hash, inscritos.troca_senha_obrigatoria,
           cursos.nome AS nome_curso, cursos.data_evento, cursos.carga_horaria
    FROM inscricoes
    JOIN inscritos ON inscritos.id = inscricoes.inscrito_id
    LEFT JOIN cursos ON inscricoes.curso = cursos.id
    WHERE inscricoes.id = ?
  `).get(inscricaoId);

  if (!inscricao) {
    throw new Error(`Inscrição ${inscricaoId} não encontrada.`);
  }

  // "Já tinha senha definitiva" = a própria pessoa já escolheu essa senha
  // (não é mais a senha provisória gerada pelo sistema). Nesse caso o
  // acesso NUNCA é resetado automaticamente - nem pelo fluxo normal, nem
  // pelo botão "Reenviar acesso" - porque isso derrubaria uma senha que só
  // a pessoa conhece. Quem esqueceu a própria senha usa "Esqueci minha
  // senha" (fluxo separado, por token de e-mail), não este aqui.
  const jaTinhaSenhaDefinitiva = !!(inscricao.senha_hash && inscricao.troca_senha_obrigatoria === 0);
  const totalOutrasInscricoes = db.prepare(
    "SELECT COUNT(*) AS total FROM inscricoes WHERE inscrito_id = ? AND id != ?"
  ).get(inscricao.inscrito_id, inscricaoId)?.total || 0;
  // "Já possui conta" (uso no fluxo automático): essa PESSOA já tinha uma
  // senha definitiva antes, ou já tem outra inscrição além desta - em
  // qualquer um dos dois casos, o fluxo automático não deve gerar nem
  // mostrar senha nenhuma, porque ela já sabe entrar no Painel do Inscrito.
  const jaPossuiConta = jaTinhaSenhaDefinitiva || totalOutrasInscricoes > 0;

  let senhaPlana = null;
  let senhaHash = inscricao.senha_hash;
  let trocaObrigatoria = inscricao.troca_senha_obrigatoria != null ? inscricao.troca_senha_obrigatoria : 1;

  // Gera uma senha nova quando: (a) a pessoa nunca teve senha nenhuma no
  // sistema [fluxo normal, primeira liberação de acesso], ou (b) foi pedido
  // explicitamente um reenvio de acesso pelo painel admin e ela ainda está
  // na senha provisória (não escolheu a própria) - não temos mais como
  // reenviar a senha antiga, então "reenviar" vira "gerar uma nova".
  const precisaGerarSenha = !senhaHash || (forcarNovaSenha && !jaTinhaSenhaDefinitiva);

  if (precisaGerarSenha) {
    senhaPlana = gerarSenhaAlfanumerica(8);
    senhaHash = hashSenha(senhaPlana);
    trocaObrigatoria = 1;

    db.prepare(`
      UPDATE inscritos
      SET senha_hash = ?, troca_senha_obrigatoria = ?
      WHERE id = ?
    `).run(senhaHash, trocaObrigatoria, inscricao.inscrito_id);
  }

  // No reenvio forçado, se geramos senha nova ela é sempre mostrada (é o
  // ponto do botão). No fluxo automático, continua seguindo "jaPossuiConta"
  // como sempre seguiu, pra não repetir e-mail de senha à toa.
  const deveExibirSenha = forcarNovaSenha ? precisaGerarSenha : (precisaGerarSenha && !jaPossuiConta);

  // Envia o e-mail de confirmação / acesso
  const resultadoEmail = await enviarEmailAcessoInscrito({
    nome: inscricao.nome,
    email: inscricao.email,
    nomeCurso: inscricao.nome_curso || inscricao.curso,
    senhaTemporaria: deveExibirSenha ? senhaPlana : null,
    baseUrl,
    dataEvento: inscricao.data_evento,
    cargaHoraria: inscricao.carga_horaria,
    jaPossuiConta: !deveExibirSenha,
  });

  if (resultadoEmail.sucesso) {
    db.prepare(`
      UPDATE inscricoes
      SET email_credenciais_enviado = 1,
          data_envio_credenciais = ?
      WHERE id = ?
    `).run(new Date().toISOString(), inscricaoId);
  }

  return {
    sucesso: true,
    email: inscricao.email,
    senhaGerada: deveExibirSenha ? senhaPlana : null,
    jaPossuiConta: !deveExibirSenha,
    jaTinhaSenhaDefinitiva,
    emailEnviado: resultadoEmail.sucesso,
    motivo: resultadoEmail.motivo || null,
  };
}

module.exports = {
  gerarSenhaAlfanumerica,
  hashSenha,
  verificarSenha,
  gerarTokenSessao,
  liberarAcessoInscrito,
};
