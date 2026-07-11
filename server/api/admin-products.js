'use strict';

const { cleanMoney, cleanText, requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, readJson, sendJson } = require('./_http');

function normalizeProduct(body) {
  const id = Number(body.id);
  const price = cleanMoney(body.price);
  const oldPrice = body.old_price === '' || body.old_price === null || body.old_price === undefined ? null : cleanMoney(body.old_price);
  const sizes = normalizeSizes(body.sizes);
  const sizeStock = normalizeSizeStock(body.size_stock, sizes);
  const stockTotal = Object.values(sizeStock).reduce((sum, value) => sum + value, 0);

  if (!Number.isInteger(id) || id < 1) throw new Error('ID do produto invalido.');
  if (!cleanText(body.name, 160)) throw new Error('Nome do produto obrigatorio.');
  if (price === null || price <= 0) throw new Error('Preco invalido.');

  return {
    id,
    sku: cleanText(body.sku, 80),
    name: cleanText(body.name, 160),
    category: cleanText(body.category, 80) || 'geral',
    price,
    old_price: oldPrice,
    image_url: cleanText(body.image_url || body.image, 900000),
    gallery_urls: normalizeGallery(body.gallery_urls, body.image_url || body.image),
    description: cleanText(body.description, 800),
    active: body.active !== false,
    supplier_id: body.supplier_id ? Number(body.supplier_id) : null,
    supplier_sku: cleanText(body.supplier_sku, 120),
    supplier_cost: body.supplier_cost ? cleanMoney(body.supplier_cost) : null,
    sizes,
    size_stock: sizeStock,
    stock_quantity: stockTotal || (Number.isInteger(Number(body.stock_quantity)) ? Number(body.stock_quantity) : 0),
    featured: body.featured === true
  };
}

function normalizeSizes(value) {
  const raw = Array.isArray(value) ? value : String(value || 'P,M,G,GG').split(',');
  const sizes = raw.map(size => cleanText(size, 8).toUpperCase()).filter(Boolean);
  return [...new Set(sizes)].join(',') || 'P,M,G,GG';
}

function normalizeSizeStock(value, sizesText) {
  const sizes = sizesText.split(',').filter(Boolean);
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = {};
      for (const part of value.split(/[,\n;]/)) {
        const [size, qty] = part.split(':').map(item => item && item.trim());
        if (size) parsed[size.toUpperCase()] = qty;
      }
    }
  }
  const stock = {};
  for (const size of sizes) {
    const qty = Number(parsed?.[size] ?? parsed?.[size.toLowerCase()] ?? 0);
    stock[size] = Number.isInteger(qty) && qty > 0 ? qty : 0;
  }
  return stock;
}

function normalizeGallery(value, mainImage) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/\n/);
  const gallery = raw.map(url => cleanText(url, 900000)).filter(Boolean);
  const main = cleanText(mainImage, 900000);
  const all = main ? [main, ...gallery] : gallery;
  return [...new Set(all)].slice(0, 6);
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
       (id, sku, name, category, price, old_price, image_url, gallery_urls, description, active, supplier_id, supplier_sku, supplier_cost, sizes, size_stock, stock_quantity, featured, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,now())
       on conflict (id) do update set
         sku = excluded.sku,
         name = excluded.name,
         category = excluded.category,
         price = excluded.price,
         old_price = excluded.old_price,
         image_url = excluded.image_url,
         gallery_urls = excluded.gallery_urls,
         description = excluded.description,
         active = excluded.active,
         supplier_id = excluded.supplier_id,
         supplier_sku = excluded.supplier_sku,
         supplier_cost = excluded.supplier_cost,
         sizes = excluded.sizes,
         size_stock = excluded.size_stock,
         stock_quantity = excluded.stock_quantity,
         featured = excluded.featured,
         updated_at = now()`,
      [
        product.id,
        product.sku,
        product.name,
        product.category,
        product.price,
        product.old_price,
        product.image_url,
        JSON.stringify(product.gallery_urls),
        product.description,
        product.active,
        product.supplier_id,
        product.supplier_sku,
        product.supplier_cost,
        product.sizes,
        JSON.stringify(product.size_stock),
        product.stock_quantity,
        product.featured
      ]
    );

    return sendJson(res, 200, { saved: true, product });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

module.exports = adminProducts;
