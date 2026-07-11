'use strict';

const state = {
  secret: localStorage.getItem('duum_admin_secret') || '',
  coupons: [],
  customers: [],
  dashboard: null,
  leads: [],
  orders: [],
  products: [],
  suppliers: []
};

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = value => value ? new Date(value).toLocaleString('pt-BR') : '-';
const qs = selector => document.querySelector(selector);

function setStatus(message, type = '') {
  const status = qs('#adminStatus');
  status.textContent = message;
  status.className = `checkout-status ${type}`.trim();
}

function escapeHtml(value) {
  const span = document.createElement('span');
  span.textContent = value ?? '';
  return span.innerHTML;
}

async function api(path, options = {}) {
  if (!state.secret) throw new Error('Informe a chave admin.');
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Secret': state.secret,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Falha na API.');
  return data;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function loadDashboard() {
  const data = await api('/api/admin-dashboard');
  state.dashboard = data;
  const summary = data.summary || {};
  qs('#dashboardCards').innerHTML = `
    <div><strong>${summary.orders || 0}</strong><span>Pedidos totais</span></div>
    <div><strong>${money(summary.gross_total)}</strong><span>Volume criado</span></div>
    <div><strong>${summary.paid_orders || 0}</strong><span>Pedidos pagos</span></div>
    <div><strong>${money(summary.paid_total)}</strong><span>Receita aprovada</span></div>`;
  qs('#statusTable').innerHTML = `
    <table><tbody>${(data.byStatus || []).map(row => `<tr><td><span class="pill">${escapeHtml(row.status)}</span></td><td>${row.count}</td></tr>`).join('') || '<tr><td>Nenhum pedido.</td></tr>'}</tbody></table>`;
  qs('#lowStockTable').innerHTML = `
    <table><tbody>${(data.lowStock || []).map(product => `<tr><td>${escapeHtml(product.name)}<small>ID ${product.id}</small></td><td>${product.stock_quantity}</td></tr>`).join('') || '<tr><td>Nenhum alerta de estoque.</td></tr>'}</tbody></table>`;
}

async function loadOrders() {
  const data = await api('/api/admin-orders');
  state.orders = data.orders || [];
  qs('#ordersTable').innerHTML = `
    <table>
      <thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Status</th><th></th></tr></thead>
      <tbody>${state.orders.map(order => `
        <tr>
          <td>${escapeHtml(order.id)}<small>${dateTime(order.created_at)}</small></td>
          <td>${escapeHtml(order.customer_name || '-')}<small>${escapeHtml(order.customer_email || '')}</small></td>
          <td>${money(order.total_amount)}</td>
          <td><span class="pill">${escapeHtml(order.payment_status)}</span></td>
          <td><span class="pill">${escapeHtml(order.status)}</span></td>
          <td><button data-order="${escapeHtml(order.id)}">Abrir</button></td>
        </tr>`).join('') || '<tr><td colspan="6">Nenhum pedido ainda.</td></tr>'}</tbody>
    </table>`;
}

async function openOrder(id) {
  const data = await api(`/api/admin-orders?id=${encodeURIComponent(id)}`);
  const order = data.order;
  qs('#orderDetail').innerHTML = `
    <h3>${escapeHtml(order.id)}</h3>
    <div class="admin-grid">
      <div><strong>Cliente</strong><span>${escapeHtml(order.customer_name || '-')}</span></div>
      <div><strong>E-mail</strong><span>${escapeHtml(order.customer_email || '-')}</span></div>
      <div><strong>Total</strong><span>${money(order.total_amount)}</span></div>
      <div><strong>Desconto</strong><span>${order.discount_code ? `${escapeHtml(order.discount_code)} - ${money(order.discount_amount)}` : '-'}</span></div>
      <div><strong>Pagamento</strong><span>${escapeHtml(order.payment_status)}</span></div>
      <div><strong>Transportadora</strong><span>${escapeHtml(order.carrier || '-')}</span></div>
      <div><strong>Rastreio</strong><span>${escapeHtml(order.tracking_code || '-')}</span></div>
    </div>
    <div class="admin-order-form">
      <label>Status operacional</label>
      <select id="orderStatus">
        ${['pending_payment','paid','preparing','shipped','delivered','cancelled','payment_rejected'].map(status => `<option ${status === order.status ? 'selected' : ''}>${status}</option>`).join('')}
      </select>
      <label>Transportadora</label>
      <input id="orderCarrier" value="${escapeHtml(order.carrier || '')}" placeholder="Correios, Jadlog, Loggi">
      <label>Codigo de rastreio</label>
      <input id="orderTracking" value="${escapeHtml(order.tracking_code || '')}" placeholder="Codigo enviado ao cliente">
      <label>Notas internas</label>
      <textarea id="orderNotes" placeholder="Observacoes internas">${escapeHtml(order.admin_notes || '')}</textarea>
    </div>
    <button class="secondary-btn mini" data-save-order="${escapeHtml(order.id)}">Salvar status</button>
    <h4>Itens</h4>
    ${order.items.map(item => `<p>${escapeHtml(item.product_name)} x ${item.quantity} - ${money(item.total_price)}</p>`).join('')}
    <h4>Eventos de pagamento</h4>
    ${order.events.map(event => `<p>${dateTime(event.created_at)} - ${escapeHtml(event.topic || '')} ${escapeHtml(event.status || '')}</p>`).join('') || '<p>Nenhum evento registrado.</p>'}`;
}

async function saveOrderStatus(id) {
  const status = qs('#orderStatus').value;
  await api(`/api/admin-orders?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      carrier: qs('#orderCarrier').value,
      tracking_code: qs('#orderTracking').value,
      admin_notes: qs('#orderNotes').value
    })
  });
  setStatus('Status do pedido salvo.', 'success');
  await loadOrders();
  await openOrder(id);
}

async function loadProducts() {
  const data = await api('/api/admin-products');
  state.products = data.products || [];
  qs('#productsTable').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Produto</th><th>Preco</th><th>Estoque</th><th>Fornecedor</th><th>Ativo</th><th>Acoes</th></tr></thead>
      <tbody>${state.products.map(product => `
        <tr>
          <td>${product.id}</td>
          <td>${escapeHtml(product.name)}<small>${escapeHtml(product.sku || product.category || '')}</small></td>
          <td>${money(product.price)}${product.old_price ? `<small>De ${money(product.old_price)}</small>` : ''}</td>
          <td>${product.stock_quantity ?? 0}</td>
          <td>${escapeHtml(product.supplier_name || '-')}</td>
          <td>${product.active ? 'Sim' : 'Nao'}</td>
          <td class="action-row">
            <button data-fill-product="${product.id}">Editar</button>
            <button data-promo-product="${product.id}">Promo 10%</button>
            <button data-toggle-product="${product.id}">${product.active ? 'Desativar' : 'Ativar'}</button>
          </td>
        </tr>`).join('')}</tbody>
    </table>`;
}

function fillProduct(id) {
  const product = state.products.find(item => Number(item.id) === Number(id));
  if (!product) return;
  const form = qs('#productForm');
  ['id','sku','name','category','price','old_price','image_url','supplier_id','supplier_sku','supplier_cost','stock_quantity','description'].forEach(name => {
    form.elements[name].value = product[name] ?? '';
  });
  form.elements.active.checked = product.active !== false;
  form.elements.featured.checked = product.featured === true;
}

async function saveProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formData(form);
  data.active = form.elements.active.checked;
  data.featured = form.elements.featured.checked;
  await api('/api/admin-products', { method: 'POST', body: JSON.stringify(data) });
  setStatus('Produto salvo.', 'success');
  form.reset();
  form.elements.active.checked = true;
  form.elements.featured.checked = false;
  await loadProducts();
  await loadDashboard();
}

async function saveProductPayload(product) {
  await api('/api/admin-products', { method: 'POST', body: JSON.stringify(product) });
  await loadProducts();
  await loadDashboard();
}

async function promoProduct(id) {
  const product = state.products.find(item => Number(item.id) === Number(id));
  if (!product) return;
  await saveProductPayload({
    ...product,
    old_price: product.old_price || product.price,
    price: Number((Number(product.price) * 0.9).toFixed(2)),
    active: product.active !== false,
    featured: product.featured === true
  });
  setStatus('Promocao aplicada ao produto.', 'success');
}

async function toggleProduct(id) {
  const product = state.products.find(item => Number(item.id) === Number(id));
  if (!product) return;
  await saveProductPayload({
    ...product,
    active: product.active === false,
    featured: product.featured === true
  });
  setStatus(product.active === false ? 'Produto ativado.' : 'Produto desativado.', 'success');
}

async function loadSuppliers() {
  const data = await api('/api/admin-suppliers');
  state.suppliers = data.suppliers || [];
  qs('#suppliersTable').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Fornecedor</th><th>Contato</th><th>Produtos</th><th></th></tr></thead>
      <tbody>${state.suppliers.map(supplier => `
        <tr>
          <td>${supplier.id}</td>
          <td>${escapeHtml(supplier.name)}<small>${escapeHtml(supplier.notes || '')}</small></td>
          <td>${escapeHtml(supplier.contact_name || '-')}<small>${escapeHtml(supplier.phone || supplier.email || '')}</small></td>
          <td>${supplier.product_count}</td>
          <td><button data-fill-supplier="${supplier.id}">Editar</button></td>
        </tr>`).join('') || '<tr><td colspan="5">Nenhum fornecedor cadastrado.</td></tr>'}</tbody>
    </table>`;
}

async function loadLeads() {
  const data = await api('/api/admin-leads');
  state.leads = data.leads || [];
  qs('#leadsTable').innerHTML = `
    <table>
      <thead><tr><th>E-mail</th><th>Origem</th><th>Cupom</th><th>Cadastro</th></tr></thead>
      <tbody>${state.leads.map(lead => `
        <tr>
          <td>${escapeHtml(lead.email)}</td>
          <td>${escapeHtml(lead.source || '-')}</td>
          <td><span class="pill">${escapeHtml(lead.coupon_code || '-')}</span></td>
          <td>${dateTime(lead.created_at)}</td>
        </tr>`).join('') || '<tr><td colspan="4">Nenhum lead ainda.</td></tr>'}</tbody>
    </table>`;
}

async function loadCoupons() {
  const data = await api('/api/admin-coupons');
  state.coupons = data.coupons || [];
  qs('#couponsTable').innerHTML = `
    <table>
      <thead><tr><th>Cupom</th><th>Tipo</th><th>Valor</th><th>Minimo</th><th>Uso</th><th>Validade</th><th></th></tr></thead>
      <tbody>${state.coupons.map(coupon => `
        <tr>
          <td>${escapeHtml(coupon.code)}<small>${coupon.active ? 'Ativo' : 'Inativo'}</small></td>
          <td>${coupon.type === 'fixed' ? 'Valor fixo' : 'Porcentagem'}</td>
          <td>${coupon.type === 'fixed' ? money(coupon.value) : `${Number(coupon.value)}%`}</td>
          <td>${money(coupon.min_order_amount)}</td>
          <td>${coupon.used_count || 0}${coupon.max_uses ? ` / ${coupon.max_uses}` : ''}</td>
          <td>${coupon.expires_at ? dateTime(coupon.expires_at) : 'Sem vencimento'}</td>
          <td><button data-fill-coupon="${escapeHtml(coupon.code)}">Editar</button></td>
        </tr>`).join('') || '<tr><td colspan="7">Nenhum cupom cadastrado.</td></tr>'}</tbody>
    </table>`;
}

function fillCoupon(code) {
  const coupon = state.coupons.find(item => item.code === code);
  if (!coupon) return;
  const form = qs('#couponForm');
  ['code','type','value','min_order_amount','max_uses'].forEach(name => {
    form.elements[name].value = coupon[name] ?? '';
  });
  form.elements.starts_at.value = coupon.starts_at ? coupon.starts_at.slice(0, 16) : '';
  form.elements.expires_at.value = coupon.expires_at ? coupon.expires_at.slice(0, 16) : '';
  form.elements.active.checked = coupon.active !== false;
}

async function saveCoupon(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formData(form);
  data.active = form.elements.active.checked;
  await api('/api/admin-coupons', { method: 'POST', body: JSON.stringify(data) });
  setStatus('Cupom salvo.', 'success');
  form.reset();
  form.elements.active.checked = true;
  await loadCoupons();
}

async function loadCustomers() {
  const data = await api('/api/admin-customers');
  state.customers = data.customers || [];
  qs('#customersTable').innerHTML = `
    <table>
      <thead><tr><th>Cliente</th><th>Contato</th><th>Conta</th><th>Pedidos</th><th>Total</th><th>Cadastro</th></tr></thead>
      <tbody>${state.customers.map(customer => `
        <tr>
          <td>${escapeHtml(customer.name || '-')}<small>ID ${customer.id}</small></td>
          <td>${escapeHtml(customer.email || '-')}<small>${escapeHtml(customer.phone || customer.city || '')}</small></td>
          <td>${customer.has_account ? 'Sim' : 'Nao'}</td>
          <td>${customer.order_count || 0}</td>
          <td>${money(customer.total_spent)}</td>
          <td>${dateTime(customer.created_at)}</td>
        </tr>`).join('') || '<tr><td colspan="6">Nenhum cliente ainda.</td></tr>'}</tbody>
    </table>`;
}

function fillSupplier(id) {
  const supplier = state.suppliers.find(item => Number(item.id) === Number(id));
  if (!supplier) return;
  const form = qs('#supplierForm');
  ['id','name','contact_name','email','phone','notes'].forEach(name => {
    form.elements[name].value = supplier[name] ?? '';
  });
}

async function saveSupplier(event) {
  event.preventDefault();
  const form = event.currentTarget;
  await api('/api/admin-suppliers', { method: 'POST', body: JSON.stringify(formData(form)) });
  setStatus('Fornecedor salvo.', 'success');
  form.reset();
  await loadSuppliers();
}

async function bootstrap() {
  qs('#adminSecret').value = state.secret;
  if (!state.secret) {
    setStatus('Cole a chave admin para carregar o painel.');
    return;
  }
  setStatus('Carregando painel...');
  await Promise.all([loadDashboard(), loadOrders(), loadProducts(), loadSuppliers(), loadCoupons(), loadCustomers(), loadLeads()]);
  setStatus('Painel carregado.', 'success');
}

document.addEventListener('click', async event => {
  const tab = event.target.closest('[data-tab]');
  if (tab) {
    document.querySelectorAll('.admin-tab').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(item => item.classList.remove('active'));
    tab.classList.add('active');
    qs(`#${tab.dataset.tab}Panel`).classList.add('active');
  }

  const orderButton = event.target.closest('[data-order]');
  if (orderButton) openOrder(orderButton.dataset.order).catch(error => setStatus(error.message, 'failure'));

  const saveOrder = event.target.closest('[data-save-order]');
  if (saveOrder) saveOrderStatus(saveOrder.dataset.saveOrder).catch(error => setStatus(error.message, 'failure'));

  const fillProductButton = event.target.closest('[data-fill-product]');
  if (fillProductButton) fillProduct(fillProductButton.dataset.fillProduct);

  const promoProductButton = event.target.closest('[data-promo-product]');
  if (promoProductButton) promoProduct(promoProductButton.dataset.promoProduct).catch(error => setStatus(error.message, 'failure'));

  const toggleProductButton = event.target.closest('[data-toggle-product]');
  if (toggleProductButton) toggleProduct(toggleProductButton.dataset.toggleProduct).catch(error => setStatus(error.message, 'failure'));

  const fillSupplierButton = event.target.closest('[data-fill-supplier]');
  if (fillSupplierButton) fillSupplier(fillSupplierButton.dataset.fillSupplier);

  const fillCouponButton = event.target.closest('[data-fill-coupon]');
  if (fillCouponButton) fillCoupon(fillCouponButton.dataset.fillCoupon);
});

qs('#saveSecret').addEventListener('click', () => {
  state.secret = qs('#adminSecret').value.trim();
  localStorage.setItem('duum_admin_secret', state.secret);
  bootstrap().catch(error => setStatus(error.message, 'failure'));
});
qs('#refreshOrders').addEventListener('click', () => loadOrders().catch(error => setStatus(error.message, 'failure')));
qs('#refreshDashboard').addEventListener('click', () => loadDashboard().catch(error => setStatus(error.message, 'failure')));
qs('#refreshProducts').addEventListener('click', () => loadProducts().catch(error => setStatus(error.message, 'failure')));
qs('#refreshSuppliers').addEventListener('click', () => loadSuppliers().catch(error => setStatus(error.message, 'failure')));
qs('#refreshCoupons').addEventListener('click', () => loadCoupons().catch(error => setStatus(error.message, 'failure')));
qs('#refreshCustomers').addEventListener('click', () => loadCustomers().catch(error => setStatus(error.message, 'failure')));
qs('#refreshLeads').addEventListener('click', () => loadLeads().catch(error => setStatus(error.message, 'failure')));
qs('#productForm').addEventListener('submit', event => saveProduct(event).catch(error => setStatus(error.message, 'failure')));
qs('#supplierForm').addEventListener('submit', event => saveSupplier(event).catch(error => setStatus(error.message, 'failure')));
qs('#couponForm').addEventListener('submit', event => saveCoupon(event).catch(error => setStatus(error.message, 'failure')));

bootstrap().catch(error => setStatus(error.message, 'failure'));
