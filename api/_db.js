'use strict';

const { Pool } = require('pg');

let pool;

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function getDatabaseUrl() {
  if (!process.env.DATABASE_URL) return '';

  const url = new URL(process.env.DATABASE_URL);
  if (url.searchParams.get('sslmode') !== 'verify-full') {
    url.searchParams.set('sslmode', 'verify-full');
  }

  return url.toString();
}

function getPool() {
  if (!hasDatabase()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function query(text, params = []) {
  const db = getPool();
  if (!db) return null;
  return db.query(text, params);
}

async function withTransaction(callback) {
  const db = getPool();
  if (!db) return null;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getDatabaseUrl,
  hasDatabase,
  query,
  withTransaction
};
