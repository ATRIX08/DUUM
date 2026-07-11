'use strict';

const { requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, sendJson } = require('./_http');

async function adminCustomers(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });
  if (req.method !== 'GET') return methodNotAllowed(res);

  const result = await query(
    `select c.id, c.name, c.email, c.phone, c.city, c.created_at,
            case when a.id is null then false else true end as has_account,
            count(o.id)::int as order_count,
            coalesce(sum(o.total_amount), 0)::numeric(10,2) as total_spent
     from customers c
     left join customer_accounts a on a.customer_id = c.id
     left join orders o on o.customer_id = c.id
     group by c.id, a.id
     order by c.created_at desc
     limit 300`
  );

  return sendJson(res, 200, { customers: result.rows });
}

module.exports = adminCustomers;
