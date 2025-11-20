const express = require('express');
const router = express.Router();
const { Parent, Student, Grade, Attendance, Invoice, Notification } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

// @route   GET api/parent/:parentId/dashboard
// @desc    Get all necessary data for the parent dashboard
// @access  Private (Parent)
router.get('/:parentId/dashboard', verifyToken, requireRole('PARENT'), async (req, res) => {
    try {
        const { parentId } = req.params;

        const parent = await Parent.findByPk(parentId, {
            include: { model: Student, limit: 1 } // Assuming one student per parent for now
        });

        if (!parent || !parent.Students || parent.Students.length === 0) {
            return res.status(404).json({ msg: 'Parent or student not found' });
        }

        const student = parent.Students[0];

        const gradesPromise = Grade.findAll({ where: { studentId: student.id }, limit: 5, order: [['createdAt', 'DESC']] });
        const attendancePromise = Attendance.findAll({ where: { studentId: student.id }, limit: 30, order: [['date', 'DESC']] });
        const invoicesPromise = Invoice.findAll({ where: { studentId: student.id }, order: [['dueDate', 'DESC']] });
        const actionItemsPromise = Notification.findAll({ where: { parentId, isRead: false }, order: [['date', 'DESC']] });

        const [grades, attendance, invoices, actionItems] = await Promise.all([
            gradesPromise, attendancePromise, invoicesPromise, actionItemsPromise
        ]);

        const attendanceStatusMap = { 'Present': 'حاضر', 'Absent': 'غائب', 'Late': 'متأخر', 'Excused': 'بعذر' };
        const invoiceStatusMap = { 'PAID': 'مدفوعة', 'UNPAID': 'غير مدفوعة', 'OVERDUE': 'متأخرة' };
        const actionItemTypeMap = { 'Warning': 'warning', 'Info': 'info', 'Approval': 'approval' };


        res.json({
            student: student.toJSON(),
            grades: grades.map(g => ({
                ...g.toJSON(),
                studentId: g.studentId,
                studentName: student.name,
                classId: g.classId,
                grades: { homework: g.homework, quiz: g.quiz, midterm: g.midterm, final: g.final },
            })),
            attendance: attendance.map(a => ({
                studentId: a.studentId,
                status: attendanceStatusMap[a.status] || a.status,
                date: a.date,
            })),
            invoices: invoices.map(inv => ({
                id: inv.id.toString(),
                studentId: inv.studentId,
                studentName: student.name,
                status: invoiceStatusMap[inv.status] || inv.status,
                issueDate: inv.createdAt.toISOString().split('T')[0],
                dueDate: inv.dueDate.toISOString().split('T')[0],
                items: [{ description: `رسوم دراسية`, amount: parseFloat(inv.amount) }],
                totalAmount: parseFloat(inv.amount),
            })),
            actionItems: actionItems.map(item => ({
                id: item.id.toString(),
                type: actionItemTypeMap[item.type] || 'info',
                title: item.title,
                description: item.description,
                date: 'اليوم', // Simplified for now
            })),
            announcements: [ // Mock announcements for now
                 { id: 'conv_05', type: 'إعلان', participantName: 'إعلانات عامة للمدرسة', lastMessage: 'تذكير: اجتماع أولياء الأمور غدًا.', timestamp: '11:00 ص' }
            ]
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;