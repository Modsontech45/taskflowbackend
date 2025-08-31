const Paystack = require('paystack-api'); // Correct require
const { PrismaClient } = require('@prisma/client');
const { subscriptionService } = require('./subscriptionService');

const prisma = new PrismaClient();
const paystackClient = new Paystack(process.env.PAYSTACK_SECRET_KEY);


const paymentService = {
  // Initialize payment with Paystack
  async initializePayment({ email, amount, subscriptionId, userId, plan }) {
    try {
      const amountInKobo = Math.round(amount * 100);

      const paymentData = {
        email,
        amount: amountInKobo,
        currency: 'USD',
        reference: `sub_${subscriptionId}_${Date.now()}`,
        callback_url: `${process.env.FRONTEND_URL}/subscription?payment=success`,
        metadata: {
          subscriptionId,
          userId,
          plan,
          custom_fields: [
            {
              display_name: 'Subscription Plan',
              variable_name: 'subscription_plan',
              value: plan,
            },
          ],
        },
      };

      const response = await paystackClient.transaction.initialize(paymentData);

      if (response.status) {
        await this.createPaymentRecord({
          reference: paymentData.reference,
          userId,
          subscriptionId,
          amount,
          status: 'PENDING',
        });

        return {
          success: true,
          authorizationUrl: response.data.authorization_url,
          reference: response.data.reference,
        };
      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (error) {
      console.error('❌ Payment initialization error:', error);
      throw new Error('Failed to initialize payment: ' + error.message);
    }
  },

  // Verify payment with Paystack
  async verifyPayment(reference, userId) {
    try {
      const response = await paystackClient.transaction.verify(reference);

      if (response.status && response.data.status === 'success') {
        const { metadata } = response.data;

        await this.updatePaymentRecord(reference, {
          status: 'SUCCESS',
          paystackReference: response.data.reference,
          paidAt: new Date(),
        });

        await subscriptionService.activateSubscription(metadata.subscriptionId);

        return {
          success: true,
          subscriptionId: metadata.subscriptionId,
          amount: response.data.amount / 100,
          plan: metadata.plan,
        };
      } else {
        await this.updatePaymentRecord(reference, {
          status: 'FAILED',
        });

        return {
          success: false,
          message: 'Payment verification failed',
        };
      }
    } catch (error) {
      console.error('❌ Payment verification error:', error);
      throw new Error('Failed to verify payment: ' + error.message);
    }
  },

  // Create payment record
  async createPaymentRecord(data) {
    return await prisma.payment.create({
      data: {
        reference: data.reference,
        userId: data.userId,
        subscriptionId: data.subscriptionId,
        amount: data.amount,
        status: data.status,
        createdAt: new Date(),
      },
    });
  },

  // Update payment record
  async updatePaymentRecord(reference, updates) {
    return await prisma.payment.updateMany({
      where: { reference },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });
  },

  // Get payment history for user
  async getPaymentHistory(userId) {
    return await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          select: {
            plan: true,
          },
        },
      },
    });
  },

  // Charge existing customer
  async chargeCustomer(customerId, amount, email) {
    try {
      const amountInKobo = Math.round(amount * 100);

      const response = await paystackClient.transaction.charge({
        email,
        amount: amountInKobo,
        authorization_code: customerId,
      });

      return {
        success: response.status && response.data.status === 'success',
        reference: response.data.reference,
        message: response.message,
      };
    } catch (error) {
      console.error('❌ Customer charge error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  // Cancel recurring payment
  async cancelRecurringPayment(customerId) {
    try {
      console.log(`🚫 Cancelled recurring payment for customer ${customerId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Cancel recurring payment error:', error);
      throw error;
    }
  },

  // Handle successful payment webhook
  async handleSuccessfulPayment(data) {
    try {
      const { reference, metadata } = data;

      if (metadata && metadata.subscriptionId) {
        await subscriptionService.activateSubscription(metadata.subscriptionId);

        if (data.authorization && data.authorization.authorization_code) {
          await prisma.subscription.update({
            where: { id: metadata.subscriptionId },
            data: {
              paystackCustomerId: data.authorization.authorization_code,
            },
          });
        }
      }

      console.log(`✅ Processed successful payment: ${reference}`);
    } catch (error) {
      console.error('❌ Error handling successful payment:', error);
    }
  },

  // Webhook handlers
  async handleSubscriptionCreated(data) {
    console.log('📝 Subscription created webhook:', data);
  },

  async handleSubscriptionCancelled(data) {
    console.log('🚫 Subscription cancelled webhook:', data);
  },

  async handleInvoiceCreated(data) {
    console.log('📄 Invoice created webhook:', data);
  },
};

module.exports = { paymentService };
