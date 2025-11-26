const express = require('express');
const router = express.Router();
const { Teacher, Class, Schedule, Notification, Grade } = require('../models');
const { Op } = require('sequelize');
const { verifyToken, requireRole } = require('../middleware/auth');

// @route   GET api/teacher/:teacherId/dashboard
// @desc    Get all necessary data for the teacher dashboard
// @access  Private (Teacher)
router.get('/:teacherId/dashboard', verifyToken, requireRole('TEACHER'), async (req, res) => {
    try {
        const { teacherId } = req.params;
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

        const classesPromise = Class.findAll({
            where: {
                homeroomTeacherId: Number(teacherId)
            }
        });

        const schedulePromise = Schedule.findAll({
            where: {
                teacherId: Number(teacherId),
                day: today,
            },
            include: { model: Class, attributes: ['name'] },
            order: [['timeSlot', 'ASC']]
        });

        const actionItemsPromise = Notification.findAll({
            where: {
                teacherId: Number(teacherId),
                isRead: false
            },
            order: [['date', 'DESC']]
        });

        const [classes, schedule, actionItems] = await Promise.all([
            classesPromise,
            schedulePromise,
            actionItemsPromise
        ]);
        
        const actionItemTypeMap = { 'Warning': 'warning', 'Info': 'info', 'Approval': 'approval' };

        res.json({
            classes: classes.map(c => c.toJSON()),
            schedule: schedule.map(s => ({
                id: s.id,
                timeSlot: s.timeSlot,
                subject: s.subject,
                classId: s.Class.name, // Use class name for display
            })),
            actionItems: actionItems.map(item => ({
                id: item.id.toString(),
                type: actionItemTypeMap[item.type] || 'info',
                title: item.title,
                description: item.description,
                date: item.date.toISOString().split('T')[0],
            })),
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Teacher classes
router.get('/:teacherId/classes', verifyToken, requireRole('TEACHER'), async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (String(req.user.teacherId) !== String(teacherId)) return res.status(403).json({ msg: 'Access denied' });
    const classes = await Class.findAll({ where: { homeroomTeacherId: Number(teacherId) }, order: [['name','ASC']] });
    res.json(classes.map(c => ({ ...c.toJSON(), subjects: ['الرياضيات', 'العلوم', 'اللغة الإنجليزية'] })));
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

// Teacher schedule
router.get('/:teacherId/schedule', verifyToken, requireRole('TEACHER'), async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (String(req.user.teacherId) !== String(teacherId)) return res.status(403).json({ msg: 'Access denied' });
    const rows = await Schedule.findAll({ where: { teacherId: Number(teacherId) }, order: [['day','ASC'],['timeSlot','ASC']] });
    res.json(rows.map(r => ({ id: String(r.id), classId: String(r.classId), className: '', day: r.day, startTime: r.timeSlot.split(' - ')[0], endTime: r.timeSlot.split(' - ')[1] || r.timeSlot, subject: r.subject, teacher: '' })));
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

// Teacher action items
router.get('/action-items', verifyToken, requireRole('TEACHER'), async (req, res) => {
  try {
    const countGrades = await Grade.count({ where: { teacherId: req.user.teacherId } });
    const items = [];
    if (countGrades > 0) items.push({ id: 't_act_'+Date.now(), type: 'task', title: 'مراجعة الدرجات', description: `توجد ${countGrades} سجلات درجات للمراجعة`, date: new Date().toISOString(), isRead: false });
    res.json(items);
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

module.exports = router;
 
// Salary slips
router.get('/:teacherId/salary-slips', verifyToken, requireRole('TEACHER'), async (req, res) => {
  try {
    if (String(req.user.teacherId) !== String(req.params.teacherId)) return res.status(403).json({ msg: 'Access denied' });
    const { SalarySlip } = require('../models');
    const rows = await SalarySlip.findAll({ where: { personType: 'teacher', personId: String(req.params.teacherId) }, order: [['month','DESC']] });
    res.json(rows.map(r => ({ id: r.id, month: r.month, baseAmount: Number(r.baseAmount || 0), allowancesTotal: Number(r.allowancesTotal || 0), deductionsTotal: Number(r.deductionsTotal || 0), netAmount: Number(r.netAmount || 0), allowances: Array.isArray(r.allowances) ? r.allowances : [], deductions: Array.isArray(r.deductions) ? r.deductions : [], status: r.status })));
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});
