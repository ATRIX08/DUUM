'use strict';

let products = [
  {id:1,name:'Vestido Midi Elegance',category:'feminino',price:149.90,old:189.90,tag:'NOVO',image:'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=700&q=85',description:'Vestido midi de caimento leve, ideal para ocasioes especiais.'},
  {id:2,name:'Conjunto Alfaiataria Areia',category:'feminino',price:179.90,old:null,tag:'MAIS VENDIDO',image:'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=700&q=85',description:'Conjunto moderno com acabamento elegante e confortavel.'},
  {id:3,name:'Camisa Premium Essential',category:'masculino',price:99.90,old:129.90,tag:'OFERTA',image:'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=700&q=85',description:'Camisa versatil para combinar com looks casuais ou sociais.'},
  {id:4,name:'Jaqueta Urban Black',category:'masculino',price:219.90,old:null,tag:'NOVO',image:'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=700&q=85',description:'Jaqueta urbana com visual moderno e acabamento resistente.'},
  {id:5,name:'Blazer Feminino Classic',category:'feminino',price:189.90,old:229.90,tag:'OFERTA',image:'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=85',description:'Blazer classico para elevar producoes profissionais e casuais.'},
  {id:6,name:'Camiseta Minimal Cotton',category:'masculino',price:69.90,old:null,tag:'ESSENCIAL',image:'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=85',description:'Camiseta basica em algodao, macia e facil de combinar.'},
  {id:7,name:'Vestido Longo Serena',category:'feminino',price:169.90,old:null,tag:'NOVO',image:'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=700&q=85',description:'Vestido longo com modelagem fluida e visual sofisticado.'},
  {id:8,name:'Moletom Urban Essential',category:'masculino',price:139.90,old:159.90,tag:'OFERTA',image:'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=700&q=85',description:'Moletom confortavel para dias frios e combinacoes urbanas.'}
];

const legacyCart = localStorage.getItem('dumke_cart');
if (legacyCart && !localStorage.getItem('duum_cart')) localStorage.setItem('duum_cart', legacyCart);

const money = value => value.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
let cart = JSON.parse(localStorage.getItem('duum_cart') || '[]');
let account = JSON.parse(localStorage.getItem('duum_account') || 'null');
let currentCategory = 'todos';
let currentSize = 'todos';

const grid = document.querySelector('#productGrid');
const cartDrawer = document.querySelector('#cartDrawer');
const overlay = document.querySelector('#overlay');
const accountDialog = document.querySelector('#accountDialog');
const accountMenu = document.querySelector('#accountMenu');
const defaultSizes = ['P', 'M', 'G', 'GG'];

function safeText(text) {
  const el = document.createElement('span');
  el.textContent = text;
  return el.innerHTML;
}

function productSizes(product) {
  return Array.isArray(product.sizes) && product.sizes.length ? product.sizes : defaultSizes;
}

function renderProducts() {
  const list = products.filter(product => {
    const categoryMatch = currentCategory === 'todos' || product.category === currentCategory;
    const sizeMatch = currentSize === 'todos' || productSizes(product).includes(currentSize);
    return categoryMatch && sizeMatch;
  });
  grid.innerHTML = list.map(product => `
    <article class="product-card" data-category="${product.category}">
      <div class="product-image" style="background-image:url('${product.image}')"><span class="tag">${safeText(product.tag)}</span></div>
      <div class="product-info">
        <h3>${safeText(product.name)}</h3>
        <div class="price">${product.old ? `<span class="old">${money(product.old)}</span>` : ''}<strong>${money(product.price)}</strong></div>
        <div class="product-sizes">${productSizes(product).map(size => `<span>${safeText(size)}</span>`).join('')}</div>
        <small class="stock-note">${Number(product.stock || 0) > 0 ? `${product.stock} disponiveis` : 'Indisponivel'}</small>
        <div class="product-actions">
          <button data-view="${product.id}">Detalhes</button>
          <button class="add" data-add="${product.id}" data-size="${currentSize === 'todos' ? 'M' : safeText(currentSize)}" ${Number(product.stock || 0) <= 0 ? 'disabled' : ''}>Adicionar</button>
        </div>
      </div>
    </article>`).join('') || '<div class="empty catalog-empty">Nenhuma roupa encontrada nesse tamanho.</div>';
}

async function loadCatalog() {
  try {
    const response = await fetch('/api/catalog');
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.products) && data.products.length) {
      products = data.products;
      renderProducts();
      renderCart();
    }
  } catch (error) {
    console.warn('Catalogo local carregado.', error);
  }
}

function saveCart() {
  localStorage.setItem('duum_cart', JSON.stringify(cart));
  renderCart();
}

function addToCart(id, size = 'M') {
  const product = products.find(entry => entry.id === id);
  if (product && Number(product.stock || 0) <= 0) {
    alert('Produto indisponivel no momento.');
    return;
  }
  const item = cart.find(product => product.id === id && product.size === size);
  if (item) item.qty += 1;
  else cart.push({id, qty:1, size});
  saveCart();
  openCart();
}

function removeFromCart(id, size) {
  cart = cart.filter(item => !(item.id === id && item.size === size));
  saveCart();
}

function renderCart() {
  const wrap = document.querySelector('#cartItems');
  document.querySelector('#cartCount').textContent = cart.reduce((sum, item) => sum + item.qty, 0);
  if (!cart.length) {
    wrap.innerHTML = '<div class="empty">Sua sacola esta vazia.</div>';
  } else {
    wrap.innerHTML = cart.map(item => {
      const product = products.find(entry => entry.id === item.id);
      if (!product) return '';
      return `<div class="cart-item"><img src="${product.image}" alt=""><div><h4>${safeText(product.name)}</h4><small>Tamanho ${safeText(item.size)} | Qtd. ${item.qty}</small><p>${money(product.price * item.qty)}</p></div><button class="remove" data-remove="${product.id}" data-remove-size="${safeText(item.size)}" aria-label="Remover">Remover</button></div>`;
    }).join('');
  }
  const total = cart.reduce((sum, item) => {
    const product = products.find(entry => entry.id === item.id);
    return product ? sum + product.price * item.qty : sum;
  }, 0);
  document.querySelector('#cartTotal').textContent = money(total);
}

function openCart() {
  cartDrawer.classList.add('open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  overlay.classList.add('open');
}

function closeCart() {
  cartDrawer.classList.remove('open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('open');
}

function updateAccountUi() {
  const button = document.querySelector('#accountBtn');
  button.textContent = account?.name ? account.name.split(' ')[0] : 'Entrar';
  document.querySelector('#logoutBtn').hidden = !account;
  document.querySelector('#accountMenuName').textContent = account?.name ? account.name : 'Minha conta';
}

function closeAccountMenu() {
  accountMenu.hidden = true;
}

function toggleAccountMenu() {
  if (!account) {
    setAuthMode('login');
    accountDialog.showModal();
    return;
  }
  accountMenu.hidden = !accountMenu.hidden;
}

function setAuthMode(mode) {
  document.querySelector('#authMode').value = mode;
  document.querySelector('#accountTitle').textContent = mode === 'register' ? 'Criar conta' : 'Entrar';
  document.querySelector('#authForm button[type="submit"]').textContent = mode === 'register' ? 'Criar conta' : 'Entrar';
  document.querySelector('#toggleAuth').textContent = mode === 'register' ? 'Ja tenho conta' : 'Criar conta';
  document.querySelectorAll('.register-only').forEach(element => {
    element.style.display = mode === 'register' ? '' : 'none';
  });
  document.querySelector('#authPassword').setAttribute('autocomplete', mode === 'register' ? 'new-password' : 'current-password');
  document.querySelector('#authStatus').textContent = '';
}

async function submitAuth(event) {
  event.preventDefault();
  const mode = document.querySelector('#authMode').value;
  const status = document.querySelector('#authStatus');
  status.textContent = mode === 'register' ? 'Criando conta...' : 'Entrando...';
  status.className = 'checkout-status';

  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: mode,
        name: document.querySelector('#authName').value,
        phone: document.querySelector('#authPhone').value,
        email: document.querySelector('#authEmail').value,
        password: document.querySelector('#authPassword').value
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Nao foi possivel autenticar.');
    account = data.user;
    localStorage.setItem('duum_account', JSON.stringify(account));
    status.textContent = 'Conta conectada.';
    status.className = 'checkout-status success';
    updateAccountUi();
    setTimeout(() => accountDialog.close(), 450);
  } catch (error) {
    status.textContent = error.message;
    status.className = 'checkout-status failure';
  }
}

function openProduct(id) {
  const product = products.find(entry => entry.id === id);
  const sizes = productSizes(product);
  const selectedSize = currentSize === 'todos' || !sizes.includes(currentSize) ? sizes[0] : currentSize;
  document.querySelector('#dialogContent').innerHTML = `<div class="dialog-product"><img src="${product.image}" alt="${safeText(product.name)}"><div class="dialog-details"><span class="eyebrow">${safeText(product.tag)}</span><h2>${safeText(product.name)}</h2><h3>${money(product.price)}</h3><p>${safeText(product.description)}</p><p><strong>Escolha o tamanho</strong></p><div class="size-list">${sizes.map(size => `<button class="${size === selectedSize ? 'active' : ''}" data-size-select="${safeText(size)}">${safeText(size)}</button>`).join('')}</div><button class="checkout-btn" data-add="${product.id}" data-size="${safeText(selectedSize)}" ${Number(product.stock || 0) <= 0 ? 'disabled' : ''}>${Number(product.stock || 0) > 0 ? 'Adicionar a sacola' : 'Indisponivel'}</button><small>Prazo e disponibilidade confirmados no checkout.</small></div></div>`;
  document.querySelector('#productDialog').showModal();
}

document.addEventListener('click', event => {
  const add = event.target.closest('[data-add]');
  if (add) addToCart(Number(add.dataset.add), add.dataset.size || 'M');

  const view = event.target.closest('[data-view]');
  if (view) openProduct(Number(view.dataset.view));

  const remove = event.target.closest('[data-remove]');
  if (remove) removeFromCart(Number(remove.dataset.remove), remove.dataset.removeSize || 'M');

  const sizeSelect = event.target.closest('[data-size-select]');
  if (sizeSelect) {
    document.querySelectorAll('[data-size-select]').forEach(button => button.classList.remove('active'));
    sizeSelect.classList.add('active');
    const addButton = document.querySelector('#productDialog [data-add]');
    if (addButton) addButton.dataset.size = sizeSelect.dataset.sizeSelect;
  }

  if (!event.target.closest('.header-actions')) closeAccountMenu();
});

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  currentCategory = button.dataset.filter;
  renderProducts();
}));

document.querySelectorAll('.size-filter-btn').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.size-filter-btn').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  currentSize = button.dataset.sizeFilter;
  renderProducts();
}));

document.querySelector('#cartBtn').addEventListener('click', openCart);
document.querySelector('#accountBtn').addEventListener('click', toggleAccountMenu);
accountMenu.addEventListener('click', event => {
  const action = event.target.closest('[data-account-action]')?.dataset.accountAction;
  if (!action) return;
  if (action === 'logout') {
    account = null;
    localStorage.removeItem('duum_account');
    updateAccountUi();
    closeAccountMenu();
    return;
  }
  if (action === 'track' || action === 'orders') {
    window.location.href = 'pedido.html';
    return;
  }
  if (action === 'profile') {
    closeAccountMenu();
    setAuthMode('login');
    document.querySelector('#authEmail').value = account?.email || '';
    document.querySelector('#authStatus').textContent = `Voce esta conectado como ${account?.email || 'cliente DUUM'}.`;
    accountDialog.showModal();
  }
});
document.querySelector('#closeCart').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);
document.querySelector('#closeDialog').addEventListener('click', () => document.querySelector('#productDialog').close());
document.querySelector('#closeAccount').addEventListener('click', () => accountDialog.close());
document.querySelector('#toggleAuth').addEventListener('click', () => {
  setAuthMode(document.querySelector('#authMode').value === 'register' ? 'login' : 'register');
});
document.querySelector('#logoutBtn').addEventListener('click', () => {
  account = null;
  localStorage.removeItem('duum_account');
  updateAccountUi();
  closeAccountMenu();
  document.querySelector('#authStatus').textContent = 'Voce saiu da conta.';
});
document.querySelector('#authForm').addEventListener('submit', submitAuth);
document.querySelector('#menuBtn').addEventListener('click', () => document.querySelector('#nav').classList.toggle('open'));
document.querySelector('#checkoutBtn').addEventListener('click', () => {
  if (!cart.length) return alert('Sua sacola esta vazia.');
  window.location.href = 'checkout.html';
});

document.querySelector('#newsletterForm').addEventListener('submit', async event => {
  event.preventDefault();
  const email = document.querySelector('#newsletterEmail').value.trim();
  const message = document.querySelector('#newsletterMessage');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    message.textContent = 'Digite um e-mail valido.';
    return;
  }
  message.textContent = 'Salvando cadastro...';
  try {
    const response = await fetch('/api/newsletter', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email, source: 'home' })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Nao foi possivel cadastrar.');
    message.textContent = `Cadastro realizado! Use o cupom ${data.coupon || 'DUUM10'}.`;
    event.target.reset();
  } catch (error) {
    message.textContent = error.message;
  }
});

const cookieBanner = document.querySelector('#cookieBanner');
if (!localStorage.getItem('cookie_choice')) cookieBanner.classList.add('show');
['acceptCookies','rejectCookies'].forEach(id => document.querySelector('#' + id).addEventListener('click', () => {
  localStorage.setItem('cookie_choice', id === 'acceptCookies' ? 'accepted' : 'essential');
  cookieBanner.classList.remove('show');
}));

renderProducts();
renderCart();
setAuthMode('login');
updateAccountUi();
loadCatalog();
