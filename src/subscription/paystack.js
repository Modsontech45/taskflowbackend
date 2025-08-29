// routes/paystack.js
const express = require("express");
const router = express.Router();
const { prisma } = require("../config/prisma");
const paystack = require("../utils/paystack");

router.post("/callback", async (req, res) => {
  const event = req.body;

  // Validate webhook signature if needed

  if (event.event === "charge.success") {
    const email = event.data.customer.email;
    const subscription = await prisma.subscription.findFirst({
      where: { user: { email } },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          nextBillingDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        },
      });
    }
  }

  res.sendStatus(200);
});

module.exports = router;
