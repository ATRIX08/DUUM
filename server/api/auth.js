'use strict';

const crypto = require('crypto');
const { cleanText } = require('./_admin');
const { hasDatabase, query, withTransaction } = require('./_db');
const { passwordResetTemplate, sendTransactionalEmail } = require('./_email');
const { methodNotAllowed, readJson, sendJson } = require('./_http');

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return { hash, salt };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function safeCustomer(row) {
  return {
    id: row.customer_id || row.id,
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    cep: row.cep || '',
    address: row.address || '',
    number: row.number || '',
    city: row.city || ''
  };
}

async function register(body) {
  const name = cleanText(body.name, 100);
  const email = cleanText(body.email, 160).toLowerCase();
  const password = String(body.password || '');
  const phone = cleanText(body.phone, 30);

  if (!name) throw new Error('Nome obrigatorio.');
  if (!isEmail(email)) throw new Error('E-mail invalido.');
  if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');

  const existing = await query('select id from customer_accounts where email = $1', [email]);
  if (existing.rows.length) throw new Error('Este e-mail ja tem conta. Faca login.');

  const credentials = hashPassword(password);

  return withTransaction(async client => {
    const customer = await client.query(
      `insert into customers (name, email, phone)
       values ($1, $2, $3)
       returning id, name, email, phone, cep, address, number, city`,
      [name, email, phone]
    );

    await client.query(
      `insert into customer_accounts (customer_id, email, password_hash, password_salt)
       values ($1, $2, $3, $4)`,
      [customer.rows[0].id, email, credentials.hash, credentials.salt]
    );

    return safeCustomer(customer.rows[0]);
  });
}

async function login(body) {
  const email = cleanText(body.email, 160).toLowerCase();
  const password = String(body.password || '');
  if (!isEmail(email) || !password) throw new Error('E-mail ou senha invalidos.');

  const result = await query(
    `select a.customer_id, a.password_hash, a.password_salt,
            c.name, c.email, c.phone, c.cep, c.address, c.number, c.city
     from customer_accounts a
     join customers c on c.id = a.customer_id
     where a.email = $1`,
    [email]
  );

  if (!result.rows.length) throw new Error('E-mail ou senha invalidos.');
  const row = result.rows[0];
  const credentials = hashPassword(password, row.password_salt);
  const ok = crypto.timingSafeEqual(Buffer.from(credentials.hash, 'hex'), Buffer.from(row.password_hash, 'hex'));
  if (!ok) throw new Error('E-mail ou senha invalidos.');

  return safeCustomer(row);
}

function getBaseUrl(req) {
  const host = req.headers.host || '';
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  return host ? `${protocol}://${host}` : '';
}

async function requestReset(body, req) {
  const email = cleanText(body.email, 160).toLowerCase();
  if (!isEmail(email)) throw new Error('E-mail invalido.');

  const account = await query('select id, email from customer_accounts where email = $1', [email]);
  if (!account.rows.length) return { sent: true };

  const token = crypto.randomBytes(28).toString('hex');
  await query(
    `insert into password_reset_tokens (account_id, token_hash, expires_at)
     values ($1, $2, now() + interval '30 minutes')`,
    [account.rows[0].id, hashToken(token)]
  );

  const link = `${getBaseUrl(req)}/resetar-senha.html?token=${encodeURIComponent(token)}`;
  const emailResult = await sendTransactionalEmail({
    to: email,
    subject: 'Recuperacao de senha DUUM',
    html: passwordResetTemplate(link)
  }).catch(() => ({ skipped: true }));

  return { sent: true, reset_link: emailResult.skipped ? link : undefined };
}

async function resetPassword(body) {
  const token = cleanText(body.token, 120);
  const password = String(body.password || '');
  if (!token) throw new Error('Token invalido.');
  if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');

  const result = await query(
    `select t.id, t.account_id
     from password_reset_tokens t
     where t.token_hash = $1
       and t.used_at is null
       and t.expires_at > now()`,
    [hashToken(token)]
  );
  if (!result.rows.length) throw new Error('Link expirado ou invalido.');

  const credentials = hashPassword(password);
  await withTransaction(async client => {
    await client.query(
      `update customer_accounts
       set password_hash = $2,
           password_salt = $3,
           updated_at = now()
       where id = $1`,
      [result.rows[0].account_id, credentials.hash, credentials.salt]
    );
    await client.query('update password_reset_tokens set used_at = now() where id = $1', [result.rows[0].id]);
  });
  return { reset: true };
}

async function auth(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  if (!hasDatabase()) return sendJson(res, 500, { error: 'Banco nao configurado.' });

  try {
    const body = await readJson(req);
    const action = cleanText(body.action, 20);
    if (action === 'request_reset') return sendJson(res, 200, await requestReset(body, req));
    if (action === 'reset_password') return sendJson(res, 200, await resetPassword(body));
    const user = action === 'register' ? await register(body) : action === 'login' ? await login(body) : null;
    if (!user) return sendJson(res, 400, { error: 'Acao invalida.' });
    return sendJson(res, 200, { user });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'Nao foi possivel autenticar.' });
  }
}

module.exports = auth;
