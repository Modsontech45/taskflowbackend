const prisma = require('../../config/prisma');
const bcrypt = require('bcryptjs');
//const { addHours, addDays } = require("date-fns");
const { randomToken, addHours, signJWT } = require('../../utils/tokens');
const { sendMail } = require('../../config/mailer');
const paystack = require('../../utils/paystack'); // your Paystack client
const APP_URL = process.env.APP_URL;

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, country, phone, email, password } = req.body;

    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // ✅ Create Paystack customer
    const paystackCustomer = await paystack.customer.create({
      email,
      first_name: firstName,
      last_name: lastName,
    });
    const paystackCustomerId = paystackCustomer.data.customer_code;

    // ✅ Create user + trial subscription
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        country,
        phone,
        email,
        password: hashed,
        subscription: {
          create: {
            plan: "BASIC",
            status: "TRIAL",
            memberCount: 0,
            monthlyPrice: 1.0, // set normal price for future billing
            trialEndsAt: addDays(new Date(), 7), // 7-day free trial
            nextBillingDate: addDays(new Date(), 7), // first billing after trial
            paystackCustomerId,
          },
        },
      },
      include: { subscription: true },
    });

    // Generate email verification token
    const token = randomToken();
    await prisma.verificationToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: addHours(new Date(), 24),
      },
    });

    // Send email
    const link = `${APP_URL}/verify-email?token=${token}`;
    await sendMail({
      to: email,
      subject: "Verify your email",
      html: `
        <p>Hello ${firstName},</p>
        <p>Verify your account: <a href="${link}">Activate</a></p>
        <p>This link expires in 24 hours.</p>
      `,
    });

    console.log("📧 Verification link (dev):", link);

    return res.status(201).json({ message: "Registered. Check your email to verify." });
  } catch (err) {
    console.error("❌ Register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Missing token' });

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) return res.status(400).json({ message: 'Invalid token' });
  if (record.usedAt) return res.status(400).json({ message: 'Token already used' });
  if (record.expiresAt < new Date()) return res.status(400).json({ message: 'Token expired' });

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.verificationToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);

  return res.json({ message: 'Email verified. You can now log in.' });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  if (!user.emailVerifiedAt) return res.status(403).json({ message: 'Email not verified' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = signJWT({ sub: user.id });
  return res.json({ token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const user = await prisma.user.findUnique({ where: { email } });
  // Return 200 regardless to avoid email enumeration
  if (!user) return res.json({ message: 'If your email exists, you will receive a link.' });

  const token = randomToken();
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: addHours(new Date(), 2),
    },
  });

  const link = `${APP_URL}/reset-password?token=${token}`;
  await sendMail({
    to: email,
    subject: 'Reset your password',
    html: `<p>Reset your password:</p><p><a href="${link}">Reset Link</a> (valid 2 hours)</p>`,
  });
  console.log('Password reset link (dev):', link);

  return res.json({ message: 'If your email exists, you will receive a link.' });
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record) return res.status(400).json({ message: 'Invalid token' });
  if (record.usedAt) return res.status(400).json({ message: 'Token already used' });
  if (record.expiresAt < new Date()) return res.status(400).json({ message: 'Token expired' });

  const hashed = await require('bcryptjs').hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);

  return res.json({ message: 'Password updated successfully.' });
};
