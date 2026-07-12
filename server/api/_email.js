'use strict';

async function sendTransactionalEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'DUUM <onboarding@resend.dev>';
  if (!key || !to) return { skipped: true };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, html })
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

function orderCreatedTemplate(orderId, total) {
  return `<h1>Pedido recebido</h1><p>Recebemos seu pedido <strong>${orderId}</strong>.</p><p>Total: <strong>${total}</strong></p><p>Voce recebera atualizacoes quando o pagamento e envio forem confirmados.</p>`;
}

function shippedTemplate(orderId, carrier, tracking) {
  return `<h1>Pedido enviado</h1><p>Seu pedido <strong>${orderId}</strong> foi enviado.</p><p>Transportadora: <strong>${carrier || '-'}</strong></p><p>Rastreio: <strong>${tracking || '-'}</strong></p>`;
}

function passwordResetTemplate(link) {
  return `<h1>Recuperar senha DUUM</h1><p>Use o botao abaixo para criar uma nova senha.</p><p><a href="${link}">Redefinir senha</a></p><p>Este link expira em 30 minutos.</p>`;
}

function abandonedCartTemplate(link, total) {
  return `<h1>Sua sacola DUUM ficou esperando</h1><p>Voce deixou uma selecao na sacola.</p><p>Total estimado: <strong>${total}</strong></p><p><a href="${link}">Voltar para finalizar</a></p>`;
}

module.exports = {
  abandonedCartTemplate,
  orderCreatedTemplate,
  passwordResetTemplate,
  sendTransactionalEmail,
  shippedTemplate
};
