'use strict';

const fs = require('fs');
const path = require('path');
const { products } = require('./_catalog');
const { query } = require('./_db');
const { readJson, sendJson } = require('./_http');

async function seedProducts() {
  for (const product of products) {
    await query(
      `insert into products (id, sku, name, category, price, old_price, image_url, gallery_urls, description, active, sizes, size_stock, stock_quantity, featured)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, true, $10, $11::jsonb, $12, $13)
       on conflict (id) do update set
         sku = excluded.sku,
         name = excluded.name,
         category = excluded.category,
         price = excluded.price,
         old_price = excluded.old_price,
         image_url = excluded.image_url,
         gallery_urls = excluded.gallery_urls,
         description = excluded.description,
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
        product.old || null,
        product.image,
        JSON.stringify([product.image]),
        product.description,
        (product.sizes || ['P', 'M', 'G', 'GG']).join(','),
        JSON.stringify(product.sizeStock || { P: product.stock || 0, M: product.stock || 0, G: product.stock || 0, GG: product.stock || 0 }),
        product.stock || 0,
        product.featured === true
      ]
    );
  }
}

async function adminMigrate(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Metodo nao permitido.' });
  }

  const configuredSecret = process.env.ADMIN_MIGRATION_SECRET;
  const providedSecret = req.headers['x-admin-secret'] || (await readJson(req).catch(() => ({}))).secret;

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return sendJson(res, 401, { error: 'Nao autorizado.' });
  }

  if (!process.env.DATABASE_URL) {
    return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });
  }

  const schema = fs.readFileSync(path.resolve(process.cwd(), 'db', 'schema.sql'), 'utf8');
  await query(schema);
  await seedProducts();

  return sendJson(res, 200, {
    migrated: true,
    productsSeeded: products.length
  });
}

module.exports = adminMigrate;
