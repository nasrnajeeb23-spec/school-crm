const cron = require('node-cron');
const { Subscription, School, User, Plan, Notification } = require('../models');
const { Op } = require('sequelize');
const EmailService = require('./EmailService');

class CronService {
  constructor() {
    this.jobs = [];
  }

  init() {
    // Run every day at 00:01
    this.schedule('1 0 * * *', this.checkSubscriptionExpiry.bind(this));
    
    console.log('CronService initialized');
  }

  schedule(expression, task) {
    const job = cron.schedule(expression, task);
    this.jobs.push(job);
  }

  async checkSubscriptionExpiry() {
    console.log('Running checkSubscriptionExpiry...');
    try {
      const now = new Date();
      // Find active or trial subscriptions that have expired
      const expiredSubs = await Subscription.findAll({
        where: {
          [Op.or]: [
            { status: 'ACTIVE' },
            { status: 'TRIAL' }
          ],
          [Op.or]: [
             { endDate: { [Op.lt]: now } },
             { renewalDate: { [Op.lt]: now } }
          ]
        },
        include: [{ model: School }, { model: Plan }]
      });

      console.log(`Found ${expiredSubs.length} expired subscriptions.`);

      for (const sub of expiredSubs) {
        const oldStatus = sub.status;
        const isTrial = oldStatus === 'TRIAL';
        
        // Update status
        sub.status = isTrial ? 'PAST_DUE' : 'PAST_DUE'; // Or EXPIRED
        await sub.save();

        // Notify School Admins
        const admins = await User.findAll({
          where: { schoolId: sub.schoolId, role: 'SchoolAdmin' }
        });

        for (const admin of admins) {
          await Notification.create({
            title: isTrial ? 'انتهت الفترة التجريبية' : 'انتهى اشتراك المدرسة',
            description: isTrial 
              ? 'انتهت فترتك التجريبية. يرجى ترقية الاشتراك للاستمرار في استخدام كافة المميزات.'
              : 'انتهى اشتراك المدرسة. يرجى تجديد الاشتراك لتجنب توقف الخدمات.',
            type: 'Financial',
            isRead: false,
            date: new Date()
          });

          // Email notification (if email service configured)
          if (admin.email) {
            try {
               await EmailService.sendSubscriptionExpiryEmail(admin.email, admin.name, isTrial);
            } catch (e) {
               console.error(`Failed to send email to ${admin.email}:`, e.message);
            }
          }
        }
        
        console.log(`Updated subscription for school ${sub.schoolId} to PAST_DUE`);
      }
    } catch (error) {
      console.error('Error in checkSubscriptionExpiry:', error);
    }
  }
}

module.exports = new CronService();
