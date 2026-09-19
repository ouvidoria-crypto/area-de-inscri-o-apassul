const nodemailer = require("nodemailer");

function obterTransporte() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Envia o e-mail automático com os dados de login e senha gerada após confirmação da inscrição
 */
async function enviarEmailAcessoInscrito({
  nome,
  email,
  nomeCurso,
  senhaTemporaria,
  baseUrl,
  dataEvento,
  cargaHoraria,
}) {
  const transport = obterTransporte();
  const linkAreaInscrito = `${baseUrl || "https://insc-apassul.onrender.com"}/area-do-inscrito.html`;
  const remetente =
    process.env.EMAIL_FROM ||
    `"Apassul - Cursos e Treinamentos" <${process.env.SMTP_USER || "ouvidoria@apassul.com.br"}>`;

  if (!transport) {
    console.log("========================================================================");
    console.log(`📧 [MODO DE TESTE - ENVIO DE DADOS DE ACESSO AO PARTICIPANTE]`);
    console.log(` -> Destinatário: ${email}`);
    console.log(` -> Login (E-mail): ${email}`);
    console.log(` -> Senha de Acesso (alfanumérica): ${senhaTemporaria}`);
    console.log(` -> Curso: ${nomeCurso}`);
    console.log(` -> Link da Área do Inscrito: ${linkAreaInscrito}`);
    console.log(` -> Status: Inscrição 100% Confirmada e Aprovada`);
    console.log(" (Para envio real para caixas externas, preencha SMTP_HOST, SMTP_USER e SMTP_PASS)");
    console.log("========================================================================");
    return {
      sucesso: true,
      motivo: "MODO_TESTE_SIMULADO",
      senhaTemporaria,
    };
  }

  const htmlConteudo = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f4; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background-color: #2e6b3e; padding: 28px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
        .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 32px 24px; line-height: 1.6; }
        .badge-sucesso { display: inline-block; background-color: #eaf5ec; color: #2e6b3e; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; }
        .box-credenciais { background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
        .box-credenciais .label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 4px; }
        .box-credenciais .valor-login { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; word-break: break-all; }
        .box-credenciais .valor-senha { font-size: 24px; font-weight: 700; color: #2e6b3e; letter-spacing: 2px; font-family: monospace; background: #ffffff; display: inline-block; padding: 8px 18px; border-radius: 6px; border: 1px solid #e2e8f0; }
        .aviso-troca { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 13px; color: #92400e; }
        .btn-acesso { display: block; width: fit-content; margin: 28px auto; background-color: #2e6b3e; color: #ffffff !important; text-decoration: none; padding: 14px 32px; font-weight: 700; font-size: 15px; border-radius: 8px; text-align: center; }
        .detalhes-curso { background-color: #f1f5f9; border-radius: 8px; padding: 16px; font-size: 14px; margin-top: 24px; }
        .detalhes-curso p { margin: 4px 0; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>APASSUL</h1>
          <p>Associação dos Produtores e Comerciantes de Sementes e Mudas</p>
        </div>
        <div class="content">
          <span class="badge-sucesso">✓ Inscrição Confirmada</span>
          <p>Olá, <strong>${nome}</strong>,</p>
          <p>Confirmamos com sucesso a sua inscrição no treinamento <strong>${nomeCurso}</strong>!</p>
          <p>Seus dados de acesso à <strong>Área do Inscrito</strong> foram gerados pelo sistema:</p>

          <div class="box-credenciais">
            <div class="label">Seu Login (E-mail):</div>
            <div class="valor-login">${email}</div>

            <div class="label">Sua Senha de Acesso Provisória:</div>
            <div class="valor-senha">${senhaTemporaria}</div>
          </div>

          <div class="aviso-troca">
            🔑 <strong>Primeiro Acesso:</strong> Ao acessar a Área do Inscrito pela primeira vez com sua senha provisória, o sistema solicitará que você cadastre sua nova senha pessoal definitiva.
          </div>

          <a href="${linkAreaInscrito}" class="btn-acesso">Acessar Área do Inscrito</a>

          <div class="detalhes-curso">
            <p><strong>Treinamento:</strong> ${nomeCurso}</p>
            ${dataEvento ? `<p><strong>Data:</strong> ${dataEvento}</p>` : ""}
            ${cargaHoraria ? `<p><strong>Carga Horária:</strong> ${cargaHoraria}</p>` : ""}
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
            Na Área do Inscrito você poderá acompanhar o cronograma, emitir seu comprovante de inscrição e acessar as salas de transmissão ao vivo e materiais do curso assim que o pagamento for compensado.
          </p>
        </div>
        <div class="footer">
          <p>Apassul - Dúvidas e suporte: ouvidoria@apassul.com.br</p>
          <p>Este é um e-mail automático enviado após a confirmação da sua inscrição.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transport.sendMail({
      from: remetente,
      to: email,
      subject: `Inscrição Confirmada e Dados de Acesso - ${nomeCurso} (Apassul)`,
      html: htmlConteudo,
    });
    console.log(`[EMAIL] Credenciais enviadas com sucesso para ${email}: ${info.messageId}`);
    return { sucesso: true, messageId: info.messageId, senhaTemporaria };
  } catch (erro) {
    console.error(`[EMAIL ERRO] Falha ao enviar credenciais para ${email}:`, erro.message);
    return { sucesso: false, erro: erro.message, senhaTemporaria };
  }
}

module.exports = {
  enviarEmailAcessoInscrito,
};
