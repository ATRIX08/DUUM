'use strict';

const { cleanText } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { companyReviewTemplate, sendCompanyNotification } = require('./_email');
const { methodNotAllowed, readJson, sendJson } = require('./_http');

function normalizeReview(body) {
  const productId = Number(body.product_id);
  const rating = Number(body.rating);
  const customerName = cleanText(body.customer_name || body.name, 100);
  if (!Number.isInteger(productId) || productId < 1) throw new Error('Produto invalido.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Nota invalida.');
  if (!customerName) throw new Error('Nome obrigatorio.');

  return {
    product_id: productId,
    customer_name: customerName,
    customer_email: cleanText(body.customer_email || body.email, 160),
    rating,
    comment: cleanText(body.comment, 600)
  };
}

async function listReviews(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const productId = Number(url.searchParams.get('product_id'));
  if (!Number.isInteger(productId) || productId < 1) {
    return sendJson(res, 400, { error: 'Produto invalido.' });
  }

  if (!hasDatabase()) return sendJson(res, 200, { reviews: [], summary: { count: 0, average: 0 } });

  const [reviews, summary] = await Promise.all([
    query(
      `select id, product_id, customer_name, rating, comment, created_at
       from product_reviews
       where product_id = $1 and approved = true
       order by created_at desc, id desc
       limit 30`,
      [productId]
    ),
    query(
      `select count(*)::int as count, coalesce(round(avg(rating)::numeric, 1), 0) as average
       from product_reviews
       where product_id = $1 and approved = true`,
      [productId]
    )
  ]);

  return sendJson(res, 200, { reviews: reviews.rows, summary: summary.rows[0] });
}

async function createReview(req, res) {
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });

  try {
    const review = normalizeReview(await readJson(req));
    const product = await query('select id, name from products where id = $1 and active = true', [review.product_id]);
    if (!product.rows.length) throw new Error('Produto nao encontrado.');

    const result = await query(
      `insert into product_reviews (product_id, customer_name, customer_email, rating, comment)
       values ($1, $2, $3, $4, $5)
       returning id, product_id, customer_name, rating, comment, created_at`,
      [review.product_id, review.customer_name, review.customer_email, review.rating, review.comment]
    );
    await sendCompanyNotification({
      subject: `DUUM: nova avaliacao ${review.rating}/5`,
      html: companyReviewTemplate({ review: result.rows[0], product: product.rows[0] })
    }).catch(() => null);
    return sendJson(res, 201, { saved: true, review: result.rows[0] });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

async function reviews(req, res) {
  if (req.method === 'GET') return listReviews(req, res);
  if (req.method === 'POST') return createReview(req, res);
  return methodNotAllowed(res);
}

module.exports = reviews;
