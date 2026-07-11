'use strict';

const state = {
  secret: localStorage.getItem('duum_admin_secret') || '',
  coupons: [],
  customers: [],
  dashboard: null,
  filters: {
    couponStatus: 'all',
    coupons: '',
    customerAccount: 'all',
    customers: '',
    leads: '',
    orderStatus: 'all',
    orders: '',
    productStatus: 'all',
    products: '',
    suppliers: ''
  },
  leads: [],
  orders: [],
  products: [],
  suppliers: []
};

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = value => value ? new Date(value).toLocaleString('pt-BR') : '-';
const qs = selector => document.querySelector(selector);
const qsa = selector => Array.from(document.querySelectorAll(selector));

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

function parseGallery(value) {
  return String(value || '').split(/\n/).map(item => item.trim()).filter(Boolean);
}

function formatGallery(value) {
  if (Array.isArray(value)) return value.join('\n');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.join('\n');
    } catch {}
  }
  return '';
}

function formatSizeStock(value) {
  const stock = typeof value === 'string' ? (() => {
    try { return JSON.parse(value); } catch { return {}; }
  })() : (value || {});
  return Object.entries(stock).map(([size, qty]) => `${size}:${qty}`).join(',');
}

function readImage(file, maxWidth = 1200, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', quality));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalize(value) {
  return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function includesAny(row, query, fields) {
  if (!query) return true;
  const search = normalize(query);
  return fields.some(field => normalize(row[field]).includes(search));
}

function metricTrend(label, value) {
  return `<small>${escapeHtml(label)}</small><span>${escapeHtml(value)}</span>`;
}

function activateTab(name) {
  qsa('.admin-tab').forEach(item => item.classList.toggle('active', item.dataset.tab === name));
  qsa('.admin-panel').forEach(item => item.classList.toggle('active', item.id === `${name}Panel`));
}

async function loadDashboard() {
  const data = await api('/api/admin-dashboard');
  state.dashboard = data;
  const summary = data.summary || {};
  qs('#dashboardCards').innerHTML = `
    <div><small>Pedidos</small><strong>${summary.orders || 0}</strong>${metricTrend('Total criado', 'Todos os canais')}</div>
    <div><small>GMV</small><strong>${money(summary.gross_total)}</strong>${metricTrend('Volume bruto', 'Pedidos emitidos')}</div>
    <div><small>Aprovados</small><strong>${summary.paid_orders || 0}</strong>${metricTrend('Checkout Pro', 'Pagamentos pagos')}</div>
    <div><small>Receita</small><strong>${money(summary.paid_total)}</strong>${metricTrend('Liquido aprovado', 'Base de vendas')}</div>`;
  qs('#statusTable').innerHTML = `
    <table><tbody>${(data.byStatus || []).map(row => `<tr><td><span class="pill">${escapeHtml(row.status)}</span></td><td>${row.count}</td></tr>`).join('') || '<tr><td>Nenhum pedido.</td></tr>'}</tbody></table>`;
  qs('#lowStockTable').innerHTML = `
    <table><tbody>${(data.lowStock || []).map(product => `<tr><td>${escapeHtml(product.name)}<small>ID ${product.id}</small></td><td>${product.stock_quantity}</td></tr>`).join('') || '<tr><td>Nenhum alerta de estoque.</td></tr>'}</tbody></table>`;
}

async function loadOrders() {
  const data = await api('/api/admin-orders');
  state.orders = data.orders || [];
  renderOrders();
}

function renderOrders() {
  const orders = state.orders.filter(order => {
    const statusMatch = state.filters.orderStatus === 'all' || order.status === state.filters.orderStatus || order.payment_status === state.filters.orderStatus;
    return statusMatch && includesAny(order, state.filters.orders, ['id', 'customer_name', 'customer_email', 'payment_status', 'status']);
  });
  qs('#ordersTable').innerHTML = `
    <table>
      <thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Status</th><th></th></tr></thead>
      <tbody>${orders.map(order => `
        <tr>
          <td>${escapeHtml(order.id)}<small>${dateTime(order.created_at)}</small></td>
          <td>${escapeHtml(order.customer_name || '-')}<small>${escapeHtml(order.customer_email || '')}</small></td>
          <td>${money(order.total_amount)}</td>
          <td><span class="pill">${escapeHtml(order.payment_status)}</span></td>
          <td><span class="pill">${escapeHtml(order.status)}</span></td>
          <td><button data-order="${escapeHtml(order.id)}">Abrir</button></td>
        </tr>`).join('') || '<tr><td colspan="6">Nenhum pedido encontrado.</td></tr>'}</tbody>
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
      <div><strong>Telefone</strong><span>${escapeHtml(order.customer_phone || '-')}</span></div>
      <div><strong>Total</strong><span>${money(order.total_amount)}</span></div>
      <div><strong>Frete</strong><span>${money(order.shipping_fee)}</span></div>
      <div><strong>Desconto</strong><span>${order.discount_code ? `${escapeHtml(order.discount_code)} - ${money(order.discount_amount)}` : '-'}</span></div>
      <div><strong>Pagamento</strong><span>${escapeHtml(order.payment_status)}</span></div>
      <div><strong>Transportadora</strong><span>${escapeHtml(order.carrier || '-')}</span></div>
      <div><strong>Rastreio</strong><span>${escapeHtml(order.tracking_code || '-')}</span></div>
      <div><strong>Endereco</strong><span>${escapeHtml([order.address, order.number, order.city, order.cep].filter(Boolean).join(', ') || '-')}</span></div>
    </div>
    <div class="action-row admin-shipping-actions">
      <button data-copy-address="${escapeHtml([order.customer_name, order.address, order.number, order.city, order.cep].filter(Boolean).join(' | '))}">Copiar endereco</button>
      ${order.customer_phone ? `<a class="admin-action-link" href="https://wa.me/${escapeHtml(String(order.customer_phone).replace(/\\D/g, ''))}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ''}
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
  renderProducts();
}

function renderProducts() {
  const products = state.products.filter(product => {
    const status = state.filters.productStatus;
    const statusMatch =
      status === 'all' ||
      (status === 'active' && product.active !== false) ||
      (status === 'inactive' && product.active === false) ||
      (status === 'featured' && product.featured === true) ||
      (status === 'low' && Number(product.stock_quantity || 0) <= 5);
    return statusMatch && includesAny(product, state.filters.products, ['id', 'name', 'sku', 'category', 'supplier_name', 'supplier_sku']);
  });
  qs('#productsTable').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Produto</th><th>Preco</th><th>Estoque</th><th>Fornecedor</th><th>Ativo</th><th>Acoes</th></tr></thead>
      <tbody>${products.map(product => `
        <tr>
          <td>${product.id}</td>
          <td>${escapeHtml(product.name)}<small>${escapeHtml(product.sku || product.category || '')}</small><small>Tam. ${escapeHtml(product.sizes || 'P,M,G,GG')}</small></td>
          <td>${money(product.price)}${product.old_price ? `<small>De ${money(product.old_price)}</small>` : ''}</td>
          <td><span class="${Number(product.stock_quantity || 0) <= 5 ? 'stock-danger' : ''}">${product.stock_quantity ?? 0}</span><small>${escapeHtml(formatSizeStock(product.size_stock))}</small></td>
          <td>${escapeHtml(product.supplier_name || '-')}</td>
          <td><span class="pill ${product.active ? 'pill-success' : 'pill-muted'}">${product.active ? 'Sim' : 'Nao'}</span></td>
          <td class="action-row">
            <button data-fill-product="${product.id}">Editar</button>
            <button data-promo-product="${product.id}">Promo 10%</button>
            <button data-toggle-product="${product.id}">${product.active ? 'Desativar' : 'Ativar'}</button>
          </td>
        </tr>`).join('') || '<tr><td colspan="7">Nenhum produto encontrado.</td></tr>'}</tbody>
    </table>`;
}

function fillProduct(id) {
  const product = state.products.find(item => Number(item.id) === Number(id));
  if (!product) return;
  const form = qs('#productForm');
  ['id','sku','name','category','price','old_price','image_url','supplier_id','supplier_sku','supplier_cost','stock_quantity','sizes','description'].forEach(name => {
    form.elements[name].value = product[name] ?? '';
  });
  form.elements.size_stock.value = formatSizeStock(product.size_stock);
  form.elements.gallery_urls.value = formatGallery(product.gallery_urls);
  form.elements.active.checked = product.active !== false;
  form.elements.featured.checked = product.featured === true;
}

async function saveProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formData(form);
  data.active = form.elements.active.checked;
  data.featured = form.elements.featured.checked;
  data.gallery_urls = parseGallery(data.gallery_urls);
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

async function uploadMainImage(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  setStatus('Preparando foto principal...');
  const dataUrl = await readImage(file);
  qs('#productForm').elements.image_url.value = dataUrl;
  setStatus('Foto principal pronta para salvar.', 'success');
}

async function uploadGalleryImages(event) {
  const files = Array.from(event.target.files || []).slice(0, 6);
  if (!files.length) return;
  setStatus('Preparando galeria...');
  const current = parseGallery(qs('#productForm').elements.gallery_urls.value);
  const uploaded = [];
  for (const file of files) uploaded.push(await readImage(file, 1000, 0.72));
  qs('#productForm').elements.gallery_urls.value = [...current, ...uploaded].slice(0, 6).join('\n');
  setStatus('Galeria pronta para salvar.', 'success');
}

async function loadSuppliers() {
  const data = await api('/api/admin-suppliers');
  state.suppliers = data.suppliers || [];
  renderSuppliers();
}

function renderSuppliers() {
  const suppliers = state.suppliers.filter(supplier => includesAny(supplier, state.filters.suppliers, ['id', 'name', 'contact_name', 'email', 'phone', 'notes']));
  qs('#suppliersTable').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Fornecedor</th><th>Contato</th><th>Produtos</th><th></th></tr></thead>
      <tbody>${suppliers.map(supplier => `
        <tr>
          <td>${supplier.id}</td>
          <td>${escapeHtml(supplier.name)}<small>${escapeHtml(supplier.notes || '')}</small></td>
          <td>${escapeHtml(supplier.contact_name || '-')}<small>${escapeHtml(supplier.phone || supplier.email || '')}</small></td>
          <td>${supplier.product_count}</td>
          <td><button data-fill-supplier="${supplier.id}">Editar</button></td>
        </tr>`).join('') || '<tr><td colspan="5">Nenhum fornecedor encontrado.</td></tr>'}</tbody>
    </table>`;
}

async function loadLeads() {
  const data = await api('/api/admin-leads');
  state.leads = data.leads || [];
  renderLeads();
}

function renderLeads() {
  const leads = state.leads.filter(lead => includesAny(lead, state.filters.leads, ['email', 'source', 'coupon_code']));
  qs('#leadsTable').innerHTML = `
    <table>
      <thead><tr><th>E-mail</th><th>Origem</th><th>Cupom</th><th>Cadastro</th></tr></thead>
      <tbody>${leads.map(lead => `
        <tr>
          <td>${escapeHtml(lead.email)}</td>
          <td>${escapeHtml(lead.source || '-')}</td>
          <td><span class="pill">${escapeHtml(lead.coupon_code || '-')}</span></td>
          <td>${dateTime(lead.created_at)}</td>
        </tr>`).join('') || '<tr><td colspan="4">Nenhum lead encontrado.</td></tr>'}</tbody>
    </table>`;
}

async function loadCoupons() {
  const data = await api('/api/admin-coupons');
  state.coupons = data.coupons || [];
  renderCoupons();
}

function renderCoupons() {
  const coupons = state.coupons.filter(coupon => {
    const statusMatch =
      state.filters.couponStatus === 'all' ||
      (state.filters.couponStatus === 'active' && coupon.active !== false) ||
      (state.filters.couponStatus === 'inactive' && coupon.active === false);
    return statusMatch && includesAny(coupon, state.filters.coupons, ['code', 'type', 'expires_at']);
  });
  qs('#couponsTable').innerHTML = `
    <table>
      <thead><tr><th>Cupom</th><th>Tipo</th><th>Valor</th><th>Minimo</th><th>Uso</th><th>Validade</th><th></th></tr></thead>
      <tbody>${coupons.map(coupon => `
        <tr>
          <td>${escapeHtml(coupon.code)}<small>${coupon.active ? 'Ativo' : 'Inativo'}</small></td>
          <td>${coupon.type === 'fixed' ? 'Valor fixo' : 'Porcentagem'}</td>
          <td>${coupon.type === 'fixed' ? money(coupon.value) : `${Number(coupon.value)}%`}</td>
          <td>${money(coupon.min_order_amount)}</td>
          <td>${coupon.used_count || 0}${coupon.max_uses ? ` / ${coupon.max_uses}` : ''}</td>
          <td>${coupon.expires_at ? dateTime(coupon.expires_at) : 'Sem vencimento'}</td>
          <td><button data-fill-coupon="${escapeHtml(coupon.code)}">Editar</button></td>
        </tr>`).join('') || '<tr><td colspan="7">Nenhum cupom encontrado.</td></tr>'}</tbody>
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
  renderCustomers();
}

function renderCustomers() {
  const customers = state.customers.filter(customer => {
    const accountMatch =
      state.filters.customerAccount === 'all' ||
      (state.filters.customerAccount === 'account' && customer.has_account) ||
      (state.filters.customerAccount === 'guest' && !customer.has_account);
    return accountMatch && includesAny(customer, state.filters.customers, ['id', 'name', 'email', 'phone', 'city']);
  });
  qs('#customersTable').innerHTML = `
    <table>
      <thead><tr><th>Cliente</th><th>Contato</th><th>Conta</th><th>Pedidos</th><th>Total</th><th>Cadastro</th></tr></thead>
      <tbody>${customers.map(customer => `
        <tr>
          <td>${escapeHtml(customer.name || '-')}<small>ID ${customer.id}</small></td>
          <td>${escapeHtml(customer.email || '-')}<small>${escapeHtml(customer.phone || customer.city || '')}</small></td>
          <td><span class="pill ${customer.has_account ? 'pill-success' : 'pill-muted'}">${customer.has_account ? 'Sim' : 'Nao'}</span></td>
          <td>${customer.order_count || 0}</td>
          <td>${money(customer.total_spent)}</td>
          <td>${dateTime(customer.created_at)}</td>
        </tr>`).join('') || '<tr><td colspan="6">Nenhum cliente encontrado.</td></tr>'}</tbody>
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
    activateTab(tab.dataset.tab);
  }

  const jump = event.target.closest('[data-jump]');
  if (jump) {
    activateTab(jump.dataset.jump);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const copyAddress = event.target.closest('[data-copy-address]');
  if (copyAddress) {
    navigator.clipboard?.writeText(copyAddress.dataset.copyAddress);
    setStatus('Endereco copiado.', 'success');
  }
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
qs('#productImageUpload').addEventListener('change', event => uploadMainImage(event).catch(error => setStatus(error.message, 'failure')));
qs('#productGalleryUpload').addEventListener('change', event => uploadGalleryImages(event).catch(error => setStatus(error.message, 'failure')));

qs('#orderSearch').addEventListener('input', event => {
  state.filters.orders = event.target.value;
  renderOrders();
});
qs('#orderStatusFilter').addEventListener('change', event => {
  state.filters.orderStatus = event.target.value;
  renderOrders();
});
qs('#productSearch').addEventListener('input', event => {
  state.filters.products = event.target.value;
  renderProducts();
});
qs('#productStatusFilter').addEventListener('change', event => {
  state.filters.productStatus = event.target.value;
  renderProducts();
});
qs('#supplierSearch').addEventListener('input', event => {
  state.filters.suppliers = event.target.value;
  renderSuppliers();
});
qs('#couponSearch').addEventListener('input', event => {
  state.filters.coupons = event.target.value;
  renderCoupons();
});
qs('#couponStatusFilter').addEventListener('change', event => {
  state.filters.couponStatus = event.target.value;
  renderCoupons();
});
qs('#customerSearch').addEventListener('input', event => {
  state.filters.customers = event.target.value;
  renderCustomers();
});
qs('#customerAccountFilter').addEventListener('change', event => {
  state.filters.customerAccount = event.target.value;
  renderCustomers();
});
qs('#leadSearch').addEventListener('input', event => {
  state.filters.leads = event.target.value;
  renderLeads();
});

bootstrap().catch(error => setStatus(error.message, 'failure'));
