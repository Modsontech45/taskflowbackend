const { subscriptionService } = require('../services/subscriptionService.js');
const { paymentService } = require('../services/paymentService.js');

const subscriptionController = {
  // Get user subscription
  async getSubscription(req, res, next) {
    try {
      const { userId } = req.params;

      // Ensure user can only access their own subscription
      if (req.user.id !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const subscription = await subscriptionService.getUserSubscription(userId);

      if (!subscription) {
        return res.status(404).json({ message: 'No subscription found' });
      }

      res.json(subscription);
    } catch (error) {
      next(error);
    }
  },

  // Create new subscription
  async createSubscription(req, res, next) {
    try {
      const { plan } = req.body;
      const userId = req.user.id;

      // Check if user already has a subscription
      const existingSubscription = await subscriptionService.getUserSubscription(userId);
      if (existingSubscription) {
        return res.status(400).json({ message: 'User already has a subscription' });
      }

      // Create subscription with trial period
      const subscription = await subscriptionService.createSubscription(userId, plan);

      res.status(201).json(subscription);
    } catch (error) {
      next(error);
    }
  },

  // Update subscription
  async updateSubscription(req, res, next) {
    try {
      const { userId } = req.params;
      const updates = req.body;

      // Ensure user can only update their own subscription
      if (req.user.id !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const subscription = await subscriptionService.updateSubscription(userId, updates);

      if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      res.json(subscription);
    } catch (error) {
      next(error);
    }
  },

  // Cancel subscription
  async cancelSubscription(req, res, next) {
    try {
      const { userId } = req.params;

      // Ensure user can only cancel their own subscription
      if (req.user.id !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const subscription = await subscriptionService.cancelSubscription(userId);

      if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      // Cancel recurring payment if exists
      if (subscription.paystackCustomerId) {
        await paymentService.cancelRecurringPayment(subscription.paystackCustomerId);
      }

      res.json(subscription);
    } catch (error) {
      next(error);
    }
  },

  // Get pricing information
  async getPricing(req, res, next) {
    try {
      const pricing = subscriptionService.getPricingInfo();
      res.json(pricing);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = { subscriptionController };
