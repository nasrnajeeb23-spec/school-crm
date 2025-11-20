const express = require('express');
const router = express.Router();
const { Plan } = require('../models');

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

module.exports = router;