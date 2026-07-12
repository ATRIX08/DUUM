'use strict';

const crypto = require('crypto');
const { cleanText } = require('./_admin');
const { normalizeCart } = require('./_catalog');
const { hasDatabase, query } = require('./_db');
const { abandonedCartTemplate, companyAbandonedCartTemplate, sendCompanyNotification, sendTransactionalEmail } = require('./_email');
const { methodNotAllowed, readJson, sendJson } = require('./_http');

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getBaseUrl(req) {
  const host = req.headers.host || '';
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  return host ? `${protocol}://${host}` : '';
}

async function abandonedCart(req, res) {
  if (req.method === 'GET') {
    if (!hasDatabase()) return sendJson(res, 404, { error: 'Banco nao configurado.' });
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const token = cleanText(url.searchParams.get('token'), 80);
    if (!token) return sendJson(res, 400, { error: 'Token invalido.' });
    const result = await query(
      `select email, customer_name, phone, cart, coupon_code, subtotal
       from abandoned_carts
       where recovery_token = $1
       limit 1`,
      [token]
    );
    if (!result.rows.length) return sendJson(res, 404, { error: 'Sacola nao encontrada.' });
    return sendJson(res, 200, { cart: result.rows[0] });
  }

  if (req.method !== 'POST') return methodNotAllowed(res);
  if (!hasDatabase()) return sendJson(res, 200, { tracked: false });

  try {
    const body = await readJson(req);
    const email = cleanText(body.email, 160).toLowerCase();
    if (!isEmail(email)) return sendJson(res, 400, { error: 'E-mail invalido.' });

    const items = await normalizeCart(body.cart || []);
    if (!items.length) return sendJson(res, 400, { error: 'Sacola vazia.' });

    const subtotal = Number(items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2));
    const existing = await query(
      `select id, recovery_token
       from abandoned_carts
       where email = $1 and status = 'open'
       order by last_seen_at desc
       limit 1`,
      [email]
    );
    const token = existing.rows[0]?.recovery_token || crypto.randomBytes(20).toString('hex');
    const values = existing.rows.length
      ? [
          existing.rows[0].id,
          cleanText(body.name, 100),
          cleanText(body.phone, 30),
          JSON.stringify(body.cart || []),
          subtotal,
          cleanText(body.coupon, 40).toUpperCase()
        ]
      : [
          email,
          cleanText(body.name, 100),
          cleanText(body.phone, 30),
          JSON.stringify(body.cart || []),
          subtotal,
          cleanText(body.coupon, 40).toUpperCase(),
          token
        ];
    const result = await query(
      existing.rows.length
        ? `update abandoned_carts
           set customer_name = $2,
               phone = $3,
               cart = $4::jsonb,
               subtotal = $5,
               coupon_code = $6,
               last_seen_at = now(),
               updated_at = now()
           where id = $1
           returning id, recovery_token`
        : `insert into abandoned_carts (email, customer_name, phone, cart, subtotal, coupon_code, recovery_token)
           values ($1, $2, $3, $4::jsonb, $5, $6, $7)
           returning id, recovery_token`,
      values
    );

    const saved = result.rows[0];
    const link = `${getBaseUrl(req)}/checkout.html?recover_cart=${saved.recovery_token}`;
    await sendTransactionalEmail({
      to: email,
      subject: 'Sua sacola DUUM esta salva',
      html: abandonedCartTemplate(link, subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
    }).catch(() => null);

    await sendCompanyNotification({
      subject: `DUUM: carrinho abandonado ${email}`,
      html: companyAbandonedCartTemplate({
        email,
        name: cleanText(body.name, 100),
        phone: cleanText(body.phone, 30),
        subtotal,
        coupon: cleanText(body.coupon, 40).toUpperCase(),
        link,
        items
      })
    }).catch(() => null);

    return sendJson(res, 200, { tracked: true });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

module.exports = abandonedCart;
