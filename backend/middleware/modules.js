const { User } = require('../models');

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
      if (req.user) {
        const role = String(req.user.role || '').toUpperCase().replace(/[^A-Z]/g, '');
        if (role === 'SUPERADMIN' || role === 'SUPER_ADMIN') return next();
      }

      // 2. Identify School ID
      const schoolIdParam = req.params?.schoolId || req.params?.id || req.body?.schoolId || req.query?.schoolId || req.user?.schoolId;
      if (!schoolIdParam) {
        return next();
      }

      const schoolId = Number(schoolIdParam);

      // 3. Check Self-Hosted License First
      const licenseModules = req.app.locals.licenseModules;
      if (licenseModules instanceof Set) {
        // Flatten module aliases
        const aliases = moduleMap[moduleId] || [moduleId];
        // Check if ANY alias is in the license
        const allowed = aliases.some(alias =>
          licenseModules.has(alias.toUpperCase()) ||
          licenseModules.has('ALL_MODULES')
        );

        if (!allowed) {
          return res.status(403).json({ msg: `Module '${moduleId}' not included in your license.` });
        }
        // If licensed, allow access immediately (bypassing subscription checks)
        return next();
      }

      // 4. Enforce subscription state only (SaaS fallback)
      const { Subscription, School } = require('../models');
      const sub = await Subscription.findOne({ where: { schoolId } });
      const now = new Date();

      if (sub) {
        const status = String(sub.status || '').toUpperCase();
        const expiry = sub.endDate || sub.renewalDate;
        const expired = expiry && now > new Date(expiry);
        const blocked = status === 'CANCELED' || status === 'PAST_DUE' || expired;
        if (blocked) {
          return res.status(402).json({ msg: 'Subscription inactive or expired' });
        }
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
