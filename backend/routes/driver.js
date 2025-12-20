const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { User, BusOperator, Route, RouteStudent, Student } = require('../models');

async function getDriverOperators(userId) {
  const operators = await BusOperator.findAll({ where: { userId } }).catch(() => []);
  if (operators.length) return operators;

  const u = await User.findByPk(userId).catch(() => null);
  if (!u) return [];

  const email = String(u.email || '').trim();
  const phone = String(u.phone || '').trim();
  const schoolId = u.schoolId || null;
  if (!schoolId) return [];

  const fallback = await BusOperator.findAll({
    where: {
      schoolId,
      status: 'Approved',
      [Op.or]: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ]
    }
  }).catch(() => []);

  for (const op of fallback) {
    if (!op.userId) {
      try {
        op.userId = u.id;
        await op.save();
      } catch {}
    }
  }

  return fallback;
}

router.get('/me', verifyToken, requireRole('DRIVER'), async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id).catch(() => null);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const operators = await getDriverOperators(user.id);
    const routesCount = operators.length
      ? await Route.count({ where: { busOperatorId: { [Op.in]: operators.map(o => o.id) } } }).catch(() => 0)
      : 0;

    const data = user.toJSON();
    delete data.password;
    return res.json({
      user: data,
      operators: operators.map(o => o.toJSON()),
      routesCount
    });
  } catch (e) {
    return res.status(500).json({ msg: 'Server Error', error: e?.message });
  }
});

router.get('/routes', verifyToken, requireRole('DRIVER'), async (req, res) => {
  try {
    const operators = await getDriverOperators(req.user.id);
    const operatorIds = operators.map(o => o.id);
    if (!operatorIds.length) return res.json([]);

    const routes = await Route.findAll({ where: { busOperatorId: { [Op.in]: operatorIds } }, order: [['name', 'ASC']] }).catch(() => []);
    if (!routes.length) return res.json([]);

    const rs = await RouteStudent.findAll({ where: { routeId: { [Op.in]: routes.map(r => r.id) } }, attributes: ['routeId'] }).catch(() => []);
    const counts = {};
    for (const x of rs) counts[x.routeId] = (counts[x.routeId] || 0) + 1;

    return res.json(routes.map(r => ({ ...r.toJSON(), studentsCount: counts[r.id] || 0 })));
  } catch (e) {
    return res.status(500).json({ msg: 'Server Error', error: e?.message });
  }
});

router.get('/routes/:routeId', verifyToken, requireRole('DRIVER'), async (req, res) => {
  try {
    const operators = await getDriverOperators(req.user.id);
    const operatorIds = operators.map(o => o.id);
    if (!operatorIds.length) return res.status(404).json({ msg: 'No operator profile found' });

    const route = await Route.findByPk(req.params.routeId).catch(() => null);
    if (!route) return res.status(404).json({ msg: 'Route not found' });
    if (!operatorIds.includes(route.busOperatorId)) return res.status(403).json({ msg: 'Access denied' });

    const assignments = await RouteStudent.findAll({ where: { routeId: route.id } }).catch(() => []);
    const studentIds = assignments.map(a => a.studentId);
    const students = studentIds.length
      ? await Student.findAll({ where: { id: { [Op.in]: studentIds } }, attributes: ['id', 'name', 'classId', 'parentId', 'homeLocation'] }).catch(() => [])
      : [];

    return res.json({ route: route.toJSON(), students: students.map(s => s.toJSON()) });
  } catch (e) {
    return res.status(500).json({ msg: 'Server Error', error: e?.message });
  }
});

module.exports = router;

