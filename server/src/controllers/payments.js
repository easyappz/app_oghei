const bot = require('@src/bot/telegramBot');

const PRODUCT = {
  id: 'arabic_course_001',
  title: 'Арабский курс',
  description: 'Интенсивный онлайн‑курс арабского языка для начинающих.',
  currency: 'RUB',
  price: 5500,
  labeledPrices: [{ label: 'Арабский курс', amount: 550000 }],
  payload: 'arabic_course_001',
  startParameter: 'buy_arabic_course',
  providerToken: '381764678:TEST:140649',
};

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

    const tgResponse = await bot.sendInvoice(
      numericChatId,
      PRODUCT.title,
      PRODUCT.description,
      PRODUCT.payload,
      PRODUCT.providerToken,
      PRODUCT.startParameter,
      PRODUCT.currency,
      PRODUCT.labeledPrices
    );

    return res.status(200).json({ ok: true, data: tgResponse });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err),
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
      price: PRODUCT.price,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}

module.exports = { sendInvoiceToChat, getProduct };
