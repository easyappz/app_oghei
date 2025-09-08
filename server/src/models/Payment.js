const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  currency: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  invoicePayload: { type: String, required: true },
  telegramPaymentChargeId: { type: String, required: true },
  providerPaymentChargeId: { type: String, required: true },
  status: { type: String, default: 'paid' },
  createdAt: { type: Date, default: Date.now },
});

const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = Payment;
