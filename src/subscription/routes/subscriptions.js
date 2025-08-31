const express = require('express');
const { subscriptionController } = require('../controllers/subscriptionController');
const {   requireAuth } = require('../../middleware/auth.js');
const { validateSubscription } = require('../../middleware/validation');

const router = express.Router();

// Get user subscription
router.get('/:userId',   requireAuth(), subscriptionController.getSubscription);

// Create new subscription
router.post('/',   requireAuth(), validateSubscription.create, subscriptionController.createSubscription);

// Update subscription
router.patch('/:userId',   requireAuth(), validateSubscription.update, subscriptionController.updateSubscription);

// Cancel subscription
router.delete('/:userId',   requireAuth(), subscriptionController.cancelSubscription);

// Get subscription pricing
router.get('/pricing/info', subscriptionController.getPricing);

module.exports = router;
