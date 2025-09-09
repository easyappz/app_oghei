const express = require('express');
const { sendInvoiceToChat, getProduct, getPricesPreview, testTelegramInvoice, telegramHealth, getTelegramMeta } = require('@src/controllers/payments');

const router = express.Router();

// GET /api/hello
router.get('/hello', async (req, res) => {
  try {
    res.json({ message: 'Hello from API!' });
  } catch (err) {
    res.status(500).json({ error: err.message, details: err?.stack || null });
  }
});

// GET /api/status
router.get('/status', async (req, res) => {
  try {
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message, details: err?.stack || null });
  }
});

// Payments
router.get('/payments/product', async (req, res) => {
  try {
    await getProduct(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message, details: err?.stack || null });
  }
});

router.get('/payments/prices-preview', async (req, res) => {
  try {
    await getPricesPreview(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message, details: err?.stack || null });
  }
});

router.post('/payments/invoice', async (req, res) => {
  try {
    await sendInvoiceToChat(req, res);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, details: err?.stack || null });
  }
});

// New diagnostics routes
router.post('/payments/telegram/invoice/test', async (req, res) => {
  try {
    await testTelegramInvoice(req, res);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, details: err?.stack || null });
  }
});

router.get('/payments/telegram/health', async (req, res) => {
  try {
    await telegramHealth(req, res);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, details: err?.stack || null });
  }
});

// New: Telegram bot metadata for frontend
router.get('/payments/telegram/meta', async (req, res) => {
  try {
    await getTelegramMeta(req, res);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, details: err?.stack || null });
  }
});

module.exports = router;
