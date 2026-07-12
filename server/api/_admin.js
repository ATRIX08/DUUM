'use strict';

const crypto = require('crypto');
const { sendJson } = require('./_http');

function getAdminSecret(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  return req.headers['x-admin-secret'] || req.headers.authorization?.replace(/^Bearer\s+/i, '') || url.searchParams.get('secret');
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(value) {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_MIGRATION_SECRET;
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function createAdminToken(email) {
  const payload = base64url(JSON.stringify({
    email,
    role: 'admin',
    exp: Date.now() + 1000 * 60 * 60 * 12
  }));
  return `${payload}.${sign(payload)}`;
}

function verifyAdminToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.role === 'admin' && Number(data.exp || 0) > Date.now();
  } catch {
    return false;
  }
}

function requireAdmin(req, res) {
  const expected = process.env.ADMIN_MIGRATION_SECRET;
  const provided = getAdminSecret(req);
  if (!expected && !process.env.ADMIN_SESSION_SECRET) {
    sendJson(res, 500, { error: 'ADMIN_SESSION_SECRET nao configurado.' });
    return false;
  }

  if ((!expected || provided !== expected) && !verifyAdminToken(provided)) {
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
  createAdminToken,
  requireAdmin
};
