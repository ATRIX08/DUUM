'use strict';

const { normalizeCart } = require('./_catalog');
const { hasDatabase, query, withTransaction } = require('./_db');

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeCustomer(customer = {}) {
  return {
    name: cleanText(customer.name, 100),
    email: cleanText(customer.email, 160).toLowerCase(),
    phone: cleanText(customer.phone, 30),
    cep: cleanText(customer.cep, 12),
    address: cleanText(customer.address, 180),
    number: cleanText(customer.number, 20),
    city: cleanText(customer.city, 100)
  };
}

function calculateTotal(items) {
  return Number(items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2));
}

async function applyCoupon(items, coupon) {
  const code = cleanText(coupon, 40).toUpperCase();
  if (!code) return { items, code: null, discountAmount: 0 };

  const subtotal = calculateTotal(items);
  let couponRow = null;

  if (hasDatabase()) {
    const result = await query(
      `select *
       from coupons
       where code = $1
         and active = true
         and (starts_at is null or starts_at <= now())
         and (expires_at is null or expires_at >= now())
         and (max_uses is null or used_count < max_uses)`,
      [code]
    );
    couponRow = result.rows[0] || null;
  } else if (code === 'DUUM10') {
    couponRow = { code: 'DUUM10', type: 'percent', value: 10, min_order_amount: 0 };
  }

  if (!couponRow) throw new Error('Cupom invalido.');
  if (subtotal < Number(couponRow.min_order_amount || 0)) throw new Error('Pedido abaixo do minimo para este cupom.');

  const discountAmount = couponRow.type === 'fixed'
    ? Math.min(Number(couponRow.value), subtotal)
    : Number((subtotal * (Number(couponRow.value) / 100)).toFixed(2));
  const discountRatio = discountAmount / subtotal;

  const discountedItems = items.map(item => ({
    ...item,
    unit_price: Number(Math.max(0.01, item.unit_price * (1 - discountRatio)).toFixed(2))
  }));

  return {
    items: discountedItems,
    code,
    discountAmount: Number((subtotal - calculateTotal(discountedItems)).toFixed(2))
  };
}

async function createPendingOrder({ orderId, cart, customer, coupon }) {
  const couponResult = await applyCoupon(await normalizeCart(cart), coupon);
  const items = couponResult.items;
  const normalizedCustomer = normalizeCustomer(customer);
  const total = calculateTotal(items);

  if (!hasDatabase()) {
    return { orderId, items, total, saved: false };
  }

  await withTransaction(async client => {
    const customerResult = await client.query(
      `insert into customers (name, email, phone, cep, address, number, city)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id`,
      [
        normalizedCustomer.name,
        normalizedCustomer.email,
        normalizedCustomer.phone,
        normalizedCustomer.cep,
        normalizedCustomer.address,
        normalizedCustomer.number,
        normalizedCustomer.city
      ]
    );

    const customerId = customerResult.rows[0].id;

    await client.query(
      `insert into orders (id, customer_id, status, payment_status, total_amount, currency, discount_code, discount_amount)
       values ($1, $2, 'pending_payment', 'pending', $3, 'BRL', $4, $5)
       on conflict (id) do update set
         customer_id = excluded.customer_id,
         status = excluded.status,
         payment_status = excluded.payment_status,
         total_amount = excluded.total_amount,
         discount_code = excluded.discount_code,
         discount_amount = excluded.discount_amount,
         updated_at = now()`,
      [orderId, customerId, total, couponResult.code, couponResult.discountAmount]
    );

    if (couponResult.code) {
      await client.query(
        `update coupons
         set used_count = used_count + 1,
             updated_at = now()
         where code = $1`,
        [couponResult.code]
      );
    }

    await client.query('delete from order_items where order_id = $1', [orderId]);

    for (const item of items) {
      await client.query(
        `insert into order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
         values ($1, $2, $3, $4, $5, $6)`,
        [
          orderId,
          item.id,
          item.title,
          item.quantity,
          item.unit_price,
          Number((item.unit_price * item.quantity).toFixed(2))
        ]
      );
    }
  });

  return { orderId, items, total, discountCode: couponResult.code, discountAmount: couponResult.discountAmount, saved: true };
}

async function attachPreference(orderId, preferenceId, paymentUrl) {
  if (!hasDatabase()) return;
  await query(
    `update orders
     set mercado_pago_preference_id = $2,
         checkout_url = $3,
         updated_at = now()
     where id = $1`,
    [orderId, preferenceId, paymentUrl]
  );
}

async function recordPaymentEvent({ paymentId, topic, rawPayload, payment }) {
  if (!hasDatabase()) return;

  const orderId = payment?.external_reference || rawPayload?.external_reference || rawPayload?.metadata?.order_id || null;
  const status = payment?.status || null;
  const statusDetail = payment?.status_detail || null;

  await withTransaction(async client => {
    await client.query(
      `insert into payment_events (provider, provider_payment_id, topic, order_id, status, status_detail, raw_payload)
       values ('mercadopago', $1, $2, $3, $4, $5, $6)`,
      [
        paymentId ? String(paymentId) : null,
        topic || null,
        orderId,
        status,
        statusDetail,
        JSON.stringify({ rawPayload, payment })
      ]
    );

    if (orderId) {
      const paymentStatus = status || 'updated';
      const orderStatus = status === 'approved' ? 'paid' : status === 'rejected' ? 'payment_rejected' : 'pending_payment';
      const previousOrder = await client.query('select paid_at from orders where id = $1', [orderId]);
      const wasAlreadyPaid = Boolean(previousOrder.rows[0]?.paid_at);

      const updatedOrder = await client.query(
        `update orders
         set mercado_pago_payment_id = coalesce($2, mercado_pago_payment_id),
             payment_status = $3,
             status = $4,
             paid_at = case when $3 = 'approved' then coalesce(paid_at, now()) else paid_at end,
             updated_at = now()
         where id = $1`,
        [orderId, paymentId ? String(paymentId) : null, paymentStatus, orderStatus]
      );

      if (status === 'approved' && updatedOrder.rowCount > 0 && !wasAlreadyPaid) {
        await client.query(
          `update products p
           set stock_quantity = greatest(0, stock_quantity - oi.quantity),
               updated_at = now()
           from order_items oi
           where oi.order_id = $1 and oi.product_id = p.id`,
          [orderId]
        );
      }
    }
  });
}

module.exports = {
  attachPreference,
  createPendingOrder,
  recordPaymentEvent
};
