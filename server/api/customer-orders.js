'use strict';

const { cleanText } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, sendJson } = require('./_http');

async function customerOrders(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  if (!hasDatabase()) return sendJson(res, 500, { error: 'Banco nao configurado.' });
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const email = cleanText(url.searchParams.get('email'), 160).toLowerCase();
  if (!email) return sendJson(res, 400, { error: 'Informe o e-mail.' });

  const result = await query(
    `select o.id, o.status, o.payment_status, o.total_amount, o.shipping_fee, o.carrier, o.tracking_code, o.created_at,
            count(oi.id)::int as item_count
     from orders o
     join customers c on c.id = o.customer_id
     left join order_items oi on oi.order_id = o.id
     where lower(c.email) = $1
     group by o.id
     order by o.created_at desc
     limit 50`,
    [email]
  );

  return sendJson(res, 200, { orders: result.rows });
}

module.exports = customerOrders;
