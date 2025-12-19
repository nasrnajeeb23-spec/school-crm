const express = require('express');
const router = express.Router();
const { Plan, AuditLog } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

// @route   GET api/plans
// @desc    Get all plans
// @access  Public
router.get('/', async (req, res) => {
  try {
    const plans = await Plan.findAll({
      order: [['id', 'ASC']],
    });
    
    // The frontend expects features and limits to be parsed JSON
    const formattedPlans = plans.map(plan => ({
      id: plan.id.toString(), // Frontend expects string id
      name: plan.name,
      price: parseFloat(plan.price),
      pricePeriod: plan.pricePeriod,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
      limits: typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits,
      recommended: plan.recommended,
    }));

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
    const plan = await Plan.create({
      name: String(name),
      price: Number(price),
      pricePeriod: String(pricePeriod),
      features: typeof features === 'object' ? JSON.stringify(features) : features,
      limits: typeof limits === 'object' ? JSON.stringify(limits) : limits,
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
    if (features) plan.features = typeof features === 'object' ? JSON.stringify(features) : features;
    if (limits) plan.limits = typeof limits === 'object' ? JSON.stringify(limits) : limits;
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
