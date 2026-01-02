const express = require('express');
const router = express.Router();
const { Teacher, Class, Schedule, Notification, Grade, TeacherClassSubjectAssignment, Assignment } = require('../models');
const { Op } = require('sequelize');
const { verifyToken, requireRole } = require('../middleware/auth');

async function getTeacherClassIds({ schoolId, teacherId }) {
  const sid = Number(schoolId || 0);
  const tid = Number(teacherId || 0);
  if (!sid || !tid) return [];

  const ids = new Set();

  try {
    const homeroom = await Class.findAll({ where: { schoolId: sid, homeroomTeacherId: tid }, attributes: ['id'] }).catch(() => []);
    for (const c of homeroom || []) ids.add(String(c.id));
  } catch {}

  try {
    const rows = await TeacherClassSubjectAssignment.findAll({
      where: { schoolId: sid, teacherId: tid, status: { [Op.ne]: 'inactive' } },
      attributes: ['classId']
    }).catch(() => []);
    for (const r of rows || []) ids.add(String(r.classId));
  } catch {}

  try {
    const rows = await Schedule.findAll({
      where: { teacherId: tid },
      attributes: ['classId'],
      include: [{ model: Class, attributes: ['id'], where: { schoolId: sid }, required: true }]
    }).catch(() => []);
    for (const r of rows || []) ids.add(String(r.classId));
  } catch {}

  try {
    const rows = await Assignment.findAll({ where: { schoolId: sid, teacherId: tid }, attributes: ['classId'] }).catch(() => []);
    for (const r of rows || []) ids.add(String(r.classId));
  } catch {}

  return Array.from(ids);
}

// @route   GET api/teacher/:teacherId/dashboard
// @desc    Get all necessary data for the teacher dashboard
// @access  Private (Teacher)
router.get('/:teacherId/dashboard', verifyToken, requireRole('TEACHER'), async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (String(req.user.teacherId) !== String(teacherId)) return res.status(403).json({ msg: 'Access denied' });
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

        const schoolId = Number(req.user.schoolId || 0);
        const classIds = await getTeacherClassIds({ schoolId, teacherId });
        const classesPromise = classIds.length
          ? Class.findAll({ where: { schoolId, id: { [Op.in]: classIds } }, order: [['gradeLevel', 'ASC'], ['section', 'ASC']] })
          : Promise.resolve([]);

        const schedulePromise = Schedule.findAll({
            where: {
                teacherId: Number(teacherId),
                day: today,
            },
            include: { model: Class, attributes: ['gradeLevel','section'], where: { schoolId }, required: true },
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
            classes: classes.map(c => { const j = c.toJSON(); return { ...j, name: `${j.gradeLevel} (${j.section || 'أ'})` }; }),
            schedule: schedule.map(s => ({
                id: s.id,
                timeSlot: s.timeSlot,
                subject: s.subject,
                classId: String(s.classId),
                className: s.Class ? `${s.Class.gradeLevel} (${s.Class.section || 'أ'})` : '',
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
  const schoolId = Number(req.user.schoolId || 0);
  const ids = await getTeacherClassIds({ schoolId, teacherId });
  const classes = ids.length
    ? await Class.findAll({ where: { schoolId, id: { [Op.in]: ids } }, order: [['gradeLevel', 'ASC'], ['section', 'ASC']] })
    : [];
  res.json(classes.map(c => { const j = c.toJSON(); return { ...j, name: `${j.gradeLevel} (${j.section || 'أ'})`, subjects: Array.isArray(j.subjects) && j.subjects.length > 0 ? j.subjects : ['الرياضيات', 'العلوم', 'اللغة الإنجليزية'] }; }));
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

// Teacher schedule
router.get('/:teacherId/schedule', verifyToken, requireRole('TEACHER'), async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (String(req.user.teacherId) !== String(teacherId)) return res.status(403).json({ msg: 'Access denied' });
    const schoolId = Number(req.user.schoolId || 0);
    const rows = await Schedule.findAll({ where: { teacherId: Number(teacherId) }, include: [{ model: Class, attributes: ['gradeLevel','section'], where: { schoolId }, required: true }, { model: Teacher, attributes: ['name'] }], order: [['day','ASC'],['timeSlot','ASC']] });
    res.json(rows.map(r => ({ id: String(r.id), classId: String(r.classId), className: r.Class ? `${r.Class.gradeLevel} (${r.Class.section || 'أ'})` : '', day: r.day, timeSlot: r.timeSlot, subject: r.subject, teacherName: r.Teacher ? r.Teacher.name : '' })));
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

// Teacher assignments
router.get('/:teacherId/assignments', verifyToken, requireRole('TEACHER'), async (req, res) => {
  try {
    const teacherId = Number(req.params.teacherId);
    if (String(req.user.teacherId) !== String(teacherId)) return res.status(403).json({ msg: 'Access denied' });
    const schoolId = Number(req.user.schoolId || 0);
    const rows = await Assignment.findAll({ where: { teacherId, schoolId }, include: [{ model: Class, attributes: ['gradeLevel','section'], where: { schoolId }, required: true }], order: [['dueDate','DESC']] });
    res.json(rows.map(a => {
      const j = a.toJSON();
      const cls = a.Class;
      return {
        id: String(j.id),
        title: j.title,
        description: j.description,
        dueDate: j.dueDate,
        classId: String(j.classId),
        className: cls ? `${cls.gradeLevel} (${cls.section || 'أ'})` : '',
        status: j.status,
        attachments: Array.isArray(j.attachments) ? j.attachments.map(att => ({
          filename: att.filename,
          originalName: att.originalName,
          mimeType: att.mimeType,
          size: att.size,
          url: `/api/assignments/${j.id}/attachments/${encodeURIComponent(att.filename)}`,
          uploadedAt: att.uploadedAt
        })) : []
      };
    }));
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
    res.json(rows.map(r => ({ id: r.id, month: r.month, baseAmount: Number(r.baseAmount || 0), allowancesTotal: Number(r.allowancesTotal || 0), deductionsTotal: Number(r.deductionsTotal || 0), netAmount: Number(r.netAmount || 0), allowances: Array.isArray(r.allowances) ? r.allowances : [], deductions: Array.isArray(r.deductions) ? r.deductions : [], status: r.status, currencyCode: String(r.currencyCode || 'SAR').toUpperCase() })));
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});
