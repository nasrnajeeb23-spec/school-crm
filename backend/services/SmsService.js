let fetch;
try { fetch = require('node-fetch'); } catch {}

class SmsService {
  async sendActivationInvite(toPhone, userName, roleLabel, activationLink, schoolName = '', schoolId = null) {
    try {
      if (!toPhone || !activationLink) return false;
      let provider = String(process.env.SMS_PROVIDER || '').trim().toLowerCase();
      let accountSid = process.env.TWILIO_ACCOUNT_SID;
      let authToken = process.env.TWILIO_AUTH_TOKEN;
      let from = process.env.TWILIO_FROM || process.env.TWILIO_PHONE_NUMBER;
      let platformUsed = true;
      try {
        if (schoolId) {
          const { SchoolSettings } = require('../models');
          const s = await SchoolSettings.findOne({ where: { schoolId } });
          const cfg = s && s.smsConfig ? s.smsConfig : null;
          const useSchool = cfg && cfg.usePlatformProvider === false;
          if (useSchool) {
            if (cfg.provider) provider = String(cfg.provider || '').trim().toLowerCase();
            if (cfg.accountSid) accountSid = cfg.accountSid;
            if (cfg.authToken) authToken = cfg.authToken;
            if (cfg.from) from = cfg.from;
            platformUsed = false;
          }
        }
      } catch {}
      const roleAr = (() => {
        const key = String(roleLabel || '').toUpperCase().replace(/[^A-Z]/g, '');
        const map = { PARENT: 'ولي أمر', TEACHER: 'معلم', SCHOOL_ADMIN: 'مدير مدرسة', STAFF: 'موظف' };
        return map[key] || roleLabel;
      })();
      const bodyText = `مرحبًا ${userName}. تم إنشاء حساب لك كـ ${roleAr}${schoolName ? ` في ${schoolName}` : ''}. لتفعيل الحساب: ${activationLink}`;

      if (provider === 'twilio') {
        if (!accountSid || !authToken || !from) return false;
        const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const params = new URLSearchParams();
        params.append('To', toPhone);
        params.append('From', from);
        params.append('Body', bodyText);
        if (!fetch) return false;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        });
        const ok = res.ok;
        try {
          if (ok && schoolId && platformUsed) {
            const { PricingConfig, CommunicationUsage, School } = require('../models');
            const row = await PricingConfig.findOne({ where: { id: 'default' } });
            const unitPrice = row && row.pricePerSMS ? Number(row.pricePerSMS) : 0.03;
            const amount = unitPrice * 1;
            await CommunicationUsage.create({ schoolId: Number(schoolId), channel: 'sms', units: 1, unitPrice, amount, context: { toPhone, roleLabel } });
            const sch = await School.findByPk(Number(schoolId));
            if (sch) {
              const bal = parseFloat(sch.balance || 0);
              sch.balance = (bal + amount).toFixed ? (bal + amount) : bal + amount;
              await sch.save();
            }
          }
        } catch {}
        return ok;
      }

      return false;
    } catch (e) {
      try { console.error('SMS send error:', e?.message || e); } catch {}
      return false;
    }
  }
}

module.exports = new SmsService();
