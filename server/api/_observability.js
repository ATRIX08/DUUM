'use strict';

const { hasDatabase, query } = require('./_db');

async function logEvent({ level = 'info', source, message, orderId = null, metadata = {} }) {
  if (!hasDatabase() || !source || !message) return;
  try {
    await query(
      `insert into app_events (level, source, message, order_id, metadata)
       values ($1, $2, $3, $4, $5::jsonb)`,
      [String(level).slice(0, 20), String(source).slice(0, 80), String(message).slice(0, 300), orderId, JSON.stringify(metadata || {})]
    );
  } catch (error) {
    console.error('[observability log failed]', error.message);
  }
}

module.exports = {
  logEvent
};
