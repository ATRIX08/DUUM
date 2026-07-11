'use strict';

const { calculateShipping } = require('./_shipping');
const { methodNotAllowed, sendJson } = require('./_http');

function shipping(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const subtotal = Number(url.searchParams.get('subtotal') || 0);
  const quote = calculateShipping(url.searchParams.get('cep'), subtotal);
  return sendJson(res, quote.valid ? 200 : 400, quote);
}

module.exports = shipping;
