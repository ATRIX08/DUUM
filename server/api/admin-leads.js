'use strict';

const { requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, sendJson } = require('./_http');

async function adminLeads(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });
  if (req.method !== 'GET') return methodNotAllowed(res);

  const [newsletter, carts] = await Promise.all([
    query(
      `select id, email, source, coupon_code, created_at
       from newsletter_subscribers
       order by created_at desc
       limit 200`
    ),
    query(
      `select id, email, 'carrinho' as source, coupon_code, last_seen_at as created_at, subtotal, status
       from abandoned_carts
       order by last_seen_at desc
       limit 100`
    )
  ]);

  return sendJson(res, 200, { leads: [...carts.rows, ...newsletter.rows] });
}

module.exports = adminLeads;
