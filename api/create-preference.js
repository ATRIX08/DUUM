'use strict';

const { methodNotAllowed, readJson, sendJson } = require('./_http');
const { attachPreference, createPendingOrder } = require('./_orders');

const MERCADO_PAGO_API = 'https://api.mercadopago.com/checkout/preferences';

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function getBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  }

  const host = req.headers.host;
  if (!host) return '';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

async function createPreference(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return sendJson(res, 500, { error: 'MERCADOPAGO_ACCESS_TOKEN nao configurado no servidor.' });
    }

    const body = await readJson(req);
    const customer = body.customer || {};
    const baseUrl = getBaseUrl(req);
    const orderId = `DUUM-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
    const order = await createPendingOrder({ orderId, cart: body.cart, customer, coupon: body.coupon });

    const preference = {
      items: order.items,
      external_reference: orderId,
      statement_descriptor: 'DUUM',
      payer: {
        name: cleanText(customer.name, 80),
        email: cleanText(customer.email, 120),
        phone: {
          number: cleanText(customer.phone, 20)
        },
        address: {
          zip_code: cleanText(customer.cep, 12),
          street_name: cleanText(customer.address, 120),
          street_number: cleanText(customer.number, 12)
        }
      },
      metadata: {
        order_id: orderId,
        customer_city: cleanText(customer.city, 80)
      }
    };

    if (baseUrl) {
      preference.back_urls = {
        success: `${baseUrl}/checkout.html?status=success&order=${orderId}`,
        failure: `${baseUrl}/checkout.html?status=failure&order=${orderId}`,
        pending: `${baseUrl}/checkout.html?status=pending&order=${orderId}`
      };

      if (baseUrl.startsWith('https://')) {
        preference.notification_url = `${baseUrl}/api/mercadopago-webhook`;
        preference.auto_return = 'approved';
      }
    }

    const mpResponse = await fetch(MERCADO_PAGO_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    const mpPayload = await mpResponse.json().catch(() => ({}));

    if (!mpResponse.ok) {
      return sendJson(res, mpResponse.status, {
        error: 'Mercado Pago recusou a criacao da preferencia.',
        details: mpPayload
      });
    }

    const useSandbox = process.env.MERCADOPAGO_USE_SANDBOX === 'true' || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    const paymentUrl = useSandbox ? (mpPayload.sandbox_init_point || mpPayload.init_point) : mpPayload.init_point;

    await attachPreference(orderId, mpPayload.id, paymentUrl);

    return sendJson(res, 200, {
      id: mpPayload.id,
      orderId,
      discount_code: order.discountCode,
      discount_amount: order.discountAmount,
      payment_url: paymentUrl,
      init_point: mpPayload.init_point,
      sandbox_init_point: mpPayload.sandbox_init_point
    });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'Nao foi possivel criar o pagamento.' });
  }
}

module.exports = createPreference;
