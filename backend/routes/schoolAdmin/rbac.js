const express = require('express');
const router = express.Router({ mergeParams: true });
const { sequelize, User, RbacRole, RbacPermission, RbacRolePermission, RbacScope, RbacUserRoleScope } = require('../../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

// Helper Functions
function normalizeRbacKey(input) {
  return String(input || '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}

async function ensureSchoolRootScope(schoolId) {
  const sid = Number(schoolId);
  if (!sid) return null;
  const existing = await RbacScope.findOne({ where: { schoolId: sid, type: 'SCHOOL', key: 'root' } }).catch(() => null);
  if (existing) return existing;
  const id = `scope_${sid}_school_root`;
  const created = await RbacScope.create({ id, schoolId: sid, type: 'SCHOOL', key: 'root', name: 'School', parentScopeId: null }).catch(() => null);
  return created;
}

async function computeUserPermissionsFromAssignments(userId, schoolId) {
  const sid = Number(schoolId);
  if (!sid || !userId) return [];
  const assigns = await RbacUserRoleScope.findAll({
    where: { userId: Number(userId), schoolId: sid },
    include: [{ model: RbacRole, include: [{ model: RbacPermission, attributes: ['key'] }] }]
  }).catch(() => []);
  const set = new Set();
  for (const a of assigns || []) {
    const role = a.RbacRole || null;
    const perms = role && Array.isArray(role.RbacPermissions) ? role.RbacPermissions : [];
    for (const p of perms) set.add(p.key);
  }
  return Array.from(set);
}

function isSuperAdminUser(user) {
  return user && (user.role === 'SuperAdmin' || user.role === 'SUPER_ADMIN');
}

function canAccessSchool(user, schoolId) {
  if (isSuperAdminUser(user)) return true;
  return Number(user.schoolId) === Number(schoolId);
}

// Routes

// Get All Permissions
router.get('/permissions', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_SETTINGS'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const list = await RbacPermission.findAll({ order: [['key', 'ASC']] }).catch(() => []);
    return res.json((list || []).map(x => x.toJSON()));
  } catch {
    return res.status(500).json({ msg: 'Server Error' });
  }
});

// Get Roles
router.get('/roles', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_SETTINGS'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const list = await RbacRole.findAll({
      where: { [Op.or]: [{ schoolId: null }, { schoolId }] },
      order: [['key', 'ASC']]
    }).catch(() => []);
    return res.json((list || []).map(x => x.toJSON()));
  } catch {
    return res.status(500).json({ msg: 'Server Error' });
  }
});

// Create Role
router.post('/roles', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_SETTINGS'), requireSameSchoolParam('schoolId'), validate([
  { name: 'key', required: true, type: 'string', minLength: 2 },
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'description', required: false, type: 'string' },
]), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const baseKey = normalizeRbacKey(req.body.key);
    if (!baseKey) return res.status(400).json({ msg: 'Invalid key' });
    const key = isSuperAdminUser(req.user) ? baseKey : `SCHOOL_${schoolId}_${baseKey}`;
    const exists = await RbacRole.findOne({ where: { key } }).catch(() => null);
    if (exists) return res.status(409).json({ msg: 'Role key already exists' });
    const id = crypto.randomUUID();
    const row = await RbacRole.create({
      id,
      schoolId: isSuperAdminUser(req.user) ? null : schoolId,
      key,
      name: String(req.body.name),
      description: req.body.description ? String(req.body.description) : null,
      isSystem: false
    });
    return res.status(201).json(row.toJSON());
  } catch {
    return res.status(500).json({ msg: 'Server Error' });
  }
});

// Update Role Permissions
router.put('/roles/:roleId/permissions', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_SETTINGS'), requireSameSchoolParam('schoolId'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const schoolId = Number(req.params.schoolId);
    const roleId = String(req.params.roleId || '');
    const role = await RbacRole.findByPk(roleId, { transaction });
    if (!role) { await transaction.rollback(); return res.status(404).json({ msg: 'Role not found' }); }
    if (role.schoolId !== null && !canAccessSchool(req.user, role.schoolId)) {
      await transaction.rollback();
      return res.status(403).json({ msg: 'Access denied' });
    }
    const keys = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const permKeys = keys.map(normalizeRbacKey).filter(Boolean);
    const perms = await RbacPermission.findAll({ where: { key: { [Op.in]: permKeys } }, transaction });
    await RbacRolePermission.destroy({ where: { roleId }, transaction });
    const now = new Date();
    const rows = perms.map(p => ({
      id: crypto.randomUUID(),
      roleId,
      permissionId: p.id,
      createdAt: now,
      updatedAt: now
    }));
    if (rows.length) await RbacRolePermission.bulkCreate(rows, { transaction });
    await transaction.commit();
    const updated = await RbacRole.findByPk(roleId, { include: [{ model: RbacPermission }], order: [[RbacPermission, 'key', 'ASC']] }).catch(() => null);
    return res.json(updated ? updated.toJSON() : { updated: true });
  } catch {
    try { await transaction.rollback(); } catch { }
    return res.status(500).json({ msg: 'Server Error' });
  }
});

// Get Scopes
router.get('/scopes', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_SETTINGS'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    await ensureSchoolRootScope(schoolId);
    const list = await RbacScope.findAll({ where: { schoolId }, order: [['type', 'ASC'], ['key', 'ASC']] }).catch(() => []);
    return res.json((list || []).map(x => x.toJSON()));
  } catch {
    return res.status(500).json({ msg: 'Server Error' });
  }
});

// Create Scope
router.post('/scopes', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_SETTINGS'), requireSameSchoolParam('schoolId'), validate([
  { name: 'type', required: true, type: 'string' },
  { name: 'key', required: true, type: 'string', minLength: 1 },
  { name: 'name', required: true, type: 'string', minLength: 1 },
  { name: 'parentScopeId', required: false, type: 'string' },
]), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const type = String(req.body.type || '').trim().toUpperCase();
    const allowed = new Set(['SCHOOL', 'BRANCH', 'STAGE', 'DEPARTMENT']);
    if (!allowed.has(type)) return res.status(400).json({ msg: 'Invalid scope type' });
    const key = String(req.body.key || '').trim();
    if (!key) return res.status(400).json({ msg: 'Invalid scope key' });
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ msg: 'Invalid scope name' });
    const parentScopeId = req.body.parentScopeId ? String(req.body.parentScopeId) : null;
    const exists = await RbacScope.findOne({ where: { schoolId, type, key } }).catch(() => null);
    if (exists) return res.status(409).json({ msg: 'Scope already exists' });
    const id = crypto.randomUUID();
    const row = await RbacScope.create({ id, schoolId, type, key, name, parentScopeId });
    return res.status(201).json(row.toJSON());
  } catch {
    return res.status(500).json({ msg: 'Server Error' });
  }
});

// Get User Roles
router.get('/users/:userId/roles', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_SETTINGS'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const userId = Number(req.params.userId);
    const rows = await RbacUserRoleScope.findAll({
      where: { schoolId, userId },
      include: [{ model: RbacRole }, { model: RbacScope }],
      order: [['createdAt', 'ASC']]
    }).catch(() => []);
    return res.json((rows || []).map(x => x.toJSON()));
  } catch {
    return res.status(500).json({ msg: 'Server Error' });
  }
});

// Assign User Roles
router.put('/users/:userId/roles', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_SETTINGS'), requireSameSchoolParam('schoolId'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const schoolId = Number(req.params.schoolId);
    const userId = Number(req.params.userId);
    const user = await User.findOne({ where: { id: userId, schoolId }, transaction });
    if (!user) { await transaction.rollback(); return res.status(404).json({ msg: 'User not found' }); }

    const assignments = Array.isArray(req.body.assignments) ? req.body.assignments : [];
    const normalized = assignments
      .map(a => ({
        roleId: a && a.roleId ? String(a.roleId) : '',
        scopeId: a && a.scopeId ? String(a.scopeId) : null,
      }))
      .filter(a => a.roleId);

    const roleIds = Array.from(new Set(normalized.map(a => a.roleId)));
    const scopeIds = Array.from(new Set(normalized.map(a => a.scopeId).filter(Boolean)));

    const roles = await RbacRole.findAll({ where: { id: { [Op.in]: roleIds } }, transaction });
    const rolesById = new Map(roles.map(r => [String(r.id), r]));
    for (const rid of roleIds) {
      const r = rolesById.get(String(rid));
      if (!r) { await transaction.rollback(); return res.status(400).json({ msg: 'Invalid roleId' }); }
      if (r.schoolId !== null && !canAccessSchool(req.user, r.schoolId)) {
        await transaction.rollback();
        return res.status(403).json({ msg: 'Access denied' });
      }
    }

    if (scopeIds.length > 0) {
      const scopes = await RbacScope.findAll({ where: { id: { [Op.in]: scopeIds }, schoolId }, transaction });
      const scopeSet = new Set(scopes.map(s => String(s.id)));
      for (const sid of scopeIds) {
        if (!scopeSet.has(String(sid))) { await transaction.rollback(); return res.status(400).json({ msg: 'Invalid scopeId' }); }
      }
    }

    await RbacUserRoleScope.destroy({ where: { userId, schoolId }, transaction });
    const now = new Date();
    const rows = normalized.map(a => ({
      id: crypto.randomUUID(),
      userId,
      schoolId,
      roleId: a.roleId,
      scopeId: a.scopeId || null,
      createdAt: now,
      updatedAt: now
    }));
    if (rows.length) await RbacUserRoleScope.bulkCreate(rows, { transaction });

    const computed = await computeUserPermissionsFromAssignments(userId, schoolId);
    user.permissions = computed;
    await user.save({ transaction });
    await transaction.commit();
    return res.json({ userId, schoolId, permissions: computed, assignments: rows });
  } catch {
    try { await transaction.rollback(); } catch { }
    return res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
