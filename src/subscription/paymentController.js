// controllers/paymentController.js
const { prisma } = require("../config/prisma");
const Paystack = require("paystack-node");
const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY);

exports.chargeSubscription = async (req, res) => {
  const { subscriptionId, email, amount } = req.body;

  try {
    const response = await paystack.transaction.initialize({
      email,
      amount: amount * 100, // Paystack expects kobo
      callback_url: "https://yourdomain.com/paystack/callback",
    });

    // response.data.authorization_url -> redirect user to Paystack checkout
    res.json({ url: response.data.authorization_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Payment initialization failed" });
  }
};
