const { 
  sequelize, School, Subscription, Plan, SchoolSettings, 
  Student, Teacher, Invoice, StudentDocument, PricingConfig, SchoolTransaction, Notification, UsageSnapshot 
} = require('../models');

function parseFileSizeToBytes(s) {
  try {
    const str = String(s || '').trim().toUpperCase();
    if (!str) return 0;
    const m = str.match(/^([0-9\.]+)\s*(B|KB|MB|GB)$/);
    if (!m) return 0;
    const val = parseFloat(m[1] || '0');
    const unit = m[2];
    const factor = unit === 'GB' ? 1024*1024*1024 : unit === 'MB' ? 1024*1024 : unit === 'KB' ? 1024 : 1;
    return Math.round(val * factor);
  } catch { return 0; }
}

async function getUsageAndLimits(schoolId) {
  const sub = await Subscription.findOne({ where: { schoolId } });
  const settings = await SchoolSettings.findOne({ where: { schoolId } });
  const plan = sub ? await Plan.findByPk(sub.planId) : null;
  const limitsMod = require('../middleware/limits');
  const norm = limitsMod.normalizeLimits(settings, plan, sub);
  const effLimits = norm.limits || {};
  const mode = norm.mode || 'overage';
  const packs = Array.isArray(norm.packs) ? norm.packs : [];

  const studentsCount = await Student.count({ where: { schoolId } });
  const teachersCount = await Teacher.count({ where: { schoolId } });
  let invoicesCount = 0;
  try {
    invoicesCount = await Invoice.count({ include: [{ model: Student, required: true, where: { schoolId }, attributes: [] }] });
  } catch {}
  let storageGB = 0;
  try {
    const docs = await StudentDocument.findAll({ include: [{ model: Student, required: true, where: { schoolId }, attributes: [] }], attributes: ['fileSize'] });
    let totalBytes = 0;
    for (const d of docs) totalBytes += parseFileSizeToBytes(d.fileSize);
    storageGB = totalBytes > 0 ? (totalBytes / (1024*1024*1024)) : 0;
  } catch {}

  return { mode, limits: effLimits, packs, usage: { students: studentsCount, teachers: teachersCount, invoices: invoicesCount, storageGB } };
}

async function computeOverageQuote(schoolId) {
  const cfgRow = await PricingConfig.findOne({ where: { id: 'default' } }).catch(()=>null);
  const price = cfgRow ? {
    student: Number(cfgRow.pricePerStudent || 1.5),
    teacher: Number(cfgRow.pricePerTeacher || 2.0),
    invoice: Number(cfgRow.pricePerInvoice || 0.05),
    storage: Number(cfgRow.pricePerGBStorage || 0.2),
    currency: String(cfgRow.currency || 'USD').toUpperCase()
  } : { student: 1.5, teacher: 2.0, invoice: 0.05, storage: 0.2, currency: 'USD' };
  const { mode, limits, usage } = await getUsageAndLimits(schoolId);
  const ovStudentsQty = Math.max(0, Number(usage.students || 0) - Number(limits.students || 0));
  const ovTeachersQty = Math.max(0, Number(usage.teachers || 0) - Number(limits.teachers || 0));
  const ovInvoicesQty = Math.max(0, Number(usage.invoices || 0) - Number(limits.invoices || 0));
  const ovStorageQty = Math.max(0, Number(usage.storageGB || 0) - Number(limits.storageGB || 0));
  const items = [
    { key: 'overage_students', qty: ovStudentsQty, unitPrice: price.student, amount: ovStudentsQty * price.student },
    { key: 'overage_teachers', qty: ovTeachersQty, unitPrice: price.teacher, amount: ovTeachersQty * price.teacher },
    { key: 'overage_invoices', qty: ovInvoicesQty, unitPrice: price.invoice, amount: ovInvoicesQty * price.invoice },
    { key: 'overage_storageGB', qty: ovStorageQty, unitPrice: price.storage, amount: ovStorageQty * price.storage },
  ];
  const total = items.reduce((s,i)=>s+Number(i.amount||0),0);
  return { mode, currency: price.currency, limits, usage, items, total };
}

async function recordUsageSnapshot(schoolId, { period = 'daily', date = null, usage = null, limits = null, items = null, total = null, currency = null } = {}, transaction = null) {
  const dt = date ? new Date(date) : new Date();
  const dateOnly = dt.toISOString().slice(0, 10);
  let payload = null;
  if (!usage || !limits || !items || total === null || currency === null) {
    const quote = await computeOverageQuote(schoolId);
    payload = {
      usage: quote.usage,
      limits: quote.limits,
      items: quote.items,
      total: quote.total,
      currency: quote.currency,
    };
  } else {
    payload = { usage, limits, items, total, currency };
  }

  const row = {
    schoolId,
    date: dateOnly,
    period,
    students: Number(payload.usage?.students || 0),
    teachers: Number(payload.usage?.teachers || 0),
    invoices: Number(payload.usage?.invoices || 0),
    storageGB: Number(payload.usage?.storageGB || 0),
    limits: payload.limits || null,
    overageItems: payload.items || null,
    overageTotal: Number(payload.total || 0),
    currency: String(payload.currency || 'USD').toUpperCase(),
  };

  const existing = await UsageSnapshot.findOne({ where: { schoolId, date: dateOnly, period }, transaction }).catch(() => null);
  if (existing) {
    await existing.update(row, { transaction });
    return existing;
  }
  return await UsageSnapshot.create(row, { transaction });
}

async function chargeOverageForSchool(schoolId, { period = 'monthly', performedBy = null } = {}) {
  const t = await sequelize.transaction();
  try {
    const school = await School.findByPk(schoolId, { transaction: t });
    if (!school) { await t.rollback(); return { ok:false, msg:'School not found' }; }
    const sub = await Subscription.findOne({ where: { schoolId }, transaction: t });
    if (!sub || (sub.status !== 'ACTIVE' && sub.status !== 'TRIAL')) {
      await t.rollback();
      return { ok:false, msg:'Subscription inactive' };
    }
    const quote = await computeOverageQuote(schoolId);
    if (quote.mode !== 'overage' || quote.total <= 0) {
      try { await recordUsageSnapshot(schoolId, { period: 'charge', usage: quote.usage, limits: quote.limits, items: quote.items, total: 0, currency: quote.currency }, t); } catch {}
      await t.rollback();
      return { ok:true, charged:false, total:0, currency:quote.currency, items:quote.items };
    }
    const amount = Number(quote.total || 0);
    const curBalance = Number(school.balance || 0);
    const canDeduct = curBalance >= amount;
    let newBalance = curBalance;
    if (canDeduct) {
      newBalance = curBalance - amount;
      school.balance = newBalance;
      await school.save({ transaction: t });
    } else {
      await Notification.create({
        title: 'رسوم الاستخدام الإضافية',
        description: `مستحقات ${amount} ${quote.currency} لفترة ${period}. يرجى شحن الرصيد.`,
        type: 'Financial',
        isRead: false,
        date: new Date()
      }, { transaction: t });
    }
    await SchoolTransaction.create({
      schoolId: school.id,
      type: canDeduct ? 'WITHDRAWAL' : 'PURCHASE',
      amount,
      balanceAfter: canDeduct ? newBalance : curBalance,
      description: `Overage charges (${period}): ` + quote.items.map(i=>`${i.key}=${i.qty}x${i.unitPrice}`).join(', '),
      performedBy: performedBy || null
    }, { transaction: t });
    try { await recordUsageSnapshot(schoolId, { period: 'charge', usage: quote.usage, limits: quote.limits, items: quote.items, total: amount, currency: quote.currency }, t); } catch {}
    await t.commit();
    return { ok:true, charged:true, total:amount, currency:quote.currency, items:quote.items, deducted:canDeduct, balanceAfter: canDeduct ? newBalance : curBalance };
  } catch (e) {
    await t.rollback();
    return { ok:false, msg:e?.message || String(e) };
  }
}

async function runMonthlyOverage() {
  const schools = await School.findAll({ attributes: ['id'] });
  const results = [];
  for (const s of schools) {
    try {
      const r = await chargeOverageForSchool(s.id, { period: 'monthly' });
      results.push({ schoolId: s.id, ...r });
    } catch (e) {
      results.push({ schoolId: s.id, ok:false, msg: e?.message || String(e) });
    }
  }
  return results;
}

async function snapshotAllSchoolsDaily() {
  const schools = await School.findAll({ attributes: ['id'] });
  for (const s of schools) {
    try {
      await recordUsageSnapshot(s.id, { period: 'daily' });
    } catch {}
  }
  return { ok: true, count: schools.length };
}

module.exports = { computeOverageQuote, chargeOverageForSchool, runMonthlyOverage, recordUsageSnapshot, snapshotAllSchoolsDaily };
