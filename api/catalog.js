'use strict';

const { products: fallbackProducts } = require('./_catalog');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, sendJson } = require('./_http');

async function catalog(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);

  if (!hasDatabase()) {
    return sendJson(res, 200, { products: fallbackProducts });
  }

  const result = await query(
    `select id, name, category, price, old_price, image_url, description, active
     from products
     where active = true
     order by id asc`
  );

  const products = result.rows.map(product => ({
    id: product.id,
    name: product.name,
    category: product.category || 'geral',
    price: Number(product.price),
    old: product.old_price === null ? null : Number(product.old_price),
    tag: product.old_price ? 'OFERTA' : 'NOVO',
    image: product.image_url,
    description: product.description || ''
  }));

  return sendJson(res, 200, { products });
}

module.exports = catalog;
