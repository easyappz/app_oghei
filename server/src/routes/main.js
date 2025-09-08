const express = require('express');
const { sendInvoiceToChat, getProduct } = require('@src/controllers/payments');

const router = express.Router();

// GET /api/hello
router.get('/hello', async (req, res) => {
  try {
    res.json({ message: 'Hello from API!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// Payments
router.get('/payments/product', async (req, res) => {
  try {
    await getProduct(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/payments/invoice', async (req, res) => {
  try {
    await sendInvoiceToChat(req, res);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
