'use strict';

const products = [
  { id: 1, sku: 'DUUM-VES-001', name: 'Vestido Midi Elegance', category: 'feminino', price: 149.90, old: 189.90, stock: 12, featured: true, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=700&q=85', description: 'Vestido midi de caimento leve, ideal para ocasioes especiais.' },
  { id: 2, sku: 'DUUM-CON-002', name: 'Conjunto Alfaiataria Areia', category: 'feminino', price: 179.90, old: null, stock: 8, featured: true, image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=700&q=85', description: 'Conjunto moderno com acabamento elegante e confortavel.' },
  { id: 3, sku: 'DUUM-CAM-003', name: 'Camisa Premium Essential', category: 'masculino', price: 99.90, old: 129.90, stock: 15, featured: false, image: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=700&q=85', description: 'Camisa versatil para combinar com looks casuais ou sociais.' },
  { id: 4, sku: 'DUUM-JAQ-004', name: 'Jaqueta Urban Black', category: 'masculino', price: 219.90, old: null, stock: 5, featured: true, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=700&q=85', description: 'Jaqueta urbana com visual moderno e acabamento resistente.' },
  { id: 5, sku: 'DUUM-BLA-005', name: 'Blazer Feminino Classic', category: 'feminino', price: 189.90, old: 229.90, stock: 3, featured: false, image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=85', description: 'Blazer classico para elevar producoes profissionais e casuais.' },
  { id: 6, sku: 'DUUM-COT-006', name: 'Camiseta Minimal Cotton', category: 'masculino', price: 69.90, old: null, stock: 20, featured: false, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=85', description: 'Camiseta basica em algodao, macia e facil de combinar.' },
  { id: 7, sku: 'DUUM-SER-007', name: 'Vestido Longo Serena', category: 'feminino', price: 169.90, old: null, stock: 2, featured: false, image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=700&q=85', description: 'Vestido longo com modelagem fluida e visual sofisticado.' },
  { id: 8, sku: 'DUUM-MOL-008', name: 'Moletom Urban Essential', category: 'masculino', price: 139.90, old: 159.90, stock: 9, featured: false, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=700&q=85', description: 'Moletom confortavel para dias frios e combinacoes urbanas.' }
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
