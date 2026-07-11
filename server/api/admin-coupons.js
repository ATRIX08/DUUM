'use strict';

const { cleanMoney, cleanText, requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, readJson, sendJson } = require('./_http');

function normalizeCoupon(body) {
  const code = cleanText(body.code, 40).toUpperCase().replace(/\s+/g, '');
  const type = cleanText(body.type, 20) || 'percent';
  const value = cleanMoney(body.value);
  const minOrderAmount = body.min_order_amount ? cleanMoney(body.min_order_amount) : 0;
  const maxUses = body.max_uses ? Number(body.max_uses) : null;

  if (!code) throw new Error('Codigo do cupom obrigatorio.');
  if (!['percent', 'fixed'].includes(type)) throw new Error('Tipo de cupom invalido.');
  if (value === null || value <= 0) throw new Error('Valor do cupom invalido.');
  if (type === 'percent' && value > 80) throw new Error('Desconto percentual maximo permitido: 80%.');
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) throw new Error('Limite de usos invalido.');

  return {
    code,
    type,
    value,
    min_order_amount: minOrderAmount || 0,
    max_uses: maxUses,
    active: body.active !== false,
    starts_at: cleanText(body.starts_at, 40) || null,
    expires_at: cleanText(body.expires_at, 40) || null
  };
}

async function adminCoupons(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });

  if (req.method === 'GET') {
    const result = await query(
      `select *
       from coupons
       order by active desc, created_at desc`
    );
    return sendJson(res, 200, { coupons: result.rows });
  }

  if (req.method !== 'POST' && req.method !== 'PUT') return methodNotAllowed(res);

  try {
    const coupon = normalizeCoupon(await readJson(req));
    await query(
      `insert into coupons (code, type, value, min_order_amount, max_uses, active, starts_at, expires_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,now())
       on conflict (code) do update set
         type = excluded.type,
         value = excluded.value,
         min_order_amount = excluded.min_order_amount,
         max_uses = excluded.max_uses,
         active = excluded.active,
         starts_at = excluded.starts_at,
         expires_at = excluded.expires_at,
         updated_at = now()`,
      [
        coupon.code,
        coupon.type,
        coupon.value,
        coupon.min_order_amount,
        coupon.max_uses,
        coupon.active,
        coupon.starts_at,
        coupon.expires_at
      ]
    );

    return sendJson(res, 200, { saved: true, coupon });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

module.exports = adminCoupons;
