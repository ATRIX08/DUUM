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

function getCompanyEmail() {
  return process.env.COMPANY_EMAIL || 'duummoda@gmail.com';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function rows(items = []) {
  if (!items.length) return '<p>Nenhum item detalhado.</p>';
  return `<table style="width:100%;border-collapse:collapse">${items.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(item.product_name || item.title || item.name)} x ${Number(item.quantity || 1)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${money(item.total_price || (Number(item.unit_price || 0) * Number(item.quantity || 1)))}</td>
    </tr>`).join('')}</table>`;
}

function companyShell(title, body) {
  return `
    <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;max-width:640px">
      <h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(title)}</h1>
      ${body}
      <p style="margin-top:24px;color:#666;font-size:13px">Notificacao automatica da loja DUUM.</p>
    </div>`;
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

function companyOrderTemplate({ orderId, customer, total, discountCode, shippingFee, items }) {
  return companyShell('Novo pedido iniciado', `
    <p>Um cliente iniciou o checkout na DUUM.</p>
    <p><strong>Pedido:</strong> ${escapeHtml(orderId)}<br>
    <strong>Cliente:</strong> ${escapeHtml(customer.name || '-')}<br>
    <strong>E-mail:</strong> ${escapeHtml(customer.email || '-')}<br>
    <strong>Telefone:</strong> ${escapeHtml(customer.phone || '-')}<br>
    <strong>Cidade:</strong> ${escapeHtml(customer.city || '-')}</p>
    ${rows(items)}
    <p><strong>Frete:</strong> ${money(shippingFee)}<br>
    <strong>Cupom:</strong> ${escapeHtml(discountCode || '-')}<br>
    <strong>Total:</strong> ${money(total)}</p>`);
}

function companyPaymentTemplate({ order, items }) {
  return companyShell('Pagamento aprovado', `
    <p>O Mercado Pago confirmou pagamento aprovado.</p>
    <p><strong>Pedido:</strong> ${escapeHtml(order.id)}<br>
    <strong>Pagamento:</strong> ${escapeHtml(order.mercado_pago_payment_id || '-')}<br>
    <strong>Cliente:</strong> ${escapeHtml(order.customer_name || '-')}<br>
    <strong>E-mail:</strong> ${escapeHtml(order.customer_email || '-')}<br>
    <strong>Status:</strong> ${escapeHtml(order.payment_status || '-')}</p>
    ${rows(items)}
    <p><strong>Total pago:</strong> ${money(order.total_amount)}</p>`);
}

function companyAccountTemplate(user) {
  return companyShell('Nova conta criada', `
    <p>Uma pessoa criou conta na loja.</p>
    <p><strong>Nome:</strong> ${escapeHtml(user.name)}<br>
    <strong>E-mail:</strong> ${escapeHtml(user.email)}<br>
    <strong>Telefone:</strong> ${escapeHtml(user.phone || '-')}</p>`);
}

function companyLeadTemplate({ email, source, coupon }) {
  return companyShell('Novo lead capturado', `
    <p>Um e-mail entrou na lista da DUUM.</p>
    <p><strong>E-mail:</strong> ${escapeHtml(email)}<br>
    <strong>Origem:</strong> ${escapeHtml(source || 'site')}<br>
    <strong>Cupom:</strong> ${escapeHtml(coupon || '-')}</p>`);
}

function companyAbandonedCartTemplate({ email, name, phone, subtotal, coupon, link, items }) {
  return companyShell('Carrinho abandonado capturado', `
    <p>Um cliente informou e-mail e deixou itens na sacola.</p>
    <p><strong>Cliente:</strong> ${escapeHtml(name || '-')}<br>
    <strong>E-mail:</strong> ${escapeHtml(email)}<br>
    <strong>Telefone:</strong> ${escapeHtml(phone || '-')}<br>
    <strong>Cupom:</strong> ${escapeHtml(coupon || '-')}</p>
    ${rows(items)}
    <p><strong>Subtotal:</strong> ${money(subtotal)}</p>
    <p><a href="${escapeHtml(link)}">Abrir recuperacao da sacola</a></p>`);
}

function companyReviewTemplate({ review, product }) {
  return companyShell('Nova avaliacao recebida', `
    <p>Uma avaliacao foi enviada e esta disponivel no admin.</p>
    <p><strong>Produto:</strong> ${escapeHtml(product?.name || `ID ${review.product_id}`)}<br>
    <strong>Cliente:</strong> ${escapeHtml(review.customer_name)}<br>
    <strong>E-mail:</strong> ${escapeHtml(review.customer_email || '-')}<br>
    <strong>Nota:</strong> ${escapeHtml(review.rating)} / 5</p>
    <p><strong>Comentario:</strong><br>${escapeHtml(review.comment || '-')}</p>`);
}

async function sendCompanyNotification({ subject, html }) {
  return sendTransactionalEmail({
    to: getCompanyEmail(),
    subject,
    html
  });
}

module.exports = {
  abandonedCartTemplate,
  companyAbandonedCartTemplate,
  companyAccountTemplate,
  companyLeadTemplate,
  companyOrderTemplate,
  companyPaymentTemplate,
  companyReviewTemplate,
  getCompanyEmail,
  orderCreatedTemplate,
  passwordResetTemplate,
  sendCompanyNotification,
  sendTransactionalEmail,
  shippedTemplate
};
