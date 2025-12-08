const { Subscription, SchoolSettings, Plan, Student, Teacher, Invoice } = require('../models');

function normalizeLimits(settings, plan, sub) {
  let limits = { students: 50, teachers: 5 };
  let source = 'default';
  if (settings && settings.customLimits) {
    const l = typeof settings.customLimits === 'string' ? safeJson(settings.customLimits) : settings.customLimits;
    if (l && l.students !== undefined) limits.students = l.students === 'غير محدود' || l.students === 'unlimited' ? 999999 : Number(l.students);
    if (l && l.teachers !== undefined) limits.teachers = l.teachers === 'غير محدود' || l.teachers === 'unlimited' ? 999999 : Number(l.teachers);
    source = 'school_custom';
  } else if (plan && plan.limits) {
    const l = typeof plan.limits === 'string' ? safeJson(plan.limits) : plan.limits;
    if (l && l.students !== undefined) limits.students = l.students === 'غير محدود' || l.students === 'unlimited' ? 999999 : Number(l.students);
    if (l && l.teachers !== undefined) limits.teachers = l.teachers === 'غير محدود' || l.teachers === 'unlimited' ? 999999 : Number(l.teachers);
    source = 'plan';
  } else if (sub && sub.customLimits) {
    const l = typeof sub.customLimits === 'string' ? safeJson(sub.customLimits) : sub.customLimits;
    if (l && l.students !== undefined) limits.students = l.students === 'غير محدود' || l.students === 'unlimited' ? 999999 : Number(l.students);
    if (l && l.teachers !== undefined) limits.teachers = l.teachers === 'غير محدود' || l.teachers === 'unlimited' ? 999999 : Number(l.teachers);
    source = 'subscription_custom';
  }
  return { limits, source };
}

function safeJson(input){
  try { return JSON.parse(input); } catch { return {}; }
}

function requireWithinLimits(resourceKey){
  return async function(req, res, next){
    try {
      const schoolId = Number(req.params.schoolId || req.user?.schoolId || req.headers['x-school-id']);
      if (!schoolId) return res.status(400).json({ code: 'BAD_REQUEST', msg: 'SchoolId required' });
      const sub = await Subscription.findOne({ where: { schoolId } });
      const plan = sub ? await Plan.findByPk(sub.planId) : null;
      const settings = await SchoolSettings.findOne({ where: { schoolId } });
      const { limits } = normalizeLimits(settings, plan, sub);

      let current = 0; let limit = 0;
      if (resourceKey === 'students') { current = await Student.count({ where: { schoolId } }); limit = Number(limits.students || 0); }
      else if (resourceKey === 'teachers') { current = await Teacher.count({ where: { schoolId } }); limit = Number(limits.teachers || 0); }
      else if (resourceKey === 'invoices') {
        const l = (plan && plan.limits) ? (typeof plan.limits === 'string' ? safeJson(plan.limits) : plan.limits) : null;
        limit = Number((l && l.invoices) || 0);
        if (!limit) return next();
        current = await Invoice.count({ where: { schoolId } });
      }
      else { return next(); }

      const nextCount = current + 1;
      if (limit && nextCount > limit) {
        return res.status(403).json({ 
          code: 'LIMIT_EXCEEDED', 
          msg: `تم بلوغ حد الموارد (${resourceKey}). يرجى الترقية أو زيادة الحد.`,
          data: { resource: resourceKey, usage: current, limit }
        });
      }
      return next();
    } catch (e) {
      console.error('requireWithinLimits error', e?.message || e);
      return res.status(500).json({ code: 'SERVER_ERROR', msg: 'Server Error' });
    }
  };
}

module.exports = { requireWithinLimits };
