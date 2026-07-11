'use strict';

const fs = require('fs');
const path = require('path');
const { products } = require('./_catalog');
const { query } = require('./_db');
const { readJson, sendJson } = require('./_http');

async function seedProducts() {
  for (const product of products) {
    await query(
      `insert into products (id, name, category, price, old_price, image_url, description, active)
       values ($1, $2, $3, $4, $5, $6, $7, true)
       on conflict (id) do update set
         name = excluded.name,
         category = excluded.category,
         price = excluded.price,
         old_price = excluded.old_price,
         image_url = excluded.image_url,
         description = excluded.description,
         updated_at = now()`,
      [product.id, product.name, product.category, product.price, product.old || null, product.image, product.description]
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
