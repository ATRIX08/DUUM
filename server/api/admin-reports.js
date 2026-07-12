'use strict';

const { requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, sendJson } = require('./_http');

function getPeriod(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const days = Number(url.searchParams.get('days') || 30);
  if (![7, 30, 90, 180, 365].includes(days)) return 30;
  return days;
}

async function adminReports(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });
  if (req.method !== 'GET') return methodNotAllowed(res);

  const days = getPeriod(req);
  const params = [days];

  const [summary, byDay, topProducts, stockValue, byStatus, paymentStatus, coupons] = await Promise.all([
    query(
      `select count(*)::int as orders,
              count(*) filter (where payment_status = 'approved')::int as paid_orders,
              coalesce(sum(total_amount), 0)::numeric(10,2) as gross_total,
              coalesce(sum(total_amount) filter (where payment_status = 'approved'), 0)::numeric(10,2) as paid_total,
              coalesce(sum(discount_amount), 0)::numeric(10,2) as discount_total,
              coalesce(sum(shipping_fee), 0)::numeric(10,2) as shipping_total
       from orders
       where created_at >= now() - ($1::int * interval '1 day')`,
      params
    ),
    query(
      `select date_trunc('day', created_at)::date as day,
              count(*)::int as orders,
              count(*) filter (where payment_status = 'approved')::int as paid_orders,
              coalesce(sum(total_amount), 0)::numeric(10,2) as gross_total,
              coalesce(sum(total_amount) filter (where payment_status = 'approved'), 0)::numeric(10,2) as paid_total,
              coalesce(sum(discount_amount), 0)::numeric(10,2) as discount_total
       from orders
       where created_at >= now() - ($1::int * interval '1 day')
       group by day
       order by day asc`,
      params
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
       where o.created_at >= now() - ($1::int * interval '1 day')
       group by oi.product_id, oi.product_name
       order by revenue desc
       limit 12`,
      params
    ),
    query(
      `select coalesce(sum(coalesce(supplier_cost, 0) * stock_quantity), 0)::numeric(10,2) as stock_cost,
              coalesce(sum(price * stock_quantity), 0)::numeric(10,2) as stock_sale_value
       from products
       where active = true`
    ),
    query(
      `select status, count(*)::int as count, coalesce(sum(total_amount), 0)::numeric(10,2) as total
       from orders
       where created_at >= now() - ($1::int * interval '1 day')
       group by status
       order by count desc`,
      params
    ),
    query(
      `select payment_status, count(*)::int as count, coalesce(sum(total_amount), 0)::numeric(10,2) as total
       from orders
       where created_at >= now() - ($1::int * interval '1 day')
       group by payment_status
       order by count desc`,
      params
    ),
    query(
      `select coalesce(discount_code, 'sem cupom') as code,
              count(*)::int as uses,
              coalesce(sum(discount_amount), 0)::numeric(10,2) as discount_total,
              coalesce(sum(total_amount), 0)::numeric(10,2) as order_total
       from orders
       where created_at >= now() - ($1::int * interval '1 day')
       group by coalesce(discount_code, 'sem cupom')
       order by discount_total desc, uses desc
       limit 10`,
      params
    )
  ]);

  const topRows = topProducts.rows.map(row => ({
    ...row,
    estimated_profit: Number(row.revenue || 0) - Number(row.estimated_cost || 0)
  }));

  const paidTotal = Number(summary.rows[0]?.paid_total || 0);
  const estimatedCost = topRows.reduce((sum, row) => sum + Number(row.estimated_cost || 0), 0);
  const orders = Number(summary.rows[0]?.orders || 0);
  const paidOrders = Number(summary.rows[0]?.paid_orders || 0);
  const estimatedProfit = paidTotal - estimatedCost;

  return sendJson(res, 200, {
    period: { days },
    summary: {
      ...summary.rows[0],
      estimated_product_cost: estimatedCost.toFixed(2),
      estimated_profit: estimatedProfit.toFixed(2),
      average_ticket: paidOrders ? (paidTotal / paidOrders).toFixed(2) : '0.00',
      paid_rate: orders ? ((paidOrders / orders) * 100).toFixed(1) : '0.0',
      estimated_margin: paidTotal ? ((estimatedProfit / paidTotal) * 100).toFixed(1) : '0.0'
    },
    byDay: byDay.rows,
    byStatus: byStatus.rows,
    paymentStatus: paymentStatus.rows,
    coupons: coupons.rows,
    topProducts: topRows,
    stockValue: stockValue.rows[0]
  });
}

module.exports = adminReports;
