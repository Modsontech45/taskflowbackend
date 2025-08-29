// controllers/subscriptionController.js
const { prisma } = require("../config/prisma");
const { addDays, addMonths } = require("date-fns");

// GET subscription info
exports.getSubscription = async (req, res) => {
  const { userId } = req.params;
  try {
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });
    res.json(subscription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST create subscription (with 7-day trial)
exports.createSubscription = async (req, res) => {
  const { userId, plan } = req.body;
  try {
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        plan: plan || "BASIC",
        status: "TRIAL",
        memberCount: 0,
        monthlyPrice: plan === "BASIC" ? 0.0 : 10.0,
        trialEndsAt: addDays(new Date(), 7),
        nextBillingDate: addDays(new Date(), 7),
      },
    });
    res.status(201).json(subscription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH update subscription (plan, status, memberCount)
exports.updateSubscription = async (req, res) => {
  const { userId } = req.params;
  const { plan, status, memberCount } = req.body;
  try {
    const updated = await prisma.subscription.update({
      where: { userId },
      data: {
        ...(plan && { plan }),
        ...(status && { status }),
        ...(memberCount !== undefined && { memberCount }),
      },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// controllers/subscriptionController.js
exports.cancelSubscription = async (req, res) => {
  const { userId } = req.params;
  try {
    const updated = await prisma.subscription.update({
      where: { userId },
      data: { status: "CANCELED" },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

