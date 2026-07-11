'use strict';

const { cleanText } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, sendJson } = require('./_http');

async function orderLookup(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  if (!hasDatabase()) return sendJson(res, 404, { error: 'Banco nao configurado.' });

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const id = cleanText(url.searchParams.get('id'), 80);
  const email = cleanText(url.searchParams.get('email'), 160).toLowerCase();

  if (!id) return sendJson(res, 400, { error: 'Informe o pedido.' });

  const result = await query(
    `select o.id, o.status, o.payment_status, o.total_amount, o.carrier, o.tracking_code, o.created_at, o.updated_at,
            c.name as customer_name, c.email as customer_email, c.city
     from orders o
     left join customers c on c.id = o.customer_id
     where o.id = $1`,
    [id]
  );

  if (!result.rows.length) return sendJson(res, 404, { error: 'Pedido nao encontrado.' });
  const order = result.rows[0];
  if (email && order.customer_email && order.customer_email !== email) {
    return sendJson(res, 403, { error: 'E-mail nao confere com o pedido.' });
  }

  const items = await query(
    `select product_name, quantity, unit_price, total_price
     from order_items
     where order_id = $1
     order by id asc`,
    [id]
  );

  return sendJson(res, 200, { order: { ...order, items: items.rows } });
}

module.exports = orderLookup;
