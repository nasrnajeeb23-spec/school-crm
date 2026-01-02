const nodemailer = require('nodemailer');
const { formatCurrency } = require('../i18n/config');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPaymentReceipt(toEmail, studentName, amount, currency = 'USD', receiptId, date, schoolId = null) {
    if (!toEmail) return false;

    let transporter = this.transporter;
    let platformUsed = true;
    try {
      if (schoolId) {
        const { SchoolSettings } = require('../models');
        const s = await SchoolSettings.findOne({ where: { schoolId } });
        const cfg = s && s.emailConfig ? s.emailConfig : null;
        const useSchool = cfg && cfg.usePlatformProvider === false;
        const host = useSchool ? cfg.host : null;
        const port = useSchool ? cfg.port : null;
        const user = useSchool ? cfg.user : null;
        const pass = useSchool ? cfg.pass : null;
        const secure = useSchool ? !!cfg.secure : false;
        if (host && port && user && pass) {
          transporter = require('nodemailer').createTransport({ host, port, secure, auth: { user, pass } });
          platformUsed = false;
        }
      }
    } catch {}
    let fromAddr = `"School Finance" <${process.env.SMTP_USER}>`;
    try {
      if (schoolId) {
        const { SchoolSettings } = require('../models');
        const s2 = await SchoolSettings.findOne({ where: { schoolId } });
        const cfg2 = s2 && s2.emailConfig ? s2.emailConfig : null;
        const useSchool2 = cfg2 && cfg2.usePlatformProvider === false;
        const from2 = useSchool2 ? (cfg2.from || cfg2.user) : process.env.SMTP_USER;
        if (from2) fromAddr = `"School Finance" <${from2}>`;
      }
    } catch {}

    const mailOptions = {
      from: fromAddr,
      to: toEmail,
      subject: `Payment Receipt - ${studentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2>إشعار استلام دفعة</h2>
          <p>عزيزي ولي الأمر،</p>
          <p>نود إعلامكم بأنه تم استلام دفعة مالية بنجاح.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 10px; border: 1px solid #dee2e6;">اسم الطالب</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>${studentName}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">المبلغ</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>${typeof amount === 'number' ? formatCurrency(amount, 'ar', currency) : amount}</strong></td>
            </tr>
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 10px; border: 1px solid #dee2e6;">رقم السند</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;">${receiptId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">التاريخ</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;">${date}</td>
            </tr>
          </table>

          <p>شكراً لالتزامكم.</p>
          <p style="color: #6c757d; font-size: 12px;">هذه رسالة آلية، يرجى عدم الرد عليها.</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Receipt email sent to ${toEmail}`);
      try {
        if (schoolId && platformUsed) {
          const { PricingConfig, CommunicationUsage, School } = require('../models');
          const row = await PricingConfig.findOne({ where: { id: 'default' } });
          const unitPrice = row && row.pricePerEmail ? Number(row.pricePerEmail) : 0.01;
          const amountCharge = unitPrice * 1;
          await CommunicationUsage.create({ schoolId: Number(schoolId), channel: 'email', units: 1, unitPrice, amount: amountCharge, context: { type: 'receipt', toEmail, studentName, receiptId } });
          const sch = await School.findByPk(Number(schoolId));
          if (sch) {
            const bal = parseFloat(sch.balance || 0);
            sch.balance = (bal + amountCharge).toFixed ? (bal + amountCharge) : bal + amountCharge;
            await sch.save();
          }
        }
      } catch {}
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendInvoiceReminder(toEmail, studentName, amount, dueDate, schoolId = null) {
    if (!toEmail) return false;

    let transporter = this.transporter;
    let platformUsed = true;
    try {
      if (schoolId) {
        const { SchoolSettings } = require('../models');
        const s = await SchoolSettings.findOne({ where: { schoolId } });
        const cfg = s && s.emailConfig ? s.emailConfig : null;
        const useSchool = cfg && cfg.usePlatformProvider === false;
        const host = useSchool ? cfg.host : null;
        const port = useSchool ? cfg.port : null;
        const user = useSchool ? cfg.user : null;
        const pass = useSchool ? cfg.pass : null;
        const secure = useSchool ? !!cfg.secure : false;
        if (host && port && user && pass) {
          transporter = require('nodemailer').createTransport({ host, port, secure, auth: { user, pass } });
          platformUsed = false;
        }
      }
    } catch {}
    let fromAddr = `"School Finance" <${process.env.SMTP_USER}>`;
    try {
      if (schoolId) {
        const { SchoolSettings } = require('../models');
        const s2 = await SchoolSettings.findOne({ where: { schoolId } });
        const cfg2 = s2 && s2.emailConfig ? s2.emailConfig : null;
        const useSchool2 = cfg2 && cfg2.usePlatformProvider === false;
        const from2 = useSchool2 ? (cfg2.from || cfg2.user) : process.env.SMTP_USER;
        if (from2) fromAddr = `"School Finance" <${from2}>`;
      }
    } catch {}

    const mailOptions = {
      from: fromAddr,
      to: toEmail,
      subject: `تذكير بموعد استحقاق الفاتورة - ${studentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2 style="color: #dc3545;">تذكير بفاتورة مستحقة</h2>
          <p>عزيزي ولي الأمر،</p>
          <p>نود تذكيركم بوجود فاتورة مستحقة الدفع خاصة بالطالب <strong>${studentName}</strong>.</p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeeba;">
            <p style="margin: 5px 0;"><strong>المبلغ المستحق:</strong> ${amount}</p>
            <p style="margin: 5px 0;"><strong>تاريخ الاستحقاق:</strong> ${dueDate}</p>
          </div>

          <p>يرجى المبادرة بالسداد لتجنب تراكم الرسوم.</p>
          <p>شكراً لتعاونكم.</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Reminder email sent to ${toEmail}`);
      try {
        if (schoolId && platformUsed) {
          const { PricingConfig, CommunicationUsage, School } = require('../models');
          const row = await PricingConfig.findOne({ where: { id: 'default' } });
          const unitPrice = row && row.pricePerEmail ? Number(row.pricePerEmail) : 0.01;
          const amountCharge = unitPrice * 1;
          await CommunicationUsage.create({ schoolId: Number(schoolId), channel: 'email', units: 1, unitPrice, amount: amountCharge, context: { type: 'reminder', toEmail, studentName } });
          const sch = await School.findByPk(Number(schoolId));
          if (sch) {
            const bal = parseFloat(sch.balance || 0);
            sch.balance = (bal + amountCharge).toFixed ? (bal + amountCharge) : bal + amountCharge;
            await sch.save();
          }
        }
      } catch {}
      return true;
    } catch (error) {
      console.error('Error sending reminder:', error);
      return false;
    }
  }

  async sendActivationInvite(toEmail, userName, roleLabel, activationLink, schoolName = '', schoolId = null) {
    if (!toEmail || !activationLink) return false;

    const roleAr = (() => {
      const key = String(roleLabel || '').toUpperCase().replace(/[^A-Z]/g, '');
      const map = { PARENT: 'ولي أمر', TEACHER: 'معلم', SCHOOL_ADMIN: 'مدير مدرسة', STAFF: 'موظف' };
      return map[key] || roleLabel;
    })();

    const subject = schoolName ? `تفعيل حسابك في نظام المدرسة - ${schoolName}` : 'تفعيل حسابك في نظام المدرسة';
    const html = `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2>مرحبًا ${userName}</h2>
        <p>تم إنشاء حساب لك كـ <strong>${roleAr}</strong> ${schoolName ? `في <strong>${schoolName}</strong>` : ''}.</p>
        <p>لإكمال تفعيل الحساب، يرجى تعيين كلمة مرورك من خلال الرابط التالي:</p>
        <p><a href="${activationLink}" style="display:inline-block;padding:10px 16px;background:#0d9488;color:#fff;border-radius:8px;text-decoration:none">تعيين كلمة المرور</a></p>
        <p style="margin-top:12px">إذا لم يعمل الزر، انسخ الرابط التالي وألصقه في المتصفح:</p>
        <p dir="ltr" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;padding:12px">${activationLink}</p>
        <p style="color:#6c757d;font-size:12px;">الرابط صالح لمدة 72 ساعة.</p>
      </div>
    `;

    let transporter = this.transporter;
    let platformUsed = true;
    try {
      if (schoolId) {
        const { SchoolSettings } = require('../models');
        const s = await SchoolSettings.findOne({ where: { schoolId } });
        const cfg = s && s.emailConfig ? s.emailConfig : null;
        const useSchool = cfg && cfg.usePlatformProvider === false;
        const host = useSchool ? cfg.host : null;
        const port = useSchool ? cfg.port : null;
        const user = useSchool ? cfg.user : null;
        const pass = useSchool ? cfg.pass : null;
        const secure = useSchool ? !!cfg.secure : false;
        if (host && port && user && pass) {
          transporter = require('nodemailer').createTransport({ host, port, secure, auth: { user, pass } });
          platformUsed = false;
        }
      }
    } catch {}
    let fromAddr = `"School CRM" <${process.env.SMTP_USER}>`;
    try {
      if (schoolId) {
        const { SchoolSettings } = require('../models');
        const s2 = await SchoolSettings.findOne({ where: { schoolId } });
        const cfg2 = s2 && s2.emailConfig ? s2.emailConfig : null;
        const useSchool2 = cfg2 && cfg2.usePlatformProvider === false;
        const from2 = useSchool2 ? (cfg2.from || cfg2.user) : process.env.SMTP_USER;
        if (from2) fromAddr = `"School CRM" <${from2}>`;
      }
    } catch {}
    const mailOptions = { from: fromAddr, to: toEmail, subject, html };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Activation invite sent to ${toEmail}`);
      try {
        if (schoolId && platformUsed) {
          const { PricingConfig, CommunicationUsage, School } = require('../models');
          const row = await PricingConfig.findOne({ where: { id: 'default' } });
          const unitPrice = row && row.pricePerEmail ? Number(row.pricePerEmail) : 0.01;
          const amount = unitPrice * 1;
          await CommunicationUsage.create({ schoolId: Number(schoolId), channel: 'email', units: 1, unitPrice, amount, context: { toEmail, roleLabel } });
          const sch = await School.findByPk(Number(schoolId));
          if (sch) {
            const bal = parseFloat(sch.balance || 0);
            sch.balance = (bal + amount).toFixed ? (bal + amount) : bal + amount;
            await sch.save();
          }
        }
      } catch {}
      return true;
    } catch (error) {
      console.error('Error sending activation invite:', error);
      return false;
    }
  }

  async sendUserInvite(toEmail, userName, roleLabel, tempPassword, schoolName = '') {
    if (!toEmail || !tempPassword) return false;

    const roleAr = (() => {
      const key = String(roleLabel || '').toUpperCase().replace(/[^A-Z]/g, '');
      const map = { PARENT: 'ولي أمر', TEACHER: 'معلم', SCHOOL_ADMIN: 'مدير مدرسة', STAFF: 'موظف' };
      return map[key] || roleLabel;
    })();

    const subject = schoolName ? `دعوة للانضمام إلى نظام المدرسة - ${schoolName}` : 'دعوة للانضمام إلى نظام المدرسة';
    const html = `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2>مرحبًا ${userName}</h2>
        <p>تم إنشاء حساب لك كـ <strong>${roleAr}</strong> في نظام إدارة المدرسة${schoolName ? ` <strong>${schoolName}</strong>` : ''}.</p>
        <p>يمكنك تسجيل الدخول باستخدام البيانات المؤقتة التالية:</p>
        <div style="background-color:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;padding:12px;margin:12px 0;">
          <p style="margin:4px 0;"><strong>البريد الإلكتروني:</strong> ${toEmail}</p>
          <p style="margin:4px 0;"><strong>كلمة المرور المؤقتة:</strong> ${tempPassword}</p>
        </div>
        <p>يرجى تسجيل الدخول وتغيير كلمة المرور فورًا لزيادة الأمان.</p>
        <p style="color:#6c757d;font-size:12px;">هذه رسالة آلية، يرجى عدم الرد عليها.</p>
      </div>
    `;

    const mailOptions = {
      from: `"School CRM" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Invite email sent to ${toEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending invite:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
