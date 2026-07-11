'use strict';

const { requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, sendJson } = require('./_http');

async function adminReports(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });
  if (req.method !== 'GET') return methodNotAllowed(res);

  const [summary, byDay, topProducts, stockValue] = await Promise.all([
    query(
      `select count(*)::int as orders,
              count(*) filter (where payment_status = 'approved')::int as paid_orders,
              coalesce(sum(total_amount), 0)::numeric(10,2) as gross_total,
              coalesce(sum(total_amount) filter (where payment_status = 'approved'), 0)::numeric(10,2) as paid_total,
              coalesce(sum(discount_amount), 0)::numeric(10,2) as discount_total,
              coalesce(sum(shipping_fee), 0)::numeric(10,2) as shipping_total
       from orders
       where created_at >= now() - interval '90 days'`
    ),
    query(
      `select date_trunc('day', created_at)::date as day,
              count(*)::int as orders,
              coalesce(sum(total_amount) filter (where payment_status = 'approved'), 0)::numeric(10,2) as paid_total
       from orders
       where created_at >= now() - interval '30 days'
       group by day
       order by day desc
       limit 30`
    ),
    query(
      `select oi.product_id,
              oi.product_name,
              coalesce(sum(oi.quantity), 0)::int as quantity,
              coalesce(sum(oi.total_price), 0)::numeric(10,2) as revenue,
              coalesce(sum(coalesce(p.supplier_cost, 0) * oi.quantity), 0)::numeric(10,2) as estimated_cost
       from order_items oi
       left join products p on p.id = oi.product_id
       left join orders o on o.id = oi.order_id
       where o.created_at >= now() - interval '90 days'
       group by oi.product_id, oi.product_name
       order by revenue desc
       limit 12`
    ),
    query(
      `select coalesce(sum(coalesce(supplier_cost, 0) * stock_quantity), 0)::numeric(10,2) as stock_cost,
              coalesce(sum(price * stock_quantity), 0)::numeric(10,2) as stock_sale_value
       from products
       where active = true`
    )
  ]);

  const topRows = topProducts.rows.map(row => ({
    ...row,
    estimated_profit: Number(row.revenue || 0) - Number(row.estimated_cost || 0)
  }));

  const paidTotal = Number(summary.rows[0]?.paid_total || 0);
  const estimatedCost = topRows.reduce((sum, row) => sum + Number(row.estimated_cost || 0), 0);

  return sendJson(res, 200, {
    summary: {
      ...summary.rows[0],
      estimated_product_cost: estimatedCost.toFixed(2),
      estimated_profit: (paidTotal - estimatedCost).toFixed(2)
    },
    byDay: byDay.rows,
    topProducts: topRows,
    stockValue: stockValue.rows[0]
  });
}

module.exports = adminReports;
