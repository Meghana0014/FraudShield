require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const { initializeDatabase } = require('./database/database');
const { analyzeTransaction } = require('./ai/fraudAgent');
const { saveTransactionEntry, getTransactions, getDashboardStats } = require('./services/transactionService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
  : null;

function validateTransactionInput(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Invalid request body.'] };
  }

  if (!body.amount || Number(body.amount) <= 0 || Number.isNaN(Number(body.amount))) {
    errors.push('Amount must be a positive number.');
  }

  if (!body.recipient || String(body.recipient).trim().length < 2) {
    errors.push('Recipient name is required.');
  }

  const validRecipientStatus = ['known', 'new'];
  if (!body.recipientStatus || !validRecipientStatus.includes(String(body.recipientStatus).toLowerCase())) {
    errors.push('Recipient status must be known or new.');
  }

  const validMethods = ['upi', 'card', 'net banking'];
  if (!body.paymentMethod || !validMethods.includes(String(body.paymentMethod).toLowerCase())) {
    errors.push('Payment method must be UPI, Card, or Net Banking.');
  }

  const validFrequencies = ['normal', 'frequent', 'very frequent'];
  if (!body.transactionFrequency || !validFrequencies.includes(String(body.transactionFrequency).toLowerCase())) {
    errors.push('Transaction frequency must be normal, frequent, or very frequent.');
  }

  const validDevices = ['known', 'new'];
  if (!body.deviceStatus || !validDevices.includes(String(body.deviceStatus).toLowerCase())) {
    errors.push('Device status must be known or new.');
  }

  const validLocations = ['normal', 'unusual'];
  if (!body.locationStatus || !validLocations.includes(String(body.locationStatus).toLowerCase())) {
    errors.push('Location status must be normal or unusual.');
  }

  return { valid: errors.length === 0, errors };
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/analyze', async (req, res) => {
  const validation = validateTransactionInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: 'Invalid request', errors: validation.errors });
  }

  try {
    const result = await analyzeTransaction({
      amount: Number(req.body.amount),
      recipient: req.body.recipient,
      recipientStatus: String(req.body.recipientStatus).toLowerCase(),
      paymentMethod: String(req.body.paymentMethod).toLowerCase(),
      transactionFrequency: String(req.body.transactionFrequency).toLowerCase(),
      deviceStatus: String(req.body.deviceStatus).toLowerCase(),
      locationStatus: String(req.body.locationStatus).toLowerCase()
    });

    const status = result.risk.level === 'LOW' ? 'SAFE' : result.risk.level === 'MEDIUM' ? 'VERIFICATION' : 'BLOCKED';

    await saveTransactionEntry({
      recipient: req.body.recipient,
      amount: Number(req.body.amount),
      recipientStatus: String(req.body.recipientStatus).toLowerCase(),
      paymentMethod: String(req.body.paymentMethod).toLowerCase(),
      transactionFrequency: String(req.body.transactionFrequency).toLowerCase(),
      deviceStatus: String(req.body.deviceStatus).toLowerCase(),
      locationStatus: String(req.body.locationStatus).toLowerCase()
    }, result);

    res.json({
      success: true,
      decision: result.decision,
      paymentStatus: status,
      risk: result.risk,
      aiUsed: result.aiUsed
    });
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ success: false, message: 'Unable to analyze transaction. Please try again.', error: error.message });
  }
});

app.post('/api/verify', (req, res) => {
  const { verificationType, recipient, amount } = req.body || {};

  if (!verificationType || !recipient || !amount) {
    return res.status(400).json({ success: false, message: 'Verification details are incomplete.' });
  }

  const valid = verificationType === 'demo' && String(recipient).trim().length > 0 && Number(amount) > 0;

  if (!valid) {
    return res.status(400).json({ success: false, message: 'Demo verification failed.' });
  }

  res.json({ success: true, message: 'Demo verification passed. Payment can continue for this test flow.' });
});

app.post('/api/payment/create-order', async (req, res) => {
  if (!razorpay) {
    return res.status(400).json({ success: false, message: 'Razorpay is not configured. Add keys to .env to enable test payments.' });
  }

  const { amount, currency, receipt } = req.body || {};

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'A valid amount is required.' });
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency: currency || 'INR',
      receipt: receipt || `fraudshield_${Date.now()}`,
      payment_capture: 1
    });

    res.json({ success: true, order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Razorpay order creation failed.', error: error.message });
  }
});

app.post('/api/payment/verify', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, expected_order_id } = req.body || {};

  if (!razorpay || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Payment verification data is incomplete.' });
  }

  const sign = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const isValid = sign === razorpay_signature && (!expected_order_id || expected_order_id === razorpay_order_id);

  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Payment verification failed.' });
  }

  res.json({ success: true, message: 'Payment verified successfully.', status: 'paid' });
});

app.get('/api/transactions', async (req, res) => {
  try {
    const result = await getTransactions();
    res.json({ success: true, transactions: result });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch transactions.' });
  }
});

app.get('/api/statistics', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Statistics fetch error:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch statistics.' });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`FraudShield server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });

module.exports = app;
