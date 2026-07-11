'use strict';

const { cleanText, requireAdmin } = require('./_admin');
const { hasDatabase, query } = require('./_db');
const { methodNotAllowed, readJson, sendJson } = require('./_http');

function cleanDate(value) {
  return value ? new Date(value).toISOString() : null;
}

function normalizeCampaign(body) {
  const title = cleanText(body.title, 160);
  if (!title) throw new Error('Titulo da campanha obrigatorio.');

  return {
    id: body.id ? Number(body.id) : null,
    title,
    subtitle: cleanText(body.subtitle, 260),
    image_url: cleanText(body.image_url, 900000),
    cta_label: cleanText(body.cta_label, 80) || 'Comprar agora',
    cta_url: cleanText(body.cta_url, 300) || '#novidades',
    active: body.active !== false,
    starts_at: cleanDate(body.starts_at),
    expires_at: cleanDate(body.expires_at)
  };
}

async function listCampaigns(res) {
  const result = await query(
    `select *
     from campaigns
     order by active desc, created_at desc, id desc`
  );
  return sendJson(res, 200, { campaigns: result.rows });
}

async function adminCampaigns(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasDatabase()) return sendJson(res, 500, { error: 'DATABASE_URL nao configurado.' });

  if (req.method === 'GET') return listCampaigns(res);
  if (req.method !== 'POST' && req.method !== 'PUT') return methodNotAllowed(res);

  try {
    const campaign = normalizeCampaign(await readJson(req));
    const result = await query(
      `insert into campaigns
       (id, title, subtitle, image_url, cta_label, cta_url, active, starts_at, expires_at, updated_at)
       values (coalesce($1, nextval('campaigns_id_seq')), $2, $3, $4, $5, $6, $7, $8, $9, now())
       on conflict (id) do update set
         title = excluded.title,
         subtitle = excluded.subtitle,
         image_url = excluded.image_url,
         cta_label = excluded.cta_label,
         cta_url = excluded.cta_url,
         active = excluded.active,
         starts_at = excluded.starts_at,
         expires_at = excluded.expires_at,
         updated_at = now()
       returning *`,
      [
        campaign.id,
        campaign.title,
        campaign.subtitle,
        campaign.image_url,
        campaign.cta_label,
        campaign.cta_url,
        campaign.active,
        campaign.starts_at,
        campaign.expires_at
      ]
    );
    return sendJson(res, 200, { saved: true, campaign: result.rows[0] });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

module.exports = adminCampaigns;
