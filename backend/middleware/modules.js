const { User } = require('../models');
const { isSuperAdminUser } = require('./auth');

const moduleMap = {
  finance: ['finance', 'finance_fees', 'finance_salaries', 'finance_expenses'],
  transportation: ['transportation', 'transport', 'bus_management'],
  academic: ['academic', 'academic_management', 'grades', 'attendance'],
  student: ['student', 'student_management']
};

function requireModule(moduleId) {
  return async (req, res, next) => {
    try {
      // 1. Allow SuperAdmins to bypass module checks
      if (req.user && isSuperAdminUser(req.user)) return next();

      // 2. Identify School ID
      const schoolIdParam = req.params?.schoolId || req.params?.id || req.body?.schoolId || req.query?.schoolId || req.user?.schoolId;
      if (!schoolIdParam) {
        return next();
      }

      const schoolId = Number(schoolIdParam);

      // 3. Enforce subscription state and module access
      const { Subscription, School, Plan, SubscriptionModule } = require('../models');
      const sub = await Subscription.findOne({ 
        where: { schoolId },
        include: [
          { model: Plan },
          { model: SubscriptionModule, required: false, where: { active: true } }
        ]
      });
      const now = new Date();

      if (sub) {
        const status = String(sub.status || '').toUpperCase();
        const expiry = sub.endDate || sub.renewalDate;
        const expired = expiry && now > new Date(expiry);
        const blocked = status === 'CANCELED' || status === 'PAST_DUE' || expired;
        if (blocked) {
          return res.status(402).json({ msg: 'Subscription inactive or expired' });
        }
        
        // MODULE ACCESS CHECK
        // Per requirement: All schools have access to all modules/features.
        // We only enforce subscription status (Active/Trial).
        // Usage limits (students, storage, etc.) are enforced in limits.js
        return next();
      } else {
        const school = await School.findByPk(schoolId);
        if (school) {
          const createdAt = new Date(school.createdAt || Date.now());
          const diffMs = now.getTime() - createdAt.getTime();
          const thirtyDays = 30 * 24 * 60 * 60 * 1000;
          if (diffMs <= thirtyDays) return next();
        }
        return res.status(402).json({ msg: 'Subscription required' });
      }
      next();
    } catch (e) {
      console.error(`Module check error for ${moduleId}:`, e);
      return res.status(403).json({ msg: `Module access check failed`, error: e?.message });
    }
  };
}

module.exports = { requireModule, moduleMap };
