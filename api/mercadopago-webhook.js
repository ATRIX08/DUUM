'use strict';

const crypto = require('crypto');
const { readJson, sendJson } = require('./_http');
const { recordPaymentEvent } = require('./_orders');

function parseSignatureHeader(header) {
  return String(header || '').split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});
}

function safeEqualHex(left, right) {
  const leftBuffer = Buffer.from(left || '', 'hex');
  const rightBuffer = Buffer.from(right || '', 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function validateSignature(req, url, body) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true;

  const signature = parseSignatureHeader(req.headers['x-signature']);
  const requestId = req.headers['x-request-id'];
  const dataId = url.searchParams.get('data.id') || url.searchParams.get('id') || body?.data?.id;
  const manifest = [
    dataId ? `id:${dataId};` : '',
    requestId ? `request-id:${requestId};` : '',
    signature.ts ? `ts:${signature.ts};` : ''
  ].join('');

  if (!signature.v1 || !manifest) return false;

  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return safeEqualHex(expected, signature.v1);
}

async function mercadopagoWebhook(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' || req.method === 'HEAD') {
      return sendJson(res, 200, { ok: true, endpoint: 'mercadopago-webhook' });
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Allow', 'GET,HEAD,OPTIONS,POST,PUT,PATCH');
      return res.end();
    }

    const body = await readJson(req).catch(() => ({}));

    if (!validateSignature(req, url, body) && body.live_mode !== false) {
      return sendJson(res, 401, { error: 'Assinatura do webhook invalida.' });
    }

    const paymentId = body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id');
    const topic = body?.type || url.searchParams.get('type') || url.searchParams.get('topic');

    if (body.live_mode === false) {
      console.log('[Mercado Pago webhook simulation]', { topic, paymentId });
      await recordPaymentEvent({ paymentId, topic, rawPayload: body, payment: null });
      return sendJson(res, 200, { received: true, simulation: true });
    }

    if (paymentId && topic === 'payment' && process.env.MERCADOPAGO_ACCESS_TOKEN) {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
        }
      });
      const payment = await response.json().catch(() => ({}));
      await recordPaymentEvent({ paymentId, topic, rawPayload: body, payment });
      console.log('[Mercado Pago webhook]', {
        paymentId,
        status: payment.status,
        status_detail: payment.status_detail,
        external_reference: payment.external_reference
      });
    } else {
      await recordPaymentEvent({ paymentId, topic, rawPayload: body, payment: null });
      console.log('[Mercado Pago webhook]', { topic, paymentId, body });
    }

    return sendJson(res, 200, { received: true });
  } catch (error) {
    console.error('[Mercado Pago webhook error]', error);
    return sendJson(res, 200, { received: true });
  }
}

module.exports = mercadopagoWebhook;
