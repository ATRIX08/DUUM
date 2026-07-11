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

module.exports = {
  orderCreatedTemplate,
  sendTransactionalEmail,
  shippedTemplate
};
