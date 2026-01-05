const express = require('express');
const router = express.Router({ mergeParams: true });
const { School, Class, Student, Teacher, Schedule, Attendance, Grade, SchoolSettings } = require('../../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { auditLog } = require('../../middleware/auditLog');
const { getUserScopeContext, buildScopeWhere, canWriteToScopes, canTeacherAccessClass } = require('../../utils/scopes');
const { Op } = require('sequelize');

// Helper to resolve school ID for class access
const resolveClassSchoolId = async (req) => {
    if (req._classForAccess && String(req._classForAccess.id) === String(req.params.classId)) {
        return Number(req._classForAccess.schoolId || 0);
    }
    const cls = await Class.findByPk(req.params.classId).catch(() => null);
    req._classForAccess = cls || null;
    return cls ? Number(cls.schoolId || 0) : 0;
};

const requireSameSchoolAndRolePolicy = (resolver) => async (req, res, next) => {
    const sid = await resolver(req);
    if (!sid) return res.status(404).json({ msg: 'Resource not found' });
    if (req.user.role !== 'SuperAdmin' && Number(req.user.schoolId) !== sid) return res.status(403).json({ msg: 'Access denied' });
    next();
};

// @route   GET api/school/:schoolId/classes
// @desc    Get all classes for a specific school
router.get('/', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const schoolId = Number(req.params.schoolId);
        const ctx = await getUserScopeContext(req, schoolId);
        const scopeWhere = buildScopeWhere(ctx);
        const where = scopeWhere ? { schoolId, ...scopeWhere } : { schoolId };
        const classes = await Class.findAll({ where, order: [['name', 'ASC']] });
        res.json(classes.map(c => {
            const json = c.toJSON();
            const displayName = `${json.gradeLevel} (${json.section || 'أ'})`;
            return { ...json, name: displayName, subjects: Array.isArray(json.subjects) ? json.subjects : [] };
        }));
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/classes
// @desc    Add a new class
router.post('/', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
    { name: 'name', required: true, type: 'string' },
    { name: 'gradeLevel', required: true, type: 'string' },
    { name: 'homeroomTeacherId', required: true, type: 'string' },
    { name: 'subjects', required: true },
    { name: 'capacity', required: false, type: 'number' },
    { name: 'section', required: false, type: 'string' },
    { name: 'branchId', required: false, type: 'string' },
    { name: 'stageId', required: false, type: 'string' },
    { name: 'departmentId', required: false, type: 'string' },
]), async (req, res) => {
    try {
        const { name, gradeLevel, homeroomTeacherId, subjects, capacity, section, branchId, stageId, departmentId } = req.body;
        if (!name || !gradeLevel || !homeroomTeacherId || !Array.isArray(subjects)) {
            return res.status(400).json({ msg: 'Missing required fields' });
        }
        const schoolId = Number(req.params.schoolId);
        const ctx = await getUserScopeContext(req, schoolId);
        if (!canWriteToScopes(ctx, { branchId: branchId || null, stageId: stageId || null, departmentId: departmentId || null })) {
            return res.status(403).json({ msg: 'Access denied' });
        }
        const teacher = await Teacher.findByPk(Number(homeroomTeacherId));
        if (!teacher) return res.status(404).json({ msg: 'Teacher not found' });
        if (Number(teacher.schoolId || 0) !== Number(req.user.schoolId || 0)) return res.status(403).json({ msg: 'Access denied for this school' });
        const newClass = await Class.create({
            id: `cls_${Date.now()}`,
            name,
            gradeLevel,
            homeroomTeacherName: teacher.name,
            studentCount: 0,
            capacity: typeof capacity === 'number' ? capacity : 30,
            schoolId: Number(req.user.schoolId || 0),
            homeroomTeacherId: Number(homeroomTeacherId),
            subjects: subjects,
            section: typeof section === 'string' ? section : 'أ',
            branchId: branchId || null,
            stageId: stageId || null,
            departmentId: departmentId || null,
        });
        const json = newClass.toJSON();
        const displayName = `${json.gradeLevel} (${json.section || 'أ'})`;
        res.status(201).json({ ...json, name: displayName, subjects: Array.isArray(json.subjects) ? json.subjects : [] });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   PUT api/school/:schoolId/classes/:classId/roster
// @desc    Update class roster
router.put('/:classId/roster', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const { studentIds } = req.body;
        if (!Array.isArray(studentIds)) return res.status(400).json({ msg: 'studentIds must be an array' });
        const cls = await Class.findByPk(req.params.classId);
        if (!cls) return res.status(404).json({ msg: 'Class not found' });
        const uniqueIds = Array.from(new Set(studentIds.map(id => String(id))));
        const scopeCtx = await getUserScopeContext(req, Number(req.params.schoolId));
        if (!canWriteToScopes(scopeCtx, { branchId: cls.branchId || null, stageId: cls.stageId || null, departmentId: cls.departmentId || null })) {
            return res.status(403).json({ msg: 'Access denied' });
        }
        const currentMembers = await Student.findAll({ where: { schoolId: cls.schoolId, classId: cls.id }, attributes: ['id'] });
        const currentIds = new Set(currentMembers.map(s => String(s.id)));
        const toAdd = uniqueIds.filter(id => !currentIds.has(id));
        const toRemove = Array.from(currentIds).filter(id => !uniqueIds.includes(id));

        // Check capacity
        if (toAdd.length > 0) {
            const currentCount = await Student.count({ where: { schoolId: cls.schoolId, classId: cls.id } });
            const available = cls.capacity - currentCount + toRemove.length;
            if (toAdd.length > available) {
                return res.status(400).json({
                    msg: `Cannot add students. Class capacity exceeded. Available spots: ${available}`,
                    code: 'CAPACITY_EXCEEDED'
                });
            }

            await Student.update({ classId: cls.id }, { where: { id: { [Op.in]: toAdd }, schoolId: cls.schoolId } });
        }
        if (toRemove.length > 0) {
            await Student.update({ classId: null }, { where: { id: { [Op.in]: toRemove }, schoolId: cls.schoolId } });
        }
        const newCount = await Student.count({ where: { schoolId: cls.schoolId, classId: cls.id } });
        cls.studentCount = newCount;
        await cls.save();
        { const j = cls.toJSON(); const displayName = `${j.gradeLevel} (${j.section || 'أ'})`; res.json({ ...j, name: displayName, subjects: Array.isArray(j.subjects) ? j.subjects : [] }); }
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   DELETE api/school/:schoolId/classes/:classId
// @desc    Delete a class
router.delete('/:classId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('DELETE_CLASSES'), requireSameSchoolParam('schoolId'), auditLog('DELETE', 'Class'), async (req, res) => {
    try {
        const cls = await Class.findByPk(req.params.classId);
        if (!cls) return res.status(404).json({ msg: 'Class not found' });
        if (Number(cls.schoolId) !== Number(req.params.schoolId)) return res.status(403).json({ msg: 'Access denied' });

        // Check dependencies
        const schedCount = await Schedule.count({ where: { classId: cls.id } });
        const attCount = await Attendance.count({ where: { classId: cls.id } });
        const gradeCount = await Grade.count({ where: { classId: cls.id } });
        if (schedCount > 0 || attCount > 0 || gradeCount > 0) {
            return res.status(409).json({ msg: 'Cannot delete class with dependent records', dependencies: { schedules: schedCount, attendance: attCount, grades: gradeCount } });
        }
        await Class.destroy({ where: { id: cls.id } });
        res.json({ deleted: true });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// SCHEDULE ROUTES

// Get Class Schedule
router.get('/:classId/schedule', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), requireSameSchoolAndRolePolicy(resolveClassSchoolId), async (req, res) => {
    try {
        const cls = req._classForAccess || await Class.findByPk(req.params.classId);
        if (!cls) return res.status(404).json({ msg: 'Class not found' });
        // Teacher access check
        if (req.user.role === 'Teacher' || req.user.role === 'TEACHER') {
            const ok = await canTeacherAccessClass(req, cls);
            if (!ok) return res.status(403).json({ msg: 'Access denied' });
        }
        const rows = await Schedule.findAll({ where: { classId: cls.id }, include: [{ model: Teacher, attributes: ['name'] }], order: [['day', 'ASC'], ['timeSlot', 'ASC']] });
        const list = rows.map(r => ({ id: String(r.id), classId: String(cls.id), day: r.day, timeSlot: r.timeSlot, subject: r.subject, teacherName: r.Teacher ? r.Teacher.name : '' }));
        res.json(list);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// Update Class Schedule (Simplified)
router.post('/:classId/schedule', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolAndRolePolicy(resolveClassSchoolId), async (req, res) => {
    try {
        const { entries } = req.body;
        const cls = req._classForAccess || await Class.findByPk(req.params.classId);
        if (!cls) return res.status(404).json({ msg: 'Class not found' });

        await Schedule.destroy({ where: { classId: cls.id } });
        const created = [];
        for (const n of entries) {
            // Basic validation
            if (!n.day || !n.timeSlot || !n.subject) continue;
            const row = await Schedule.create({ day: n.day, timeSlot: n.timeSlot, subject: n.subject, classId: cls.id, teacherId: n.teacherId || null });
            created.push(row);
        }
        res.status(201).json({ createdCount: created.length });
    } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

module.exports = router;
