'use strict';

const products = [
  { id: 1, name: 'Vestido Midi Elegance', price: 149.90, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=700&q=85' },
  { id: 2, name: 'Conjunto Alfaiataria Areia', price: 179.90, image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=700&q=85' },
  { id: 3, name: 'Camisa Premium Essential', price: 99.90, image: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=700&q=85' },
  { id: 4, name: 'Jaqueta Urban Black', price: 219.90, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=700&q=85' },
  { id: 5, name: 'Blazer Feminino Classic', price: 189.90, image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=85' },
  { id: 6, name: 'Camiseta Minimal Cotton', price: 69.90, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=85' },
  { id: 7, name: 'Vestido Longo Serena', price: 169.90, image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=700&q=85' },
  { id: 8, name: 'Moletom Urban Essential', price: 139.90, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=700&q=85' }
];

const productMap = new Map(products.map(product => [product.id, product]));

function normalizeCart(rawCart) {
  if (!Array.isArray(rawCart)) {
    throw new Error('Sacola invalida.');
  }

  const normalized = rawCart.map(item => {
    const id = Number(item.id);
    const qty = Number(item.qty);
    const product = productMap.get(id);

    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 20) {
      throw new Error('Produto ou quantidade invalida.');
    }

    return {
      id: product.id,
      title: product.name,
      quantity: qty,
      unit_price: Number(product.price.toFixed(2)),
      currency_id: 'BRL',
      picture_url: product.image
    };
  });

  if (!normalized.length) {
    throw new Error('Sua sacola esta vazia.');
  }

  return normalized;
}

module.exports = {
  normalizeCart,
  products
};
