const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // true for 465, false for 587
  auth: { 
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS 
  },
});

async function sendMail({ to, subject, html }) {
  const info = await transporter.sendMail({
    from: process.env.FROM_EMAIL, // <-- use FROM_EMAIL as in your .env
    to,
    subject,
    html,
  });

  console.log('📧 Email sent:', info.messageId);
  return info;
}

module.exports = { sendMail };
