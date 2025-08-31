const express = require('express');
const { paymentController } = require('../controllers/paymentContoler.js');
const { requireAuth } = require('../../middleware/auth.js');
const { validatePayment } = require('../../middleware/validation.js');

const router = express.Router();

// Initialize payment
router.post(
  '/initialize',
  requireAuth(),
  validatePayment.initialize,
  paymentController.initializePayment
);

// Verify payment
router.post(
  '/verify',
  requireAuth(),
  validatePayment.verify,
  paymentController.verifyPayment
);

// Paystack webhook (no auth required)
router.post(
  '/webhook/paystack',
  express.raw({ type: 'application/json' }),
  paymentController.handlePaystackWebhook
);

// Get payment history
router.get('/history', requireAuth(), paymentController.getPaymentHistory);

// Cancel subscription payment
router.post(
  '/cancel-subscription',
  requireAuth(),
  paymentController.cancelSubscription
);

module.exports = router;
