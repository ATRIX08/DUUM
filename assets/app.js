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

const grid = document.querySelector('#productGrid');
const cartDrawer = document.querySelector('#cartDrawer');
const overlay = document.querySelector('#overlay');

function safeText(text) {
  const el = document.createElement('span');
  el.textContent = text;
  return el.innerHTML;
}

function renderProducts(filter = 'todos') {
  const list = filter === 'todos' ? products : products.filter(product => product.category === filter);
  grid.innerHTML = list.map(product => `
    <article class="product-card" data-category="${product.category}">
      <div class="product-image" style="background-image:url('${product.image}')"><span class="tag">${safeText(product.tag)}</span></div>
      <div class="product-info">
        <h3>${safeText(product.name)}</h3>
        <div class="price">${product.old ? `<span class="old">${money(product.old)}</span>` : ''}<strong>${money(product.price)}</strong></div>
        <small class="stock-note">${Number(product.stock || 0) > 0 ? `${product.stock} disponiveis` : 'Indisponivel'}</small>
        <div class="product-actions">
          <button data-view="${product.id}">Detalhes</button>
          <button class="add" data-add="${product.id}" ${Number(product.stock || 0) <= 0 ? 'disabled' : ''}>Adicionar</button>
        </div>
      </div>
    </article>`).join('');
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

function addToCart(id) {
  const product = products.find(entry => entry.id === id);
  if (product && Number(product.stock || 0) <= 0) {
    alert('Produto indisponivel no momento.');
    return;
  }
  const item = cart.find(product => product.id === id);
  if (item) item.qty += 1;
  else cart.push({id, qty:1, size:'M'});
  saveCart();
  openCart();
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
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
      return `<div class="cart-item"><img src="${product.image}" alt=""><div><h4>${safeText(product.name)}</h4><small>Tamanho ${item.size} | Qtd. ${item.qty}</small><p>${money(product.price * item.qty)}</p></div><button class="remove" data-remove="${product.id}" aria-label="Remover">Remover</button></div>`;
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

function openProduct(id) {
  const product = products.find(entry => entry.id === id);
  document.querySelector('#dialogContent').innerHTML = `<div class="dialog-product"><img src="${product.image}" alt="${safeText(product.name)}"><div class="dialog-details"><span class="eyebrow">${safeText(product.tag)}</span><h2>${safeText(product.name)}</h2><h3>${money(product.price)}</h3><p>${safeText(product.description)}</p><p><strong>Escolha o tamanho</strong></p><div class="size-list"><button>P</button><button>M</button><button>G</button><button>GG</button></div><button class="checkout-btn" data-add="${product.id}" ${Number(product.stock || 0) <= 0 ? 'disabled' : ''}>${Number(product.stock || 0) > 0 ? 'Adicionar a sacola' : 'Indisponivel'}</button><small>Prazo e disponibilidade confirmados no checkout.</small></div></div>`;
  document.querySelector('#productDialog').showModal();
}

document.addEventListener('click', event => {
  const add = event.target.closest('[data-add]');
  if (add) addToCart(Number(add.dataset.add));

  const view = event.target.closest('[data-view]');
  if (view) openProduct(Number(view.dataset.view));

  const remove = event.target.closest('[data-remove]');
  if (remove) removeFromCart(Number(remove.dataset.remove));
});

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  renderProducts(button.dataset.filter);
}));

document.querySelector('#cartBtn').addEventListener('click', openCart);
document.querySelector('#closeCart').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);
document.querySelector('#closeDialog').addEventListener('click', () => document.querySelector('#productDialog').close());
document.querySelector('#menuBtn').addEventListener('click', () => document.querySelector('#nav').classList.toggle('open'));
document.querySelector('#checkoutBtn').addEventListener('click', () => {
  if (!cart.length) return alert('Sua sacola esta vazia.');
  window.location.href = 'checkout.html';
});

document.querySelector('#newsletterForm').addEventListener('submit', event => {
  event.preventDefault();
  const email = document.querySelector('#newsletterEmail').value.trim();
  document.querySelector('#newsletterMessage').textContent = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Cadastro realizado! Use o cupom DUUM10.' : 'Digite um e-mail valido.';
  if (email) event.target.reset();
});

const cookieBanner = document.querySelector('#cookieBanner');
if (!localStorage.getItem('cookie_choice')) cookieBanner.classList.add('show');
['acceptCookies','rejectCookies'].forEach(id => document.querySelector('#' + id).addEventListener('click', () => {
  localStorage.setItem('cookie_choice', id === 'acceptCookies' ? 'accepted' : 'essential');
  cookieBanner.classList.remove('show');
}));

renderProducts();
renderCart();
loadCatalog();
