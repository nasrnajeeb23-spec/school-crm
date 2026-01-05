const express = require('express');
const router = express.Router({ mergeParams: true });
const { Parent, Student, User, Notification, AuditLog } = require('../../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { auditUserOperation } = require('../../middleware/auditLog');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// @route   GET api/school/:schoolId/parents
// @desc    Get all parents for a specific school
// @access  Private (SchoolAdmin)
router.get('/', verifyToken, requireRole('SCHOOL_ADMIN', 'STAFF'), requirePermission('MANAGE_PARENTS'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const parents = await Parent.findAll({
            where: { schoolId: req.params.schoolId },
            include: { model: Student, attributes: ['name', 'id'] },
            order: [['name', 'ASC']]
        });
        if (!parents) return res.status(404).json({ msg: 'No parents found' });

        const statusMap = { 'Active': 'نشط', 'Invited': 'مدعو' };
        res.json(parents.map(p => {
            const parentJson = p.toJSON();
            return {
                id: parentJson.id,
                name: parentJson.name,
                studentName: parentJson.Students.length > 0 ? parentJson.Students[0].name : 'N/A',
                studentId: parentJson.Students.length > 0 ? parentJson.Students[0].id : 'N/A',
                email: parentJson.email,
                phone: parentJson.phone,
                status: statusMap[parentJson.status] || parentJson.status,
            }
        }));
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/parents
// @desc    Upsert a parent and link to student
// @access  Private (SchoolAdmin)
router.post('/', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
    { name: 'name', required: true, type: 'string', minLength: 2 },
    { name: 'email', required: true, type: 'string' },
    { name: 'phone', required: true, type: 'string' },
    { name: 'studentId', required: true, type: 'string' },
]), async (req, res) => {
    try {
        const schoolId = Number(req.params.schoolId);
        const { name, email, phone, studentId } = req.body || {};
        if (!name || !email || !phone || !studentId) return res.status(400).json({ msg: 'Missing required fields' });

        const student = await Student.findByPk(studentId);
        if (!student || Number(student.schoolId) !== schoolId) return res.status(404).json({ msg: 'Student not found' });

        let parent = await Parent.findOne({ where: { email } });
        if (parent) {
            if (Number(parent.schoolId || 0) !== schoolId) {
                return res.status(409).json({ msg: 'البريد الإلكتروني مستخدم في مدرسة أخرى.', code: 'DUPLICATE_EMAIL' });
            }
            const existingByPhone = await Parent.findOne({ where: { schoolId, phone: String(phone || '').trim() } });
            if (existingByPhone && Number(existingByPhone.id) !== Number(parent.id)) {
                return res.status(409).json({ msg: 'رقم الهاتف مستخدم لولي أمر آخر.', code: 'DUPLICATE_PHONE' });
            }
            parent.name = name;
            parent.phone = String(phone || '').trim();
            if (!parent.status) parent.status = 'Invited';
            await parent.save();
        } else {
            const existingByPhone = await Parent.findOne({ where: { schoolId, phone: String(phone || '').trim() } });
            if (existingByPhone) {
                return res.status(409).json({ msg: 'رقم الهاتف مستخدم لولي أمر آخر.', code: 'DUPLICATE_PHONE' });
            }
            parent = await Parent.create({ name, email, phone: String(phone || '').trim(), status: 'Invited', schoolId });
        }

        student.parentId = parent.id;
        await student.save();

        let user = await User.findOne({ where: { parentId: parent.id } });
        if (!user) {
            // Create user account if not exists
            const placeholder = Math.random().toString(36).slice(-12) + 'Aa!1';
            const hashed = await bcrypt.hash(placeholder, 10);
            user = await User.create({ email: parent.email, username: parent.email, password: hashed, name: parent.name, role: 'Parent', schoolId: parent.schoolId, parentId: parent.id, passwordMustChange: true, isActive: true, tokenVersion: 0 });
        }

        const inviteToken = jwt.sign({ id: user.id, type: 'invite', targetRole: 'Parent', tokenVersion: user.tokenVersion || 0 }, JWT_SECRET, { expiresIn: '72h' });
        const base = process.env.FRONTEND_URL || 'http://localhost:3000';
        const activationLink = `${base.replace(/\/$/, '')}/set-password?token=${encodeURIComponent(inviteToken)}`;

        const statusMap = { 'Active': 'نشط', 'Invited': 'مدعو' };
        return res.status(201).json({ id: String(parent.id), name: parent.name, email: parent.email, phone: parent.phone, status: statusMap[parent.status] || parent.status, studentId: student.id, studentName: student.name, activationLink });
    } catch (e) {
        console.error(e.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT api/school/:schoolId/parents/:parentId
// @desc    Update parent details (name, email, phone). Email change syncs to user account.
// @access  Private (SchoolAdmin)
router.put('/:parentId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
    { name: 'name', required: false, type: 'string', minLength: 2 },
    { name: 'email', required: false, type: 'string' },
    { name: 'phone', required: false, type: 'string' },
    { name: 'studentId', required: false, type: 'string' },
]), async (req, res) => {
    try {
        const schoolId = Number(req.params.schoolId);
        const parentId = Number(req.params.parentId);
        const { name, email, phone } = req.body || {};
        const emailStr = String(email || '').trim();
        const phoneStr = String(phone || '').trim();
        if (emailStr && !/^.+@.+\..+$/.test(emailStr)) return res.status(400).json({ msg: 'بريد إلكتروني غير صالح' });
        if (phoneStr && !/^[0-9+\-()\s]{5,}$/.test(phoneStr)) return res.status(400).json({ msg: 'رقم هاتف غير صالح' });

        const parent = await Parent.findByPk(parentId);
        if (!parent) return res.status(404).json({ msg: 'Parent not found' });
        if (Number(parent.schoolId) !== schoolId) return res.status(403).json({ msg: 'Access denied' });

        if (name) parent.name = name;
        if (phoneStr) parent.phone = phoneStr;
        if (emailStr) parent.email = emailStr.toLowerCase();
        await parent.save();

        try {
            const user = await User.findOne({ where: { parentId: parent.id } });
            if (user) {
                if (emailStr) {
                    user.email = emailStr.toLowerCase();
                    user.username = emailStr.toLowerCase();
                }
                user.name = parent.name;
                await user.save();
            }
        } catch (e) { }

        const statusMap = { 'Active': 'نشط', 'Invited': 'مدعو' };
        return res.json({
            id: String(parent.id), name: parent.name, email: parent.email, phone: parent.phone, status: statusMap[parent.status] || parent.status,
            // ... student info retrieval omitted for brevity or kept minimal ...
        });
    } catch (e) {
        console.error(e.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE api/school/:schoolId/parents/:parentId
// @desc    Delete a parent
// @access  Private (SchoolAdmin)
router.delete('/:parentId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('DELETE_PARENTS'), requireSameSchoolParam('schoolId'), auditUserOperation('DELETE'), async (req, res) => {
    try {
        const parent = await Parent.findOne({ where: { id: req.params.parentId, schoolId: req.params.schoolId } });
        if (!parent) return res.status(404).json({ msg: 'Parent not found' });
        const user = await User.findOne({ where: { parentId: parent.id } });
        if (user) await user.destroy();

        // Unlink students
        const students = await Student.findAll({ where: { parentId: parent.id } });
        for (const s of students) { s.parentId = null; s.parentName = ''; await s.save(); }

        await parent.destroy();
        return res.json({ msg: 'Parent removed' });
    } catch (e) { console.error(e.message); return res.status(500).json({ msg: 'Server Error' }); }
});

module.exports = router;
