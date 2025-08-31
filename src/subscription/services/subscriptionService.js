const { PrismaClient } = require('@prisma/client');
const { addDays, addMonths } = require('date-fns');
const { emailService } = require('./emailService'); // Make sure path is correct
const { paymentService } = require('./paymentService'); // Make sure path is correct

const prisma = new PrismaClient();

const subscriptionService = {
  // Get pricing configuration
  getPricingInfo() {
    return {
      basicPrice: parseFloat(process.env.BASIC_PLAN_PRICE) || 2.0,
      memberPrice: parseFloat(process.env.MEMBER_PRICE) || 0.5,
      trialDays: parseInt(process.env.TRIAL_DAYS) || 14,
      currency: 'USD',
    };
  },

  // Calculate monthly price based on plan and member count
  calculateMonthlyPrice(plan, memberCount = 0) {
    const pricing = this.getPricingInfo();
    if (plan === 'BASIC') return pricing.basicPrice;
    if (plan === 'TEAM') return memberCount * pricing.memberPrice;
    return 0;
  },

  // Create new subscription with trial
  async createSubscription(userId, plan) {
    const pricing = this.getPricingInfo();
    const trialEndsAt = addDays(new Date(), pricing.trialDays);
    const monthlyPrice = this.calculateMonthlyPrice(plan, 0);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        plan,
        status: 'TRIAL',
        memberCount: 0,
        monthlyPrice,
        trialEndsAt,
        nextBillingDate: trialEndsAt,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    console.log(`✅ Created ${plan} subscription for user ${userId} with ${pricing.trialDays}-day trial`);
    return subscription;
  },

  // Get user subscription
  async getUserSubscription(userId) {
    return prisma.subscription.findFirst({
      where: { userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  },

  // Get subscription by ID
  async getSubscriptionById(subscriptionId) {
    return prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  },

  // Update subscription
  async updateSubscription(userId, updates) {
    const subscription = await prisma.subscription.findFirst({ where: { userId } });
    if (!subscription) throw new Error('Subscription not found');

    let updateData = { ...updates };
    if (updates.memberCount !== undefined) {
      updateData.monthlyPrice = this.calculateMonthlyPrice(subscription.plan, updates.memberCount);
    }

    return prisma.subscription.update({
      where: { id: subscription.id },
      data: updateData,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  },

  // Activate subscription
  async activateSubscription(subscriptionId) {
    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'ACTIVE', nextBillingDate: addMonths(new Date(), 1) },
    });

    console.log(`✅ Activated subscription ${subscriptionId}`);
    return subscription;
  },

  // Cancel subscription
  async cancelSubscription(userId) {
    const subscription = await prisma.subscription.findFirst({ where: { userId } });
    if (!subscription) throw new Error('Subscription not found');

    return prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'CANCELLED', paystackCustomerId: null },
    });
  },

  // Process trial expirations
  async processTrialExpirations() {
    const expiredTrials = await prisma.subscription.findMany({
      where: { status: 'TRIAL', trialEndsAt: { lte: new Date() } },
      include: { user: true },
    });

    for (const subscription of expiredTrials) {
      try {
        await prisma.subscription.update({ where: { id: subscription.id }, data: { status: 'INACTIVE' } });
        await emailService.sendTrialExpirationEmail(subscription.user.email, subscription.user.firstName, subscription.plan);
        console.log(`⏰ Trial expired for user ${subscription.userId}`);
      } catch (error) {
        console.error(`❌ Error processing trial expiration for ${subscription.userId}:`, error);
      }
    }

    return expiredTrials.length;
  },

  // Process billing cycles
  async processBillingCycles() {
    const subscriptionsToBill = await prisma.subscription.findMany({
      where: { status: 'ACTIVE', nextBillingDate: { lte: new Date() }, paystackCustomerId: { not: null } },
      include: { user: true },
    });

    for (const subscription of subscriptionsToBill) {
      try {
        const paymentResult = await paymentService.chargeCustomer(subscription.paystackCustomerId, subscription.monthlyPrice, subscription.user.email);

        if (paymentResult.success) {
          await prisma.subscription.update({ where: { id: subscription.id }, data: { nextBillingDate: addMonths(new Date(), 1) } });
          console.log(`💳 Successfully billed user ${subscription.userId} - $${subscription.monthlyPrice}`);
        } else {
          await this.handleFailedPayment(subscription);
        }
      } catch (error) {
        console.error(`❌ Error billing user ${subscription.userId}:`, error);
        await this.handleFailedPayment(subscription);
      }
    }

    return subscriptionsToBill.length;
  },

  // Handle failed payment
  async handleFailedPayment(subscription) {
    await prisma.subscription.update({ where: { id: subscription.id }, data: { status: 'INACTIVE' } });
    await emailService.sendPaymentFailedEmail(subscription.user.email, subscription.user.firstName, subscription.monthlyPrice);
    console.log(`❌ Payment failed for user ${subscription.userId}`);
  },

  // Update member count
  async updateMemberCount(userId, memberCount) {
    const subscription = await prisma.subscription.findFirst({ where: { userId } });
    if (!subscription) return null;

    const newPrice = this.calculateMonthlyPrice(subscription.plan, memberCount);
    return prisma.subscription.update({ where: { id: subscription.id }, data: { memberCount, monthlyPrice: newPrice } });
  },
};

module.exports = { subscriptionService };
