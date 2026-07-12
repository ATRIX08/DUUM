'use strict';

const { products: fallbackProducts } = require('./_catalog');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, sendJson } = require('./_http');

function baseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const host = req.headers.host || 'duum-store.vercel.app';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

function toMeta(product, req) {
  const url = `${baseUrl(req)}/produto.html?id=${encodeURIComponent(product.id)}`;
  const image = product.image_url || product.image;
  const price = Number(product.price || 0);
  const description = product.description || `${product.name} na DUUM com compra segura e pedido rastreado.`;
  return {
    id: product.id,
    title: `${product.name} | DUUM`,
    description,
    image,
    canonical: url,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: image ? [image] : [],
      description,
      sku: product.sku || `DUUM-${product.id}`,
      brand: { '@type': 'Brand', name: 'DUUM' },
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'BRL',
        price: price.toFixed(2),
        availability: Number(product.stock_quantity ?? product.stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
      }
    }
  };
}

async function productMeta(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id) || id < 1) return sendJson(res, 400, { error: 'Produto invalido.' });

  if (!hasDatabase()) {
    const product = fallbackProducts.find(item => Number(item.id) === id);
    return product ? sendJson(res, 200, { meta: toMeta(product, req) }) : sendJson(res, 404, { error: 'Produto nao encontrado.' });
  }

  const result = await query(
    `select id, sku, name, price, image_url, description, stock_quantity
     from products
     where id = $1 and active = true`,
    [id]
  );
  if (!result.rows.length) return sendJson(res, 404, { error: 'Produto nao encontrado.' });
  return sendJson(res, 200, { meta: toMeta(result.rows[0], req) });
}

module.exports = productMeta;
