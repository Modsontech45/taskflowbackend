const nodemailer = require("nodemailer");

const port = Number(process.env.SMTP_PORT || 465);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.resend.com",
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER || "resend",
    pass: process.env.SMTP_PASS || process.env.RESEND_API_KEY,
  },
});

async function sendMail({ to, subject, html }) {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.FROM_EMAIL,
    to,
    subject,
    html,
  });

  console.log("📧 Email sent:", info.messageId);
  return info;
}

module.exports = { sendMail };
