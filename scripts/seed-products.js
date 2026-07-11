'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { products } = require('../api/_catalog');
const { getDatabaseUrl } = require('../api/_db');

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
    connectionString: getDatabaseUrl(),
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });

  try {
    for (const product of products) {
      await pool.query(
        `insert into products (id, name, price, image_url, active)
         values ($1, $2, $3, $4, true)
         on conflict (id) do update set
           name = excluded.name,
           price = excluded.price,
           image_url = excluded.image_url,
           updated_at = now()`,
        [product.id, product.name, product.price, product.image]
      );
    }

    console.log(`${products.length} produtos sincronizados.`);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
