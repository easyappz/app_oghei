const bot = require('@src/bot/telegramBot');
const { PRODUCT, buildPrices, validatePrices } = require('@src/config/product');

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

async function sendInvoiceToChat(req, res) {
  try {
    const { chatId } = req.body || {};
    const numericChatId = Number(chatId);

    if (!numericChatId || !Number.isFinite(numericChatId) || numericChatId <= 0) {
      return res.status(400).json({
        ok: false,
        error: 'chatId is required and must be a number > 0',
      });
    }

    const prices = buildPrices();
    validatePrices(prices);

    console.log('API /payments/invoice -> sending invoice with params:', {
      chatId: numericChatId,
      currency: PRODUCT.currency,
      providerTokenMasked: maskProviderToken(PRODUCT.providerToken),
      pricesType: typeof prices,
      pricesJSON: safeJSONStringify(prices),
    });

    const tgResponse = await bot.sendInvoice(
      numericChatId,
      PRODUCT.title,
      PRODUCT.description,
      PRODUCT.payload,
      PRODUCT.providerToken,
      PRODUCT.startParameter,
      PRODUCT.currency,
      prices
    );

    return res.status(200).json({ ok: true, data: tgResponse });
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
    return res.status(500).json({ error: err?.message || String(err) });
  }
}

module.exports = { sendInvoiceToChat, getProduct };
