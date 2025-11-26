const express = require('express');
const router = express.Router();
const { School, Subscription, Plan, Student, Invoice, SchoolSettings } = require('../models');
const { sequelize } = require('../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../middleware/auth');
const { requireModule } = require('../middleware/modules');

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

// @route   GET api/schools/:id
// @desc    Get a single school by id with its subscription details
// @access  Private (SchoolAdmin) / Public where appropriate
router.get('/:id', async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id, {
      include: {
        model: Subscription,
        include: { model: Plan },
      },
    });
    if (!school) return res.status(404).json({ msg: 'School not found' });
    const s = school.toJSON();
    return res.json({
      id: s.id,
      name: s.name,
      plan: s.Subscription?.Plan?.name || 'N/A',
      status: s.Subscription?.status || 'N/A',
      students: s.studentCount,
      teachers: s.teacherCount,
      balance: parseFloat(s.balance),
      joinDate: new Date(s.createdAt).toISOString().split('T')[0],
    });
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

router.get('/:id/modules', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  try {
    const schoolId = Number(req.params.id);
    const allowed = req.app?.locals?.allowedModules || [];
    const settings = await SchoolSettings.findOne({ where: { schoolId } });
    const active = Array.isArray(settings?.activeModules) && settings.activeModules.length > 0 ? settings.activeModules : allowed;
    const list = active.map(m => ({ schoolId, moduleId: m }));
    res.json(list);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.put('/:id/modules', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  try {
    const schoolId = Number(req.params.id);
    const moduleIds = Array.isArray(req.body?.moduleIds) ? req.body.moduleIds : [];
    const settings = await SchoolSettings.findOrCreate({ where: { schoolId }, defaults: { schoolName: '', academicYearStart: new Date(), academicYearEnd: new Date(), notifications: { email: true, sms: false, push: true } } });
    const settingsInstance = Array.isArray(settings) ? settings[0] : settings;
    settingsInstance.activeModules = moduleIds;
    await settingsInstance.save();
    const list = moduleIds.map(m => ({ schoolId, moduleId: m }));
    res.json(list);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/:id/stats/student-distribution', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  try {
    const rows = await Student.findAll({
      attributes: ['grade', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { schoolId: Number(req.params.id) },
      group: ['grade'],
      order: [[sequelize.literal('count'), 'DESC']]
    });
    const data = rows.map(r => ({ name: r.get('grade'), value: Number(r.get('count')) }));
    res.json(data);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/:id/invoices', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      include: { model: Student, attributes: ['name'], where: { schoolId: Number(req.params.id) } },
      order: [['dueDate', 'DESC']]
    });
    const statusMap = { PAID: 'مدفوعة', UNPAID: 'غير مدفوعة', OVERDUE: 'متأخرة' };
    res.json(invoices.map(inv => ({
      id: String(inv.id),
      studentId: inv.studentId,
      studentName: inv.Student.name,
      status: statusMap[inv.status] || inv.status,
      issueDate: inv.createdAt.toISOString().split('T')[0],
      dueDate: inv.dueDate.toISOString().split('T')[0],
      items: [{ description: 'رسوم دراسية', amount: parseFloat(inv.amount) }],
      totalAmount: parseFloat(inv.amount)
    })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;
