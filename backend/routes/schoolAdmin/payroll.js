const express = require('express');
const router = express.Router({ mergeParams: true });
const { SalaryStructure, SalarySlip, Teacher, User, StaffAttendance, TeacherAttendance } = require('../../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { auditFinanceOperation } = require('../../middleware/auditLog');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { Op } = require('sequelize');

// Multer setup for receipts
const receiptStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const dir = path.join(__dirname, '../../../uploads/receipts');
        await fs.ensureDir(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `receipt-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const uploadReceipt = multer({
    storage: receiptStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|pdf/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) return cb(null, true);
        cb(new Error('Only images (jpeg, jpg, png) and PDFs are allowed'));
    }
});

// Helper to calculate salary
const calculateSalary = (structure, attendanceStats) => {
    if (!structure) return 0;
    const basic = parseFloat(structure.basicSalary || 0);
    const housing = parseFloat(structure.housingAllowance || 0);
    const transport = parseFloat(structure.transportAllowance || 0);
    const other = parseFloat(structure.otherAllowances || 0);
    const gross = basic + housing + transport + other;

    let deduction = 0;
    // Simple logic: deduction per absent day
    // In a real app, this might be more complex (hourly, etc.)
    const deductionPerDay = parseFloat(structure.deductionPerDay || (basic / 30));
    if (attendanceStats && attendanceStats.absent > 0) {
        deduction += (attendanceStats.absent * deductionPerDay);
    }

    // Add tax/insurance logic here if needed based on structure
    const tax = parseFloat(structure.tax || 0);
    const insurance = parseFloat(structure.insurance || 0);

    return Math.max(0, gross - deduction - tax - insurance);
};

// @route   GET api/school/:schoolId/payroll/structures
// @desc    Get all salary structures
router.get('/structures', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const structures = await SalaryStructure.findAll({ where: { schoolId: req.params.schoolId } });
        res.json(structures);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/payroll/structures
// @desc    Create salary structure
router.post('/structures', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), validate([
    { name: 'title', required: true, type: 'string' },
    { name: 'basicSalary', required: true, type: 'number' }
]), async (req, res) => {
    try {
        const { title, basicSalary, housingAllowance, transportAllowance, otherAllowances, deductionPerDay, tax, insurance } = req.body;
        const struct = await SalaryStructure.create({
            schoolId: parseInt(req.params.schoolId),
            title,
            basicSalary,
            housingAllowance: housingAllowance || 0,
            transportAllowance: transportAllowance || 0,
            otherAllowances: otherAllowances || 0,
            deductionPerDay: deductionPerDay || 0,
            tax: tax || 0,
            insurance: insurance || 0
        });
        res.status(201).json(struct);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

// @route   DELETE api/school/:schoolId/payroll/structures/:id
router.delete('/structures/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), auditFinanceOperation('DELETE_SALARY_STRUCTURE'), async (req, res) => {
    try {
        const struct = await SalaryStructure.findOne({ where: { id: req.params.id, schoolId: req.params.schoolId } });
        if (!struct) return res.status(404).json({ msg: 'Structure not found' });
        // Check usage
        const teacherCount = await Teacher.count({ where: { salaryStructureId: struct.id } });
        const userCount = await User.count({ where: { salaryStructureId: struct.id } });
        if (teacherCount > 0 || userCount > 0) return res.status(409).json({ msg: 'Structure in use' });

        await struct.destroy();
        res.json({ msg: 'Deleted' });
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/payroll/generate
// @desc    Generate salary slips for a month
router.post('/generate', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), auditFinanceOperation('RUN_PAYROLL'), async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId);
        const { month, year } = req.body; // 1-12, YYYY
        if (!month || !year) return res.status(400).json({ msg: 'Month and year required' });

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Process Teachers
        const teachers = await Teacher.findAll({ where: { schoolId, status: 'Active' }, include: [SalaryStructure] });
        let count = 0;
        for (const t of teachers) {
            if (!t.SalaryStructure) continue;
            // Check if slip exists
            const existing = await SalarySlip.findOne({ where: { teacherId: t.id, month, year } });
            if (existing) continue;

            const attendances = await TeacherAttendance.findAll({
                where: {
                    teacherId: t.id,
                    date: { [Op.between]: [startDate, endDate] },
                    status: 'Absent'
                }
            });
            const absentCount = attendances.length;
            const netSalary = calculateSalary(t.SalaryStructure, { absent: absentCount });

            await SalarySlip.create({
                schoolId,
                teacherId: t.id,
                month,
                year,
                basicSalary: t.SalaryStructure.basicSalary,
                allowances: (t.SalaryStructure.housingAllowance || 0) + (t.SalaryStructure.transportAllowance || 0) + (t.SalaryStructure.otherAllowances || 0),
                deductions: (absentCount * (t.SalaryStructure.deductionPerDay || 0)) + (t.SalaryStructure.tax || 0) + (t.SalaryStructure.insurance || 0),
                netSalary,
                status: 'Pension' // Default pending
            });
            count++;
        }

        // Process Staff (Users with role Staff)
        const staff = await User.findAll({
            where: { schoolId, role: 'Staff', isActive: true },
            include: [SalaryStructure] // Assuming User has association, or we fetch manually
        });
        // Note: User-SalaryStructure association might need to be verified in models definition. 
        // If not standard, might need `SalaryStructure.findOne({ where: { id: user.salaryStructureId } })`

        for (const s of staff) {
            if (!s.salaryStructureId) continue;
            const struct = s.SalaryStructure || await SalaryStructure.findByPk(s.salaryStructureId);
            if (!struct) continue;

            const existing = await SalarySlip.findOne({ where: { userId: s.id, month, year } });
            if (existing) continue;

            const attendances = await StaffAttendance.findAll({
                where: {
                    userId: s.id,
                    date: { [Op.between]: [startDate, endDate] },
                    status: 'Absent'
                }
            });
            const absentCount = attendances.length;
            const netSalary = calculateSalary(struct, { absent: absentCount });

            await SalarySlip.create({
                schoolId,
                userId: s.id,
                month,
                year,
                basicSalary: struct.basicSalary,
                allowances: (struct.housingAllowance || 0) + (struct.transportAllowance || 0) + (struct.otherAllowances || 0),
                deductions: (absentCount * (struct.deductionPerDay || 0)) + (struct.tax || 0) + (struct.insurance || 0),
                netSalary,
                status: 'Pending'
            });
            count++;
        }

        res.json({ msg: 'Payroll run complete', generated: count });

    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

// @route   GET api/school/:schoolId/payroll/slips
router.get('/slips', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const { month, year } = req.query;
        const where = { schoolId: req.params.schoolId };
        if (month) where.month = month;
        if (year) where.year = year;

        const slips = await SalarySlip.findAll({
            where,
            include: [
                { model: Teacher, attributes: ['name'] },
                { model: User, attributes: ['name'] }
            ],
            order: [['year', 'DESC'], ['month', 'DESC']]
        });

        res.json(slips.map(s => ({
            id: s.id,
            name: s.Teacher ? s.Teacher.name : (s.User ? s.User.name : 'Unknown'),
            type: s.Teacher ? 'Teacher' : 'Staff',
            month: s.month,
            year: s.year,
            netSalary: s.netSalary,
            status: s.status,
            paymentDate: s.paymentDate,
            receiptUrl: s.receiptUrl
        })));
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

// @route   PUT api/school/:schoolId/payroll/slips/:id/pay
// @desc    Mark slip as paid and upload receipt
router.put('/slips/:id/pay', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), auditFinanceOperation('PAY_SALARY'), uploadReceipt.single('receipt'), async (req, res) => {
    try {
        const slip = await SalarySlip.findOne({ where: { id: req.params.id, schoolId: req.params.schoolId } });
        if (!slip) return res.status(404).json({ msg: 'Slip not found' });

        slip.status = 'Paid';
        slip.paymentDate = new Date();
        if (req.file) {
            slip.receiptUrl = `/uploads/receipts/${req.file.filename}`;
        }
        await slip.save();
        res.json(slip);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

module.exports = router;
