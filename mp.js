const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

let mpClient = null;

function getMPClient() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token || !token.trim()) {
    return null;
  }
  if (!mpClient) {
    mpClient = new MercadoPagoConfig({
      accessToken: token.trim(),
      options: { timeout: 10000 },
    });
  }
  return mpClient;
}

/**
 * Cria a preferência de pagamento no Mercado Pago (Checkout Pro)
 * Suporta redirecionamento automático para Pix ou Boleto Bancário.
 */
async function criarPreferenciaPagamento({
  inscricaoId,
  curso,
  participante,
  metodoPagamento,
  vencimentoBoleto,
  baseUrl,
}) {
  const client = getMPClient();
  const valorCurso = Number(curso.preco) || 3200.00;

  // Se não houver credencial configurada no ambiente, retorna modo simulação
  // para que o fluxo continue funcionando com feedback visual no app.
  if (!client) {
    return {
      id: null,
      init_point: null,
      sandbox_init_point: null,
      modoSimulado: true,
      mensagem: "Token do Mercado Pago não configurado no ambiente (.env).",
    };
  }

  const preference = new Preference(client);

  const isHttps = Boolean(baseUrl && baseUrl.startsWith("https://") && !baseUrl.includes("localhost"));
  const backUrls = isHttps ? {
    success: `${baseUrl}/inscricao-confirmada.html?status=aprovado&id=${inscricaoId}`,
    pending: `${baseUrl}/inscricao-confirmada.html?status=pendente&id=${inscricaoId}`,
    failure: `${baseUrl}/inscricao-confirmada.html?status=rejeitado&id=${inscricaoId}`,
  } : undefined;

  const payerData = {
    name: participante.nome || "",
    email: participante.email || "",
  };

  if (participante.telefone) {
    const digitosTel = participante.telefone.replace(/\D/g, "");
    if (digitosTel.length >= 10) {
      payerData.phone = {
        area_code: digitosTel.slice(0, 2),
        number: digitosTel.slice(2),
      };
    }
  }

  if (participante.cpf) {
    const digitosCpf = participante.cpf.replace(/\D/g, "");
    if (digitosCpf.length === 11) {
      payerData.identification = {
        type: "CPF",
        number: digitosCpf,
      };
    }
  }

  const body = {
    items: [
      {
        id: String(curso.id || "curso"),
        title: `Inscrição: ${curso.nome || "Curso Apassul"}`.substring(0, 255),
        description: `Inscrição do participante ${participante.nome} no curso ${curso.nome}`.substring(0, 255),
        quantity: 1,
        unit_price: valorCurso,
        currency_id: "BRL",
      },
    ],
    payer: payerData,
    ...(backUrls ? { back_urls: backUrls, auto_return: "approved" } : {}),
    external_reference: String(inscricaoId),
    statement_descriptor: "APASSUL",
  };

  // Se a URL pública do servidor for informada ou válida (não localhost), adiciona o webhook
  if (baseUrl && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) {
    body.notification_url = `${baseUrl}/webhook/mercadopago`;
  }

  // Configuração específica para Boleto ou Pix
  if (metodoPagamento === "boleto") {
    // Configura a data limite de vencimento se informada pelo usuário no calendário (DD/MM/AAAA)
    if (vencimentoBoleto) {
      const partes = vencimentoBoleto.split("/");
      if (partes.length === 3) {
        const dia = partes[0].padStart(2, "0");
        const mes = partes[1].padStart(2, "0");
        const ano = partes[2];
        const dataVencimentoIso = `${ano}-${mes}-${dia}T23:59:59.000-03:00`;
        body.date_of_expiration = dataVencimentoIso;
        body.expires = true;
        body.expiration_date_to = dataVencimentoIso;
      }
    }

    body.payment_methods = {
      excluded_payment_types: [
        { id: "credit_card" },
        { id: "debit_card" },
        { id: "bank_transfer" },
      ],
      installments: 1,
    };
  } else if (metodoPagamento === "pix") {
    body.payment_methods = {
      excluded_payment_types: [
        { id: "credit_card" },
        { id: "debit_card" },
        { id: "ticket" },
      ],
      installments: 1,
    };
  }

  try {
    const resposta = await preference.create({ body });
    return {
      id: resposta.id,
      init_point: resposta.init_point,
      sandbox_init_point: resposta.sandbox_init_point,
      modoSimulado: false,
    };
  } catch (erro) {
    console.error("Erro ao gerar preferência no Mercado Pago:", erro);
    throw erro;
  }
}

/**
 * Consulta os detalhes de um pagamento no Mercado Pago a partir do payment_id
 */
async function consultarPagamento(paymentId) {
  const client = getMPClient();
  if (!client) return null;

  try {
    const payment = new Payment(client);
    return await payment.get({ id: String(paymentId) });
  } catch (erro) {
    console.error(`Erro ao consultar pagamento ${paymentId} no Mercado Pago:`, erro);
    return null;
  }
}

module.exports = {
  getMPClient,
  criarPreferenciaPagamento,
  consultarPagamento,
};
