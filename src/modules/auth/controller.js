
require('dotenv').config();
const APP_URL = process.env.APP_URL;
const pool = require("../../config/db");
const bcrypt = require("bcryptjs");
const { randomToken, addHours, signJWT } = require("../../utils/tokens");
const { sendMail } = require("../../config/mailer");
// ---------------- REGISTER ----------------
const register = async (req, res) => {
  const { firstName, lastName, country, phone, email, password } = req.body;

  try {
    // Check if email exists
    const existing = await pool.query(
      'SELECT * FROM "User" WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Insert user
    const userResult = await pool.query(
      `INSERT INTO "User" (id, "firstName", "lastName", country, phone, email, password, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
      [firstName, lastName, country, phone, email, hashed]
    );
    const user = userResult.rows[0];

    // Create verification token
    const token = randomToken();
    await pool.query(
      `INSERT INTO "VerificationToken" (id, token, "userId", type, "expiresAt", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
      [token, user.id, "EMAIL_VERIFICATION", addHours(new Date(), 24)]
    );

    // Send verification email
    const link = `${APP_URL}/verify-email?token=${token}`;
    await sendMail({
      to: email,
      subject: "Verify your email",
      html: `<p>Hello ${firstName},</p>
             <p>Verify your account: <a href="${link}">Activate</a></p>
             <p>This link expires in 24 hours.</p>`,
    });

    console.log("Verification link (dev):", link);
    return res.status(201).json({ message: "Registered. Check your email to verify." });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ---------------- VERIFY EMAIL ----------------
const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: "Missing token" });

  try {
    const tokenResult = await pool.query(
      'SELECT * FROM "VerificationToken" WHERE token = $1',
      [token]
    );
    const record = tokenResult.rows[0];

    if (!record) return res.status(400).json({ message: "Invalid token" });
    if (record.usedAt) return res.status(400).json({ message: "Token already used" });
    if (new Date(record.expiresAt) < new Date())
      return res.status(400).json({ message: "Token expired" });

    // Transaction: update user and token
    await pool.query("BEGIN");
    await pool.query(
      'UPDATE "User" SET "emailVerifiedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1',
      [record.userId]
    );
    await pool.query(
      'UPDATE "VerificationToken" SET "usedAt" = NOW() WHERE token = $1',
      [token]
    );
    await pool.query("COMMIT");

    return res.json({ message: "Email verified. You can now log in." });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Verify email error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ---------------- LOGIN ----------------
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT * FROM "User" WHERE email = $1',
      [email]
    );
    const user = userResult.rows[0];

    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if (!user.emailVerifiedAt) return res.status(403).json({ message: "Email not verified" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signJWT({ sub: user.id });
    return res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ---------------- FORGOT PASSWORD ----------------
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const userResult = await pool.query(
      'SELECT * FROM "User" WHERE email = $1',
      [email]
    );
    const user = userResult.rows[0];

    if (!user)
      return res.json({ message: "If your email exists, you will receive a link." });

    const token = randomToken();
    await pool.query(
      `INSERT INTO "PasswordResetToken" (id, token, "userId", "expiresAt", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
      [token, user.id, addHours(new Date(), 2)]
    );

    const link = `${APP_URL}/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: "Reset your password",
      html: `<p>Reset your password:</p><p><a href="${link}">Reset Link</a> (valid 2 hours)</p>`,
    });
    console.log("Password reset link (dev):", link);

    return res.json({ message: "If your email exists, you will receive a link." });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ---------------- RESET PASSWORD ----------------
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8)
    return res.status(400).json({ message: "Invalid request" });

  try {
    const tokenResult = await pool.query(
      'SELECT * FROM "PasswordResetToken" WHERE token = $1',
      [token]
    );
    const record = tokenResult.rows[0];

    if (!record) return res.status(400).json({ message: "Invalid token" });
    if (record.usedAt) return res.status(400).json({ message: "Token already used" });
    if (new Date(record.expiresAt) < new Date())
      return res.status(400).json({ message: "Token expired" });

    const hashed = await bcrypt.hash(newPassword, 10);

    // Transaction: update password and mark token used
    await pool.query("BEGIN");
    await pool.query(
      'UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE id = $2',
      [hashed, record.userId]
    );
    await pool.query(
      'UPDATE "PasswordResetToken" SET "usedAt" = NOW() WHERE token = $1',
      [token]
    );
    await pool.query("COMMIT");

    return res.json({ message: "Password updated successfully." });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = { register, verifyEmail, login, forgotPassword, resetPassword };