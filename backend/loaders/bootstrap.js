const { User, RbacPermission, RbacRole, RbacRolePermission, SecurityPolicy, sequelize } = require('../models');
const { ALL_PERMISSIONS, derivePermissionsForUser, normalizeDbRole } = require('../utils/permissionMatrix');
const { Op } = require('sequelize');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const init = async (logger) => {
    // 1. Ensure Custom Limits column exists (DB Schema Fix)
    try {
        const queryInterface = sequelize.getQueryInterface();
        // Logic for Schema Fixes if needed (omitted for brevity, can be in migrations)
    } catch { }

    // 2. Ensure RBAC Permissions
    try {
        const existing = await RbacPermission.findAll({ attributes: ['key'] });
        const existingKeys = new Set(existing.map(p => String(p.key)));
        const toAdd = (Array.isArray(ALL_PERMISSIONS) ? ALL_PERMISSIONS : []).filter(k => !existingKeys.has(String(k)));
        if (toAdd.length > 0) {
            const display = { VIEW_CONTENT: 'عرض المحتوى', MANAGE_CONTENT: 'إدارة المحتوى' };
            const rows = toAdd.map(k => ({
                id: `perm_${String(k).toLowerCase().replace(/[^a-z0-9_]+/g, '_')}`,
                key: String(k), name: display[String(k)] || String(k).replace(/_/g, ' '), description: null, isSystem: true, createdAt: new Date(), updatedAt: new Date()
            }));
            await RbacPermission.bulkCreate(rows, { ignoreDuplicates: true });
        }
    } catch (e) { logger?.warn('Bootstrap Permissions Error', e); }

    // 3. SuperAdmin Perms Update
    try {
        const users = await User.findAll({ where: { role: { [Op.in]: ['SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor'] } }, order: [['id', 'ASC']] });
        for (const user of users) {
            const recommended = derivePermissionsForUser({ role: normalizeDbRole(user.role) });
            const current = Array.isArray(user.permissions) ? user.permissions : [];
            const next = Array.from(new Set([...current, ...recommended]));
            if (JSON.stringify(current.sort()) !== JSON.stringify(next.sort())) {
                user.permissions = next;
                await user.save();
            }
        }
    } catch (e) { logger?.warn('Bootstrap SuperAdmin Perms Error', e); }

    // 4. Content Manager Role
    try {
        const roleKey = 'CONTENT_MANAGER';
        let role = await RbacRole.findOne({ where: { key: roleKey, schoolId: null } });
        if (!role) { role = await RbacRole.create({ id: 'role_' + Date.now(), key: roleKey, name: 'مدير محتوى', description: 'يدير المحتوى العام للنظام', schoolId: null, isSystem: true }); }
        // Assign perms
        const desiredKeys = ['VIEW_DASHBOARD', 'VIEW_CONTENT', 'MANAGE_CONTENT'];
        const perms = await RbacPermission.findAll({ where: { key: { [Op.in]: desiredKeys } } });
        if (perms.length) {
            await RbacRolePermission.destroy({ where: { roleId: String(role.id) } });
            await RbacRolePermission.bulkCreate(perms.map(p => ({ id: crypto.randomUUID(), roleId: String(role.id), permissionId: String(p.id) })), { ignoreDuplicates: true });
        }
    } catch (e) { logger?.warn('Bootstrap ContentManager Error', e); }

    // 5. Create Default SuperAdmin
    try {
        const email = process.env.SUPER_ADMIN_EMAIL;
        const pwd = process.env.SUPER_ADMIN_PASSWORD;
        if (email && pwd) {
            const hashed = await bcrypt.hash(pwd, 10);
            let u = await User.findOne({ where: { email } });
            if (!u) { await User.create({ name: 'المدير العام', email, username: email, password: hashed, role: 'SuperAdmin' }); }
            else {
                if (!String(u.password).startsWith('$2')) await u.update({ password: hashed });
                if (u.role !== 'SuperAdmin') await u.update({ role: 'SuperAdmin' });
            }
        }
    } catch (e) { logger?.warn('Bootstrap Default SuperAdmin Error', e); }
};

module.exports = { init };
