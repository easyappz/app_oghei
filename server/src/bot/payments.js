'use strict';

// Utilities for Telegram Payments prices handling
// Note: keep all names in English; validate strictly to avoid Telegram JSON parse errors

function toMinorUnitsRub(priceRub) {
  const n = Number(priceRub);
  if (!Number.isFinite(n)) throw new Error('priceRub must be a finite number');
  const cents = Math.round(n * 100);
  if (!Number.isInteger(cents) || cents <= 0) {
    throw new Error('price in minor units must be a positive integer');
  }
  return cents;
}

function normalizeLabel(label) {
  const s = String(label ?? '').trim();
  if (s.length === 0) return s;
  // Telegram requires 1..32 characters
  return s.length > 32 ? s.slice(0, 32) : s;
}

// Build [{ label, amount }] from product config
function buildLabeledPricesFromProduct(product) {
  if (!product || typeof product !== 'object') {
    throw new Error('product must be an object');
  }
  const label = normalizeLabel(product.title);
  const amount = toMinorUnitsRub(product.priceRub);
  return [{ label, amount }];
}

// Strict validation for Telegram prices
function validateTelegramPrices(prices) {
  if (!Array.isArray(prices)) {
    throw new Error('prices must be an array');
  }
  if (prices.length === 0) {
    throw new Error('prices must be a non-empty array');
  }
  for (let i = 0; i < prices.length; i += 1) {
    const p = prices[i];
    if (!p || typeof p !== 'object' || Array.isArray(p)) {
      throw new Error(`prices[${i}] must be an object`);
    }
    const keys = Object.keys(p);
    const allowed = ['label', 'amount'];
    const extra = keys.filter((k) => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`prices[${i}] contains unknown keys: ${extra.join(', ')}`);
    }

    if (typeof p.label !== 'string' || p.label.trim().length === 0) {
      throw new Error(`prices[${i}].label must be a non-empty string`);
    }
    if (p.label.trim().length > 32) {
      throw new Error(`prices[${i}].label length must be <= 32 characters`);
    }

    if (typeof p.amount !== 'number' || !Number.isFinite(p.amount) || !Number.isInteger(p.amount)) {
      throw new Error(`prices[${i}].amount must be an integer`);
    }
    if (p.amount <= 0) {
      throw new Error(`prices[${i}].amount must be > 0`);
    }
  }
  return true;
}

function stringifyPrices(prices) {
  try {
    return JSON.stringify(prices);
  } catch (e) {
    throw new Error(`Failed to stringify prices: ${e.message}`);
  }
}

module.exports = {
  buildLabeledPricesFromProduct,
  validateTelegramPrices,
  stringifyPrices,
};
