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

  const emailNorm = inscricao.email.trim().toLowerCase();
  let usuario = db.prepare("SELECT * FROM usuarios_aluno WHERE LOWER(email) = ?").get(emailNorm);

  const jaTinhaCadastroDefinido = !!(usuario?.senha_hash && (usuario.troca_senha_obrigatoria === 0 || usuario.senha_plana_inicial));
  const totalInscricoesAnteriores = db.prepare("SELECT COUNT(*) AS total FROM inscricoes WHERE LOWER(email) = ? AND id != ?").get(emailNorm, inscricaoId)?.total || 0;
  const jaPossuiConta = jaTinhaCadastroDefinido || totalInscricoesAnteriores > 0;

  let senhaPlana = usuario?.senha_plana_inicial || inscricao.senha_plana_inicial;
  let senhaHash = usuario?.senha_hash || inscricao.senha_hash;
  let trocaObrigatoria = usuario?.troca_senha_obrigatoria != null ? usuario.troca_senha_obrigatoria : 1;

  // Se o usuário ainda não possuir senha no sistema, gera a senha de 8 caracteres
  if (!senhaHash) {
    senhaPlana = gerarSenhaAlfanumerica(8);
    senhaHash = hashSenha(senhaPlana);
    trocaObrigatoria = 1;
  }

  // Garante sincronia na tabela unificada usuarios_aluno
  db.prepare(`
    INSERT INTO usuarios_aluno (email, cpf, nome, empresa, telefone, senha_hash, senha_plana_inicial, troca_senha_obrigatoria, criado_em)
    VALUES (@email, @cpf, @nome, @empresa, @telefone, @senha_hash, @senha_plana_inicial, @troca_senha_obrigatoria, @criado_em)
    ON CONFLICT(email) DO UPDATE SET
      cpf = COALESCE(excluded.cpf, usuarios_aluno.cpf),
      nome = COALESCE(excluded.nome, usuarios_aluno.nome),
      empresa = COALESCE(excluded.empresa, usuarios_aluno.empresa),
      telefone = COALESCE(excluded.telefone, usuarios_aluno.telefone),
      senha_hash = COALESCE(usuarios_aluno.senha_hash, excluded.senha_hash)
  `).run({
    email: emailNorm,
    cpf: inscricao.cpf || null,
    nome: inscricao.nome,
    empresa: inscricao.empresa || null,
    telefone: inscricao.telefone || null,
    senha_hash: senhaHash,
    senha_plana_inicial: senhaPlana,
    troca_senha_obrigatoria: trocaObrigatoria,
    criado_em: new Date().toISOString()
  });

  // Atualiza os dados desta inscrição específica
  db.prepare(`
    UPDATE inscricoes
    SET senha_hash = ?,
        senha_plana_inicial = ?,
        troca_senha_obrigatoria = ?
    WHERE id = ?
  `).run(senhaHash, senhaPlana, trocaObrigatoria, inscricaoId);

  // Envia o e-mail de confirmação / acesso
  const resultadoEmail = await enviarEmailAcessoInscrito({
    nome: inscricao.nome,
    email: inscricao.email,
    nomeCurso: inscricao.nome_curso || inscricao.curso,
    senhaTemporaria: jaPossuiConta ? null : senhaPlana,
    baseUrl,
    dataEvento: inscricao.data_evento,
    cargaHoraria: inscricao.carga_horaria,
    jaPossuiConta,
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
    senhaGerada: jaPossuiConta ? null : senhaPlana,
    jaPossuiConta,
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
