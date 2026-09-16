const axios = require("axios");

async function sendMail({ to, subject, html }) {
  const response = await axios.post(
    "https://api.resend.com/emails",
    {
      from: process.env.EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log("📧 Email sent via Resend:", response.data.id);
  return response.data;
}

module.exports = { sendMail };
