'use strict';

const { requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, sendJson } = require('./_http');

async function adminLeads(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });
  if (req.method !== 'GET') return methodNotAllowed(res);

  const result = await query(
    `select id, email, source, coupon_code, created_at
     from newsletter_subscribers
     order by created_at desc
     limit 200`
  );

  return sendJson(res, 200, { leads: result.rows });
}

module.exports = adminLeads;
