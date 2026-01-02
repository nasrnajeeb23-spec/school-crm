const express = require('express');
const router = express.Router();
const { Plan, AuditLog } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

function safeJsonParse(value, fallback) {
  if (typeof value !== 'string') return value ?? fallback;
  const s = value.trim();
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}

// @route   GET api/plans
// @desc    Get all plans
// @access  Public
router.get('/', async (req, res) => {
  try {
    const isPublic = String(req.query?.scope || '').toLowerCase() === 'public';
    const publicNames = new Set(['الأساسية', 'المميزة', 'المؤسسات']);

    const plans = await Plan.findAll({ order: [['id', 'ASC']] });

    let filtered = plans;
    if (isPublic) {
      const named = plans.filter(p => publicNames.has(String(p.name || '').trim()));
      filtered = named.length ? named : plans.slice(0, 3);
    }

    const formattedPlans = filtered.map(plan => {
      const features = safeJsonParse(plan.features, []);
      const limits = safeJsonParse(plan.limits, {});
      return {
        id: plan.id.toString(),
        name: plan.name,
        price: parseFloat(plan.price),
        pricePeriod: plan.pricePeriod,
        features: Array.isArray(features) ? features : [],
        limits: limits && typeof limits === 'object' ? limits : {},
        recommended: plan.recommended,
      };
    });

    res.json(formattedPlans);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/plans
// @desc    Create a plan
// @access  Private (SuperAdmin)
router.post('/', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { name, price, pricePeriod, features, limits, recommended } = req.body || {};
    if (!name || price === undefined || !pricePeriod || !features || !limits) {
      return res.status(400).json({ msg: 'Invalid payload' });
    }
    const normalizedFeatures = safeJsonParse(features, features);
    const normalizedLimits = safeJsonParse(limits, limits);
    if (!Array.isArray(normalizedFeatures) || !normalizedLimits || typeof normalizedLimits !== 'object' || Array.isArray(normalizedLimits)) {
      return res.status(400).json({ msg: 'Invalid payload' });
    }
    const plan = await Plan.create({
      name: String(name),
      price: Number(price),
      pricePeriod: String(pricePeriod),
      features: normalizedFeatures,
      limits: normalizedLimits,
      recommended: !!recommended
    });
    try {
      await AuditLog.create({
        action: 'PLAN_CREATE',
        userId: req.user?.id || null,
        userEmail: req.user?.email || null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: JSON.stringify({ planId: plan.id, name, price, pricePeriod, features, limits, recommended }),
        riskLevel: 'medium'
      });
    } catch(e) {}
    res.status(201).json({
      id: plan.id.toString(),
      name: plan.name,
      price: parseFloat(plan.price),
      pricePeriod: plan.pricePeriod,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
      limits: typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits,
      recommended: plan.recommended
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/plans/:id
// @desc    Update a plan
// @access  Private (SuperAdmin)
router.put('/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });

    const { name, price, pricePeriod, features, limits, recommended } = req.body;

    if (name) plan.name = name;
    if (price !== undefined) plan.price = price;
    if (pricePeriod) plan.pricePeriod = pricePeriod;
    if (features !== undefined) {
      const normalizedFeatures = safeJsonParse(features, features);
      if (!Array.isArray(normalizedFeatures)) return res.status(400).json({ msg: 'Invalid payload' });
      plan.features = normalizedFeatures;
    }
    if (limits !== undefined) {
      const normalizedLimits = safeJsonParse(limits, limits);
      if (!normalizedLimits || typeof normalizedLimits !== 'object' || Array.isArray(normalizedLimits)) return res.status(400).json({ msg: 'Invalid payload' });
      plan.limits = normalizedLimits;
    }
    if (recommended !== undefined) plan.recommended = recommended;

    await plan.save();

    try {
      await AuditLog.create({
        action: 'PLAN_UPDATE',
        userId: req.user?.id || null,
        userEmail: req.user?.email || null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: JSON.stringify({ planId: plan.id, changes: { name, price, pricePeriod, features, limits, recommended } }),
        riskLevel: 'medium'
      });
    } catch(e) {}

    res.json({
      id: plan.id.toString(),
      name: plan.name,
      price: parseFloat(plan.price),
      pricePeriod: plan.pricePeriod,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
      limits: typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits,
      recommended: plan.recommended
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/plans/:id
// @desc    Delete a plan (blocked if assigned to subscriptions)
// @access  Private (SuperAdmin)
router.delete('/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    const { Subscription } = require('../models');
    const assigned = await Subscription.count({ where: { planId: plan.id } });
    if (assigned > 0) {
      return res.status(400).json({ msg: 'Cannot delete plan assigned to subscriptions' });
    }
    await plan.destroy();
    try {
      await AuditLog.create({
        action: 'PLAN_DELETE',
        userId: req.user?.id || null,
        userEmail: req.user?.email || null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: JSON.stringify({ planId: Number(req.params.id) }),
        riskLevel: 'high'
      });
    } catch(e) {}
    res.json({ deleted: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
