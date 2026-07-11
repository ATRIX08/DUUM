'use strict';

const { Pool } = require('pg');

let pool;

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!hasDatabase()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
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
  hasDatabase,
  query,
  withTransaction
};
