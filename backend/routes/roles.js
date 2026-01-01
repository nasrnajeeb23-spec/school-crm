const express = require('express');
const router = express.Router();
const { verifyToken, requireRole, isSuperAdminUser } = require('../middleware/auth');
const { sequelize, RbacRole, RbacUserRoleScope, RbacPermission, RbacRolePermission } = require('../models');
const { Op } = require('sequelize');

// Static fallback data
const rolesData = [
    { id: 'super_admin', name: 'مدير عام (Super Admin)', description: 'يمتلك صلاحيات كاملة على النظام، بما في ذلك إدارة المدارس والاشتراكات والخطط.', userCount: 1 },
    { id: 'school_admin', name: 'مدير مدرسة', description: 'يدير مدرسة واحدة بشكل كامل، بما في ذلك الطلاب والمعلمين والصفوف والمالية.', userCount: 8 },
    { id: 'teacher', name: 'معلم', description: 'يدير صفوفه، ويسجل الحضور والدرجات، ويتواصل مع أولياء الأمور.', userCount: 294 },
    { id: 'parent', name: 'ولي أمر', description: 'يتابع تقدم أبنائه، ويطلع على الدرجات والغياب، ويتواصل مع المدرسة.', userCount: 4250 },
    { id: 'student', name: 'طالب', description: 'يطلع على جدوله ودرجاته والمواد الدراسية الخاصة به.', userCount: 5200 },
];

// @route   GET api/roles
// @desc    Get all user roles (Scoped for SchoolAdmin)
// @access  Private (SuperAdmin or SchoolAdmin)
router.get('/', verifyToken, requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        let where = {};
        
        // If School Admin, only show roles for their school OR global system roles (optional, usually they just see their own or global roles are hidden/read-only)
        // For simplicity: 
        // SuperAdmin sees all.
        // SchoolAdmin sees roles where schoolId == their schoolId OR schoolId is NULL (global roles)
        
        if (!isSuperAdminUser(req.user)) {
            const userSchoolId = Number(req.user.schoolId || 0);
            where = {
                [Op.or]: [
                    { schoolId: userSchoolId },
                    { schoolId: null } // System roles
                ]
            };
        }

        const roles = await RbacRole.findAll({ 
            where,
            order: [['key', 'ASC']] 
        });
        
        if (!roles || roles.length === 0) {
            return res.json(rolesData);
        }

        // Count users for these roles
        // Ideally scoped to the school if SchoolAdmin
        let countWhere = {};
        if (!isSuperAdminUser(req.user)) {
            countWhere = { schoolId: Number(req.user.schoolId || 0) };
        }

        const counts = await RbacUserRoleScope.findAll({
            attributes: [
                'roleId',
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('userId'))), 'userCount']
            ],
            where: countWhere,
            group: ['roleId'],
            raw: true
        }).catch(() => []);
        
        const countByRoleId = new Map((counts || []).map(r => [String(r.roleId), Number(r.userCount || 0)]));
        
        const payload = roles.map(r => ({
            id: String(r.id),
            name: r.name,
            description: r.description,
            userCount: countByRoleId.get(String(r.id)) || 0,
            key: r.key,
            schoolId: r.schoolId
        }));
        
        return res.json(payload);
    } catch (e) {
        console.error('Error fetching roles:', e);
        return res.json(rolesData);
    }
});

// @route   POST api/roles
// @desc    Create a new role
// @access  Private (SuperAdmin or SchoolAdmin)
router.post('/', verifyToken, requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { name, description, key, schoolId } = req.body;
        
        if (!name || !key) {
            return res.status(400).json({ msg: 'Name and Key are required' });
        }

        let targetSchoolId = null;
        if (isSuperAdminUser(req.user)) {
            targetSchoolId = schoolId || null; // SuperAdmin can create global or specific school role
        } else {
            targetSchoolId = Number(req.user.schoolId); // SchoolAdmin creates for their school only
        }

        // Unique check might need to be scoped? 
        // Assuming key is unique globally for simplicity or we can scope it.
        // Current model has unique: true on key. So keys must be unique system-wide.
        // We might want to prefix keys for schools? e.g. school_1_manager
        
        const existingRole = await RbacRole.findOne({ where: { key } });
        if (existingRole) {
            return res.status(400).json({ msg: 'Role key already exists' });
        }

        const role = await RbacRole.create({
            id: 'role_' + Date.now() + Math.random().toString(36).slice(2, 6),
            name,
            description,
            key,
            schoolId: targetSchoolId
        });

        return res.status(201).json({
            id: String(role.id),
            name: role.name,
            description: role.description,
            key: role.key,
            userCount: 0
        });
    } catch (e) {
        console.error('Error creating role:', e);
        return res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT api/roles/:id
// @desc    Update a role
// @access  Private (SuperAdmin or SchoolAdmin)
router.put('/:id', verifyToken, requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { name, description } = req.body;
        const role = await RbacRole.findByPk(req.params.id);

        if (!role) {
            return res.status(404).json({ msg: 'Role not found' });
        }

        // Check ownership
        if (!isSuperAdminUser(req.user)) {
            if (Number(role.schoolId) !== Number(req.user.schoolId)) {
                return res.status(403).json({ msg: 'Access denied: Cannot edit global roles or other school roles' });
            }
        }

        if (name) role.name = name;
        if (description !== undefined) role.description = description;

        await role.save();

        return res.json({
            id: String(role.id),
            name: role.name,
            description: role.description,
            key: role.key
        });
    } catch (e) {
        console.error('Error updating role:', e);
        return res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE api/roles/:id
// @desc    Delete a role
// @access  Private (SuperAdmin or SchoolAdmin)
router.delete('/:id', verifyToken, requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const role = await RbacRole.findByPk(req.params.id);

        if (!role) {
            return res.status(404).json({ msg: 'Role not found' });
        }

        // Check ownership
        if (!isSuperAdminUser(req.user)) {
            if (Number(role.schoolId) !== Number(req.user.schoolId)) {
                return res.status(403).json({ msg: 'Access denied: Cannot delete global roles or other school roles' });
            }
        }

        await role.destroy();

        return res.json({ msg: 'Role deleted' });
    } catch (e) {
        console.error('Error deleting role:', e);
        return res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/roles/permissions
// @desc    Get all available permissions
// @access  Private (SuperAdmin or SchoolAdmin)
router.get('/permissions', verifyToken, requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const permissions = await RbacPermission.findAll();
        return res.json(permissions);
    } catch (e) {
        console.error('Error fetching permissions:', e);
        return res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/roles/:id/permissions
// @desc    Assign permissions to a role
// @access  Private (SuperAdmin or SchoolAdmin)
router.post('/:id/permissions', verifyToken, requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { permissionIds } = req.body; // Array of permission IDs
        const roleId = req.params.id;

        const role = await RbacRole.findByPk(roleId);
        if (!role) {
            return res.status(404).json({ msg: 'Role not found' });
        }

        // Check ownership
        if (!isSuperAdminUser(req.user)) {
            if (Number(role.schoolId) !== Number(req.user.schoolId)) {
                return res.status(403).json({ msg: 'Access denied: Cannot modify permissions for this role' });
            }
        }

        // Clear existing permissions
        await RbacRolePermission.destroy({ where: { roleId } });

        // Add new permissions
        if (Array.isArray(permissionIds) && permissionIds.length > 0) {
            const rolePermissions = permissionIds.map(permId => ({
                roleId,
                permissionId: permId
            }));
            await RbacRolePermission.bulkCreate(rolePermissions);
        }

        return res.json({ msg: 'Permissions updated successfully' });
    } catch (e) {
        console.error('Error assigning permissions:', e);
        return res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
