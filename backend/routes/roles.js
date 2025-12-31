const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { sequelize, RbacRole, RbacUserRoleScope } = require('../models');

// This is a static list for now, can be moved to DB later.
const rolesData = [
    { id: 'super_admin', name: 'مدير عام (Super Admin)', description: 'يمتلك صلاحيات كاملة على النظام، بما في ذلك إدارة المدارس والاشتراكات والخطط.', userCount: 1 },
    { id: 'school_admin', name: 'مدير مدرسة', description: 'يدير مدرسة واحدة بشكل كامل، بما في ذلك الطلاب والمعلمين والصفوف والمالية.', userCount: 8 },
    { id: 'teacher', name: 'معلم', description: 'يدير صفوفه، ويسجل الحضور والدرجات، ويتواصل مع أولياء الأمور.', userCount: 294 },
    { id: 'parent', name: 'ولي أمر', description: 'يتابع تقدم أبنائه، ويطلع على الدرجات والغياب، ويتواصل مع المدرسة.', userCount: 4250 },
    { id: 'student', name: 'طالب', description: 'يطلع على جدوله ودرجاته والمواد الدراسية الخاصة به.', userCount: 5200 },
];

// @route   GET api/roles
// @desc    Get all user roles
// @access  Private (SuperAdmin)
router.get('/', verifyToken, requireRole('SUPER_ADMIN'), (req, res) => {
    (async () => {
        try {
            const roles = await RbacRole.findAll({ order: [['key', 'ASC']] });
            const counts = await RbacUserRoleScope.findAll({
                attributes: [
                    'roleId',
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('userId'))), 'userCount']
                ],
                group: ['roleId'],
                raw: true
            }).catch(() => []);
            const countByRoleId = new Map((counts || []).map(r => [String(r.roleId), Number(r.userCount || 0)]));
            const payload = (roles || []).map(r => ({
                id: String(r.id),
                name: r.name,
                description: r.description,
                userCount: countByRoleId.get(String(r.id)) || 0,
                key: r.key,
                schoolId: r.schoolId
            }));
            return res.json(payload);
        } catch (e) {
            return res.json(rolesData);
        }
    })().catch(() => res.json(rolesData));
});

module.exports = router;
