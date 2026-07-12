'use strict';

const crypto = require('crypto');
const { cleanText, createAdminToken } = require('./_admin');
const { methodNotAllowed, readJson, sendJson } = require('./_http');

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), String(salt), 120000, 32, 'sha256').toString('hex');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'hex');
  const right = Buffer.from(String(b || ''), 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function adminAuth(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    const configuredLogin = cleanText(process.env.ADMIN_LOGIN || process.env.ADMIN_EMAIL, 160).toLowerCase();
    const salt = process.env.ADMIN_PASSWORD_SALT;
    const expectedHash = process.env.ADMIN_PASSWORD_HASH;
    if (!configuredLogin || !salt || !expectedHash) {
      return sendJson(res, 500, { error: 'Login admin nao configurado.' });
    }

    const body = await readJson(req);
    const login = cleanText(body.login || body.email, 160).toLowerCase();
    const password = String(body.password || '');
    const hash = hashPassword(password, salt);

    if (login !== configuredLogin || !safeEqual(hash, expectedHash)) {
      return sendJson(res, 401, { error: 'Login ou senha admin invalidos.' });
    }

    return sendJson(res, 200, {
      token: createAdminToken(login),
      user: { login },
      expires_in: 43200
    });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'Nao foi possivel entrar.' });
  }
}

module.exports = adminAuth;
