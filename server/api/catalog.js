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
    `select id, sku, name, category, price, old_price, image_url, gallery_urls, description, active, sizes, size_stock, stock_quantity, featured
     from products
     where active = true
     order by featured desc, id asc`
  );

  const products = result.rows.map(product => ({
    id: product.id,
    name: product.name,
    category: product.category || 'geral',
    price: Number(product.price),
    old: product.old_price === null ? null : Number(product.old_price),
    tag: product.old_price ? 'OFERTA' : 'NOVO',
    image: product.image_url,
    gallery: Array.isArray(product.gallery_urls) ? product.gallery_urls : [],
    description: product.description || '',
    sizes: String(product.sizes || 'P,M,G,GG').split(',').map(size => size.trim()).filter(Boolean),
    sizeStock: product.size_stock || {},
    stock: Number(product.stock_quantity || 0),
    featured: product.featured === true
  }));

  return sendJson(res, 200, { products });
}

module.exports = catalog;
