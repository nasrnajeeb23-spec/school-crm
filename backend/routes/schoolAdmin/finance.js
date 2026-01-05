const express = require('express');
const router = express.Router({ mergeParams: true });
const { FeeSetup, Invoice, Expense, Student, User } = require('../../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { auditFinanceOperation } = require('../../middleware/auditLog');
const { Op } = require('sequelize');

// FEES SETUP

// @route   GET api/school/:schoolId/fees
router.get('/fees', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const fees = await FeeSetup.findAll({ where: { schoolId: req.params.schoolId }, order: [['title', 'ASC']] });
        res.json(fees);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/fees
router.post('/fees', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), validate([
    { name: 'title', required: true, type: 'string' },
    { name: 'amount', required: true, type: 'string' }, // Accept string or number, parse later
    { name: 'grade', required: true, type: 'string' }
]), async (req, res) => {
    try {
        const { title, amount, grade, isOptional, dueDate } = req.body;
        const fee = await FeeSetup.create({
            schoolId: parseInt(req.params.schoolId),
            title,
            amount: parseFloat(amount),
            grade,
            isOptional: !!isOptional,
            dueDate: dueDate ? new Date(dueDate) : null
        });
        res.status(201).json(fee);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

// INVOICES

// @route   GET api/school/:schoolId/invoices
router.get('/invoices', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const invoices = await Invoice.findAll({ where: { schoolId: req.params.schoolId }, order: [['createdAt', 'DESC']], limit: 200 });
        res.json(invoices);
    } catch (err) { console.error(err); res.status(500).json({ msg: 'Server Error' }); }
});

// @route   POST api/school/:schoolId/invoices/generate
// @desc    Generate invoices for students
router.post('/invoices/generate', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), auditFinanceOperation('GENERATE_INVOICES'), async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId);
        const { feeId, targetGrade, targetStudentId } = req.body;

        // Fetch Fee
        let fee = null;
        if (feeId) fee = await FeeSetup.findByPk(feeId);
        if (!fee && !feeId && req.body.manualAmount) {
            // Handle ad-hoc invoice generation
            fee = { title: req.body.title || 'Addoc Fee', amount: parseFloat(req.body.manualAmount) };
        }
        if (!fee) return res.status(404).json({ msg: 'Fee setup not found' });

        let students = [];
        if (targetStudentId) {
            const s = await Student.findOne({ where: { id: targetStudentId, schoolId } });
            if (s) students.push(s);
        } else if (targetGrade) {
            students = await Student.findAll({ where: { schoolId, grade: targetGrade, status: 'Active' } });
        }

        if (students.length === 0) return res.status(400).json({ msg: 'No eligible students found' });

        let count = 0;
        for (const s of students) {
            // Prevent duplicate if needed (omitted for brevity)
            await Invoice.create({
                id: `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                schoolId,
                studentId: s.id,
                studentName: s.name,
                title: fee.title,
                amount: fee.amount,
                status: 'Pending',
                dueDate: fee.dueDate ? new Date(fee.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            count++;
        }

        res.json({ msg: 'Invoices generated', count });
    } catch (err) { console.error(err); res.status(500).json({ msg: 'Server Error' }); }
});

// EXPENSES

// @route   GET api/school/:schoolId/expenses
router.get('/expenses', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const expenses = await Expense.findAll({ where: { schoolId: req.params.schoolId }, order: [['date', 'DESC']], limit: 200 });
        res.json(expenses);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/expenses
router.post('/expenses', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), auditFinanceOperation('ADD_EXPENSE'), validate([
    { name: 'title', required: true, type: 'string' },
    { name: 'amount', required: true, type: 'number' },
    { name: 'category', required: true, type: 'string' }
]), async (req, res) => {
    try {
        const { title, amount, category, date, description } = req.body;
        const exp = await Expense.create({
            schoolId: parseInt(req.params.schoolId),
            title,
            amount,
            category,
            date: date ? new Date(date) : new Date(),
            description,
            status: 'Approved', // Auto-approve for admins
            recordedBy: req.user.name
        });
        res.status(201).json(exp);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

module.exports = router;
