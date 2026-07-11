'use strict';

const { cleanText, requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, readJson, sendJson } = require('./_http');

function normalizeSupplier(body) {
  const name = cleanText(body.name, 160);
  if (!name) throw new Error('Nome do fornecedor obrigatorio.');
  return {
    id: body.id ? Number(body.id) : null,
    name,
    contact_name: cleanText(body.contact_name, 160),
    email: cleanText(body.email, 160).toLowerCase(),
    phone: cleanText(body.phone, 40),
    notes: cleanText(body.notes, 1000)
  };
}

async function adminSuppliers(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });

  if (req.method === 'GET') {
    const result = await query(
      `select s.*,
              count(p.id)::int as product_count
       from suppliers s
       left join products p on p.supplier_id = s.id
       group by s.id
       order by s.name asc`
    );
    return sendJson(res, 200, { suppliers: result.rows });
  }

  if (req.method !== 'POST' && req.method !== 'PUT') return methodNotAllowed(res);

  try {
    const supplier = normalizeSupplier(await readJson(req));
    let result;
    if (supplier.id) {
      result = await query(
        `update suppliers
         set name=$2, contact_name=$3, email=$4, phone=$5, notes=$6, updated_at=now()
         where id=$1
         returning *`,
        [supplier.id, supplier.name, supplier.contact_name, supplier.email, supplier.phone, supplier.notes]
      );
    } else {
      result = await query(
        `insert into suppliers (name, contact_name, email, phone, notes)
         values ($1,$2,$3,$4,$5)
         returning *`,
        [supplier.name, supplier.contact_name, supplier.email, supplier.phone, supplier.notes]
      );
    }

    return sendJson(res, 200, { saved: true, supplier: result.rows[0] });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

module.exports = adminSuppliers;
