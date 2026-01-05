const express = require('express');
const router = express.Router({ mergeParams: true });
const { User, StaffAttendance, SalaryStructure, SalarySlip, Expense } = require('../../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { auditUserOperation } = require('../../middleware/auditLog');
const { deriveDesiredDbRole, derivePermissionsForUser } = require('../../utils/permissionMatrix');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const { Op } = require('sequelize');

// @route   GET api/school/:schoolId/staff
// @desc    Get all staff members (non-teachers) for a specific school
// @access  Private (SchoolAdmin)
router.get('/', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId);
        const staff = await User.findAll({
            where: {
                schoolId,
                role: { [Op.in]: ['Staff', 'SchoolAdmin'] },
                [Op.or]: [
                    { schoolRole: { [Op.ne]: 'سائق' } },
                    { schoolRole: null }
                ]
            },
            attributes: { exclude: ['password'] },
            order: [['name', 'ASC']]
        });
        res.json(staff);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/school/:schoolId/staff
// @desc    Add a new staff member
// @access  Private (SchoolAdmin)
router.post('/', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
    { name: 'name', required: true, type: 'string' },
    { name: 'email', required: true, type: 'string' },
    { name: 'role', required: true, type: 'string' }
]), async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId);
        const { name, email, role, phone, department, bankAccount } = req.body;

        if (String(role || '') === 'سائق') {
            return res.status(400).json({ msg: 'Drivers are managed in transportation module' });
        }

        // Check if user exists
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const placeholder = Math.random().toString(36).slice(-12) + 'Aa!1';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(placeholder, salt);

        const desiredRole = deriveDesiredDbRole({ role: 'Staff', schoolRole: role });
        const desiredPermissions = derivePermissionsForUser({ role: desiredRole, schoolRole: role });

        user = await User.create({ name, email, username: email.split('@')[0], password: hashedPassword, role: desiredRole, schoolRole: role, schoolId, phone, department, bankAccount, isActive: true, passwordMustChange: true, permissions: desiredPermissions, tokenVersion: 0 });

        const userJson = user.toJSON();
        delete userJson.password;
        try {
            const EmailService = require('../../services/EmailService');
            const inviteToken = jwt.sign({ id: user.id, type: 'invite', targetRole: 'Staff', tokenVersion: user.tokenVersion || 0 }, JWT_SECRET, { expiresIn: '72h' });
            const base = process.env.FRONTEND_URL || 'http://localhost:3000';
            const activationLink = `${base.replace(/\/$/, '')}/set-password?token=${encodeURIComponent(inviteToken)}`;
            userJson.activationLink = activationLink; // Add link to response
            await EmailService.sendActivationInvite(user.email, user.name, 'Staff', activationLink, '', schoolId);
            userJson.inviteSent = true;
        } catch { }
        res.status(201).json(userJson);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/school/:schoolId/staff/:id
// @desc    Update staff member
// @access  Private (SchoolAdmin)
router.put('/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId);
        const userId = parseInt(req.params.id);
        const { name, email, role, phone, department, bankAccount, isActive } = req.body;

        let user = await User.findOne({ where: { id: userId, schoolId } });
        if (!user) return res.status(404).json({ msg: 'Staff not found' });

        if (role !== undefined && String(role || '') === 'سائق') {
            return res.status(400).json({ msg: 'Drivers are managed in transportation module' });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.schoolRole = role || user.schoolRole;
        user.phone = phone || user.phone;
        user.department = department || user.department;
        user.bankAccount = bankAccount || user.bankAccount;
        if (isActive !== undefined) user.isActive = isActive;

        const desiredRole = deriveDesiredDbRole({ role: user.role, schoolRole: user.schoolRole });
        const desiredPermissions = derivePermissionsForUser({ role: desiredRole, schoolRole: user.schoolRole });
        user.role = desiredRole;
        user.permissions = desiredPermissions;

        await user.save();

        const userJson = user.toJSON();
        delete userJson.password;
        res.json(userJson);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/school/:schoolId/staff/:id
// @desc    Delete staff member
// @access  Private (SchoolAdmin)
router.delete('/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('DELETE_STAFF'), requireSameSchoolParam('schoolId'), auditUserOperation('DELETE'), async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId);
        const userId = parseInt(req.params.id);

        const user = await User.findOne({ where: { id: userId, schoolId } });
        if (!user) return res.status(404).json({ msg: 'Staff not found' });

        await user.destroy();
        res.json({ msg: 'Staff member removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Drivers specific routes (subset of staff/users)
router.get('/drivers/list', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId, 10);
        const rows = await User.findAll({
            where: {
                schoolId,
                isActive: { [Op.not]: false },
                [Op.or]: [
                    { role: 'Driver' },
                    { role: 'Staff', schoolRole: 'سائق' }
                ]
            },
            attributes: { exclude: ['password'] },
            order: [['name', 'ASC']]
        });
        res.json(Array.isArray(rows) ? rows.map(r => r.toJSON()) : []);
    } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// Assign Salary Structure to Staff/Driver
router.put('/:userId/salary-structure', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const userId = Number(req.params.userId)
        const staff = await User.findOne({ where: { id: userId, schoolId: req.params.schoolId } });
        if (!staff) return res.status(404).json({ msg: 'Staff not found' });
        const { salaryStructureId } = req.body || {};
        if (!salaryStructureId) return res.status(400).json({ msg: 'salaryStructureId required' });
        const struct = await SalaryStructure.findOne({ where: { id: salaryStructureId, schoolId: req.params.schoolId } });
        if (!struct) return res.status(404).json({ msg: 'Structure not found' });
        staff.salaryStructureId = salaryStructureId;
        await staff.save();
        res.json({ id: staff.id, salaryStructureId: staff.salaryStructureId });
    } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

module.exports = router;
