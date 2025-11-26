function requireModule(moduleId) {
  return async (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') return next();
    try {
      const allowedGlobal = req.app?.locals?.allowedModules || [];
      const schoolIdParam = req.params?.schoolId || req.params?.id || req.body?.schoolId || req.query?.schoolId;
      if (schoolIdParam) {
        const { Subscription, SchoolSettings } = require('../models');
        const schoolId = Number(schoolIdParam);
        const sub = await Subscription.findOne({ where: { schoolId } });
        const now = new Date();
        if (sub && String(sub.status).toUpperCase() === 'TRIAL') {
          const expiry = sub.endDate || sub.renewalDate;
          if (!expiry || now <= new Date(expiry)) {
            return next();
          } else {
            return res.status(403).json({ msg: 'انتهت فترة التجربة لهذه المدرسة. الرجاء تفعيل الاشتراك.' });
          }
        }
        const settings = await SchoolSettings.findOne({ where: { schoolId } });
        const active = Array.isArray(settings?.activeModules) ? settings.activeModules : [];
        if (!active.includes(moduleId)) {
          return res.status(403).json({ msg: `وحدة ${moduleId} غير مفعلة لهذه المدرسة.` });
        }
        if (!allowedGlobal.includes(moduleId)) {
          return res.status(403).json({ msg: `الوحدة ${moduleId} غير مرخّصة على الخادم.` });
        }
        return next();
      }
      if (!allowedGlobal.includes(moduleId)) {
        return res.status(403).json({ msg: `Module ${moduleId} not licensed` });
      }
      next();
    } catch (e) {
      return res.status(403).json({ msg: `Module ${moduleId} not licensed or access denied`, error: e?.message });
    }
  };
}

module.exports = { requireModule };
