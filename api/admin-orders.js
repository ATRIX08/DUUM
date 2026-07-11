'use strict';

const { cleanText, requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, readJson, sendJson } = require('./_http');

const allowedStatuses = new Set(['pending_payment', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'payment_rejected']);

async function getOrder(orderId) {
  const orders = await query(
    `select o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
            c.cep, c.address, c.number, c.city
     from orders o
     left join customers c on c.id = o.customer_id
     where o.id = $1`,
    [orderId]
  );

  if (!orders.rows.length) return null;

  const items = await query(
    `select *
     from order_items
     where order_id = $1
     order by id asc`,
    [orderId]
  );

  const events = await query(
    `select provider_payment_id, topic, status, status_detail, created_at
     from payment_events
     where order_id = $1
     order by created_at desc
     limit 20`,
    [orderId]
  );

  return { ...orders.rows[0], items: items.rows, events: events.rows };
}

async function listOrders(res) {
  const result = await query(
    `select o.id, o.status, o.payment_status, o.total_amount, o.created_at, o.updated_at,
            c.name as customer_name, c.email as customer_email, count(oi.id)::int as item_count
     from orders o
     left join customers c on c.id = o.customer_id
     left join order_items oi on oi.order_id = o.id
     group by o.id, c.name, c.email
     order by o.created_at desc
     limit 100`
  );
  return sendJson(res, 200, { orders: result.rows });
}

async function adminOrders(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const orderId = cleanText(url.searchParams.get('id'), 80);

  if (req.method === 'GET') {
    if (!orderId) return listOrders(res);
    const order = await getOrder(orderId);
    return order ? sendJson(res, 200, { order }) : sendJson(res, 404, { error: 'Pedido nao encontrado.' });
  }

  if (req.method !== 'PATCH' && req.method !== 'POST') return methodNotAllowed(res);

  try {
    const body = await readJson(req);
    const targetId = orderId || cleanText(body.id, 80);
    const status = cleanText(body.status, 40);
    if (!targetId) throw new Error('Pedido obrigatorio.');
    if (!allowedStatuses.has(status)) throw new Error('Status invalido.');

    const result = await query(
      `update orders
       set status = $2,
           updated_at = now()
       where id = $1
       returning id, status, updated_at`,
      [targetId, status]
    );

    if (!result.rows.length) return sendJson(res, 404, { error: 'Pedido nao encontrado.' });
    return sendJson(res, 200, { saved: true, order: result.rows[0] });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

module.exports = adminOrders;
