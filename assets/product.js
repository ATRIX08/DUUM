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

fetch('/api/catalog')
  .then(response => response.json())
  .then(data => {
    product = (data.products || []).find(item => Number(item.id) === id);
    if (!product) throw new Error('Produto nao encontrado.');
    render();
  })
  .catch(error => {
    document.querySelector('#productPage').innerHTML = `<p class="checkout-status failure">${safe(error.message)}</p>`;
  });
