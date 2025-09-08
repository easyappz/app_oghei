const TelegramBot = require('node-telegram-bot-api');
const Payment = require('@src/models/Payment');

// Constants (no .env as requested)
const BOT_TOKEN = '7443123336:AAEY0axnHAS12fYJnV-JdAp_lYDuRDL1Swo';
const PROVIDER_TOKEN = '381764678:TEST:140649';

const isDev = process.env.NODE_ENV !== 'production';

// Initialize bot with polling in dev
const bot = new TelegramBot(BOT_TOKEN, { polling: isDev });

// Product definition
const PRODUCT = {
  title: 'Арабский курс',
  description: 'Онлайн-курс арабского языка: доступ сразу после оплаты. Безопасная оплата через ЮKassa.',
  currency: 'RUB',
  providerToken: PROVIDER_TOKEN,
  payload: 'arabic_course_001',
  prices: [{ label: 'Арабский курс', amount: 550000 }], // amount in kopecks
  startParameter: 'buy_arabic_course',
};

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
      await bot.sendInvoice(
        chatId,
        PRODUCT.title,
        PRODUCT.description,
        PRODUCT.payload,
        PRODUCT.providerToken,
        PRODUCT.startParameter,
        PRODUCT.currency,
        PRODUCT.prices
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
    console.error('Error in message handler:', err?.message || err);
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
