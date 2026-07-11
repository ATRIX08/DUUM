'use strict';

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function calculateShipping(cep, subtotal = 0) {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) {
    return { valid: false, fee: 0, label: 'Informe um CEP valido.', method: 'standard' };
  }

  if (Number(subtotal || 0) >= 199) {
    return { valid: true, fee: 0, label: 'Frete gratis', method: 'free' };
  }

  const prefix = Number(digits.slice(0, 2));
  if (prefix >= 1 && prefix <= 19) return { valid: true, fee: 14.9, label: 'Entrega Sudeste', method: 'standard' };
  if (prefix >= 20 && prefix <= 39) return { valid: true, fee: 17.9, label: 'Entrega Sudeste', method: 'standard' };
  if (prefix >= 80 && prefix <= 99) return { valid: true, fee: 19.9, label: 'Entrega Sul', method: 'standard' };
  if (prefix >= 70 && prefix <= 79) return { valid: true, fee: 21.9, label: 'Entrega Centro-Oeste', method: 'standard' };
  if (prefix >= 40 && prefix <= 69) return { valid: true, fee: 24.9, label: 'Entrega Norte/Nordeste', method: 'standard' };
  return { valid: true, fee: 22.9, label: 'Entrega nacional', method: 'standard' };
}

module.exports = {
  calculateShipping
};
