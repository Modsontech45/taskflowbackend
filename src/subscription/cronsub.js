// cron/subscriptionRenewal.js
const cron = require("node-cron");
const { prisma } = require("../config/prisma");
const { addMonths } = require("date-fns");
const paystack = require("../utils/paystack");

cron.schedule("0 0 * * *", async () => {
  console.log("⏰ Running subscription renewal job...");

  const now = new Date();

  try {
    // 1️⃣ Activate trials
    await prisma.subscription.updateMany({
      where: { status: "TRIAL", trialEndsAt: { lte: now } },
      data: { status: "ACTIVE" },
    });

    // 2️⃣ Auto-renew ACTIVE subscriptions
    const activeSubs = await prisma.subscription.findMany({
      where: { status: "ACTIVE", nextBillingDate: { lte: now }, paystackCustomerId: { not: null } },
      include: { user: true },
    });

    for (const sub of activeSubs) {
      try {
        console.log(`💳 Charging subscription for ${sub.user.email}`);

        // Charge saved customer using Paystack
        const charge = await paystack.transaction.charge({
          email: sub.user.email,
          amount: sub.monthlyPrice * 100, // in kobo
          customer: sub.paystackCustomerId,
        });

        if (charge.status === "success") {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { nextBillingDate: addMonths(sub.nextBillingDate, 1) },
          });
          console.log(`✅ Successfully renewed ${sub.user.email}`);
        } else {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "PAST_DUE" },
          });
          console.log(`⚠️ Payment failed for ${sub.user.email}`);
        }
      } catch (err) {
        console.error("❌ Error charging subscription:", err);
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "PAST_DUE" },
        });
      }
    }
  } catch (err) {
    console.error("❌ Cron job failed:", err);
  }
});
