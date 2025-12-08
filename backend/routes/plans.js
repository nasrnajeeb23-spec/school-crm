const express = require('express');
const router = express.Router();
const { Plan, AuditLog } = require('../models');

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

// @route   PUT api/plans/:id
// @desc    Update a plan
// @access  Private (SuperAdmin)
router.put('/:id', async (req, res) => {
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

module.exports = router;
