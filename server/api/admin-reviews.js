'use strict';

const { requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, readJson, sendJson } = require('./_http');

async function listReviews(res) {
  const result = await query(
    `select r.*, p.name as product_name
     from product_reviews r
     left join products p on p.id = r.product_id
     order by r.created_at desc, r.id desc
     limit 200`
  );
  return sendJson(res, 200, { reviews: result.rows });
}

async function adminReviews(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });

  if (req.method === 'GET') return listReviews(res);
  if (req.method !== 'POST' && req.method !== 'PATCH') return methodNotAllowed(res);

  try {
    const body = await readJson(req);
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) throw new Error('Avaliacao invalida.');

    const result = await query(
      `update product_reviews
       set approved = $2, updated_at = now()
       where id = $1
       returning *`,
      [id, body.approved !== false]
    );

    if (!result.rows.length) throw new Error('Avaliacao nao encontrada.');
    return sendJson(res, 200, { saved: true, review: result.rows[0] });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

module.exports = adminReviews;
