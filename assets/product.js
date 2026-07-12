'use strict';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const safe = value => {
  const span = document.createElement('span');
  span.textContent = value ?? '';
  return span.innerHTML;
};
const params = new URLSearchParams(window.location.search);
const id = Number(params.get('id'));
let product;
let reviews = [];
let reviewSummary = { count: 0, average: 0 };

function setMeta(name, content, property = false) {
  if (!content) return;
  const attr = property ? 'property' : 'name';
  let tag = document.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setLink(rel, href) {
  if (!href) return;
  let tag = document.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

async function loadProductMeta() {
  try {
    const response = await fetch(`/api/product-meta?id=${encodeURIComponent(id)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.meta) return;
    document.title = data.meta.title;
    setMeta('description', data.meta.description);
    setMeta('og:title', data.meta.title, true);
    setMeta('og:description', data.meta.description, true);
    setMeta('og:image', data.meta.image, true);
    setMeta('og:url', data.meta.canonical, true);
    setLink('canonical', data.meta.canonical);
    let json = document.querySelector('#productJsonLd');
    if (!json) {
      json = document.createElement('script');
      json.type = 'application/ld+json';
      json.id = 'productJsonLd';
      document.head.appendChild(json);
    }
    json.textContent = JSON.stringify(data.meta.jsonLd);
  } catch (error) {
    console.warn('SEO do produto indisponivel.', error);
  }
}

function sizeStock(size) {
  return Number((product.sizeStock || product.size_stock || {})[size] || product.stock || 0);
}

function addToCart(size) {
  const cart = JSON.parse(localStorage.getItem('duum_cart') || '[]');
  const item = cart.find(entry => Number(entry.id) === product.id && entry.size === size);
  if (item) item.qty += 1;
  else cart.push({ id: product.id, qty: 1, size });
  localStorage.setItem('duum_cart', JSON.stringify(cart));
  window.location.href = 'checkout.html';
}

function render() {
  const gallery = Array.isArray(product.gallery) && product.gallery.length ? product.gallery : [product.image];
  const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['P', 'M', 'G', 'GG'];
  const selected = sizes.find(size => sizeStock(size) > 0) || sizes[0];
  document.title = `${product.name} | DUUM`;
  document.querySelector('#productPage').innerHTML = `
    <section class="product-page-media">
      <img id="productMainImage" src="${gallery[0]}" alt="${safe(product.name)}">
      <div class="gallery-thumbs">${gallery.slice(0, 6).map((image, index) => `<button class="${index === 0 ? 'active' : ''}" data-gallery-image="${safe(image)}"><img src="${safe(image)}" alt=""></button>`).join('')}</div>
    </section>
    <section class="product-page-info">
      <span class="eyebrow">${safe(product.tag || 'DUUM')}</span>
      <h1>${safe(product.name)}</h1>
      <div class="price">${product.old ? `<span class="old">${money(product.old)}</span>` : ''}<strong>${money(product.price)}</strong></div>
      <p>${safe(product.description || '')}</p>
      <div class="size-list">${sizes.map(size => `<button class="${size === selected ? 'active' : ''}" data-size-select="${safe(size)}">${safe(size)}<small>${sizeStock(size)}</small></button>`).join('')}</div>
      <button class="checkout-btn" id="buyBtn" data-size="${safe(selected)}" ${sizeStock(selected) <= 0 ? 'disabled' : ''}>Comprar agora</button>
      <p class="summary-note">Frete e prazo aparecem no checkout pelo CEP.</p>
    </section>`;
  document.querySelector('#reviewsBox').hidden = false;
  document.querySelector('#reviewProductId').value = product.id;
  prefillReviewUser();
  loadReviews();
}

function stars(value) {
  const rating = Math.max(0, Math.min(5, Number(value || 0)));
  return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
}

function renderReviews() {
  document.querySelector('#reviewSummary').textContent = `${Number(reviewSummary.average || 0).toFixed(1)}/5 (${reviewSummary.count || 0})`;
  document.querySelector('#reviewList').innerHTML = reviews.map(review => `
    <article class="review-card">
      <div><strong>${safe(review.customer_name)}</strong><span>${stars(review.rating)}</span></div>
      <p>${safe(review.comment || 'Cliente avaliou este produto.')}</p>
    </article>`).join('') || '<p class="empty">Esse produto ainda nao tem avaliacoes.</p>';
}

async function loadReviews() {
  const response = await fetch(`/api/reviews?product_id=${encodeURIComponent(product.id)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return;
  reviews = data.reviews || [];
  reviewSummary = data.summary || reviewSummary;
  renderReviews();
}

function prefillReviewUser() {
  try {
    const account = JSON.parse(localStorage.getItem('duum_account') || 'null');
    if (!account) return;
    document.querySelector('#reviewName').value = account.name || '';
    document.querySelector('#reviewEmail').value = account.email || '';
  } catch {}
}

async function submitReview(event) {
  event.preventDefault();
  const status = document.querySelector('#reviewStatus');
  status.textContent = 'Enviando avaliacao...';
  status.className = 'checkout-status';
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());

  try {
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Nao foi possivel salvar.');
    status.textContent = 'Avaliacao publicada. Obrigado!';
    status.className = 'checkout-status success';
    event.currentTarget.elements.comment.value = '';
    await loadReviews();
  } catch (error) {
    status.textContent = error.message;
    status.className = 'checkout-status failure';
  }
}

document.addEventListener('click', event => {
  const galleryButton = event.target.closest('[data-gallery-image]');
  if (galleryButton) {
    document.querySelectorAll('[data-gallery-image]').forEach(button => button.classList.remove('active'));
    galleryButton.classList.add('active');
    document.querySelector('#productMainImage').src = galleryButton.dataset.galleryImage;
  }

  const sizeButton = event.target.closest('[data-size-select]');
  if (sizeButton) {
    document.querySelectorAll('[data-size-select]').forEach(button => button.classList.remove('active'));
    sizeButton.classList.add('active');
    const buy = document.querySelector('#buyBtn');
    buy.dataset.size = sizeButton.dataset.sizeSelect;
    buy.disabled = sizeStock(sizeButton.dataset.sizeSelect) <= 0;
  }

  if (event.target.closest('#buyBtn')) addToCart(document.querySelector('#buyBtn').dataset.size);
});

document.querySelector('#reviewForm').addEventListener('submit', submitReview);

fetch('/api/catalog')
  .then(response => response.json())
  .then(data => {
    product = (data.products || []).find(item => Number(item.id) === id);
    if (!product) throw new Error('Produto nao encontrado.');
    render();
    loadProductMeta();
  })
  .catch(error => {
    document.querySelector('#productPage').innerHTML = `<p class="checkout-status failure">${safe(error.message)}</p>`;
  });
