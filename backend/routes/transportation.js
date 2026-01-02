const express = require('express');
const router = express.Router();
const { QueryTypes, Op } = require('sequelize');
const { sequelize, BusOperator, Route, RouteStudent, Student, School, User, ParentStudent } = require('../models');
const { verifyToken, requireRole, requireSameSchoolParam, JWT_SECRET, isSuperAdminUser, canAccessSchool, getUserScopeContext, buildScopeWhere, canWriteToScopes, canParentAccessStudent } = require('../middleware/auth');
const { requireModule } = require('../middleware/modules');
const { validate } = require('../middleware/validate');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const busOperatorQueryOptions = { attributes: { exclude: ['userId'] } };

// --- Operators ---
<<<<<<< HEAD
router.get('/:schoolId/operators', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), async (req, res) => {
  try {
    const ops = await BusOperator.findAll({ where: { schoolId: req.params.schoolId }, order: [['status', 'ASC']] });
    const statusMap = { 'Approved': 'معتمد', 'Pending': 'قيد المراجعة', 'Rejected': 'مرفوض' };
    res.json(ops.map(o => ({ ...o.toJSON(), status: statusMap[o.status] || o.status })));
  } catch (e) { res.status(500).json({ msg: 'Server Error', error: e?.message }); }
});

router.post('/:schoolId/operators', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), validate([
=======
// Public application endpoint for bus operators (drivers)
// Allows a driver to submit an application to a specific school without authentication
router.post('/operator/application', validate([
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
  { name: 'name', required: true, type: 'string' },
  { name: 'email', required: true, type: 'string' },
  { name: 'phone', required: true, type: 'string' },
  { name: 'licenseNumber', required: true, type: 'string' },
  { name: 'busPlateNumber', required: true, type: 'string' },
  { name: 'busCapacity', required: true },
  { name: 'busModel', required: true, type: 'string' },
  { name: 'schoolId', required: true },
]), async (req, res) => {
  try {
    const schoolId = Number(req.body.schoolId);
    if (!schoolId || Number.isNaN(schoolId)) {
      return res.status(400).json({ msg: 'Invalid schoolId' });
    }
    const school = await School.findByPk(schoolId).catch(() => null);
    if (!school) {
      return res.status(404).json({ msg: 'School not found' });
    }
    const op = await BusOperator.create({
      id: `op_${Date.now()}`,
      name: req.body.name,
      email: String(req.body.email || '').trim() || null,
      phone: req.body.phone,
      licenseNumber: req.body.licenseNumber,
      busPlateNumber: req.body.busPlateNumber,
      busCapacity: Number(req.body.busCapacity),
      busModel: req.body.busModel,
      schoolId,
      status: 'Pending',
    }, { returning: false });
    const statusMap = { 'Approved': 'معتمد', 'Pending': 'قيد المراجعة', 'Rejected': 'مرفوض' };
    return res.status(201).json({ ...op.toJSON(), status: statusMap[op.status] });
  } catch (e) {
    return res.status(500).json({ msg: 'Server Error', error: e?.message });
  }
});

router.get('/:schoolId/operators', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), async (req, res) => {
  try {
    const schoolId = Number.parseInt(String(req.params.schoolId), 10);
    if (!schoolId || Number.isNaN(schoolId)) return res.status(400).json({ msg: 'Invalid schoolId' });

    const statusMap = { 'Approved': 'معتمد', 'Pending': 'قيد المراجعة', 'Rejected': 'مرفوض' };
    try {
      const ctx = await getUserScopeContext(req, schoolId);
      const scopeWhere = buildScopeWhere(ctx);
      const where = scopeWhere ? { schoolId, ...scopeWhere } : { schoolId };
      const ops = await BusOperator.findAll({ where, order: [['status', 'ASC']], ...busOperatorQueryOptions });
      return res.json(ops.map(o => ({ ...o.toJSON(), status: statusMap[o.status] || o.status })));
    } catch (e) {
      const tables = ['"BusOperators"', '"busoperators"'];
      const columnSets = [
        ['id', 'name', 'email', 'phone', 'licenseNumber', 'busPlateNumber', 'busCapacity', 'busModel', 'schoolId', 'userId', 'status'],
        ['id', 'name', 'email', 'phone', 'licenseNumber', 'busPlateNumber', 'busCapacity', 'busModel', 'schoolId', 'status'],
        ['id', 'name', 'phone', 'licenseNumber', 'busPlateNumber', 'busCapacity', 'busModel', 'schoolId', 'userId', 'status'],
        ['id', 'name', 'phone', 'licenseNumber', 'busPlateNumber', 'busCapacity', 'busModel', 'schoolId', 'status'],
      ];
      for (const table of tables) {
        for (const cols of columnSets) {
          try {
            const colSql = cols.map(c => `"${c}"`).join(', ');
            const rows = await sequelize.query(
              `SELECT ${colSql} FROM ${table} WHERE "schoolId" = :schoolId ORDER BY "status" ASC`,
              { replacements: { schoolId }, type: QueryTypes.SELECT }
            );
            return res.json((rows || []).map((o) => ({ ...o, status: statusMap[o.status] || o.status })));
          } catch {}
        }
      }
      return res.status(500).json({ msg: e?.message || 'Server Error' });
    }
  } catch (e) {
    return res.status(500).json({ msg: e?.message || 'Server Error' });
  }
});

router.post('/:schoolId/operators', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), validate([
  { name: 'name', required: true, type: 'string' },
  { name: 'email', required: true, type: 'string' },
  { name: 'phone', required: true, type: 'string' },
  { name: 'licenseNumber', required: true, type: 'string' },
  { name: 'busPlateNumber', required: true, type: 'string' },
  { name: 'busCapacity', required: true },
  { name: 'busModel', required: true, type: 'string' },
  { name: 'branchId', required: false, type: 'string' },
  { name: 'stageId', required: false, type: 'string' },
  { name: 'departmentId', required: false, type: 'string' },
]), async (req, res) => {
  try {
    const schoolId = Number.parseInt(String(req.params.schoolId), 10);
    const ctx = await getUserScopeContext(req, schoolId);
    if (!canWriteToScopes(ctx, { branchId: req.body.branchId || null, stageId: req.body.stageId || null, departmentId: req.body.departmentId || null })) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    const op = await BusOperator.create(
      { id: `op_${Date.now()}`, ...req.body, status: 'Pending', schoolId },
      { returning: false }
    );
    const statusMap = { 'Approved': 'معتمد', 'Pending': 'قيد المراجعة', 'Rejected': 'مرفوض' };
    res.status(201).json({ ...op.toJSON(), status: statusMap[op.status] });
  } catch (e) { res.status(500).json({ msg: 'Server Error', error: e?.message }); }
});

router.put('/operator/:operatorId/approve', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireModule('transportation'), async (req, res) => {
  try {
    const op = await BusOperator.findByPk(req.params.operatorId, busOperatorQueryOptions);
    if (!op) return res.status(404).json({ msg: 'Operator not found' });
    if (!canAccessSchool(req.user, op.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const scopeCtx = await getUserScopeContext(req, Number(op.schoolId || 0));
    if (!canWriteToScopes(scopeCtx, { branchId: op.branchId || null, stageId: op.stageId || null, departmentId: op.departmentId || null })) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    op.status = 'Approved';
    await op.save({ returning: false });
    let user = null;
    const providedEmail = String(op.email || '').trim();
    const usernameRaw = providedEmail || String(op.phone || '').trim() || `driver_${op.id}`;
    const emailRaw = providedEmail || `driver+${String(op.id)}@drivers.local`;

    if (providedEmail) {
      const existingByEmail = await User.findOne({ where: { email: providedEmail } });
      if (existingByEmail) {
        const sameSchool = Number(existingByEmail.schoolId || 0) === Number(op.schoolId || 0);
        const isDriver = String(existingByEmail.schoolRole || '') === 'سائق';
        const isDriverRole = String(existingByEmail.role || '') === 'Driver' || String(existingByEmail.role || '') === 'Staff';
        if (!sameSchool || !isDriver || !isDriverRole) {
          return res.status(409).json({ msg: 'Email already in use' });
        }
        user = existingByEmail;
      }
    }

    if (!user) user = await User.findOne({ where: { schoolId: op.schoolId, username: usernameRaw } });
    if (!user && op.phone) user = await User.findOne({ where: { schoolId: op.schoolId, phone: op.phone } });
    if (!user && !providedEmail) user = await User.findOne({ where: { email: emailRaw } });
    if (!user) {
      const placeholder = Math.random().toString(36).slice(-12) + 'Aa!1';
      const hashed = await bcrypt.hash(placeholder, 10);
      user = await User.create({
        name: op.name,
        email: emailRaw,
        username: usernameRaw,
        password: hashed,
        role: 'Driver',
        schoolId: op.schoolId,
        phone: op.phone || null,
        schoolRole: 'سائق',
        isActive: true,
        passwordMustChange: true,
        tokenVersion: 0
      });
    } else {
      if (providedEmail && String(user.email || '') !== providedEmail) {
        user.email = providedEmail;
        if (!user.username) user.username = usernameRaw;
      }
      user.isActive = true;
      user.schoolRole = user.schoolRole || 'سائق';
      if (String(user.role || '') !== 'Driver') user.role = 'Driver';
      await user.save();
    }
    try {
      op.userId = user ? user.id : null;
      await op.save({ returning: false });
    } catch {}
    const payload = { ...op.toJSON(), status: 'معتمد', driverAccountCreated: true, userId: user ? String(user.id) : null };
    res.json(payload);
  } catch (e) { res.status(500).json({ msg: 'Server Error', error: e?.message }); }
});

router.get('/operator/:operatorId/invite-link', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireModule('transportation'), async (req, res) => {
  try {
    const op = await BusOperator.findByPk(req.params.operatorId, busOperatorQueryOptions);
    if (!op) return res.status(404).json({ msg: 'Operator not found' });
    if (!canAccessSchool(req.user, op.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const scopeCtx = await getUserScopeContext(req, Number(op.schoolId || 0));
    if (!canWriteToScopes(scopeCtx, { branchId: op.branchId || null, stageId: op.stageId || null, departmentId: op.departmentId || null })) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    if (String(op.status || '') !== 'Approved') return res.status(400).json({ msg: 'Operator not approved' });

    const providedEmail = String(op.email || '').trim();
    const usernameRaw = providedEmail || String(op.phone || '').trim() || `driver_${op.id}`;
    let user =
      (providedEmail ? await User.findOne({ where: { email: providedEmail } }).catch(() => null) : null) ||
      (await User.findOne({ where: { schoolId: op.schoolId, username: usernameRaw } }).catch(() => null)) ||
      (op.phone ? await User.findOne({ where: { schoolId: op.schoolId, phone: op.phone } }).catch(() => null) : null) ||
      null;

    if (!user) return res.status(404).json({ msg: 'Driver account not found' });
    if (String(user.schoolRole || '') !== 'سائق') return res.status(404).json({ msg: 'Driver account not found' });
    if (String(user.role || '') !== 'Driver') {
      user.role = 'Driver';
      await user.save();
    }
    if (!op.userId) {
      try {
        op.userId = user.id;
        await op.save({ returning: false });
      } catch {}
    }

    user.isActive = true;
    user.passwordMustChange = true;
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    try { user.lastInviteAt = new Date(); user.lastInviteChannel = 'manual'; } catch {}
    await user.save();

    const inviteToken = jwt.sign({ id: user.id, type: 'invite', targetRole: 'Driver', tokenVersion: user.tokenVersion || 0 }, JWT_SECRET, { expiresIn: '72h' });
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const baseEnv = process.env.FRONTEND_URL || '';
    const computedBase = (baseEnv || String(req.headers.origin || 'http://localhost:3000')).replace(/\/$/, '');
    if (!baseEnv && isProd) return res.status(500).json({ msg: 'FRONTEND_URL not configured' });
    const activationLink = `${computedBase}/set-password?token=${encodeURIComponent(inviteToken)}`;
    return res.json({ activationLink });
  } catch (e) {
    return res.status(500).json({ msg: 'Server Error', error: e?.message });
  }
});

router.put('/operator/:operatorId/reject', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireModule('transportation'), async (req, res) => {
  try {
    const op = await BusOperator.findByPk(req.params.operatorId, busOperatorQueryOptions);
    if (!op) return res.status(404).json({ msg: 'Operator not found' });
    if (!canAccessSchool(req.user, op.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const scopeCtx = await getUserScopeContext(req, Number(op.schoolId || 0));
    if (!canWriteToScopes(scopeCtx, { branchId: op.branchId || null, stageId: op.stageId || null, departmentId: op.departmentId || null })) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    op.status = 'Rejected';
    await op.save({ returning: false });
    res.json({ ...op.toJSON(), status: 'مرفوض' });
  } catch (e) { res.status(500).json({ msg: 'Server Error', error: e?.message }); }
});

router.get('/operator/:operatorId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireModule('transportation'), async (req, res) => {
  try {
    const op = await BusOperator.findByPk(req.params.operatorId, busOperatorQueryOptions);
    if (!op) return res.status(404).json({ msg: 'Operator not found' });
    if (!canAccessSchool(req.user, op.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const scopeCtx = await getUserScopeContext(req, Number(op.schoolId || 0));
    const scopeWhere = buildScopeWhere(scopeCtx);
    if (scopeWhere && !canWriteToScopes(scopeCtx, { branchId: op.branchId || null, stageId: op.stageId || null, departmentId: op.departmentId || null })) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    const statusMap = { 'Approved': 'معتمد', 'Pending': 'قيد المراجعة', 'Rejected': 'مرفوض' };
    return res.json({ ...op.toJSON(), status: statusMap[op.status] || op.status });
  } catch (e) {
    return res.status(500).json({ msg: 'Server Error', error: e?.message });
  }
});

router.put('/operator/:operatorId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireModule('transportation'), async (req, res) => {
  try {
    const op = await BusOperator.findByPk(req.params.operatorId, busOperatorQueryOptions);
    if (!op) return res.status(404).json({ msg: 'Operator not found' });
    if (!canAccessSchool(req.user, op.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const scopeCtx = await getUserScopeContext(req, Number(op.schoolId || 0));
    if (!canWriteToScopes(scopeCtx, { branchId: op.branchId || null, stageId: op.stageId || null, departmentId: op.departmentId || null })) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const fields = ['name', 'email', 'phone', 'licenseNumber', 'busPlateNumber', 'busModel', 'busCapacity'];
    let changed = false;
    for (const f of fields) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, f)) {
        const val = req.body[f];
        if (f === 'busCapacity') {
          const n = Number(val);
          if (!Number.isNaN(n) && n > 0) {
            op.busCapacity = n;
            changed = true;
          }
        } else if (f === 'email') {
          op.email = typeof val === 'string' ? String(val).trim() || null : (val === null ? null : op.email);
          changed = true;
        } else if (typeof val === 'string') {
          op[f] = String(val).trim();
          changed = true;
        }
      }
    }

    if (!changed) return res.status(400).json({ msg: 'No changes provided' });

    await op.save({ returning: false });

    if (op.userId) {
      try {
        const user = await User.findByPk(op.userId);
        if (user) {
          if (op.name) user.name = op.name;
          if (op.phone) user.phone = op.phone;
          if (typeof op.email === 'string' && op.email.trim()) {
            const emailLower = op.email.trim().toLowerCase();
            const existing = await User.findOne({ where: { email: emailLower } });
            if (existing && Number(existing.id) !== Number(user.id)) return res.status(409).json({ msg: 'Email already in use' });
            user.email = emailLower;
          }
          await user.save();
        }
      } catch {}
    }

    const statusMap = { 'Approved': 'معتمد', 'Pending': 'قيد المراجعة', 'Rejected': 'مرفوض' };
    return res.json({ ...op.toJSON(), status: statusMap[op.status] || op.status });
  } catch (e) {
    return res.status(500).json({ msg: 'Server Error', error: e?.message });
  }
});

router.delete('/operator/:operatorId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireModule('transportation'), async (req, res) => {
  try {
    const op = await BusOperator.findByPk(req.params.operatorId, busOperatorQueryOptions);
    if (!op) return res.status(404).json({ msg: 'Operator not found' });
    if (!canAccessSchool(req.user, op.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const scopeCtx = await getUserScopeContext(req, Number(op.schoolId || 0));
    if (!canWriteToScopes(scopeCtx, { branchId: op.branchId || null, stageId: op.stageId || null, departmentId: op.departmentId || null })) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    try {
      await Route.update({ busOperatorId: null }, { where: { schoolId: op.schoolId, busOperatorId: op.id } });
    } catch {}

    if (op.userId) {
      try {
        await User.update({ isActive: false }, { where: { id: op.userId } });
      } catch {}
    }

    await op.destroy();
    return res.json({ deleted: true });
  } catch (e) {
    return res.status(500).json({ msg: 'Server Error', error: e?.message });
  }
});

// --- Routes ---
router.get('/:schoolId/routes', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), async (req, res) => {
  try {
<<<<<<< HEAD
    const routes = await Route.findAll({ where: { schoolId: req.params.schoolId }, order: [['name', 'ASC']] });
=======
    const schoolId = Number.parseInt(String(req.params.schoolId), 10);
    const ctx = await getUserScopeContext(req, schoolId);
    const scopeWhere = buildScopeWhere(ctx);
    const where = scopeWhere ? { schoolId, ...scopeWhere } : { schoolId };
    const routes = await Route.findAll({ where, order: [['name','ASC']] });
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
    const payload = [];
    for (const r of routes) {
      const rs = await RouteStudent.findAll({ where: { routeId: r.id } });
      payload.push({ ...r.toJSON(), studentIds: rs.map(x => x.studentId) });
    }
    res.json(payload);
  } catch (e) { res.status(500).json({ msg: 'Server Error', error: e?.message }); }
});

router.post('/:schoolId/routes', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), validate([
  { name: 'name', required: true, type: 'string' },
  { name: 'busOperatorId', required: false, type: 'string' },
  { name: 'branchId', required: false, type: 'string' },
  { name: 'stageId', required: false, type: 'string' },
  { name: 'departmentId', required: false, type: 'string' },
]), async (req, res) => {
  try {
    const schoolId = Number.parseInt(String(req.params.schoolId), 10);
    const ctx = await getUserScopeContext(req, schoolId);
    if (!canWriteToScopes(ctx, { branchId: req.body.branchId || null, stageId: req.body.stageId || null, departmentId: req.body.departmentId || null })) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    const route = await Route.create({ id: `rt_${Date.now()}`, name: req.body.name, schoolId, busOperatorId: req.body.busOperatorId || null, departureTime: req.body.departureTime || null, stops: Array.isArray(req.body.stops) ? req.body.stops : [], branchId: req.body.branchId || null, stageId: req.body.stageId || null, departmentId: req.body.departmentId || null });
    res.status(201).json({ ...route.toJSON(), studentIds: [] });
  } catch (e) { res.status(500).json({ msg: 'Server Error', error: e?.message }); }
});

router.put('/:schoolId/routes/:routeId/students', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), validate([
  { name: 'studentIds', required: true },
]), async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.routeId);
    if (!route) return res.status(404).json({ msg: 'Route not found' });
    if (Number(route.schoolId || 0) !== Number(req.params.schoolId || 0)) return res.status(403).json({ msg: 'Access denied' });
    const scopeCtx = await getUserScopeContext(req, Number(req.params.schoolId));
    if (!canWriteToScopes(scopeCtx, { branchId: route.branchId || null, stageId: route.stageId || null, departmentId: route.departmentId || null })) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    // Replace assignments
    await RouteStudent.destroy({ where: { routeId: route.id } });
    const idsRaw = Array.isArray(req.body.studentIds) ? req.body.studentIds : [];
    const ids = Array.from(new Set(idsRaw.map(x => String(x)).filter(Boolean)));
    if (ids.length > 0) {
      const scopeWhere = buildScopeWhere(scopeCtx);
      const studentWhere = scopeWhere
        ? { schoolId: Number(req.params.schoolId), id: { [Op.in]: ids }, ...scopeWhere }
        : { schoolId: Number(req.params.schoolId), id: { [Op.in]: ids } };
      const found = await Student.findAll({ where: studentWhere, attributes: ['id'] });
      if ((found || []).length !== ids.length) return res.status(403).json({ msg: 'Access denied' });
      await RouteStudent.bulkCreate(ids.map(studentId => ({ routeId: route.id, studentId })));
    }
    res.json({ ...route.toJSON(), studentIds: ids });
  } catch (e) { res.status(500).json({ msg: 'Server Error', error: e?.message }); }
});

// Update route configuration (stops/departureTime/operator)
router.put('/:schoolId/routes/:routeId/config', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.routeId);
    if (!route) return res.status(404).json({ msg: 'Route not found' });
    if (Number(route.schoolId || 0) !== Number(req.params.schoolId || 0)) return res.status(403).json({ msg: 'Access denied' });
    const scopeCtx = await getUserScopeContext(req, Number(req.params.schoolId));
    const { name, busOperatorId, departureTime, stops } = req.body || {};
    if (!canWriteToScopes(scopeCtx, { branchId: route.branchId || null, stageId: route.stageId || null, departmentId: route.departmentId || null })) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    if (typeof name === 'string') route.name = name;
    if (busOperatorId !== undefined) route.busOperatorId = busOperatorId || null;
    if (typeof departureTime === 'string' || departureTime === null) route.departureTime = departureTime || null;
    if (stops !== undefined) route.stops = Array.isArray(stops) ? stops : route.stops;
    await route.save();
    const rs = await RouteStudent.findAll({ where: { routeId: route.id } });
    res.json({ ...route.toJSON(), studentIds: rs.map(x => x.studentId) });
  } catch (e) { res.status(500).send('Server Error'); }
});

// Parent transportation detail
router.get('/parent/:parentId', verifyToken, requireRole('PARENT'), requireModule('transportation'), async (req, res) => {
  try {
    if (String(req.user.parentId) !== String(req.params.parentId)) return res.status(403).json({ msg: 'Access denied' });
    const schoolId = Number(req.user.schoolId || 0);
    const pid = Number(req.params.parentId || 0);
    const map = new Map();
    try {
      const direct = await Student.findAll({ where: { schoolId, parentId: pid }, order: [['name', 'ASC']] }).catch(() => []);
      for (const s of direct || []) map.set(String(s.id), s);
    } catch {}
    try {
      const links = await ParentStudent.findAll({ where: { schoolId, parentId: pid, status: { [Op.ne]: 'inactive' } }, attributes: ['studentId'] }).catch(() => []);
      const ids = Array.from(new Set((links || []).map(x => String(x.studentId)).filter(Boolean)));
      if (ids.length > 0) {
        const extra = await Student.findAll({ where: { schoolId, id: { [Op.in]: ids } }, order: [['name', 'ASC']] }).catch(() => []);
        for (const s of extra || []) map.set(String(s.id), s);
      }
    } catch {}
    const student = Array.from(map.values())[0] || null;
    if (!student) return res.json(null);
    const ok = await canParentAccessStudent(req, schoolId, student.id);
    if (!ok) return res.status(403).json({ msg: 'Access denied' });
    const rs = await RouteStudent.findOne({ where: { studentId: student.id } });
    if (!rs) return res.json(null);
    const route = await Route.findByPk(rs.routeId);
    if (!route) return res.json(null);
    const operator = route.busOperatorId ? await BusOperator.findByPk(route.busOperatorId, busOperatorQueryOptions) : null;
    const statusMap = { 'Approved': 'معتمد', 'Pending': 'قيد المراجعة', 'Rejected': 'مرفوض' };
    let nearestStop = null;
    const stops = Array.isArray(route.stops) ? route.stops : [];
    const loc = student.homeLocation || {};
    const haversine = (lat1, lon1, lat2, lon2) => {
      const toRad = d => d * Math.PI / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      for (let i = 0; i < stops.length; i++) {
        const st = stops[i] || {};
        if (typeof st.lat !== 'number' || typeof st.lng !== 'number') continue;
        const d = haversine(loc.lat, loc.lng, st.lat, st.lng);
        if (!nearestStop || d < nearestStop.distanceKm) nearestStop = { name: st.name || '', lat: st.lat, lng: st.lng, time: st.time || null, distanceKm: Number(d.toFixed(2)) };
      }
    }
    res.json({ route: { ...route.toJSON(), studentIds: [] }, operator: operator ? { ...operator.toJSON(), status: statusMap[operator.status] } : null, nearestStop });
  } catch (e) { res.status(500).send('Server Error'); }
});

// Public Bus Operator Application
router.post('/operator/application', validate([
  { name: 'name', required: true, type: 'string' },
  { name: 'phone', required: true, type: 'string' },
  { name: 'licenseNumber', required: true, type: 'string' },
  { name: 'busPlateNumber', required: true, type: 'string' },
  { name: 'busCapacity', required: true },
  { name: 'busModel', required: true, type: 'string' },
  { name: 'schoolId', required: true },
]), async (req, res) => {
  try {
    const { schoolId, ...data } = req.body;
    const op = await BusOperator.create({
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...data,
      schoolId: parseInt(schoolId),
      status: 'Pending'
    });

    // Notify School Admin
    try {
      const { User, Notification } = require('../models');
      const schoolAdmins = await User.findAll({ where: { schoolId: schoolId, role: 'SCHOOL_ADMIN' } });
      for (const admin of schoolAdmins) {
        await Notification.create({
          type: 'Info', // Changed from DriverApplication to match DB Enum
          title: 'طلب انضمام سائق جديد',
          description: `تقدم ${data.name} بطلب للانضمام كأسطول نقل.`,
          userId: admin.id,
          isRead: false
        });
      }
    } catch (err) { console.error('Failed to notify admins', err); }

    res.status(201).json({ success: true, message: 'Application submitted successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server Error', error: e.message });
  }
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
    if (!canAccessSchool(req.user, route.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const ctx = await getUserScopeContext(req, Number(route.schoolId || 0));
    if (!canWriteToScopes(ctx, { branchId: route.branchId || null, stageId: route.stageId || null, departmentId: route.departmentId || null })) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    const rs = await RouteStudent.findAll({ where: { routeId: route.id } });
    const studentIds = rs.map(x => x.studentId);
    const scopeWhere = buildScopeWhere(ctx);
    const studentWhere = scopeWhere ? { id: studentIds, schoolId: Number(route.schoolId || 0), ...scopeWhere } : { id: studentIds, schoolId: Number(route.schoolId || 0) };
    const students = await Student.findAll({ where: studentWhere });
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

// Auto-assign students to routes based on location and capacity
router.post('/:schoolId/auto-assign', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const options = req.body || {};
    const mode = options.mode === 'text' ? 'text' : 'geo';
    const fillToCapacity = options.fillToCapacity !== false;
    const skipMissingLocation = options.skipMissingLocation !== false;

    const ctx = await getUserScopeContext(req, schoolId);
    const scopeWhere = buildScopeWhere(ctx);
    const routeWhere = scopeWhere ? { schoolId, ...scopeWhere } : { schoolId };
    const routes = await Route.findAll({ where: routeWhere });
    const routeMap = {};
    for (const r of routes) {
      routeMap[r.id] = { route: r, operator: null, capacity: Infinity, assignedCount: 0 };
    }
    const opsById = {};
    for (const r of routes) {
      if (r.busOperatorId) {
        const op = await BusOperator.findByPk(r.busOperatorId, busOperatorQueryOptions);
        if (op && op.status === 'Approved') {
          opsById[op.id] = op;
          const cnt = await RouteStudent.count({ where: { routeId: r.id } });
          routeMap[r.id].operator = op;
          routeMap[r.id].capacity = Number(op.busCapacity) || Infinity;
          routeMap[r.id].assignedCount = cnt;
        }
      }
    }

    const existingAssignments = await RouteStudent.findAll({ where: { routeId: routes.map(r => r.id) } });
    const alreadyAssigned = new Set(existingAssignments.map(x => x.studentId));

    const studentWhere = scopeWhere ? { schoolId, status: 'Active', ...scopeWhere } : { schoolId, status: 'Active' };
    const students = await Student.findAll({ where: studentWhere });
    const assigned = [];
    const skipped = [];

    const haversine = (lat1, lon1, lat2, lon2) => {
      const toRad = d => d * Math.PI / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const normalize = (s) => String(s || '').toLowerCase().trim();

    const fallbackToText = options.fallbackToText !== false;
    for (const s of students) {
      if (alreadyAssigned.has(s.id)) { skipped.push({ studentId: s.id, reason: 'already_assigned' }); continue; }
      const loc = s.homeLocation || {};
      let best = null;
      if (mode === 'geo' && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        for (const r of routes) {
          const meta = routeMap[r.id];
          if (!meta.operator) continue;
          const stops = Array.isArray(r.stops) ? r.stops : [];
          for (let i = 0; i < stops.length; i++) {
            const st = stops[i] || {};
            if (typeof st.lat !== 'number' || typeof st.lng !== 'number') continue;
            const d = haversine(loc.lat, loc.lng, st.lat, st.lng);
            if (!best || d < best.distance) best = { routeId: r.id, stopIndex: i, stopName: st.name || '', distance: d };
          }
        }
      } else if (mode === 'text') {
        const city = normalize(loc.city);
        const address = normalize(loc.address);
        for (const r of routes) {
          const meta = routeMap[r.id];
          if (!meta.operator) continue;
          const target = normalize(r.name);
          let score = 0;
          if (city && target.includes(city)) score += 2;
          if (address && target.includes(address)) score += 1;
          const stops = Array.isArray(r.stops) ? r.stops : [];
          for (let i = 0; i < stops.length; i++) {
            const st = stops[i] || {};
            const sn = normalize(st.name);
            if (city && sn.includes(city)) score += 2;
            if (address && sn.includes(address)) score += 1;
            if (score > 0 && (!best || score > best.score)) best = { routeId: r.id, stopIndex: i, stopName: st.name || '', score };
          }
        }
      } else {
        if (skipMissingLocation) { skipped.push({ studentId: s.id, reason: 'missing_location' }); continue; }
      }

      if (!best && mode === 'geo' && fallbackToText) {
        const city = normalize(loc.city);
        const address = normalize(loc.address);
        for (const r of routes) {
          const meta = routeMap[r.id];
          if (!meta.operator) continue;
          const target = normalize(r.name);
          let score = 0;
          if (city && target.includes(city)) score += 2;
          if (address && target.includes(address)) score += 1;
          const stops = Array.isArray(r.stops) ? r.stops : [];
          for (let i = 0; i < stops.length; i++) {
            const st = stops[i] || {};
            const sn = normalize(st.name);
            if (city && sn.includes(city)) score += 2;
            if (address && sn.includes(address)) score += 1;
            if (score > 0 && (!best || score > best.score)) best = { routeId: r.id, stopIndex: i, stopName: st.name || '', score };
          }
        }
      }
      if (!best) { skipped.push({ studentId: s.id, reason: mode === 'geo' ? 'no_stops_with_coords' : 'no_text_match' }); continue; }
      const meta = routeMap[best.routeId];
      if (fillToCapacity && meta.assignedCount >= meta.capacity) { skipped.push({ studentId: s.id, reason: 'route_full', routeId: best.routeId }); continue; }
      await RouteStudent.create({ routeId: best.routeId, studentId: s.id });
      meta.assignedCount += 1;
      assigned.push({ studentId: s.id, routeId: best.routeId, stopIndex: best.stopIndex ?? null, stopName: best.stopName || '', distanceKm: best.distance ? Number(best.distance.toFixed(2)) : undefined });
    }

    const capacityMap = {};
    for (const r of routes) {
      const meta = routeMap[r.id];
      capacityMap[r.id] = { capacity: meta.capacity, assigned: meta.assignedCount };
    }

    res.json({ assigned, skipped, capacityMap });
  } catch (e) { res.status(500).send('Server Error'); }
});

// Preview auto-assign without persisting
router.post('/:schoolId/auto-assign/preview', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const options = req.body || {};
    const mode = options.mode === 'text' ? 'text' : 'geo';
    const fillToCapacity = options.fillToCapacity !== false;
    const skipMissingLocation = options.skipMissingLocation !== false;

    const ctx = await getUserScopeContext(req, schoolId);
    const scopeWhere = buildScopeWhere(ctx);
    const routeWhere = scopeWhere ? { schoolId, ...scopeWhere } : { schoolId };
    const routes = await Route.findAll({ where: routeWhere });
    const routeMap = {};
    for (const r of routes) {
      routeMap[r.id] = { route: r, operator: null, capacity: Infinity, assignedCount: 0 };
    }
    for (const r of routes) {
      if (r.busOperatorId) {
        const op = await BusOperator.findByPk(r.busOperatorId, busOperatorQueryOptions);
        if (op && op.status === 'Approved') {
          const cnt = await RouteStudent.count({ where: { routeId: r.id } });
          routeMap[r.id].operator = op;
          routeMap[r.id].capacity = Number(op.busCapacity) || Infinity;
          routeMap[r.id].assignedCount = cnt;
        }
      }
    }

    const existingAssignments = await RouteStudent.findAll({ where: { routeId: routes.map(r => r.id) } });
    const alreadyAssigned = new Set(existingAssignments.map(x => x.studentId));

    const studentWhere = scopeWhere ? { schoolId, status: 'Active', ...scopeWhere } : { schoolId, status: 'Active' };
    const students = await Student.findAll({ where: studentWhere });
    const assigned = [];
    const skipped = [];

    const haversine = (lat1, lon1, lat2, lon2) => {
      const toRad = d => d * Math.PI / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const normalize = (s) => String(s || '').toLowerCase().trim();

    const fallbackToText = options.fallbackToText !== false;
    for (const s of students) {
      if (alreadyAssigned.has(s.id)) { skipped.push({ studentId: s.id, reason: 'already_assigned' }); continue; }
      const loc = s.homeLocation || {};
      let best = null;
      if (mode === 'geo' && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        for (const r of routes) {
          const meta = routeMap[r.id];
          if (!meta.operator) continue;
          const stops = Array.isArray(r.stops) ? r.stops : [];
          for (let i = 0; i < stops.length; i++) {
            const st = stops[i] || {};
            if (typeof st.lat !== 'number' || typeof st.lng !== 'number') continue;
            const d = haversine(loc.lat, loc.lng, st.lat, st.lng);
            if (!best || d < best.distance) best = { routeId: r.id, stopIndex: i, stopName: st.name || '', distance: d };
          }
        }
      } else if (mode === 'text') {
        const city = normalize(loc.city);
        const address = normalize(loc.address);
        for (const r of routes) {
          const meta = routeMap[r.id];
          if (!meta.operator) continue;
          const target = normalize(r.name);
          let score = 0;
          if (city && target.includes(city)) score += 2;
          if (address && target.includes(address)) score += 1;
          const stops = Array.isArray(r.stops) ? r.stops : [];
          for (let i = 0; i < stops.length; i++) {
            const st = stops[i] || {};
            const sn = normalize(st.name);
            if (city && sn.includes(city)) score += 2;
            if (address && sn.includes(address)) score += 1;
            if (score > 0 && (!best || score > best.score)) best = { routeId: r.id, stopIndex: i, stopName: st.name || '', score };
          }
        }
      } else {
        if (skipMissingLocation) { skipped.push({ studentId: s.id, reason: 'missing_location' }); continue; }
      }

      if (!best && mode === 'geo' && fallbackToText) {
        const city = normalize(loc.city);
        const address = normalize(loc.address);
        for (const r of routes) {
          const meta = routeMap[r.id];
          if (!meta.operator) continue;
          const target = normalize(r.name);
          let score = 0;
          if (city && target.includes(city)) score += 2;
          if (address && target.includes(address)) score += 1;
          const stops = Array.isArray(r.stops) ? r.stops : [];
          for (let i = 0; i < stops.length; i++) {
            const st = stops[i] || {};
            const sn = normalize(st.name);
            if (city && sn.includes(city)) score += 2;
            if (address && sn.includes(address)) score += 1;
            if (score > 0 && (!best || score > best.score)) best = { routeId: r.id, stopIndex: i, stopName: st.name || '', score };
          }
        }
      }
      if (!best) { skipped.push({ studentId: s.id, reason: mode === 'geo' ? 'no_stops_with_coords' : 'no_text_match' }); continue; }
      const meta = routeMap[best.routeId];
      if (fillToCapacity && meta.assignedCount >= meta.capacity) { skipped.push({ studentId: s.id, reason: 'route_full', routeId: best.routeId }); continue; }
      // simulate assignment without persisting
      meta.assignedCount += 1;
      assigned.push({ studentId: s.id, routeId: best.routeId, stopIndex: best.stopIndex ?? null, stopName: best.stopName || '', distanceKm: best.distance ? Number(best.distance.toFixed(2)) : undefined, score: best.score });
    }

    const capacityMap = {};
    for (const r of routes) {
      const meta = routeMap[r.id];
      capacityMap[r.id] = { capacity: meta.capacity, assigned: meta.assignedCount };
    }

    res.json({ assigned, skipped, capacityMap });
  } catch (e) { res.status(500).send('Server Error'); }
});
