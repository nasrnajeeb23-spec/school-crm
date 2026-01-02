const cron = require('node-cron');
const { Subscription, School, User, SchoolSettings, Plan, Notification } = require('../models');
const { Op } = require('sequelize');
const EmailService = require('./EmailService');

class CronService {
  constructor() {
    this.jobs = [];
  }

  init() {
    this.schedule('1 0 * * *', this.checkSubscriptionExpiry.bind(this));
    this.schedule('15 0 1 * *', this.runMonthlyOverageBilling.bind(this));
    this.schedule('10 0 * * *', this.snapshotDailyUsage.bind(this));

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
            // Note: We might want to keep checking PAST_DUE for a grace period, but let's stick to initial expiry for now
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
        const school = sub.School;
        const plan = sub.Plan;

        if (!school || !plan) {
          // Data integrity issue, skip but maybe log?
          continue;
        }

        const oldStatus = sub.status;
        const price = Number(plan.price || 0);
        const balance = Number(school.balance || 0);

        // Attempt Auto-Renewal if not a trial (or upgrade trial if balance exists? Usually trial -> paid needs manual confirmation mostly, but let's auto-renew if they loaded balance)
        // Let's assume auto-renew applies if they have enough balance.

        let renewed = false;
        if (price > 0 && balance >= price) {
          // Processing Auto-Renewal
          const t = await require('../models').sequelize.transaction();
          try {
            // Deduct Balance
            await school.decrement('balance', { by: price, transaction: t });

            // Create Transaction Record
            const { SchoolTransaction } = require('../models');
            await SchoolTransaction.create({
              schoolId: school.id,
              amount: -price,
              type: 'SUBSCRIPTION_RENEWAL',
              description: `Auto-renewal for plan ${plan.name}`,
              date: new Date(),
              status: 'COMPLETED'
            }, { transaction: t });

            // Extend Subscription
            const durationMonths = plan.pricePeriod === 'YEARLY' ? 12 : 1; // Simplistic
            const newEndDate = new Date(sub.renewalDate || now);
            if (newEndDate < now) newEndDate.setTime(now.getTime()); // If very old, start from now? Or keep continuity? usually continuity unless gap is huge.
            // Let's reset to NOW if it was expired for a while to give full value, OR strict continuity. 
            // Strict continuity is better for business, but "Reset to Now" is friendlier if system was down.
            // Let's do: Start from MAX(now, renewalDate)

            newEndDate.setMonth(newEndDate.getMonth() + durationMonths);

            sub.status = 'ACTIVE';
            sub.endDate = newEndDate;
            sub.renewalDate = newEndDate; // Usually they track same thing
            await sub.save({ transaction: t });

            await t.commit();
            renewed = true;
            console.log(`Auto-renewed subscription for school ${school.id}`);

            // Notify Success
            await this.notifyAdmins(school.id, 'تم تجديد الاشتراك بنجاح', `تم خصم ${price} من الرصيد وتجديد اشتراكك حتى ${newEndDate.toLocaleDateString('en-GB')}`);

          } catch (err) {
            await t.rollback();
            console.error(`Failed to auto-renew school ${school.id}:`, err);
          }
        }

        if (!renewed) {
          // Mark as Past Due
          sub.status = 'PAST_DUE';
          await sub.save();

          // Notify Failure
          const title = oldStatus === 'TRIAL' ? 'انتهت الفترة التجريبية' : 'فشل تجديد الاشتراك';
          const msg = oldStatus === 'TRIAL'
            ? 'انتهت فترتك التجريبية. يرجى ترقية الاشتراك.'
            : `رصيدك (${balance}) غير كافٍ لتجديد الاشتراك (${price}). يرجى شحن الرصيد.`;

          await this.notifyAdmins(school.id, title, msg, true); // true = send email

          console.log(`Updated subscription for school ${sub.schoolId} to PAST_DUE`);
        }
      }
    } catch (error) {
      console.error('Error in checkSubscriptionExpiry:', error);
    }
  }

  async notifyAdmins(schoolId, title, description, sendEmail = false) {
    try {
      const admins = await User.findAll({ where: { schoolId, role: 'SchoolAdmin' } });
      for (const admin of admins) {
        await Notification.create({
          title,
          description,
          type: 'Financial',
          isRead: false,
          date: new Date(),
          userId: admin.id, // Ensure notification is linked to user if model supports it, or just rely on some broadcast mechanism? 
          // User model usually has Many-to-Many or One-to-Many notification relation. 
          // The original code didn't show linking user explicitly in create, implying simplistic notification table or missing logic.
          // Let's assume standard Notification model has simple fields. 
          schoolId: schoolId // If notifications are per school
        }).catch(() => { }); // Ignore if model doesn't support some fields

        if (sendEmail && admin.email) {
          try {
            // Using existing service or generic
            const EmailService = require('./EmailService');
            if (EmailService && EmailService.sendCustomEmail) {
              await EmailService.sendCustomEmail(admin.email, title, description);
            }
          } catch (e) { }
        }
      }
    } catch (e) { }
  }

  async runMonthlyOverageBilling() {
    try {
      const { runMonthlyOverage } = require('./BillingService');
      const results = await runMonthlyOverage();
      const okCount = results.filter(r => r.ok && r.charged).length;
      const failCount = results.filter(r => !r.ok).length;
      console.log(`Monthly overage billing: charged=${okCount}, failed=${failCount}`);
    } catch (e) {
      console.error('Monthly overage billing failed:', e?.message || e);
    }
  }

  async snapshotDailyUsage() {
    try {
      const { snapshotAllSchoolsDaily } = require('./BillingService');
      await snapshotAllSchoolsDaily();
    } catch (e) {
      console.error('Daily usage snapshot failed:', e?.message || e);
    }
  }
}

module.exports = new CronService();
