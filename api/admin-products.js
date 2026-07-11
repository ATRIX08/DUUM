'use strict';

const { cleanMoney, cleanText, requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, readJson, sendJson } = require('./_http');

function normalizeProduct(body) {
  const id = Number(body.id);
  const price = cleanMoney(body.price);
  const oldPrice = body.old_price === '' || body.old_price === null || body.old_price === undefined ? null : cleanMoney(body.old_price);

  if (!Number.isInteger(id) || id < 1) throw new Error('ID do produto invalido.');
  if (!cleanText(body.name, 160)) throw new Error('Nome do produto obrigatorio.');
  if (price === null || price <= 0) throw new Error('Preco invalido.');

  return {
    id,
    name: cleanText(body.name, 160),
    category: cleanText(body.category, 80) || 'geral',
    price,
    old_price: oldPrice,
    image_url: cleanText(body.image_url || body.image, 500),
    description: cleanText(body.description, 800),
    active: body.active !== false,
    supplier_id: body.supplier_id ? Number(body.supplier_id) : null,
    supplier_sku: cleanText(body.supplier_sku, 120),
    supplier_cost: body.supplier_cost ? cleanMoney(body.supplier_cost) : null
  };
}

async function listProducts(res) {
  const result = await query(
    `select p.*, s.name as supplier_name
     from products p
     left join suppliers s on s.id = p.supplier_id
     order by p.id asc`
  );
  return sendJson(res, 200, { products: result.rows });
}

async function adminProducts(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });

  if (req.method === 'GET') return listProducts(res);
  if (req.method !== 'POST' && req.method !== 'PUT') return methodNotAllowed(res);

  try {
    const product = normalizeProduct(await readJson(req));
    await query(
      `insert into products
       (id, name, category, price, old_price, image_url, description, active, supplier_id, supplier_sku, supplier_cost, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
       on conflict (id) do update set
         name = excluded.name,
         category = excluded.category,
         price = excluded.price,
         old_price = excluded.old_price,
         image_url = excluded.image_url,
         description = excluded.description,
         active = excluded.active,
         supplier_id = excluded.supplier_id,
         supplier_sku = excluded.supplier_sku,
         supplier_cost = excluded.supplier_cost,
         updated_at = now()`,
      [
        product.id,
        product.name,
        product.category,
        product.price,
        product.old_price,
        product.image_url,
        product.description,
        product.active,
        product.supplier_id,
        product.supplier_sku,
        product.supplier_cost
      ]
    );

    return sendJson(res, 200, { saved: true, product });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

module.exports = adminProducts;
