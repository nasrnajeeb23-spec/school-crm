const express = require('express');
const router = express.Router({ mergeParams: true });
const { School, Student, User, BehaviorRecord } = require('../../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { auditStudentOperation } = require('../../middleware/auditLog');
const { requireWithinLimits } = require('../../middleware/limits');
const { getUserScopeContext, buildScopeWhere, canWriteToScopes, canTeacherAccessStudent, canParentAccessStudent } = require('../../utils/scopes');

// @route   GET api/school/:schoolId/students
// @desc    Get all students for a specific school
// @access  Private (SchoolAdmin)
router.get('/', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const schoolId = Number(req.params.schoolId);
        const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
        const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
        const ctx = await getUserScopeContext(req, schoolId);
        const scopeWhere = buildScopeWhere(ctx);
        const where = scopeWhere ? { schoolId, ...scopeWhere } : { schoolId };

        // Add filtering by name if needed, though not explicitly in original snippet but good for large lists
        if (req.query.search) {
            where.name = { [require('sequelize').Op.like]: `%${req.query.search}%` };
        }

        const students = await Student.findAll({ where, order: [['name', 'ASC']], limit, offset });

        const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
        return res.json({ students: students.map(s => ({ ...s.toJSON(), status: statusMap[s.status] || s.status })), limit, offset });
    } catch (err) { console.error(err.message); return res.status(500).json({ msg: 'Server Error', error: err.message }); }
});

// @route   POST api/school/:schoolId/students
// @desc    Add a new student to a school
// @access  Private (SchoolAdmin)
router.post('/', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireWithinLimits('students'), validate([
    { name: 'name', required: true, type: 'string', minLength: 2 },
    { name: 'grade', required: true, type: 'string' },
    { name: 'parentName', required: true, type: 'string' },
    { name: 'dateOfBirth', required: true, type: 'string' },
    { name: 'branchId', required: false, type: 'string' },
    { name: 'stageId', required: false, type: 'string' },
    { name: 'departmentId', required: false, type: 'string' },
]), async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { name, grade, parentName, dateOfBirth, address, city, homeLocation, lat, lng, branchId, stageId, departmentId } = req.body;
        const ctx = await getUserScopeContext(req, Number(schoolId));
        if (!canWriteToScopes(ctx, { branchId: branchId || null, stageId: stageId || null, departmentId: departmentId || null })) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const school = await School.findByPk(schoolId);
        if (!school) {
            return res.status(404).json({ msg: 'School not found' });
        }

        // Limit check is handled by middleware but we need the custom logic for fallback/legacy if middleware doesn't fully cover it
        // The middleware `requireWithinLimits('students')` handles the check now.

        const newStudent = await Student.create({
            id: `std_${Date.now()}`,
            name,
            grade,
            parentName,
            dateOfBirth,
            schoolId: parseInt(schoolId),
            branchId: branchId || null,
            stageId: stageId || null,
            departmentId: departmentId || null,
            status: 'Active', // Default status
            registrationDate: new Date(),
            profileImageUrl: `https://picsum.photos/seed/std_${Date.now()}/100/100`,
            homeLocation: homeLocation || ((address || city || lat !== undefined || lng !== undefined) ? { address: address || '', city: city || '', ...(lat !== undefined ? { lat: Number(lat) } : {}), ...(lng !== undefined ? { lng: Number(lng) } : {}) } : null),
        });

        const newCountAfterCreate = await Student.count({ where: { schoolId: parseInt(schoolId) } });
        school.studentCount = newCountAfterCreate;
        await school.save();

        // Map status for frontend consistency
        const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
        const formattedStudent = {
            ...newStudent.toJSON(),
            status: statusMap[newStudent.status] || newStudent.status
        };

        return res.status(201).json(formattedStudent);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT api/school/:schoolId/students/:studentId
// @desc    Update a student
// @access  Private (SchoolAdmin)
router.put('/:studentId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
    { name: 'name', required: true, type: 'string', minLength: 2 },
    { name: 'grade', required: true, type: 'string' },
    { name: 'parentName', required: true, type: 'string' },
    { name: 'dateOfBirth', required: true, type: 'string' },
    { name: 'status', required: true, type: 'string', enum: ['نشط', 'موقوف'] },
    { name: 'branchId', required: false, type: 'string' },
    { name: 'stageId', required: false, type: 'string' },
    { name: 'departmentId', required: false, type: 'string' },
]), async (req, res) => {
    try {
        const schoolId = Number(req.params.schoolId);
        const { name, grade, parentName, dateOfBirth, status, branchId, stageId, departmentId } = req.body;
        if (!name || !grade || !parentName || !dateOfBirth || !status) {
            return res.status(400).json({ msg: 'Missing required fields' });
        }
        const ctx = await getUserScopeContext(req, schoolId);
        const scopeWhere = buildScopeWhere(ctx);
        const where = scopeWhere ? { id: String(req.params.studentId), schoolId, ...scopeWhere } : { id: String(req.params.studentId), schoolId };
        const student = await Student.findOne({ where });
        if (!student) return res.status(404).json({ msg: 'Student not found' });
        if (!canWriteToScopes(ctx, { branchId: branchId ?? student.branchId ?? null, stageId: stageId ?? student.stageId ?? null, departmentId: departmentId ?? student.departmentId ?? null })) {
            return res.status(403).json({ msg: 'Access denied' });
        }
        student.name = name;
        student.grade = grade;
        student.parentName = parentName;
        student.dateOfBirth = dateOfBirth;
        student.status = status === 'نشط' ? 'Active' : status === 'موقوف' ? 'Suspended' : student.status;
        if (branchId !== undefined) student.branchId = branchId || null;
        if (stageId !== undefined) student.stageId = stageId || null;
        if (departmentId !== undefined) student.departmentId = departmentId || null;
        await student.save();
        const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
        return res.json({ ...student.toJSON(), status: statusMap[student.status] || student.status, msg: 'Student updated' });
    } catch (err) { console.error(err.message); return res.status(500).json({ msg: 'Server Error' }); }
});

// @route   DELETE api/school/:schoolId/students/:studentId
// @desc    Delete a student
// @access  Private (SchoolAdmin)
router.delete('/:studentId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('DELETE_STUDENTS'), requireSameSchoolParam('schoolId'), auditStudentOperation('DELETE'), async (req, res) => {
    try {
        const schoolId = Number(req.params.schoolId);
        const ctx = await getUserScopeContext(req, schoolId);
        const scopeWhere = buildScopeWhere(ctx);
        const where = scopeWhere ? { id: String(req.params.studentId), schoolId, ...scopeWhere } : { id: String(req.params.studentId), schoolId };
        const student = await Student.findOne({ where });
        if (!student) return res.status(404).json({ msg: 'Student not found' });

        // Check write access
        if (!canWriteToScopes(ctx, { branchId: student.branchId, stageId: student.stageId, departmentId: student.departmentId })) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        await student.destroy();

        // Update school student count
        const school = await School.findByPk(schoolId);
        if (school) {
            school.studentCount = await Student.count({ where: { schoolId } });
            await school.save();
        }

        return res.json({ studentId: req.params.studentId, msg: 'Student deleted' });
    } catch (err) { console.error(err.message); return res.status(500).json({ msg: 'Server Error' }); }
});

// Behavior Records

// @route   GET api/school/:schoolId/students/:studentId/behavior
// @desc    Get behavior records for a student
// @access  Private (SchoolAdmin, Teacher, Parent)
router.get('/:studentId/behavior', verifyToken, requireRole('SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId);
        const studentId = req.params.studentId;

        // Authorization checks for non-admin roles
        if (req.user.role === 'Parent' || req.user.role === 'PARENT') {
            const ok = await canParentAccessStudent(req, schoolId, studentId);
            if (!ok) return res.status(403).json({ msg: 'Access denied' });
        }
        if (req.user.role === 'Teacher' || req.user.role === 'TEACHER') {
            const ok = await canTeacherAccessStudent(req, schoolId, studentId);
            if (!ok) return res.status(403).json({ msg: 'Access denied' });
        }

        const records = await BehaviorRecord.findAll({
            where: { schoolId, studentId },
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });

        res.json(records);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/school/:schoolId/students/:studentId/behavior
// @desc    Add a behavior record
// @access  Private (SchoolAdmin, Teacher)
router.post('/:studentId/behavior', verifyToken, requireSameSchoolParam('schoolId'), requireRole('SCHOOL_ADMIN', 'TEACHER'), async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId);
        const studentId = req.params.studentId;
        const { type, title, description, date, actionTaken, severity } = req.body;

        if (req.user.role === 'Teacher' || req.user.role === 'TEACHER') {
            const ok = await canTeacherAccessStudent(req, schoolId, studentId);
            if (!ok) return res.status(403).json({ msg: 'Access denied' });
        }

        const record = await BehaviorRecord.create({
            schoolId,
            studentId,
            type,
            title,
            description,
            date: date || new Date(),
            recordedBy: req.user.name,
            actionTaken,
            severity
        });

        res.status(201).json(record);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
