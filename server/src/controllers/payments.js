const { bot, sendInvoiceSafe } = require('@src/bot/telegramBot');
const { PRODUCT } = require('@src/config/product');
const { buildLabeledPricesFromProduct, stringifyPrices } = require('@src/bot/payments');

function maskProviderToken(token) {
  if (!token || typeof token !== 'string') return '';
  const len = token.length;
  if (len <= 10) return '***masked***';
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function safeJSONStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (_) {
    return '[unserializable]';
  }
}

function deepCleanJSON(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
}

async function sendInvoiceToChat(req, res) {
  try {
    const { chatId } = req.body || {};
    const numericChatId = Math.trunc(Number(chatId));

    if (!numericChatId || !Number.isFinite(numericChatId) || numericChatId <= 0) {
      return res.status(400).json({
        ok: false,
        error: 'chatId is required and must be a number > 0',
      });
    }

    const args = {
      chatId: numericChatId,
      title: PRODUCT.title,
      description: PRODUCT.description,
      payload: PRODUCT.payload,
      providerToken: PRODUCT.providerToken,
      startParameter: PRODUCT.startParameter,
      currency: PRODUCT.currency,
    };

    try {
      const result = await sendInvoiceSafe(bot, args);
      if (result.ok) {
        return res.status(200).json({ ok: true, data: result.data });
      }
      return res.status(500).json({ ok: false, error: 'Unknown error', details: result });
    } catch (sendErr) {
      const details = sendErr?.responseBody || sendErr?.response?.body || sendErr?.response?.data || sendErr?.stack || null;
      return res.status(500).json({
        ok: false,
        error: sendErr?.message || String(sendErr),
        details,
      });
    }
  } catch (err) {
    const details = err?.response?.body || err?.response?.data || err?.response || err?.stack || null;
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err),
      details,
    });
  }
}

async function getProduct(req, res) {
  try {
    return res.status(200).json({
      id: PRODUCT.id,
      title: PRODUCT.title,
      description: PRODUCT.description,
      currency: PRODUCT.currency,
      price: PRODUCT.priceRub,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err), details: err?.stack || null });
  }
}

async function getPricesPreview(req, res) {
  try {
    const built = buildLabeledPricesFromProduct(PRODUCT);
    const prices = deepCleanJSON(built);

    const payload = {
      currency: PRODUCT.currency,
      prices,
      rawJSON: safeJSONStringify(prices),
      valid: true,
    };

    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({
      error: err?.message || String(err),
      details: err?.stack || null,
    });
  }
}

// New: diagnostics and manual test endpoints
async function testTelegramInvoice(req, res) {
  try {
    const { chatId } = req.body || {};
    const numericChatId = Math.trunc(Number(chatId));

    if (!numericChatId || !Number.isFinite(numericChatId) || numericChatId <= 0) {
      return res.status(400).json({ ok: false, error: 'chatId is required and must be a number > 0' });
    }

    const args = {
      chatId: numericChatId,
      title: PRODUCT.title,
      description: PRODUCT.description,
      payload: PRODUCT.payload,
      providerToken: PRODUCT.providerToken,
      startParameter: PRODUCT.startParameter,
      currency: PRODUCT.currency,
    };

    const result = await sendInvoiceSafe(bot, args);
    return res.status(200).json(result);
  } catch (err) {
    const details = err?.responseBody || err?.response?.body || err?.response?.data || err?.stack || null;
    return res.status(500).json({ ok: false, error: err?.message || String(err), details });
  }
}

async function telegramHealth(req, res) {
  try {
    const prices = buildLabeledPricesFromProduct(PRODUCT);
    const priceMinor = prices[0]?.amount || null;
    const providerTokenMasked = maskProviderToken(PRODUCT.providerToken);

    return res.status(200).json({
      currency: PRODUCT.currency,
      providerTokenMasked,
      priceMinor,
      pricesPreview: stringifyPrices(prices),
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err), details: err?.stack || null });
  }
}

module.exports = { sendInvoiceToChat, getProduct, getPricesPreview, testTelegramInvoice, telegramHealth };
