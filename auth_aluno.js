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
 * Gera a senha alfanumérica de 8 caracteres e envia o e-mail automaticamente
 */
async function liberarAcessoInscrito(db, inscricaoId, baseUrl) {
  const inscricao = db.prepare(`
    SELECT inscricoes.*, cursos.nome AS nome_curso, cursos.data_evento, cursos.carga_horaria
    FROM inscricoes
    LEFT JOIN cursos ON inscricoes.curso = cursos.id
    WHERE inscricoes.id = ?
  `).get(inscricaoId);

  if (!inscricao) {
    throw new Error(`Inscrição ${inscricaoId} não encontrada.`);
  }

  // Gera nova senha alfanumérica de 8 caracteres
  let senhaPlana = inscricao.senha_plana_inicial;
  if (!senhaPlana || !inscricao.senha_hash) {
    senhaPlana = gerarSenhaAlfanumerica(8);
    const senhaCripto = hashSenha(senhaPlana);

    db.prepare(`
      UPDATE inscricoes
      SET senha_hash = ?,
          senha_plana_inicial = ?,
          troca_senha_obrigatoria = 1
      WHERE id = ?
    `).run(senhaCripto, senhaPlana, inscricaoId);
  }

  // Envia o e-mail com os dados de acesso
  const resultadoEmail = await enviarEmailAcessoInscrito({
    nome: inscricao.nome,
    email: inscricao.email,
    nomeCurso: inscricao.nome_curso || inscricao.curso,
    senhaTemporaria: senhaPlana,
    baseUrl,
    dataEvento: inscricao.data_evento,
    cargaHoraria: inscricao.carga_horaria,
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
    senhaGerada: senhaPlana,
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
