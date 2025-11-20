const express = require('express');
const router = express.Router();
const { BusOperator, Route, RouteStudent, Student } = require('../models');
const { verifyToken, requireRole, requireSameSchoolParam } = require('../middleware/auth');
const { requireModule } = require('../middleware/modules');
const { validate } = require('../middleware/validate');

// --- Operators ---
router.get('/:schoolId/operators', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), async (req, res) => {
  try {
    const ops = await BusOperator.findAll({ where: { schoolId: req.params.schoolId }, order: [['status','ASC']] });
    const statusMap = { 'Approved': 'معتمد', 'Pending': 'قيد المراجعة', 'Rejected': 'مرفوض' };
    res.json(ops.map(o => ({ ...o.toJSON(), status: statusMap[o.status] || o.status })));
  } catch (e) { res.status(500).send('Server Error'); }
});

router.post('/:schoolId/operators', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), validate([
  { name: 'name', required: true, type: 'string' },
  { name: 'phone', required: true, type: 'string' },
  { name: 'licenseNumber', required: true, type: 'string' },
  { name: 'busPlateNumber', required: true, type: 'string' },
  { name: 'busCapacity', required: true },
  { name: 'busModel', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const op = await BusOperator.create({ id: `op_${Date.now()}`, ...req.body, status: 'Pending', schoolId: parseInt(req.params.schoolId, 10) });
    const statusMap = { 'Approved': 'معتمد', 'Pending': 'قيد المراجعة', 'Rejected': 'مرفوض' };
    res.status(201).json({ ...op.toJSON(), status: statusMap[op.status] });
  } catch (e) { res.status(500).send('Server Error'); }
});

router.put('/operator/:operatorId/approve', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireModule('transportation'), async (req, res) => {
  try {
    const op = await BusOperator.findByPk(req.params.operatorId);
    if (!op) return res.status(404).json({ msg: 'Operator not found' });
    op.status = 'Approved';
    await op.save();
    res.json({ ...op.toJSON(), status: 'معتمد' });
  } catch (e) { res.status(500).send('Server Error'); }
});

// --- Routes ---
router.get('/:schoolId/routes', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), async (req, res) => {
  try {
    const routes = await Route.findAll({ where: { schoolId: req.params.schoolId }, order: [['name','ASC']] });
    const payload = [];
    for (const r of routes) {
      const rs = await RouteStudent.findAll({ where: { routeId: r.id } });
      payload.push({ ...r.toJSON(), studentIds: rs.map(x => x.studentId) });
    }
    res.json(payload);
  } catch (e) { res.status(500).send('Server Error'); }
});

router.post('/:schoolId/routes', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), validate([
  { name: 'name', required: true, type: 'string' },
  { name: 'busOperatorId', required: false, type: 'string' },
]), async (req, res) => {
  try {
    const route = await Route.create({ id: `rt_${Date.now()}`, name: req.body.name, schoolId: parseInt(req.params.schoolId, 10), busOperatorId: req.body.busOperatorId || null });
    res.status(201).json({ ...route.toJSON(), studentIds: [] });
  } catch (e) { res.status(500).send('Server Error'); }
});

router.put('/:schoolId/routes/:routeId/students', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), validate([
  { name: 'studentIds', required: true },
]), async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.routeId);
    if (!route) return res.status(404).json({ msg: 'Route not found' });
    // Replace assignments
    await RouteStudent.destroy({ where: { routeId: route.id } });
    const ids = Array.isArray(req.body.studentIds) ? req.body.studentIds : [];
    for (const sid of ids) {
      await RouteStudent.create({ routeId: route.id, studentId: sid });
    }
    res.json({ ...route.toJSON(), studentIds: ids });
  } catch (e) { res.status(500).send('Server Error'); }
});

// Parent transportation detail
router.get('/parent/:parentId', verifyToken, requireRole('PARENT'), requireModule('transportation'), async (req, res) => {
  try {
    const student = await Student.findOne({ where: { parentId: req.params.parentId } });
    if (!student) return res.json(null);
    const rs = await RouteStudent.findOne({ where: { studentId: student.id } });
    if (!rs) return res.json(null);
    const route = await Route.findByPk(rs.routeId);
    if (!route) return res.json(null);
    const operator = route.busOperatorId ? await BusOperator.findByPk(route.busOperatorId) : null;
    const statusMap = { 'Approved': 'معتمد', 'Pending': 'قيد المراجعة', 'Rejected': 'مرفوض' };
    res.json({ route: { ...route.toJSON(), studentIds: [] }, operator: operator ? { ...operator.toJSON(), status: statusMap[operator.status] } : null });
  } catch (e) { res.status(500).send('Server Error'); }
});

module.exports = router;
/**
 * Simulation endpoint: POST /api/transportation/routes/:routeId/simulate
 * body: { progress: number } 0..100
 */
router.post('/routes/:routeId/simulate', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireModule('transportation'), validate([
  { name: 'progress', required: true },
]), async (req, res) => {
  try {
    const { progress } = req.body;
    const route = await Route.findByPk(req.params.routeId);
    if (!route) return res.status(404).json({ msg: 'Route not found' });
    const rs = await RouteStudent.findAll({ where: { routeId: route.id } });
    const studentIds = rs.map(x => x.studentId);
    const students = await Student.findAll({ where: { id: studentIds } });
    const parents = students.map(s => s.parentId).filter(Boolean);
    const Notification = require('../models/Notification');
    if (progress >= 80 && progress < 100) {
      for (const pid of parents) {
        await Notification.create({ type: 'Info', title: 'الحافلة تقترب من المنزل', description: 'يرجى الاستعداد لاستقبال الطالب', parentId: pid });
      }
    }
    if (progress >= 100) {
      for (const pid of parents) {
        await Notification.create({ type: 'Info', title: 'وصل الطالب إلى المدرسة', description: 'تم تسجيل الوصول بنجاح', parentId: pid });
      }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).send('Server Error'); }
});
