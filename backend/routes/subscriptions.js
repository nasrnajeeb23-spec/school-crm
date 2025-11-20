const express = require('express');
const router = express.Router();
const { Subscription, School, Plan } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

// @route   GET api/subscriptions
// @desc    Get all subscriptions
// @access  Private (SuperAdmin)
router.get('/', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      include: [
        { model: School, attributes: ['name'] },
        { model: Plan, attributes: ['name', 'price'] },
      ],
      order: [['id', 'ASC']],
    });

    // Format the response to match the frontend's expected structure
    const formattedSubscriptions = subscriptions.map(sub => ({
      id: sub.id.toString(),
      schoolId: sub.schoolId,
      schoolName: sub.School.name,
      plan: sub.Plan.name,
      status: sub.status,
      startDate: sub.startDate.toISOString().split('T')[0],
      renewalDate: sub.renewalDate.toISOString().split('T')[0],
      amount: parseFloat(sub.Plan.price),
    }));

    res.json(formattedSubscriptions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
