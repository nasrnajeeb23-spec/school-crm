const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { sequelize, School, Plan, Subscription, SubscriptionModule, ModuleCatalog, SchoolTransaction, Notification, UsageSnapshot } = require('../models');
const { Op } = require('sequelize');
const { computeOverageQuote, chargeOverageForSchool, recordUsageSnapshot } = require('../services/BillingService');

// @route   POST api/billing/payment-proof
// @desc    Submit payment proof for manual review
// @access  Private
router.post('/payment-proof', verifyToken, async (req, res) => {
  try {
    const p = req.body || {};
    const title = String(p.relatedService || 'Payment Proof');
    const desc = `Method: ${p.method || ''} | Amount: ${p.amount || 0} | Ref: ${p.reference || ''} | School: ${p.schoolName || ''}`;
    await Notification.create({ type: 'Approval', title, description: desc, status: 'Pending' });
    res.json({ success: true });
  } catch (e) {
    console.error(e?.message || e);
    res.status(500).send('Server Error');
  }
});

router.get('/overage/preview', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const schoolId = Number(req.user?.schoolId || req.query?.schoolId || 0);
    if (!schoolId) return res.status(400).json({ msg: 'schoolId required' });
    const quote = await computeOverageQuote(schoolId);
    return res.json(quote);
  } catch (e) {
    console.error('Overage preview error:', e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.post('/overage/run', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const schoolId = Number(req.user?.schoolId || req.body?.schoolId || 0);
    if (!schoolId) return res.status(400).json({ msg: 'schoolId required' });
    const period = String(req.body?.period || 'monthly');
    const r = await chargeOverageForSchool(schoolId, { period, performedBy: req.user?.id || null });
    if (!r.ok) return res.status(400).json({ msg: r.msg || 'Charge failed' });
    return res.json(r);
  } catch (e) {
    console.error('Overage charge error:', e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.get('/usage/report', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const schoolId = Number(req.query?.schoolId || req.user?.schoolId || 0);
    if (!schoolId) return res.status(400).json({ msg: 'schoolId required' });
    const group = String(req.query?.group || 'day').toLowerCase();
    const fromQ = String(req.query?.from || '').trim();
    const toQ = String(req.query?.to || '').trim();
    const now = new Date();
    const to = toQ ? new Date(toQ) : now;
    const from = fromQ ? new Date(fromQ) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = new Date(from.toISOString().slice(0, 10));
    const toDate = new Date(to.toISOString().slice(0, 10));

    let dailyRows = await UsageSnapshot.findAll({
      where: { schoolId, period: 'daily', date: { [Op.between]: [fromDate, toDate] } },
      order: [['date', 'ASC']]
    });
    const chargeRows = await UsageSnapshot.findAll({
      where: { schoolId, period: 'charge', date: { [Op.between]: [fromDate, toDate] } },
      order: [['date', 'ASC']]
    });
    if (!dailyRows.length) {
      try { await recordUsageSnapshot(schoolId, { period: 'daily' }); } catch {}
      dailyRows = await UsageSnapshot.findAll({
        where: { schoolId, period: 'daily', date: { [Op.between]: [fromDate, toDate] } },
        order: [['date', 'ASC']]
      });
    }

    const chargedByKey = new Map();
    for (const r of chargeRows) {
      const k = String(r.date);
      chargedByKey.set(k, Number(chargedByKey.get(k) || 0) + Number(r.overageTotal || 0));
    }

    if (group === 'month' || group === 'monthly') {
      const byMonth = new Map();
      for (const r of dailyRows) {
        const d = String(r.date);
        const m = d.slice(0, 7);
        const prev = byMonth.get(m);
        if (!prev || String(prev.date) < d) byMonth.set(m, r);
      }
      const chargedByMonth = new Map();
      for (const r of chargeRows) {
        const d = String(r.date);
        const m = d.slice(0, 7);
        chargedByMonth.set(m, Number(chargedByMonth.get(m) || 0) + Number(r.overageTotal || 0));
      }
      const rows = Array.from(byMonth.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([m, r]) => ({
        key: m,
        date: m + '-01',
        students: Number(r.students || 0),
        teachers: Number(r.teachers || 0),
        invoices: Number(r.invoices || 0),
        storageGB: Number(r.storageGB || 0),
        limits: r.limits || null,
        estimatedOverageTotal: Number(r.overageTotal || 0),
        chargedOverageTotal: Number(chargedByMonth.get(m) || 0),
        currency: String(r.currency || 'USD').toUpperCase(),
      }));
      return res.json({ group: 'month', from: fromDate.toISOString().slice(0,10), to: toDate.toISOString().slice(0,10), rows });
    }

    const rows = dailyRows.map(r => {
      const d = String(r.date);
      return {
        key: d,
        date: d,
        students: Number(r.students || 0),
        teachers: Number(r.teachers || 0),
        invoices: Number(r.invoices || 0),
        storageGB: Number(r.storageGB || 0),
        limits: r.limits || null,
        estimatedOverageTotal: Number(r.overageTotal || 0),
        chargedOverageTotal: Number(chargedByKey.get(d) || 0),
        currency: String(r.currency || 'USD').toUpperCase(),
      };
    });
    return res.json({ group: 'day', from: fromDate.toISOString().slice(0,10), to: toDate.toISOString().slice(0,10), rows });
  } catch (e) {
    console.error('Usage report error:', e?.message || e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.post('/usage/snapshot', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const schoolId = Number(req.body?.schoolId || req.user?.schoolId || 0);
    if (!schoolId) return res.status(400).json({ msg: 'schoolId required' });
    const period = String(req.body?.period || 'daily');
    const row = await recordUsageSnapshot(schoolId, { period });
    return res.json({ ok: true, id: row?.id ? String(row.id) : null });
  } catch (e) {
    console.error('Snapshot create error:', e?.message || e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.get('/transactions', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const schoolId = Number(req.query?.schoolId || req.user?.schoolId || 0);
    if (!schoolId) return res.status(400).json({ msg: 'schoolId required' });
    const fromQ = String(req.query?.from || '').trim();
    const toQ = String(req.query?.to || '').trim();
    const typeQ = String(req.query?.type || '').trim().toUpperCase();
    const kindQ = String(req.query?.kind || '').trim().toLowerCase();
    const now = new Date();
    const to = toQ ? new Date(toQ) : now;
    const from = fromQ ? new Date(fromQ) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const where = { schoolId, createdAt: { [Op.between]: [from, to] } };
    if (typeQ) where.type = typeQ;
    const rows = await SchoolTransaction.findAll({ where, order: [['createdAt', 'DESC']] });
    const filtered = kindQ === 'overage'
      ? rows.filter(r => String(r.description || '').toLowerCase().includes('overage charges'))
      : rows;
    return res.json(filtered.map(r => ({
      id: String(r.id),
      type: r.type,
      amount: Number(r.amount || 0),
      balanceAfter: Number(r.balanceAfter || 0),
      reference: r.reference || null,
      description: r.description || '',
      performedBy: r.performedBy || null,
      createdAt: r.createdAt,
    })));
  } catch (e) {
    console.error('Transactions list error:', e?.message || e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.get('/usage/breakdown', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const schoolId = Number(req.query?.schoolId || req.user?.schoolId || 0);
    if (!schoolId) return res.status(400).json({ msg: 'schoolId required' });
    const fromQ = String(req.query?.from || '').trim();
    const toQ = String(req.query?.to || '').trim();
    const now = new Date();
    const to = toQ ? new Date(toQ) : now;
    const from = fromQ ? new Date(fromQ) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = new Date(from.toISOString().slice(0, 10));
    const toDate = new Date(to.toISOString().slice(0, 10));

    const dailyRows = await UsageSnapshot.findAll({
      where: { schoolId, period: 'daily', date: { [Op.between]: [fromDate, toDate] } },
      order: [['date', 'ASC']]
    });
    const chargeRows = await UsageSnapshot.findAll({
      where: { schoolId, period: 'charge', date: { [Op.between]: [fromDate, toDate] } },
      order: [['date', 'ASC']]
    });

    const sumItems = (rows) => {
      const totals = {};
      let total = 0;
      for (const r of rows) {
        total += Number(r.overageTotal || 0);
        const items = r.overageItems;
        if (Array.isArray(items)) {
          for (const it of items) {
            const key = String(it?.key || '');
            const amount = Number(it?.amount || 0);
            if (!key) continue;
            totals[key] = Number(totals[key] || 0) + amount;
          }
        } else if (items && typeof items === 'object') {
          for (const [k, v] of Object.entries(items)) {
            totals[k] = Number(totals[k] || 0) + Number(v || 0);
          }
        }
      }
      return { totals, total };
    };

    const est = sumItems(dailyRows);
    const charged = sumItems(chargeRows);
    const currency = String((dailyRows[0]?.currency || chargeRows[0]?.currency || 'USD')).toUpperCase();
    return res.json({
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
      currency,
      estimated: { ...est, total: Number(est.total || 0) },
      charged: { ...charged, total: Number(charged.total || 0) },
    });
  } catch (e) {
    console.error('Usage breakdown error:', e?.message || e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   POST api/billing/upgrade-plan
// @desc    Upgrade subscription plan using school balance
// @access  Private (SchoolAdmin)
router.post('/upgrade-plan', verifyToken, requireRole('SCHOOL_ADMIN'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { planId, period } = req.body;
    const schoolId = req.user.schoolId;
    if (!planId) return res.status(400).json({ msg: 'planId required' });

    const school = await School.findByPk(schoolId, { transaction: t });
    if (!school) {
      await t.rollback();
      return res.status(404).json({ msg: 'School not found' });
    }

    const plan = await Plan.findByPk(planId, { transaction: t });
    if (!plan) {
      await t.rollback();
      return res.status(404).json({ msg: 'Plan not found' });
    }

    // Determine price (simple logic: full price for new period)
    // In a real system, we would pro-rate based on remaining time of current subscription
    let price = Number(plan.price); 
    if (period === 'ANNUAL' && plan.annualPrice) {
        price = Number(plan.annualPrice);
    }

    if (Number(school.balance) < price) {
      await t.rollback();
      return res.status(400).json({ msg: 'Insufficient balance', required: price, balance: school.balance });
    }

    // Deduct balance
    school.balance = Number(school.balance) - price;
    await school.save({ transaction: t });

    // Record Transaction
    await SchoolTransaction.create({
      schoolId: school.id,
      type: 'UPGRADE',
      amount: price,
      balanceAfter: school.balance,
      description: `Upgrade to plan: ${plan.name} (${period || 'MONTHLY'})`,
      performedBy: req.user.id
    }, { transaction: t });

    // Update or Create Subscription
    let subscription = await Subscription.findOne({ where: { schoolId: school.id }, transaction: t });
    
    const startDate = new Date();
    const renewalDate = new Date();
    if (period === 'ANNUAL') {
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
        renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    if (subscription) {
      subscription.planId = plan.id;
      subscription.status = 'ACTIVE';
      subscription.renewalDate = renewalDate;
      // Reset custom limits if switching plans? 
      // Maybe keep them, but for safety let's keep them as is unless null.
      await subscription.save({ transaction: t });
    } else {
      subscription = await Subscription.create({
        schoolId: school.id,
        planId: plan.id,
        status: 'ACTIVE',
        startDate: startDate,
        renewalDate: renewalDate
      }, { transaction: t });
    }

    await t.commit();
    res.json({ success: true, msg: 'Plan upgraded successfully', plan: plan.name, newBalance: school.balance });

  } catch (e) {
    await t.rollback();
    console.error('Upgrade plan error:', e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   POST api/billing/purchase-addon
// @desc    Purchase add-on module using school balance
// @access  Private (SchoolAdmin)
router.post('/purchase-addon', verifyToken, requireRole('SCHOOL_ADMIN'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { moduleId } = req.body;
    const schoolId = req.user.schoolId;
    if (!moduleId) return res.status(400).json({ msg: 'moduleId required' });

    const school = await School.findByPk(schoolId, { transaction: t });
    if (!school) {
      await t.rollback();
      return res.status(404).json({ msg: 'School not found' });
    }

    const moduleItem = await ModuleCatalog.findByPk(moduleId, { transaction: t });
    if (!moduleItem) {
      await t.rollback();
      return res.status(404).json({ msg: 'Module not found' });
    }

    const subscription = await Subscription.findOne({ where: { schoolId: school.id }, transaction: t });
    if (!subscription) {
      await t.rollback();
      return res.status(400).json({ msg: 'Active subscription required' });
    }

    // Check if already active
    const existing = await SubscriptionModule.findOne({
      where: { subscriptionId: subscription.id, moduleId: moduleItem.id, active: true },
      transaction: t
    });
    if (existing) {
      await t.rollback();
      return res.status(400).json({ msg: 'Module already active' });
    }

    const price = Number(moduleItem.monthlyPrice || 0);
    
    if (Number(school.balance) < price) {
      await t.rollback();
      return res.status(400).json({ msg: 'Insufficient balance', required: price, balance: school.balance });
    }

    // Deduct balance
    school.balance = Number(school.balance) - price;
    await school.save({ transaction: t });

    // Record Transaction
    await SchoolTransaction.create({
      schoolId: school.id,
      type: 'PURCHASE',
      amount: price,
      balanceAfter: school.balance,
      description: `Purchase add-on: ${moduleItem.name}`,
      performedBy: req.user.id
    }, { transaction: t });

    // Create SubscriptionModule
    await SubscriptionModule.create({
      subscriptionId: subscription.id,
      moduleId: moduleItem.id,
      priceSnapshot: price,
      active: true,
      activationDate: new Date()
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, msg: 'Module purchased successfully', module: moduleItem.name, newBalance: school.balance });

  } catch (e) {
    await t.rollback();
    console.error('Purchase addon error:', e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
