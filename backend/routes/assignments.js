const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken, requireRole, isSuperAdminUser } = require('../middleware/auth');
const { checkStorageLimit, updateUsedStorage } = require('../middleware/storageLimits');
const { Assignment, Class, Student, Submission, Teacher, Parent } = require('../models');

// --- Helper Functions & Multer Config ---

const MAX_ATTACHMENT_SIZE = parseInt(process.env.MAX_ATTACHMENT_SIZE || `${25 * 1024 * 1024}`, 10); // 25 MB
const allowedMimeTypes = new Set([
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'text/plain'
]);

function ensureDir(p) { try { fs.mkdirSync(p, { recursive: true }); } catch { } }
function makeSafeName(name) {
    const base = path.basename(name).replace(/[^A-Za-z0-9._-]+/g, '_');
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${base}`;
}

const assignmentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const schoolId = Number(req.user?.schoolId || 0) || 0;
            // Note: navigating up from routes/ to root is ../.. from this file? 
            // Current dir: backend/routes. Root: backend/.
            // Storage should be in backend/storage.
            const dir = path.join(__dirname, '..', 'storage', 'assignments', String(schoolId || 'unknown'));
            ensureDir(dir);
            cb(null, dir);
        } catch (e) { cb(e); }
    },
    filename: (_req, file, cb) => cb(null, makeSafeName(file.originalname))
});

const assignmentUpload = multer({
    storage: assignmentStorage,
    limits: { fileSize: MAX_ATTACHMENT_SIZE },
    fileFilter: (_req, file, cb) => {
        if (allowedMimeTypes.has(file.mimetype)) cb(null, true);
        else cb(new Error('Unsupported file type'));
    }
});

// --- Routes ---

// Create Assignment
router.post('/assignments', verifyToken, requireRole('TEACHER'), checkStorageLimit, assignmentUpload.array('attachments', 10), async (req, res) => {
    try {
        const teacherId = Number(req.user.teacherId || 0);
        if (!teacherId) return res.status(403).json({ msg: 'Access denied' });
        const { title, description, classId, dueDate } = req.body || {};
        if (!title || !classId) return res.status(400).json({ msg: 'title and classId are required' });
        const cls = await Class.findByPk(String(classId));
        if (!cls) return res.status(404).json({ msg: 'Class not found' });
        const teacher = await Teacher.findByPk(teacherId);
        if (!teacher) return res.status(404).json({ msg: 'Teacher not found' });
        if (Number(teacher.schoolId) !== Number(cls.schoolId)) return res.status(403).json({ msg: 'Access denied' });
        const files = Array.isArray(req.files) ? req.files : [];

        // Update storage usage
        let totalSize = 0;
        for (const f of files) {
            totalSize += f.size;
        }
        if (totalSize > 0) {
            try { await updateUsedStorage(teacher.schoolId, totalSize); } catch (e) { console.error('Storage update failed', e); }
        }

        const attachments = files.map(f => ({
            filename: f.filename,
            originalName: f.originalname,
            mimeType: f.mimetype,
            size: f.size,
            url: `/api/assignments/${'pending'}/attachments/${encodeURIComponent(f.filename)}`,
            uploadedAt: new Date().toISOString()
        }));
        const assignment = await Assignment.create({
            schoolId: Number(teacher.schoolId),
            classId: String(classId),
            teacherId: teacherId,
            title: String(title),
            description: description || '',
            dueDate: dueDate ? new Date(dueDate) : null,
            status: 'Active',
            attachments
        });
        // Fix attachment URLs with real assignmentId
        if (attachments.length > 0) {
            assignment.attachments = attachments.map(a => ({ ...a, url: `/api/assignments/${assignment.id}/attachments/${encodeURIComponent(a.filename)}` }));
            try { await assignment.save(); } catch { }
        }
        const students = await Student.findAll({ where: { classId: String(cls.id), schoolId: Number(teacher.schoolId) } });
        if (students && students.length > 0) {
            try {
                await Submission.bulkCreate(
                    students.map(s => ({ assignmentId: assignment.id, studentId: s.id, status: 'NotSubmitted', attachments: [] })),
                    { validate: true }
                );
            } catch (e) { try { console.warn('Bulk create submissions failed', e?.message || e); } catch { } }
        }
        const className = `${cls.gradeLevel} (${cls.section || 'أ'})`;
        return res.status(201).json({
            id: String(assignment.id),
            title: assignment.title,
            description: assignment.description || '',
            dueDate: assignment.dueDate ? assignment.dueDate.toISOString().split('T')[0] : '',
            classId: String(cls.id),
            className,
            status: assignment.status,
            attachments: Array.isArray(assignment.attachments) ? assignment.attachments : []
        });
    } catch (e) {
        try { console.error('Create assignment error:', e?.message || e); } catch { }
        res.status(500).json({ msg: 'Server Error' });
    }
});

// List Assignments for Class
router.get('/school/class/:classId/assignments', verifyToken, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const classId = String(req.params.classId);
        const cls = await Class.findByPk(classId);
        if (!cls) return res.status(404).json({ msg: 'Class not found' });
        if (!isSuperAdminUser(req.user) && Number(req.user.schoolId || 0) !== Number(cls.schoolId || 0)) return res.status(403).json({ msg: 'Access denied' });
        const rows = await Assignment.findAll({ where: { classId }, include: [{ model: Class, attributes: ['gradeLevel', 'section'] }, { model: Teacher, attributes: ['name'] }], order: [['createdAt', 'DESC']] });
        const list = [];
        for (const a of rows) {
            const j = a.toJSON();
            const count = await Submission.count({ where: { assignmentId: a.id } }).catch(() => 0);
            list.push({
                id: String(j.id),
                classId: String(j.classId),
                className: a.Class ? `${a.Class.gradeLevel} (${a.Class.section || 'أ'})` : '',
                title: j.title,
                description: j.description || '',
                dueDate: j.dueDate ? new Date(j.dueDate).toISOString().split('T')[0] : '',
                creationDate: a.createdAt ? a.createdAt.toISOString().split('T')[0] : '',
                status: j.status,
                submissionCount: count,
                attachments: Array.isArray(j.attachments) ? j.attachments.map(att => ({
                    filename: att.filename,
                    originalName: att.originalName,
                    mimeType: att.mimeType,
                    size: att.size,
                    url: `/api/assignments/${j.id}/attachments/${encodeURIComponent(att.filename)}`,
                    uploadedAt: att.uploadedAt
                })) : []
            });
        }
        return res.json(list);
    } catch (e) {
        try { console.error('List class assignments error:', e?.message || e); } catch { }
        res.status(500).json({ msg: 'Server Error' });
    }
});

// List Submissions for Assignment
router.get('/assignments/:assignmentId/submissions', verifyToken, requireRole('TEACHER'), async (req, res) => {
    try {
        const teacherId = Number(req.user.teacherId || 0);
        if (!teacherId) return res.status(403).json({ msg: 'Access denied' });
        const assignment = await Assignment.findByPk(Number(req.params.assignmentId));
        if (!assignment) return res.status(404).json({ msg: 'Assignment not found' });
        if (Number(assignment.teacherId || 0) !== teacherId) return res.status(403).json({ msg: 'Access denied' });
        const cls = await Class.findByPk(String(assignment.classId));
        if (!cls) return res.status(404).json({ msg: 'Class not found' });
        const students = await Student.findAll({ where: { classId: String(cls.id) }, order: [['name', 'ASC']] });
        const rows = await Submission.findAll({ where: { assignmentId: assignment.id } });
        const map = new Map(rows.map(r => [String(r.studentId), r]));
        const statusMap = { Submitted: 'تم التسليم', NotSubmitted: 'لم يسلم', Late: 'متأخر', Graded: 'تم التقييم' };
        const result = students.map(s => {
            const sub = map.get(String(s.id));
            if (sub) {
                const j = sub.toJSON();
                return {
                    id: String(j.id),
                    assignmentId: String(j.assignmentId),
                    studentId: String(j.studentId),
                    studentName: s.name,
                    submissionDate: j.submissionDate ? new Date(j.submissionDate).toISOString().split('T')[0] : null,
                    status: statusMap[j.status] || j.status,
                    grade: typeof j.grade === 'number' ? Number(j.grade) : undefined,
                    feedback: j.feedback || undefined,
                    attachments: Array.isArray(j.attachments) ? j.attachments.map(a => ({
                        filename: a.filename,
                        mimeType: a.mimeType,
                        size: a.size,
                        url: `/api/submissions/${j.id}/attachments/${encodeURIComponent(a.filename)}`,
                        uploadedAt: a.uploadedAt
                    })) : []
                };
            }
            return {
                id: `pending_${assignment.id}_${s.id}`,
                assignmentId: String(assignment.id),
                studentId: String(s.id),
                studentName: s.name,
                submissionDate: null,
                status: statusMap['NotSubmitted'],
                grade: undefined,
                feedback: undefined,
                attachments: []
            };
        });
        return res.json(result);
    } catch (e) {
        try { console.error('List submissions error:', e?.message || e); } catch { }
        res.status(500).json({ msg: 'Server Error' });
    }
});

// Grade Submission
router.put('/submissions/:id/grade', verifyToken, requireRole('TEACHER'), async (req, res) => {
    try {
        const teacherId = Number(req.user.teacherId || 0);
        if (!teacherId) return res.status(403).json({ msg: 'Access denied' });
        const submission = await Submission.findByPk(Number(req.params.id));
        if (!submission) return res.status(404).json({ msg: 'Submission not found' });
        const assignment = await Assignment.findByPk(Number(submission.assignmentId));
        if (!assignment) return res.status(404).json({ msg: 'Assignment not found' });
        if (Number(assignment.teacherId || 0) !== teacherId) return res.status(403).json({ msg: 'Access denied' });
        const { grade, feedback } = req.body || {};
        submission.grade = typeof grade === 'number' ? grade : submission.grade;
        submission.feedback = typeof feedback === 'string' ? feedback : submission.feedback;
        submission.status = 'Graded';
        await submission.save();
        const s = await Student.findByPk(String(submission.studentId)).catch(() => null);
        const statusMap = { Submitted: 'تم التسليم', NotSubmitted: 'لم يسلم', Late: 'متأخر', Graded: 'تم التقييم' };
        return res.json({
            id: String(submission.id),
            assignmentId: String(submission.assignmentId),
            studentId: String(submission.studentId),
            studentName: s ? s.name : '',
            submissionDate: submission.submissionDate ? new Date(submission.submissionDate).toISOString().split('T')[0] : null,
            status: statusMap[submission.status] || submission.status,
            grade: typeof submission.grade === 'number' ? Number(submission.grade) : undefined,
            feedback: submission.feedback || undefined,
            attachments: Array.isArray(submission.attachments) ? submission.attachments.map(a => ({
                filename: a.filename,
                mimeType: a.mimeType,
                size: a.size,
                url: `/api/submissions/${submission.id}/attachments/${encodeURIComponent(a.filename)}`,
                uploadedAt: a.uploadedAt
            })) : []
        });
    } catch (e) {
        try { console.error('Grade submission error:', e?.message || e); } catch { }
        res.status(500).json({ msg: 'Server Error' });
    }
});

// Download Teacher Attachment
router.get('/assignments/:assignmentId/attachments/:filename', verifyToken, requireRole('TEACHER'), async (req, res) => {
    try {
        const assignment = await Assignment.findByPk(Number(req.params.assignmentId));
        if (!assignment) return res.status(404).json({ msg: 'Assignment not found' });
        const teacherId = Number(req.user.teacherId || 0);
        if (!teacherId || Number(assignment.teacherId || 0) !== teacherId) return res.status(403).json({ msg: 'Access denied' });
        const schoolId = Number(assignment.schoolId || 0);
        const filename = path.basename(req.params.filename);
        const filePath = path.join(__dirname, '..', 'storage', 'assignments', String(schoolId || 'unknown'), filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found' });
        res.setHeader('Content-Disposition', `inline; filename=${filename}`);
        res.type(path.extname(filename));
        fs.createReadStream(filePath).pipe(res);
    } catch (e) { try { console.error('Download assignment attachment error:', e?.message || e); } catch { } res.status(500).json({ msg: 'Server Error' }); }
});

// Download Parent Attachment
router.get('/parent/:parentId/assignments/:assignmentId/attachments/:filename', verifyToken, requireRole('PARENT'), async (req, res) => {
    try {
        if (String(req.user.parentId) !== String(req.params.parentId)) return res.status(403).json({ msg: 'Access denied' });
        const parent = await Parent.findByPk(String(req.params.parentId));
        if (!parent) return res.status(404).json({ msg: 'Parent not found' });
        const assignment = await Assignment.findByPk(Number(req.params.assignmentId));
        if (!assignment) return res.status(404).json({ msg: 'Assignment not found' });
        if (Number(parent.schoolId || 0) !== Number(assignment.schoolId || 0)) return res.status(403).json({ msg: 'Access denied' });
        const schoolId = Number(assignment.schoolId || 0);
        const filename = path.basename(req.params.filename);
        const filePath = path.join(__dirname, '..', 'storage', 'assignments', String(schoolId || 'unknown'), filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found' });
        res.setHeader('Content-Disposition', `inline; filename=${filename}`);
        res.type(path.extname(filename));
        fs.createReadStream(filePath).pipe(res);
    } catch (e) { try { console.error('Parent download assignment attachment error:', e?.message || e); } catch { } res.status(500).json({ msg: 'Server Error' }); }
});

// Download Submission Attachment
router.get('/submissions/:id/attachments/:filename', verifyToken, requireRole('TEACHER'), async (req, res) => {
    try {
        const submission = await Submission.findByPk(Number(req.params.id));
        if (!submission) return res.status(404).json({ msg: 'Submission not found' });
        const assignment = await Assignment.findByPk(Number(submission.assignmentId));
        const teacherId = Number(req.user.teacherId || 0);
        if (!assignment || Number(assignment.teacherId || 0) !== teacherId) return res.status(403).json({ msg: 'Access denied' });
        const schoolId = Number(assignment.schoolId || 0);
        const filename = path.basename(req.params.filename);
        const studentId = String(submission.studentId);
        const filePath = path.join(__dirname, '..', 'storage', 'submissions', String(schoolId || 'unknown'), String(studentId || 'unknown'), filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found' });
        res.setHeader('Content-Disposition', `inline; filename=${filename}`);
        res.type(path.extname(filename));
        fs.createReadStream(filePath).pipe(res);
    } catch (e) { try { console.error('Download submission attachment error:', e?.message || e); } catch { } res.status(500).json({ msg: 'Server Error' }); }
});

module.exports = router;
