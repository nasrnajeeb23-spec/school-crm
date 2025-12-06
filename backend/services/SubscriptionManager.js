const { Subscription, School, User, Notification } = require('../models');
const EmailService = require('./EmailService');
const NotificationService = require('./NotificationService');
const { Op } = require('sequelize');

class SubscriptionManager {
  
  /**
   * Check for subscriptions expiring soon or expired
   * Designed to be run daily via Cron
   */
  async checkExpirations() {
    console.log('Running Daily Subscription Check...');
    const today = new Date();
    const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Handle Expired Trials & Active Subs -> GRACE_PERIOD (e.g. 3 days grace)
    // Or directly to PAST_DUE/SUSPENDED depending on policy
    // Here we implement a policy: Expired -> GRACE_PERIOD (3 days) -> SUSPENDED
    
    // Find expired subscriptions that are still marked as ACTIVE or TRIAL
    const expiredSubs = await Subscription.findAll({
        where: {
            status: { [Op.in]: ['ACTIVE', 'TRIAL'] },
            renewalDate: { [Op.lt]: today }
        },
        include: [{ model: School }]
    });

    for (const sub of expiredSubs) {
        // Move to Grace Period
        sub.status = 'GRACE_PERIOD';
        await sub.save();
        
        await this.notifySchoolAdmin(sub.School, 'تحذير: انتهاء الاشتراك', 'لقد انتهت فترة اشتراكك. تم منحك فترة سماح لمدة 3 أيام قبل تعليق الخدمة. يرجى التجديد فوراً.');
        console.log(`Moved Subscription ${sub.id} to GRACE_PERIOD`);
    }

    // 2. Handle Grace Period Expiry -> SUSPENDED
    const gracePeriodLength = 3; // days
    const graceExpiryDate = new Date(today.getTime() - gracePeriodLength * 24 * 60 * 60 * 1000);
    
    const suspendedSubs = await Subscription.findAll({
        where: {
            status: 'GRACE_PERIOD',
            renewalDate: { [Op.lt]: graceExpiryDate }
        },
        include: [{ model: School }]
    });

    for (const sub of suspendedSubs) {
        sub.status = 'SUSPENDED';
        await sub.save();
        await this.notifySchoolAdmin(sub.School, 'تم تعليق الحساب', 'لأسف، تم تعليق حساب المدرسة لعدم تجديد الاشتراك. يرجى التواصل مع الإدارة لاستعادة الخدمة.');
        console.log(`Moved Subscription ${sub.id} to SUSPENDED`);
    }

    // 3. Send Upcoming Expiry Notifications (7 days and 3 days before)
    // 7 Days Warning
    await this.sendExpiryWarning(sevenDaysLater, 7);
    // 3 Days Warning
    await this.sendExpiryWarning(threeDaysLater, 3);
  }

  async sendExpiryWarning(targetDate, daysLeft) {
    // We want to find subs where renewalDate is exactly (or roughly) targetDate
    // Using a range for the whole day
    const startOfDay = new Date(targetDate); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(targetDate); endOfDay.setHours(23,59,59,999);

    const expiringSoon = await Subscription.findAll({
        where: {
            status: { [Op.in]: ['ACTIVE', 'TRIAL'] },
            renewalDate: { [Op.between]: [startOfDay, endOfDay] }
        },
        include: [{ model: School }]
    });

    for (const sub of expiringSoon) {
        await this.notifySchoolAdmin(
            sub.School, 
            `تذكير: باقي ${daysLeft} أيام على انتهاء الاشتراك`, 
            `نود تذكيركم بأن اشتراككم الحالي سينتهي خلال ${daysLeft} أيام. يرجى التجديد لضمان استمرار الخدمة دون انقطاع.`
        );
    }
  }

  async notifySchoolAdmin(school, title, message) {
    if (!school) return;
    
    // Find School Admin
    const admin = await User.findOne({ where: { schoolId: school.id, role: 'SchoolAdmin' } });
    if (!admin) return;

    // 1. In-App Notification
    await NotificationService.send({
        title,
        description: message,
        type: 'Warning',
        schoolId: school.id,
        // We could link to user ID if NotificationService supports it directly, 
        // but here we might need to broadcast to all admins of that school or specific user
        // Assuming NotificationService can handle targeted user if we modify it slightly or use a loop
    });
    
    // Manually create notification for this specific user to be safe
    await Notification.create({
        title,
        description: message,
        type: 'Warning',
        status: 'Sent',
        date: new Date(),
        isRead: false,
        userId: admin.id, // Assuming User-Notification relation exists or we use a generic one
        schoolId: school.id
    });

    // 2. Email Notification
    if (admin.email) {
        // Use a generic email sender or create a specific template
        // Reusing existing service for simplicity
        const mailOptions = {
            from: `"SchoolSaaS Billing" <${process.env.SMTP_USER}>`,
            to: admin.email,
            subject: title,
            html: `<div style="direction: rtl; text-align: right;"><h2>${title}</h2><p>${message}</p></div>`
        };
        const transporter = EmailService.transporter; // Access transporter directly if public, or use a method
        if (transporter) {
            try { await transporter.sendMail(mailOptions); } catch(e) { console.error('Failed to send billing email', e); }
        }
    }
  }
}

module.exports = new SubscriptionManager();