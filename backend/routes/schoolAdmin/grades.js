const express = require('express');
const router = express.Router({ mergeParams: true });
const { Grade, Student, Class, Subject } = require('../../models'); // Subject might not be a separate model in some legacy code, but assuming standard Structure
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { auditLog } = require('../../middleware/auditLog');
const { canTeacherAccessClass } = require('../../utils/scopes');

// @route   GET api/school/:schoolId/grades
// @desc    Get grades for a specific class/subject
// @access  Private
router.get('/', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const { classId, subject } = req.query;
        if (!classId || !subject) return res.status(400).json({ msg: 'ClassId and Subject required' });

        // Teacher Access Check
        if (req.user.role === 'Teacher' || req.user.role === 'TEACHER') {
            const cls = await Class.findByPk(classId);
            if (!cls) return res.status(404).json({ msg: 'Class not found' });
            if (!await canTeacherAccessClass(req, cls)) return res.status(403).json({ msg: 'Access denied' });
            // Ideally also check if teacher teaches this subject to this class
        }

        const grades = await Grade.findAll({
            where: { classId, subject, schoolId: req.params.schoolId },
            include: [{ model: Student, attributes: ['id', 'name'] }]
        });

        res.json(grades);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/grades/bulk
// @desc    Bulk save grades
router.post('/bulk', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), requirePermission('MANAGE_GRADES'), requireSameSchoolParam('schoolId'), auditLog('UPDATE', 'Grade'), async (req, res) => {
    try {
        const { classId, subject, semester, maxScore, grades } = req.body; // grades: [{ studentId, score, comment }]
        if (!classId || !subject || !Array.isArray(grades)) return res.status(400).json({ msg: 'Invalid data' });

        // Teacher Access Check
        if (req.user.role === 'Teacher' || req.user.role === 'TEACHER') {
            const cls = await Class.findByPk(classId);
            if (!cls || !await canTeacherAccessClass(req, cls)) return res.status(403).json({ msg: 'Access denied' });
        }

        const schoolId = parseInt(req.params.schoolId);
        let count = 0;

        for (const g of grades) {
            // Upsert logic
            let gradeEntry = await Grade.findOne({
                where: { schoolId, classId, studentId: g.studentId, subject, semester: semester || 'First' }
            });

            if (gradeEntry) {
                gradeEntry.score = g.score;
                gradeEntry.maxScore = maxScore || gradeEntry.maxScore || 100;
                gradeEntry.comment = g.comment;
                gradeEntry.gradedBy = req.user.id;
                await gradeEntry.save();
            } else {
                await Grade.create({
                    schoolId,
                    classId,
                    studentId: g.studentId,
                    subject,
                    semester: semester || 'First',
                    score: g.score,
                    maxScore: maxScore || 100,
                    comment: g.comment,
                    gradedBy: req.user.id
                });
            }
            count++;
        }

        res.json({ msg: 'Grades saved', count });
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

module.exports = router;
