const express = require('express');
const router = express.Router();
const ctrl = require('./controller');
const { z } = require('zod');

const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post('/register', validate(registerSchema), ctrl.register);
router.get('/verify-email', ctrl.verifyEmail); // ?token=...
router.post('/login', validate(loginSchema), ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword); // { token, newPassword }

function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() });
    }
    req.body = parsed.data;
    next();
  };
}

module.exports = router;
