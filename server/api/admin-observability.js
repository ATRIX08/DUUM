'use strict';

const { requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, sendJson } = require('./_http');

async function ensureObservabilitySchema() {
  await query(`
    create table if not exists app_events (
      id bigserial primary key,
      created_at timestamptz not null default now()
    );
    alter table app_events add column if not exists level text not null default 'info';
    alter table app_events add column if not exists source text not null default 'app';
    alter table app_events add column if not exists message text not null default 'Evento';
    alter table app_events add column if not exists order_id text;
    alter table app_events add column if not exists metadata jsonb not null default '{}'::jsonb;
  `);
}

async function safeEventData() {
  try {
    await ensureObservabilitySchema();
    const [events, counts] = await Promise.all([
      query(
        `select id, level, source, message, order_id, metadata, created_at
         from app_events
         order by created_at desc
         limit 80`
      ),
      query(
        `select
           count(*) filter (where level in ('error','critical') and created_at >= now() - interval '24 hours')::int as errors_24h,
           count(*) filter (where source like 'mercadopago%' and created_at >= now() - interval '24 hours')::int as webhook_logs_24h
         from app_events`
      )
    ]);
    return { events: events.rows, counts: counts.rows[0] };
  } catch (error) {
    console.error('[admin-observability events unavailable]', error.message);
    return { events: [], counts: { errors_24h: 0, webhook_logs_24h: 0 } };
  }
}

async function adminObservability(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });
  if (req.method !== 'GET') return methodNotAllowed(res);

  const [eventData, pendingOrders, rejectedPayments, webhookEvents] = await Promise.all([
    safeEventData(),
    query(
      `select id, customer_id, total_amount, payment_status, status, created_at
       from orders
       where payment_status <> 'approved'
         and created_at <= now() - interval '30 minutes'
       order by created_at desc
       limit 30`
    ),
    query(
      `select id, payment_status, status, total_amount, created_at
       from orders
       where payment_status in ('rejected', 'cancelled', 'refunded')
          or status in ('payment_rejected', 'cancelled')
       order by updated_at desc
       limit 30`
    ),
    query(
      `select provider_payment_id, topic, status, status_detail, created_at
       from payment_events
       order by created_at desc
       limit 30`
    )
  ]);

  return sendJson(res, 200, {
    counts: {
      ...eventData.counts,
      pending_orders: pendingOrders.rows.length
    },
    events: eventData.events,
    pendingOrders: pendingOrders.rows,
    rejectedPayments: rejectedPayments.rows,
    webhookEvents: webhookEvents.rows
  });
}

module.exports = adminObservability;
