const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios'); // Added for HTTP fallback to Telegram API
const Payment = require('@src/models/Payment');
const { PRODUCT } = require('@src/config/product');
const { buildLabeledPricesFromProduct, validateTelegramPrices, stringifyPrices } = require('@src/bot/payments');

// Constants (no .env as requested)
const BOT_TOKEN = '7443123336:AAEY0axnHAS12fYJnV-JdAp_lYDuRDL1Swo';

const isDev = process.env.NODE_ENV !== 'production';

// Initialize bot with polling in dev
const bot = new TelegramBot(BOT_TOKEN, { polling: isDev });

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

async function sendInvoiceSafe(botInstance, args) {
  const {
    chatId,
    title,
    description,
    payload,
    providerToken,
    startParameter,
    currency,
  } = args || {};

  if (!chatId) {
    throw new Error('chatId is required');
  }

  // Build and validate prices from product configuration only
  const pricesBuilt = buildLabeledPricesFromProduct(PRODUCT);
  validateTelegramPrices(pricesBuilt);
  const prices = deepCleanJSON(pricesBuilt);
  validateTelegramPrices(prices);

  // Log parameters (mask provider token)
  const providerTokenMasked = maskProviderToken(providerToken);
  console.log('[sendInvoiceSafe] Attempt 1 (library) ->', {
    chatId,
    currency,
    providerTokenMasked,
    pricesArrayLength: Array.isArray(prices) ? prices.length : 'n/a',
    pricesType: typeof prices,
    pricesJSON: safeJSONStringify(prices),
    fieldTypes: {
      chatId: typeof chatId,
      title: typeof title,
      description: typeof description,
      payload: typeof payload,
      providerToken: typeof providerToken,
      startParameter: typeof startParameter,
      currency: typeof currency,
      prices: Array.isArray(prices) ? 'array' : typeof prices,
    },
  });

  try {
    // Never pass a string here. Library expects an array of objects.
    const result = await botInstance.sendInvoice(
      chatId,
      title,
      description,
      payload,
      providerToken,
      startParameter,
      currency,
      prices
    );
    return { ok: true, data: result };
  } catch (err) {
    const msg = err?.message || String(err);
    const body = err?.response?.body || null;
    console.error('[sendInvoiceSafe] Library sendInvoice error:', msg);
    if (body) console.error('[sendInvoiceSafe] Telegram response body:', body);

    const isParseError = /can\'t parse prices JSON object|can't parse prices JSON object/i.test(msg) || /can't parse prices JSON object/i.test(String(body || ''));

    if (!isParseError) {
      // Not a parse error, propagate enriched
      throw Object.assign(new Error(msg), { responseBody: body });
    }

    // Fallback: direct HTTP call with x-www-form-urlencoded and explicit JSON.stringify for prices
    const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendInvoice`;
    const encoded = new URLSearchParams();
    encoded.append('chat_id', String(chatId));
    encoded.append('title', String(title));
    encoded.append('description', String(description));
    encoded.append('payload', String(payload));
    encoded.append('provider_token', String(providerToken));
    encoded.append('start_parameter', String(startParameter));
    encoded.append('currency', String(currency));
    encoded.append('prices', stringifyPrices(prices));

    console.warn('[sendInvoiceSafe] Attempt 2 (HTTP fallback) ->', {
      chatId,
      currency,
      providerTokenMasked,
      pricesArrayLength: prices.length,
      pricesJSON: stringifyPrices(prices),
      contentType: 'application/x-www-form-urlencoded',
      url: apiUrl.replace(BOT_TOKEN, '***masked***'),
    });

    try {
      const { data } = await axios.post(apiUrl, encoded.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      });
      // Telegram returns { ok: boolean, result?: object, description?: string }
      if (data && data.ok) {
        return { ok: true, data: data.result };
      }
      const description = data?.description || 'Unknown Telegram error';
      const httpErr = new Error(`Telegram HTTP fallback error: ${description}`);
      httpErr.telegram = data;
      throw httpErr;
    } catch (httpErr) {
      const httpBody = httpErr?.response?.data || httpErr?.telegram || null;
      console.error('[sendInvoiceSafe] HTTP fallback error:', httpErr?.message || String(httpErr));
      if (httpBody) console.error('[sendInvoiceSafe] HTTP fallback response body:', httpBody);
      throw Object.assign(new Error(httpErr?.message || 'HTTP fallback failed'), { responseBody: httpBody });
    }
  }
}

// /start command
bot.onText(/^\/start$/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const welcome = [
      'Привет! Это оплата за "Арабский курс" (5500 ₽).',
      'Чтобы оформить покупку, отправьте сообщение: Купить'
    ].join('\n');
    await bot.sendMessage(chatId, welcome);
  } catch (err) {
    console.error('Error in /start handler:', err?.message || err);
  }
});

// Handle messages: "Купить" and successful payments
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat?.id;

    // Exact match "Купить"
    if (msg.text && msg.text.trim() === 'Купить') {
      const args = {
        chatId,
        title: PRODUCT.title,
        description: PRODUCT.description,
        payload: PRODUCT.payload,
        providerToken: PRODUCT.providerToken,
        startParameter: PRODUCT.startParameter,
        currency: PRODUCT.currency,
      };

      try {
        const result = await sendInvoiceSafe(bot, args);
        if (!result.ok) {
          console.error('sendInvoiceSafe returned not ok in bot handler:', result);
        }
      } catch (sendErr) {
        console.error('sendInvoiceSafe error (bot handler):', sendErr?.message || sendErr);
        const body = sendErr?.responseBody || sendErr?.response?.body || null;
        if (body) console.error('Telegram error body:', body);
      }
      return;
    }

    // Successful payment
    if (msg.successful_payment) {
      const sp = msg.successful_payment;

      // Save payment to DB (if DB is connected)
      try {
        const payment = new Payment({
          chatId: chatId,
          currency: sp.currency,
          totalAmount: sp.total_amount,
          invoicePayload: sp.invoice_payload,
          telegramPaymentChargeId: sp.telegram_payment_charge_id,
          providerPaymentChargeId: sp.provider_payment_charge_id,
          status: 'paid',
        });
        await payment.save();
      } catch (saveErr) {
        console.error('Payment save error:', saveErr?.message || saveErr);
      }

      // Notify user
      try {
        await bot.sendMessage(chatId, 'Оплата успешно получена! Спасибо. Доступ к курсу будет предоставлен в ближайшее время.');
      } catch (sendErr) {
        console.error('Send confirmation error:', sendErr?.message || sendErr);
      }
    }
  } catch (err) {
    console.error('Error in message handler:', err?.message || err, err?.response?.body || '');
  }
});

// Pre-checkout confirmation
bot.on('pre_checkout_query', async (query) => {
  try {
    await bot.answerPreCheckoutQuery(query.id, true);
  } catch (err) {
    console.error('answerPreCheckoutQuery error:', err?.message || err);
  }
});

module.exports = { bot, sendInvoiceSafe };
