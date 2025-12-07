const express = require('express');
const router = express.Router();
const { Parent, Student, Grade, Attendance, Invoice, Notification, Schedule, Class, Teacher, Assignment, Submission } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

// @route   GET api/parent/:parentId/dashboard
// @desc    Get all necessary data for the parent dashboard
// @access  Private (Parent)
router.get('/:parentId/dashboard', verifyToken, requireRole('PARENT'), async (req, res) => {
    try {
        const { parentId } = req.params;
        if (String(req.user.parentId) !== String(parentId)) return res.status(403).json({ msg: 'Access denied' });
        const studentIdFilter = req.query?.studentId ? String(req.query.studentId) : '';
        const parent = await Parent.findByPk(parentId, { include: { model: Student } });
        if (!parent || !parent.Students || parent.Students.length === 0) return res.status(404).json({ msg: 'Parent or student not found' });
        const attendanceStatusMap = { 'Present': 'حاضر', 'Absent': 'غائب', 'Late': 'متأخر', 'Excused': 'بعذر' };
        const invoiceStatusMap = { 'PAID': 'مدفوعة', 'UNPAID': 'غير مدفوعة', 'OVERDUE': 'متأخرة' };
        const actionItemTypeMap = { 'Warning': 'warning', 'Info': 'info', 'Approval': 'approval' };
        const targetStudents = studentIdFilter ? parent.Students.filter(s => String(s.id) === studentIdFilter) : parent.Students;
        const children = [];
        for (const student of targetStudents) {
            const [grades, attendance, invoices] = await Promise.all([
                Grade.findAll({ where: { studentId: student.id }, limit: 5, order: [['createdAt','DESC']] }),
                Attendance.findAll({ where: { studentId: student.id }, limit: 30, order: [['date','DESC']] }),
                Invoice.findAll({ where: { studentId: student.id }, order: [['dueDate','DESC']] })
            ]);
            children.push({
                student: student.toJSON(),
                grades: grades.map(g => ({ ...g.toJSON(), studentId: g.studentId, studentName: student.name, classId: g.classId, grades: { homework: g.homework, quiz: g.quiz, midterm: g.midterm, final: g.final } })),
                attendance: attendance.map(a => ({ studentId: a.studentId, status: attendanceStatusMap[a.status] || a.status, date: a.date })),
                invoices: invoices.map(inv => ({ id: inv.id.toString(), studentId: inv.studentId, studentName: student.name, status: invoiceStatusMap[inv.status] || inv.status, issueDate: inv.createdAt.toISOString().split('T')[0], dueDate: inv.dueDate.toISOString().split('T')[0], items: [{ description: 'رسوم دراسية', amount: parseFloat(inv.amount) }], totalAmount: parseFloat(inv.amount) }))
            });
        }
        const actionItems = await Notification.findAll({ where: { parentId, isRead: false }, order: [['date','DESC']] });
        if (studentIdFilter || children.length === 1) {
            const single = children[0];
            return res.json({
                student: single.student,
                grades: single.grades,
                attendance: single.attendance,
                invoices: single.invoices,
                actionItems: actionItems.map(item => ({ id: item.id.toString(), type: actionItemTypeMap[item.type] || 'info', title: item.title, description: item.description, date: item.date.toISOString().split('T')[0] })),
                announcements: [{ id: 'conv_05', type: 'إعلان', participantName: 'إعلانات عامة للمدرسة', lastMessage: 'تذكير: اجتماع أولياء الأمور غدًا.', timestamp: '11:00 ص' }],
                children
            });
        }
        return res.json({ children, actionItems: actionItems.map(item => ({ id: item.id.toString(), type: actionItemTypeMap[item.type] || 'info', title: item.title, description: item.description, date: item.date.toISOString().split('T')[0] })) });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;

// Parent requests
router.get('/:parentId/requests', verifyToken, requireRole('PARENT'), async (req, res) => {
  try {
    const rows = await Notification.findAll({ where: { parentId: req.params.parentId }, order: [['createdAt','DESC']] });
    const statusMap = { 'Pending': 'قيد الانتظار', 'Approved': 'موافق عليه', 'Rejected': 'مرفوض' };
    res.json(rows.map(r => ({ id: String(r.id), title: r.title || 'طلب', description: r.description || '', status: statusMap[r.status] || 'قيد الانتظار', createdAt: r.createdAt.toISOString().split('T')[0] })));
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

router.post('/:parentId/requests', verifyToken, requireRole('PARENT'), async (req, res) => {
  try {
    const { title, description } = req.body || {};
    if (!title) return res.status(400).json({ msg: 'title is required' });
    const row = await Notification.create({ parentId: req.params.parentId, type: 'Approval', title, description: description || '', status: 'Pending' });
    res.status(201).json({ id: String(row.id), title: row.title, description: row.description, status: 'قيد الانتظار', createdAt: row.createdAt.toISOString().split('T')[0] });
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

router.get('/action-items', verifyToken, requireRole('PARENT'), async (req, res) => {
  try {
    const rows = await Notification.findAll({ where: { parentId: req.user.parentId }, order: [['date','DESC']] });
    const typeMap = { 'Warning': 'warning', 'Info': 'info', 'Approval': 'approval' };
    res.json(rows.map(r => ({ id: String(r.id), type: typeMap[r.type] || 'info', title: r.title, description: r.description, date: r.date.toISOString().split('T')[0], isRead: !!r.isRead })));
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

router.get('/:parentId/student-schedule', verifyToken, requireRole('PARENT'), async (req, res) => {
  try {
    if (String(req.user.parentId) !== String(req.params.parentId)) return res.status(403).json({ msg: 'Access denied' });
    const studentIdFilter = req.query?.studentId ? String(req.query.studentId) : '';
    const parent = await Parent.findByPk(req.params.parentId, { include: { model: Student } });
    if (!parent || !parent.Students || parent.Students.length === 0) return res.status(404).json({ msg: 'No student linked' });
    const targets = studentIdFilter ? parent.Students.filter(s => String(s.id) === studentIdFilter) : parent.Students;
    const list = [];
    for (const student of targets) {
      const rows = await Schedule.findAll({ where: { classId: student.classId }, include: [{ model: Teacher, attributes: ['name'] }, { model: Class, attributes: ['gradeLevel','section'] }], order: [['day','ASC'],['timeSlot','ASC']] });
      const schedule = rows.map(r => ({ id: String(r.id), classId: String(r.classId), className: r.Class ? `${r.Class.gradeLevel} (${r.Class.section || 'أ'})` : '', day: r.day, timeSlot: r.timeSlot, subject: r.subject, teacherName: r.Teacher ? r.Teacher.name : '' }));
      list.push({ student: student.toJSON(), schedule });
    }
    if (studentIdFilter || list.length === 1) return res.json(list[0]);
    return res.json({ children: list });
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

router.get('/:parentId/assignments', verifyToken, requireRole('PARENT'), async (req, res) => {
    try {
        if (String(req.user.parentId) !== String(req.params.parentId)) return res.status(403).json({ msg: 'Access denied' });
        const studentIdFilter = req.query?.studentId ? String(req.query.studentId) : '';
        const parent = await Parent.findByPk(req.params.parentId, { include: { model: Student } });
        if (!parent || !parent.Students || parent.Students.length === 0) return res.status(404).json({ msg: 'No student linked' });
        const targets = studentIdFilter ? parent.Students.filter(s => String(s.id) === studentIdFilter) : parent.Students;
        
        const list = [];
        for (const student of targets) {
            const assignments = await Assignment.findAll({ 
                where: { classId: student.classId },
                include: [{ model: Teacher, attributes: ['name'] }],
                order: [['dueDate', 'DESC']] 
            });
            list.push({ 
                student: student.toJSON(), 
                assignments: assignments.map(a => ({
                    id: String(a.id),
                    title: a.title,
                    description: a.description,
                    dueDate: a.dueDate,
                    teacherName: a.Teacher ? a.Teacher.name : 'Unknown',
                    status: a.status
                }))
            });
        }
        
        if (studentIdFilter || list.length === 1) return res.json(list[0]);
        return res.json({ children: list });
    } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

router.get('/:parentId/assignments/:assignmentId/submission', verifyToken, requireRole('PARENT'), async (req, res) => {
    try {
        if (String(req.user.parentId) !== String(req.params.parentId)) return res.status(403).json({ msg: 'Access denied' });
        const { studentId } = req.query;
        if (!studentId) return res.status(400).json({ msg: 'studentId is required' });
        
        const submission = await Submission.findOne({ 
            where: { 
                assignmentId: req.params.assignmentId,
                studentId: studentId
            }
        });
        
        if (!submission) return res.json(null);
        return res.json(submission);
    } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

router.post('/:parentId/assignments/:assignmentId/submit', verifyToken, requireRole('PARENT'), async (req, res) => {
    try {
        if (String(req.user.parentId) !== String(req.params.parentId)) return res.status(403).json({ msg: 'Access denied' });
        const { studentId, content } = req.body;
        if (!studentId) return res.status(400).json({ msg: 'studentId is required' });
        
        let submission = await Submission.findOne({ 
            where: { 
                assignmentId: req.params.assignmentId,
                studentId: studentId
            }
        });
        
        if (submission) {
            submission.content = content || submission.content;
            submission.status = 'Submitted';
            submission.submissionDate = new Date();
            await submission.save();
        } else {
            submission = await Submission.create({
                assignmentId: req.params.assignmentId,
                studentId: studentId,
                content: content || '',
                status: 'Submitted',
                submissionDate: new Date()
            });
        }
        
        return res.json(submission);
    } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

router.get('/:parentId/grades', verifyToken, requireRole('PARENT'), async (req, res) => {
    try {
        if (String(req.user.parentId) !== String(req.params.parentId)) return res.status(403).json({ msg: 'Access denied' });
        const studentIdFilter = req.query?.studentId ? String(req.query.studentId) : '';
        const parent = await Parent.findByPk(req.params.parentId, { include: { model: Student } });
        if (!parent || !parent.Students || parent.Students.length === 0) return res.status(404).json({ msg: 'No student linked' });
        const targets = studentIdFilter ? parent.Students.filter(s => String(s.id) === studentIdFilter) : parent.Students;
        
        const list = [];
        for (const student of targets) {
            const grades = await Grade.findAll({ 
                where: { studentId: student.id }, 
                order: [['createdAt', 'DESC']] 
            });
            list.push({ 
                student: student.toJSON(), 
                grades: grades.map(g => ({ ...g.toJSON(), studentId: g.studentId, studentName: student.name, classId: g.classId, grades: { homework: g.homework, quiz: g.quiz, midterm: g.midterm, final: g.final } }))
            });
        }
        
        if (studentIdFilter || list.length === 1) return res.json(list[0]);
        return res.json({ children: list });
    } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

router.get('/:parentId/attendance', verifyToken, requireRole('PARENT'), async (req, res) => {
    try {
        if (String(req.user.parentId) !== String(req.params.parentId)) return res.status(403).json({ msg: 'Access denied' });
        const studentIdFilter = req.query?.studentId ? String(req.query.studentId) : '';
        const parent = await Parent.findByPk(req.params.parentId, { include: { model: Student } });
        if (!parent || !parent.Students || parent.Students.length === 0) return res.status(404).json({ msg: 'No student linked' });
        const targets = studentIdFilter ? parent.Students.filter(s => String(s.id) === studentIdFilter) : parent.Students;
        const attendanceStatusMap = { 'Present': 'حاضر', 'Absent': 'غائب', 'Late': 'متأخر', 'Excused': 'بعذر' };
        
        const list = [];
        for (const student of targets) {
            const attendance = await Attendance.findAll({ 
                where: { studentId: student.id }, 
                order: [['date', 'DESC']] 
            });
            list.push({ 
                student: student.toJSON(), 
                attendance: attendance.map(a => ({ studentId: a.studentId, status: attendanceStatusMap[a.status] || a.status, date: a.date }))
            });
        }
        
        if (studentIdFilter || list.length === 1) return res.json(list[0]);
        return res.json({ children: list });
    } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

module.exports = router;
