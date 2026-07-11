'use strict';

const { requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, sendJson } = require('./_http');

async function adminDashboard(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });
  if (req.method !== 'GET') return methodNotAllowed(res);

  const [summary, byStatus, lowStock, recentEvents] = await Promise.all([
    query(
      `select count(*)::int as orders,
              coalesce(sum(total_amount), 0)::numeric(10,2) as gross_total,
              count(*) filter (where payment_status = 'approved')::int as paid_orders,
              coalesce(sum(total_amount) filter (where payment_status = 'approved'), 0)::numeric(10,2) as paid_total
       from orders`
    ),
    query(
      `select status, count(*)::int as count
       from orders
       group by status
       order by count desc`
    ),
    query(
      `select id, name, stock_quantity
       from products
       where active = true and stock_quantity <= 3
       order by stock_quantity asc, id asc
       limit 12`
    ),
    query(
      `select provider_payment_id, topic, status, created_at
       from payment_events
       order by created_at desc
       limit 8`
    )
  ]);

  return sendJson(res, 200, {
    summary: summary.rows[0],
    byStatus: byStatus.rows,
    lowStock: lowStock.rows,
    recentEvents: recentEvents.rows
  });
}

module.exports = adminDashboard;
