'use strict';

// Unified product configuration and helpers
const PRODUCT = {
  id: 'arabic_course_001',
  title: 'Арабский курс',
  description: 'Интенсивный онлайн‑курс арабского языка для начинающих.',
  currency: 'RUB',
  priceRub: 5500,
  payload: 'arabic_course_001',
  startParameter: 'buy_arabic_course',
  // Test provider token, kept inline as requested (no .env)
  providerToken: '381764678:TEST:140649',
};

function toMinorUnits(priceRub) {
  const n = Number(priceRub);
  const cents = Math.round(n * 100);
  return Number.isFinite(cents) ? cents : NaN;
}

function sanitizePrices(prices) {
  if (!Array.isArray(prices)) return [];
  const result = [];
  for (let i = 0; i < prices.length; i += 1) {
    const p = prices[i] || {};
    let label = '';
    try {
      label = String(p.label ?? '').trim();
    } catch (_) {
      label = '';
    }

    let amount = Number(p.amount);
    if (!Number.isFinite(amount)) {
      amount = NaN;
    }
    amount = Math.round(amount);

    // Return only allowed fields
    result.push({ label, amount });
  }
  return result;
}

function buildPrices() {
  const amount = toMinorUnits(PRODUCT.priceRub); // integer in minor units
  const raw = [
    { label: PRODUCT.title, amount }
  ];
  return sanitizePrices(raw);
}

function validatePrices(prices) {
  if (!Array.isArray(prices) || prices.length === 0) {
    throw new Error('prices must be a non-empty array');
  }
  for (let i = 0; i < prices.length; i += 1) {
    const p = prices[i];
    if (!p || typeof p !== 'object') {
      throw new Error(`prices[${i}] must be an object`);
    }
    const keys = Object.keys(p);
    const allowed = ['label', 'amount'];
    const hasOnlyAllowed = keys.every((k) => allowed.includes(k));
    if (!hasOnlyAllowed) {
      throw new Error(`prices[${i}] must contain only: label, amount`);
    }
    if (typeof p.label !== 'string' || p.label.trim().length === 0) {
      throw new Error(`prices[${i}].label must be a non-empty string`);
    }
    if (typeof p.amount !== 'number' || !Number.isFinite(p.amount) || !Number.isInteger(p.amount) || p.amount <= 0) {
      throw new Error(`prices[${i}].amount must be a positive integer in minor currency units`);
    }
  }
  return true;
}

module.exports = { PRODUCT, buildPrices, sanitizePrices, validatePrices };