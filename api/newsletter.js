'use strict';

const { cleanText } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, readJson, sendJson } = require('./_http');

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function newsletter(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    const body = await readJson(req);
    const email = cleanText(body.email, 160).toLowerCase();
    if (!isEmail(email)) return sendJson(res, 400, { error: 'E-mail invalido.' });

    if (hasDatabase()) {
      await query(
        `insert into newsletter_subscribers (email, source, coupon_code)
         values ($1, $2, 'DUUM10')
         on conflict (email) do update set
           source = excluded.source`,
        [email, cleanText(body.source, 80) || 'site']
      );
    }

    return sendJson(res, 200, { saved: true, coupon: 'DUUM10' });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'Nao foi possivel cadastrar.' });
  }
}

module.exports = newsletter;
