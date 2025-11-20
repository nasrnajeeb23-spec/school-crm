const express = require('express');
const router = express.Router();
const { School, Subscription, Plan } = require('../models');

// @route   GET api/schools
// @desc    Get all schools with their subscription details
// @access  Private (SuperAdmin) / Public for login screen
router.get('/', async (req, res) => {
  try {
    const schools = await School.findAll({
      include: {
        model: Subscription,
        include: {
          model: Plan,
        },
      },
      order: [['name', 'ASC']], // Order alphabetically by name
    });

    // Format the response to match the frontend's expected structure
    const formattedSchools = schools.map(school => {
      const schoolJSON = school.toJSON();
      return {
        id: schoolJSON.id,
        name: schoolJSON.name,
        plan: schoolJSON.Subscription?.Plan?.name || 'N/A',
        // The frontend expects the ENUM key (e.g., 'ACTIVE')
        status: schoolJSON.Subscription?.status || 'N/A', 
        students: schoolJSON.studentCount,
        teachers: schoolJSON.teacherCount,
        balance: parseFloat(schoolJSON.balance),
        joinDate: schoolJSON.createdAt.toISOString().split('T')[0],
      }
    });

    res.json(formattedSchools);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/schools
// @desc    Add a new school
// @access  Private (SuperAdmin)
router.post('/', (req, res) => {
  res.json({ msg: 'Add school placeholder' });
});

module.exports = router;
