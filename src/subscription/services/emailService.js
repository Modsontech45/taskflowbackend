const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const emailService = {
  // Send payment confirmation email
  async sendPaymentConfirmation(email, firstName, amount, plan) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Payment Confirmation - TaskNest Subscription',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Payment Confirmed! 🎉</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Hi ${firstName},
              </p>
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Thank you for your payment! Your TaskNest ${plan} subscription is now active.
              </p>
              <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #1F2937;">Payment Details:</h3>
                <p style="margin: 5px 0; color: #4B5563;"><strong>Plan:</strong> ${plan}</p>
                <p style="margin: 5px 0; color: #4B5563;"><strong>Amount:</strong> $${amount.toFixed(2)}</p>
                <p style="margin: 5px 0; color: #4B5563;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                You can now enjoy all the features of your ${plan} plan. Start creating boards, adding tasks, and collaborating with your team!
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/dashboard" 
                   style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Go to Dashboard
                </a>
              </div>
              <p style="font-size: 14px; color: #6B7280; text-align: center;">
                If you have any questions, feel free to contact our support team.
              </p>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Payment confirmation email sent to ${email}`);
    } catch (error) {
      console.error('❌ Error sending payment confirmation email:', error);
    }
  },

  // Send trial expiration email
  async sendTrialExpirationEmail(email, firstName, plan) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Your TaskNest Trial Has Expired',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Trial Expired</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Hi ${firstName},
              </p>
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Your 14-day trial of TaskNest ${plan} has expired. To continue using all features, please upgrade to a paid subscription.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/subscription" 
                   style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Upgrade Now
                </a>
              </div>
              <p style="font-size: 14px; color: #6B7280; text-align: center;">
                Thank you for trying TaskNest!
              </p>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Trial expiration email sent to ${email}`);
    } catch (error) {
      console.error('❌ Error sending trial expiration email:', error);
    }
  },

  // Send payment failed email
  async sendPaymentFailedEmail(email, firstName, amount) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Payment Failed - TaskNest Subscription',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #EF4444; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Payment Failed</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Hi ${firstName},
              </p>
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                We were unable to process your payment of $${amount.toFixed(2)} for your TaskNest subscription.
              </p>
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Please update your payment method to continue using TaskNest.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/subscription" 
                   style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Update Payment Method
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Payment failed email sent to ${email}`);
    } catch (error) {
      console.error('❌ Error sending payment failed email:', error);
    }
  },
};

module.exports = { emailService };
