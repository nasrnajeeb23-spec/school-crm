const express = require('express');
const router = express.Router();
const { School, Subscription, Invoice, Payment, Plan, User } = require('../models');
const { sequelize } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// @route   GET api/superadmin/stats
// @desc    Get dashboard stats for SuperAdmin
// @access  Private (SuperAdmin)
router.get('/stats', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const totalSchools = await School.count();
        const activeSubscriptions = await Subscription.count({
            where: { status: 'ACTIVE' }
        });

        // Calculate total revenue from all paid invoices
        const totalRevenueResult = await Payment.findOne({
            attributes: [[sequelize.fn('sum', sequelize.col('amount')), 'total']],
            raw: true,
        });
        const totalRevenue = parseFloat(totalRevenueResult.total) || 0;
        
        // This is a simplified revenue chart data
        const revenueData = [
            { month: 'يناير', revenue: 18000 },
            { month: 'فبراير', revenue: 21000 },
            { month: 'مارس', revenue: 25000 },
            { month: 'أبريل', revenue: 23000 },
            { month: 'مايو', revenue: 28000 },
            { month: 'يونيو', revenue: 32000 },
        ];


        res.json({
            totalSchools,
            activeSubscriptions,
            totalRevenue,
            revenueData
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/superadmin/team
// @desc    Get all SuperAdmin team members
// @access  Private (SuperAdmin and team roles)
router.get('/team', verifyToken, async (req, res) => {
    try {
        // Allow all SuperAdmin team roles to view team members
        const allowedRoles = ['SuperAdmin', 'SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const teamMembers = await User.findAll({
            where: {
                role: {
                    [require('sequelize').Op.in]: ['SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor']
                }
            },
            attributes: ['id', 'name', 'email', 'username', 'role', 'isActive', 'lastLoginAt', 'createdAt', 'permissions']
        });

        res.json(teamMembers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/superadmin/team
// @desc    Create a new SuperAdmin team member
// @access  Private (SuperAdmin only)
router.post('/team', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const { name, email, username, password, role, permissions } = req.body;

        // Validate role
        const allowedRoles = ['SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role for team member' });
        }

        // Check if username or email already exists
        const existingUser = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { username: username },
                    { email: email }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new team member
        const newTeamMember = await User.create({
            name,
            email,
            username,
            password: hashedPassword,
            role,
            permissions: permissions || getDefaultPermissions(role),
            isActive: true,
            schoolId: null // SuperAdmin team members don't belong to a specific school
        });

        // Remove password from response
        const { password: _, ...memberWithoutPassword } = newTeamMember.toJSON();
        
        res.status(201).json(memberWithoutPassword);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/superadmin/team/:id
// @desc    Update a SuperAdmin team member
// @access  Private (SuperAdmin only)
router.put('/team/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const { name, email, username, password, role, permissions } = req.body;
        const memberId = req.params.id;

        // Find the team member
        const teamMember = await User.findOne({
            where: {
                id: memberId,
                role: {
                    [require('sequelize').Op.in]: ['SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor']
                }
            }
        });

        if (!teamMember) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        // Validate role if provided
        if (role) {
            const allowedRoles = ['SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor'];
            if (!allowedRoles.includes(role)) {
                return res.status(400).json({ message: 'Invalid role for team member' });
            }
        }

        // Check if new username or email already exists (excluding current member)
        if (username || email) {
            const existingUser = await User.findOne({
                where: {
                    id: {
                        [require('sequelize').Op.ne]: memberId
                    },
                    [require('sequelize').Op.or]: [
                        username ? { username: username } : null,
                        email ? { email: email } : null
                    ].filter(Boolean)
                }
            });

            if (existingUser) {
                return res.status(400).json({ message: 'Username or email already exists' });
            }
        }

        // Update fields
        if (name) teamMember.name = name;
        if (email) teamMember.email = email;
        if (username) teamMember.username = username;
        if (role) teamMember.role = role;
        if (permissions) teamMember.permissions = permissions;
        
        // Update password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            teamMember.password = await bcrypt.hash(password, salt);
        }

        await teamMember.save();

        // Remove password from response
        const { password: _, ...memberWithoutPassword } = teamMember.toJSON();
        
        res.json(memberWithoutPassword);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/superadmin/team/:id
// @desc    Delete a SuperAdmin team member
// @access  Private (SuperAdmin only)
router.delete('/team/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const memberId = req.params.id;

        // Find the team member
        const teamMember = await User.findOne({
            where: {
                id: memberId,
                role: {
                    [require('sequelize').Op.in]: ['SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor']
                }
            }
        });

        if (!teamMember) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        await teamMember.destroy();
        res.json({ message: 'Team member deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Helper function to get default permissions for a role
function getDefaultPermissions(role) {
    const defaultPermissions = {
        'SuperAdminFinancial': ['view_financial_reports', 'manage_billing', 'view_subscriptions', 'manage_invoices'],
        'SuperAdminTechnical': ['manage_system_settings', 'view_logs', 'manage_features', 'monitor_performance', 'manage_api_keys'],
        'SuperAdminSupervisor': ['view_all_schools', 'manage_school_admins', 'view_reports', 'manage_content', 'view_user_analytics']
    };
    return defaultPermissions[role] || [];
}

module.exports = router;
