const TelegramBot = require('node-telegram-bot-api');
const Payment = require('@src/models/Payment');
const { PRODUCT, buildPrices, validatePrices } = require('@src/config/product');

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
      const prices = buildPrices();
      validatePrices(prices);

      console.log('Preparing to send invoice (bot handler):', {
        chatId,
        currency: PRODUCT.currency,
        providerTokenMasked: maskProviderToken(PRODUCT.providerToken),
        pricesType: typeof prices,
        pricesJSON: safeJSONStringify(prices),
      });

      await bot.sendInvoice(
        chatId,
        PRODUCT.title,
        PRODUCT.description,
        PRODUCT.payload,
        PRODUCT.providerToken,
        PRODUCT.startParameter,
        PRODUCT.currency,
        prices
      );
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

module.exports = bot;
