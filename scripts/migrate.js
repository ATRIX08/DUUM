'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

async function main() {
  loadEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL nao configurado.');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });

  try {
    const schema = fs.readFileSync(path.resolve(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Banco migrado com sucesso.');
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
