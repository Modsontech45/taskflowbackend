const { paymentService } = require('../services/paymentService.js');
const { subscriptionService } = require('../services/subscriptionService.js');
const { emailService } = require('../services/emailService.js');
const crypto = require('crypto');

const paymentController = {
  // Initialize payment for subscription
  async initializePayment(req, res, next) {
    try {
      const { subscriptionId, email } = req.body;
      const userId = req.user.id;

      // Get subscription details
      const subscription = await subscriptionService.getSubscriptionById(subscriptionId);
      if (!subscription || subscription.userId !== userId) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      // Initialize payment with Paystack
      const paymentData = await paymentService.initializePayment({
        email,
        amount: subscription.monthlyPrice,
        subscriptionId,
        userId,
        plan: subscription.plan,
      });

      res.json(paymentData);
    } catch (error) {
      next(error);
    }
  },

  // Verify payment
  async verifyPayment(req, res, next) {
    try {
      const { reference } = req.body;
      const userId = req.user.id;

      const verification = await paymentService.verifyPayment(reference, userId);

      if (verification.success) {
        // Update subscription status
        await subscriptionService.activateSubscription(verification.subscriptionId);

        // Send confirmation email
        await emailService.sendPaymentConfirmation(
          req.user.email,
          req.user.firstName,
          verification.amount,
          verification.plan
        );
      }

      res.json(verification);
    } catch (error) {
      next(error);
    }
  },

  // Handle Paystack webhook
  async handlePaystackWebhook(req, res, next) {
    try {
      const hash = crypto
        .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        return res.status(400).json({ message: 'Invalid signature' });
      }

      const event = req.body;
      console.log('📧 Paystack webhook received:', event.event);

      switch (event.event) {
        case 'charge.success':
          await paymentService.handleSuccessfulPayment(event.data);
          break;
        case 'subscription.create':
          await paymentService.handleSubscriptionCreated(event.data);
          break;
        case 'subscription.disable':
          await paymentService.handleSubscriptionCancelled(event.data);
          break;
        case 'invoice.create':
          await paymentService.handleInvoiceCreated(event.data);
          break;
        default:
          console.log('🔄 Unhandled webhook event:', event.event);
      }

      res.status(200).json({ message: 'Webhook processed' });
    } catch (error) {
      console.error('❌ Webhook error:', error);
      next(error);
    }
  },

  // Get payment history
  async getPaymentHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const history = await paymentService.getPaymentHistory(userId);
      res.json(history);
    } catch (error) {
      next(error);
    }
  },

  // Cancel subscription payment
  async cancelSubscription(req, res, next) {
    try {
      const userId = req.user.id;
      const subscription = await subscriptionService.getUserSubscription(userId);

      if (!subscription) {
        return res.status(404).json({ message: 'No active subscription found' });
      }

      if (subscription.paystackCustomerId) {
        await paymentService.cancelRecurringPayment(subscription.paystackCustomerId);
      }

      await subscriptionService.cancelSubscription(userId);

      res.json({ message: 'Subscription cancelled successfully' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = { paymentController };
