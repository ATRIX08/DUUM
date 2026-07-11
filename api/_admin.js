'use strict';

const { sendJson } = require('./_http');

function getAdminSecret(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  return req.headers['x-admin-secret'] || req.headers.authorization?.replace(/^Bearer\s+/i, '') || url.searchParams.get('secret');
}

function requireAdmin(req, res) {
  const expected = process.env.ADMIN_MIGRATION_SECRET;
  if (!expected) {
    sendJson(res, 500, { error: 'ADMIN_MIGRATION_SECRET nao configurado.' });
    return false;
  }

  if (getAdminSecret(req) !== expected) {
    sendJson(res, 401, { error: 'Acesso admin nao autorizado.' });
    return false;
  }

  return true;
}

function cleanText(value, maxLength = 255) {
  return String(value || '').trim().slice(0, maxLength);
}

function cleanMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Number(number.toFixed(2));
}

module.exports = {
  cleanMoney,
  cleanText,
  requireAdmin
};
