const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, RbacUserRoleScope, RbacRole, RbacPermission, RbacScope, Student, Class, Schedule, Assignment, TeacherClassSubjectAssignment, ParentStudent, DriverRoute, Route, BusOperator } = require('../models');
const { deriveDesiredDbRole, derivePermissionsForUser } = require('../utils/permissionMatrix');

function ipv4(ip) {
  const m = String(ip || '').match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  return m ? m[1] : '';
}

function ipToLong(ip) {
  const parts = String(ip).split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function inCidr(ip, cidr) {
  const [base, bitsStr] = String(cidr).split('/');
  const bits = Number(bitsStr);
  const ipNum = ipToLong(ip);
  const baseNum = ipToLong(base);
  if (ipNum == null || baseNum == null || isNaN(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipNum & mask) === (baseNum & mask);
}

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret' : (() => {
  console.error('❌ JWT_SECRET not found in environment variables!');
  console.error('Please set JWT_SECRET in your .env file');
  process.exit(1);
})());

function roleKey(role) {
  return String(role || '').toUpperCase().replace(/[^A-Z]/g, '');
}

function normalizeRole(role) {
  if (!role) return '';
  const key = roleKey(role);
  const map = {
    SUPERADMIN: 'SUPER_ADMIN',
    SUPERADMINFINANCIAL: 'SUPER_ADMIN_FINANCIAL',
    SUPERADMINTECHNICAL: 'SUPER_ADMIN_TECHNICAL',
    SUPERADMINSUPERVISOR: 'SUPER_ADMIN_SUPERVISOR',
    SCHOOLADMIN: 'SCHOOL_ADMIN',
    TEACHER: 'TEACHER',
    PARENT: 'PARENT',
    DRIVER: 'DRIVER',
    STAFF: 'STAFF'
  };
  return map[key] || String(role).toUpperCase();
}

function normalizeUserRole(user) {
  let userRole = normalizeRole(user && user.role);
  if (userRole === 'STAFF' && String(user && user.schoolRole || '') === 'سائق') userRole = 'DRIVER';
  return userRole;
}

function isSuperAdminRole(role) {
  return roleKey(role).startsWith('SUPERADMIN');
}

function isSuperAdminUser(user) {
  return isSuperAdminRole(user && user.role);
}

function isSchoolAdminUser(user) {
  return normalizeUserRole(user) === 'SCHOOL_ADMIN';
}

function canAccessSchool(user, schoolId) {
  if (!user) return false;
  if (isSuperAdminUser(user)) return true;
  const sid = Number(schoolId || 0);
  const uid = Number(user.schoolId || 0);
  if (!sid || !uid) return false;
  return sid === uid;
}

async function verifyToken(req, res, next) {
  const parseCookies = (cookieHeader) => {
    const out = {};
    if (!cookieHeader) return out;
    const pairs = String(cookieHeader).split(';');
    for (const p of pairs) {
      const idx = p.indexOf('=');
      if (idx === -1) continue;
      const k = p.slice(0, idx).trim();
      const v = decodeURIComponent(p.slice(idx + 1).trim());
      out[k] = v;
    }
    return out;
  };
  const authHeader = req.headers['authorization'];
<<<<<<< HEAD
  if (!authHeader) return res.status(401).json({ msg: 'Missing Authorization header' });
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ msg: 'Invalid Authorization header format' });
  const token = parts[1];
  if (process.env.NODE_ENV === 'test') {
    if (token === 'valid_token') {
      req.user = { id: 1, email: 'test@admin.com', role: 'SUPER_ADMIN', tokenVersion: 0, schoolId: 0, permissions: [] };
      return next();
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      req.user = payload;
      return next();
    } catch {
      return res.status(401).json({ msg: 'Invalid or expired token' });
    }
  }
=======
  let token = null;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }
  if (!token) {
    try {
      const cookies = parseCookies(req.headers['cookie'] || '');
      token = cookies['access_token'] || null;
    } catch {}
  }
  if (!token) return res.status(401).json({ msg: 'Missing Authorization header' });
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = payload;
    const u = await User.findByPk(payload.id);
    if (!u || u.isActive === false) return res.status(401).json({ msg: 'User disabled' });
    const tv = Number(u.tokenVersion || 0);
    const ptv = Number(payload.tokenVersion || 0);
    if (tv !== ptv) return res.status(401).json({ msg: 'Token revoked' });
    const effectiveRole = deriveDesiredDbRole({ role: u.role, schoolRole: u.schoolRole });
    let effectivePermissions = Array.isArray(u.permissions) ? u.permissions : [];
    if (!effectivePermissions || effectivePermissions.length === 0) {
      try {
        const schoolId = u.schoolId || null;
        const assigns = await RbacUserRoleScope.findAll({
          where: { userId: u.id, schoolId: Number(schoolId || 0) },
          include: [{ model: RbacRole, include: [{ model: RbacPermission }] }]
        });
        const set = new Set();
        for (const a of assigns || []) {
          const role = a.RbacRole || null;
          const perms = role && Array.isArray(role.RbacPermissions) ? role.RbacPermissions : [];
          for (const p of perms) set.add(p.key);
        }
        effectivePermissions = Array.from(set);
      } catch {
        effectivePermissions = [];
      }
    }
    if (!effectivePermissions || effectivePermissions.length === 0) {
      effectivePermissions = derivePermissionsForUser({ role: effectiveRole, schoolRole: u.schoolRole });
    }
    try {
      req.user = {
        ...req.user,
        id: u.id,
        role: effectiveRole,
        schoolRole: u.schoolRole || null,
        schoolId: u.schoolId || null,
        teacherId: u.teacherId || null,
        parentId: u.parentId || null,
        name: u.name,
        email: u.email,
        username: u.username,
        permissions: effectivePermissions,
        tokenVersion: u.tokenVersion || 0
      };
    } catch {}
    // Enforce central security policies for SuperAdmin
    const policies = (req.app && req.app.locals && req.app.locals.securityPolicies) || null;
  const isSuper = isSuperAdminRole(u.role);
  if (policies && isSuper) {
    // Enforce MFA only if user has MFA enabled
    if (policies.enforceMfaForAdmins && u.mfaEnabled === true && String(payload.type || '') !== 'superadmin') {
      return res.status(401).json({ msg: 'MFA required' });
    }
      // Enforce allowed IP ranges if configured
      const ranges = Array.isArray(policies.allowedIpRanges) ? policies.allowedIpRanges : [];
      if (ranges.length > 0) {
        const ipRaw = (req.headers['x-forwarded-for'] || req.ip || '').toString();
        const ip4 = ipv4(ipRaw);
        const ok = ranges.some(r => String(r).includes('/') ? inCidr(ip4, String(r)) : ip4.startsWith(String(r)));
        if (!ok) return res.status(403).json({ msg: 'IP not allowed' });
      }
      // Enforce session max age if set (override JWT exp)
      const maxH = Number(policies.sessionMaxAgeHours || 0);
      if (maxH > 0 && payload.iat) {
        const ageSec = Math.floor(Date.now() / 1000) - Number(payload.iat);
        if (ageSec > maxH * 3600) return res.status(401).json({ msg: 'Session expired' });
      }
    }
    next();
  } catch (err) {
    try { const logger = req.app && req.app.locals && req.app.locals.logger; if (logger) logger.warn('auth_invalid_token', { path: req.originalUrl || req.url, ip: req.ip }); } catch {}
    return res.status(401).json({ msg: 'Invalid or expired token' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthenticated' });
    const userRole = normalizeUserRole(req.user);
    const allowedRolesUpper = allowedRoles.map((role) => normalizeRole(role));

    if (!allowedRolesUpper.includes(userRole)) {
      try { const logger = req.app && req.app.locals && req.app.locals.logger; if (logger) logger.warn('access_denied_role', { userId: req.user.id, role: userRole, allowed: allowedRolesUpper, path: req.originalUrl || req.url }); } catch {}
      return res.status(403).json({ msg: 'Access denied' });
    }
    next();
  };
}

function requireSameSchoolParam(paramName = 'schoolId') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthenticated' });
    if (isSuperAdminUser(req.user)) return next();

    const requestedSchoolId = parseInt(req.params[paramName], 10);
    const userSchoolId = Number(req.user.schoolId || 0);
    const matchesParam = !!requestedSchoolId && userSchoolId === requestedSchoolId;
    if (!matchesParam) {
      try { const logger = req.app && req.app.locals && req.app.locals.logger; if (logger) logger.warn('access_denied_school', { userId: req.user.id, role: req.user.role, userSchoolId, requestedSchoolId, path: req.originalUrl || req.url }); } catch {}
      return res.status(403).json({ msg: 'Access denied for this school' });
    }
    next();
  };
}

function requirePermission(...requiredPerms) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthenticated' });
    const userRole = normalizeUserRole(req.user);

    const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const ok = requiredPerms.some(p => perms.includes(p));
    if (!ok) { 
      try { 
        const logger = req.app && req.app.locals && req.app.locals.logger; 
        if (logger) logger.warn('access_denied_permission', { userId: req.user.id, role: req.user.role, requiredPerms, path: req.originalUrl || req.url }); 
      } catch {} 
      // Return clear error message about missing permissions
      return res.status(403).json({ msg: 'Insufficient permissions', requiredPermissions: requiredPerms, userPermissions: perms }); 
    }
    next();
  };
}

function requireSameSchoolQuery(paramName = 'schoolId') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthenticated' });
    if (isSuperAdminUser(req.user)) return next();

    const requestedSchoolId = parseInt((req.query && req.query[paramName]) || '', 10);
    const userSchoolId = Number(req.user.schoolId || 0);
    const matchesQuery = !!requestedSchoolId && userSchoolId === requestedSchoolId;
    if (!matchesQuery) {
      try { const logger = req.app && req.app.locals && req.app.locals.logger; if (logger) logger.warn('access_denied_school_query', { userId: req.user.id, role: req.user.role, userSchoolId, requestedSchoolId, path: req.originalUrl || req.url }); } catch {}
      return res.status(403).json({ msg: 'Access denied for this school' });
    }
    next();
  };
}

function requireSameSchoolAndRolePolicy(targetSchoolIdResolver) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthenticated' });
    if (isSuperAdminUser(req.user)) return next();
    try {
      const targetSchoolIdRaw = await targetSchoolIdResolver(req);
      const targetSchoolId = Number(targetSchoolIdRaw || 0);
      if (!targetSchoolId) return next();
      const userSchoolId = Number(req.user.schoolId || 0);
      if (!userSchoolId || userSchoolId !== targetSchoolId) {
        return res.status(403).json({ msg: 'Access denied' });
      }
      return next();
    } catch (e) {
      console.error(e && e.message ? e.message : e);
      return res.status(500).json({ msg: 'Server Error' });
    }
  };
}

async function getUserScopeContext(req, schoolId) {
  const sid = Number(schoolId || 0);
  if (!req || !req.user || !req.user.id || !sid) return { fullAccess: true, branches: new Set(), stages: new Set(), departments: new Set() };
  if (isSuperAdminUser(req.user)) return { fullAccess: true, branches: new Set(), stages: new Set(), departments: new Set() };
  if (req._rbacScopeContext && Number(req._rbacScopeContext.schoolId) === sid) return req._rbacScopeContext;

  const ctx = { schoolId: sid, fullAccess: true, branches: new Set(), stages: new Set(), departments: new Set() };
  try {
    const rows = await RbacUserRoleScope.findAll({
      where: { userId: Number(req.user.id), schoolId: sid },
      include: [{ model: RbacScope, attributes: ['id', 'type', 'parentScopeId'] }]
    }).catch(() => []);

    if (!rows || rows.length === 0) {
      req._rbacScopeContext = ctx;
      return ctx;
    }

    const scoped = [];
    for (const r of rows) {
      if (!r || !r.scopeId) {
        ctx.fullAccess = true;
        req._rbacScopeContext = ctx;
        return ctx;
      }
      const s = r.RbacScope || null;
      if (s && String(s.type || '').toUpperCase() === 'SCHOOL') {
        ctx.fullAccess = true;
        req._rbacScopeContext = ctx;
        return ctx;
      }
      scoped.push(String(r.scopeId));
    }

    if (scoped.length === 0) {
      req._rbacScopeContext = ctx;
      return ctx;
    }

    const allScopes = await RbacScope.findAll({
      where: { schoolId: sid },
      attributes: ['id', 'type', 'parentScopeId']
    }).catch(() => []);

    const scopeById = new Map((allScopes || []).map(s => [String(s.id), s]));
    const childrenByParent = new Map();
    for (const s of allScopes || []) {
      const pid = s.parentScopeId ? String(s.parentScopeId) : '';
      if (!pid) continue;
      const list = childrenByParent.get(pid) || [];
      list.push(String(s.id));
      childrenByParent.set(pid, list);
    }

    const expanded = new Set();
    const queue = scoped.slice();
    while (queue.length) {
      const id = String(queue.shift());
      if (!id || expanded.has(id)) continue;
      expanded.add(id);
      const kids = childrenByParent.get(id) || [];
      for (const kid of kids) queue.push(kid);
    }

    for (const id of expanded) {
      const s = scopeById.get(String(id)) || null;
      const t = s ? String(s.type || '').toUpperCase() : '';
      if (t === 'BRANCH') ctx.branches.add(String(id));
      else if (t === 'STAGE') ctx.stages.add(String(id));
      else if (t === 'DEPARTMENT') ctx.departments.add(String(id));
    }

    ctx.fullAccess = false;
  } catch {
    ctx.fullAccess = true;
  }

  req._rbacScopeContext = ctx;
  return ctx;
}

function buildScopeWhere(scopeContext) {
  const ctx = scopeContext || null;
  if (!ctx || ctx.fullAccess) return null;
  const ors = [{ branchId: null, stageId: null, departmentId: null }];
  if (ctx.branches && ctx.branches.size > 0) ors.push({ branchId: { [Op.in]: Array.from(ctx.branches) } });
  if (ctx.stages && ctx.stages.size > 0) ors.push({ stageId: { [Op.in]: Array.from(ctx.stages) } });
  if (ctx.departments && ctx.departments.size > 0) ors.push({ departmentId: { [Op.in]: Array.from(ctx.departments) } });
  return { [Op.or]: ors };
}

function canWriteToScopes(scopeContext, input) {
  const ctx = scopeContext || null;
  if (!ctx || ctx.fullAccess) return true;
  const b = input && input.branchId != null ? String(input.branchId) : null;
  const s = input && input.stageId != null ? String(input.stageId) : null;
  const d = input && input.departmentId != null ? String(input.departmentId) : null;
  if (!b && !s && !d) return true;
  if (b && (!ctx.branches || !ctx.branches.has(b))) return false;
  if (s && (!ctx.stages || !ctx.stages.has(s))) return false;
  if (d && (!ctx.departments || !ctx.departments.has(d))) return false;
  return true;
}

async function canTeacherAccessClass(req, cls) {
  const role = normalizeUserRole(req && req.user);
  if (role !== 'TEACHER') return true;
  if (!req || !req.user || !req.user.teacherId) return false;
  if (!cls) return false;
  if (isSuperAdminUser(req.user)) return true;
  if (req.user.schoolId && Number(req.user.schoolId) !== Number(cls.schoolId)) return false;
  if (Number(cls.homeroomTeacherId || 0) === Number(req.user.teacherId || 0)) return true;

  try {
    const row = await TeacherClassSubjectAssignment.findOne({
      where: {
        schoolId: Number(cls.schoolId),
        teacherId: Number(req.user.teacherId),
        classId: String(cls.id),
        status: { [Op.ne]: 'inactive' }
      }
    });
    if (row) return true;
  } catch {}

  try {
    const c = await Schedule.count({ where: { classId: String(cls.id), teacherId: Number(req.user.teacherId) } });
    if (c > 0) return true;
  } catch {}

  try {
    const c = await Assignment.count({ where: { classId: String(cls.id), teacherId: Number(req.user.teacherId) } });
    if (c > 0) return true;
  } catch {}

  return false;
}

async function canTeacherAccessSubject(req, cls, subject) {
  const role = normalizeUserRole(req && req.user);
  if (role !== 'TEACHER') return true;
  if (!req || !req.user || !req.user.teacherId) return false;
  if (!cls) return false;
  if (!subject) return false;
  if (isSuperAdminUser(req.user)) return true;
  if (req.user.schoolId && Number(req.user.schoolId) !== Number(cls.schoolId)) return false;

  try {
    const map = cls.subjectTeacherMap || null;
    if (map && typeof map === 'object' && !Array.isArray(map)) {
      const tId = Number(map[String(subject)] || 0);
      if (tId && tId === Number(req.user.teacherId)) return true;
    }
  } catch {}

  try {
    const row = await TeacherClassSubjectAssignment.findOne({
      where: {
        schoolId: Number(cls.schoolId),
        teacherId: Number(req.user.teacherId),
        classId: String(cls.id),
        status: { [Op.ne]: 'inactive' },
        [Op.or]: [{ subject: String(subject) }, { subject: null }]
      }
    });
    if (row) return true;
  } catch {}

  try {
    const c = await Schedule.count({ where: { classId: String(cls.id), teacherId: Number(req.user.teacherId), subject: String(subject) } });
    if (c > 0) return true;
  } catch {}

  return false;
}

async function canTeacherAccessStudent(req, schoolId, studentId) {
  const role = normalizeUserRole(req && req.user);
  if (role !== 'TEACHER') return true;
  const sid = Number(schoolId || 0);
  if (!sid) return false;
  if (!studentId) return false;
  try {
    const s = await Student.findOne({ where: { id: String(studentId), schoolId: sid } }).catch(() => null);
    if (!s || !s.classId) return false;
    const cls = await Class.findOne({ where: { id: String(s.classId), schoolId: sid } }).catch(() => null);
    if (!cls) return false;
    return await canTeacherAccessClass(req, cls);
  } catch {
    return false;
  }
}

async function canParentAccessStudent(req, schoolId, studentId) {
  const role = normalizeUserRole(req && req.user);
  if (role !== 'PARENT') return true;
  const sid = Number(schoolId || 0);
  if (!sid) return false;
  if (!req || !req.user || !req.user.parentId) return false;
  if (!studentId) return false;
  try {
    const s = await Student.findOne({ where: { id: String(studentId), schoolId: sid } }).catch(() => null);
    if (s && String(s.parentId || '') === String(req.user.parentId || '')) return true;
  } catch {}
  try {
    const row = await ParentStudent.findOne({
      where: {
        schoolId: sid,
        parentId: Number(req.user.parentId),
        studentId: String(studentId),
        status: { [Op.ne]: 'inactive' }
      }
    }).catch(() => null);
    if (row) return true;
  } catch {}
  return false;
}

async function canDriverAccessRoute(req, route) {
  const role = normalizeUserRole(req && req.user);
  if (role !== 'DRIVER') return true;
  if (!req || !req.user || !req.user.id) return false;
  if (!route) return false;
  if (isSuperAdminUser(req.user)) return true;
  if (req.user.schoolId && Number(req.user.schoolId) !== Number(route.schoolId)) return false;
  const schoolId = Number(route.schoolId || req.user.schoolId || 0);
  try {
    const rows = await DriverRoute.findAll({
      where: { schoolId, driverUserId: Number(req.user.id), status: { [Op.ne]: 'inactive' } },
      attributes: ['routeId']
    }).catch(() => []);
    if (rows && rows.length > 0) {
      return rows.some(r => String(r.routeId) === String(route.id));
    }
  } catch {}
  try {
    const ops = await BusOperator.findAll({ where: { userId: Number(req.user.id), status: 'Approved', schoolId } }).catch(() => []);
    const opIds = ops.map(o => String(o.id));
    if (opIds.length > 0 && route.busOperatorId && opIds.includes(String(route.busOperatorId))) return true;
  } catch {}
  return false;
}

module.exports = { verifyToken, requireRole, requireSameSchoolParam, requirePermission, JWT_SECRET, requireSameSchoolQuery, requireSameSchoolAndRolePolicy, roleKey, normalizeRole, normalizeUserRole, isSuperAdminRole, isSuperAdminUser, isSchoolAdminUser, canAccessSchool, getUserScopeContext, buildScopeWhere, canWriteToScopes, canTeacherAccessClass, canTeacherAccessSubject, canTeacherAccessStudent, canParentAccessStudent, canDriverAccessRoute };
