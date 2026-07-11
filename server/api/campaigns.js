'use strict';

const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, sendJson } = require('./_http');

const fallbackCampaigns = [
  {
    id: 1,
    title: 'Frete gratis acima de R$ 199',
    subtitle: 'Aproveite a curadoria DUUM com entrega rastreada e pagamento seguro.',
    image_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1400&q=84',
    cta_label: 'Ver novidades',
    cta_url: '#novidades'
  }
];

async function campaigns(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);

  if (!hasDatabase()) return sendJson(res, 200, { campaigns: fallbackCampaigns });

  const result = await query(
    `select id, title, subtitle, image_url, cta_label, cta_url, starts_at, expires_at
     from campaigns
     where active = true
       and (starts_at is null or starts_at <= now())
       and (expires_at is null or expires_at >= now())
     order by created_at desc, id desc
     limit 6`
  );

  return sendJson(res, 200, { campaigns: result.rows });
}

module.exports = campaigns;
