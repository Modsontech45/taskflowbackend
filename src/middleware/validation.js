const Joi = require('joi');

// Subscription validation schemas
const subscriptionSchemas = {
  create: Joi.object({
    plan: Joi.string().valid('BASIC', 'TEAM').required(),
  }),
  update: Joi.object({
    memberCount: Joi.number().integer().min(0).optional(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'CANCELLED', 'TRIAL').optional(),
  }),
};

// Payment validation schemas
const paymentSchemas = {
  initialize: Joi.object({
    subscriptionId: Joi.string().uuid().required(),
    email: Joi.string().email().required(),
  }),
  verify: Joi.object({
    reference: Joi.string().required(),
  }),
};

// Generic validation middleware
function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details.map(detail => detail.message),
      });
    }
    next();
  };
}

const validateSubscription = {
  create: validate(subscriptionSchemas.create),
  update: validate(subscriptionSchemas.update),
};

const validatePayment = {
  initialize: validate(paymentSchemas.initialize),
  verify: validate(paymentSchemas.verify),
};

module.exports = { validateSubscription, validatePayment };
