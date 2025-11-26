const express = require('express');
const router = express.Router();
const { School, Student, Teacher, Class, Parent, Invoice, SchoolSettings, SchoolEvent, Grade, Attendance, Schedule, StudentNote, StudentDocument, User, Subscription } = require('../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { SalaryStructure, SalarySlip } = require('../models');
const { StaffAttendance, TeacherAttendance } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadDir = path.join(__dirname, '..', 'uploads', 'payroll-receipts');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `receipt_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });
const { validate } = require('../middleware/validate');
const { requireModule } = require('../middleware/modules');

async function enforceActiveSubscription(req, res, next) {
  try {
    const schoolId = Number(req.params.schoolId);
    if (!schoolId) return res.status(400).json({ msg: 'Invalid schoolId' });
    let sub = await Subscription.findOne({ where: { schoolId } });
    if (!sub) {
      const { Plan } = require('../models');
      let plan = await Plan.findOne({ where: { recommended: true } });
      if (!plan) plan = await Plan.findOne();
      const renewal = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      sub = await Subscription.create({ schoolId, planId: plan?.id || null, status: 'TRIAL', startDate: new Date(), endDate: renewal, renewalDate: renewal });
    }
  const now = new Date();
  const renewal = sub.renewalDate ? new Date(sub.renewalDate) : null;
  const status = String(sub.status || '').toUpperCase();
  const trialExpired = status === 'TRIAL' && renewal && renewal.getTime() < now.getTime();
  const blocked = status === 'CANCELED' || status === 'PAST_DUE' || trialExpired;
    if (blocked) {
      // Allow reading settings so المدير يستطيع رؤية وضبط المعلومات حتى في حالة الحظر
      const pathStr = (req.path || '').toLowerCase();
      if (req.method === 'GET' && pathStr.includes('/settings')) {
        return next();
      }
      return res.status(402).json({ msg: 'انتهت النسخة التجريبية أو الاشتراك غير فعال. الرجاء دفع الرسوم لتفعيل المنصة.' });
    }
    next();
  } catch (e) {
    console.error('Subscription enforcement failed:', e);
    return res.status(500).json({ msg: 'Server Error' });
  }
}

// Note: Do not apply global enforcement to avoid blocking benign GETs.

// @route   GET api/schools/:id
// @desc    Get school by ID
// @access  Private (SchoolAdmin, SuperAdmin)
router.get('/schools/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id);
    if (!school) return res.status(404).json({ msg: 'School not found' });
    res.json(school);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/school/:schoolId/students
// @desc    Get all students for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/students', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const students = await Student.findAll({ where: { schoolId: req.params.schoolId }, order: [['name', 'ASC']] });
    if (!students) return res.status(404).json({ msg: 'No students found' });
    
    const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
    res.json(students.map(s => ({ ...s.toJSON(), status: statusMap[s.status] || s.status })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/students
// @desc    Add a new student to a school
// @access  Private (SchoolAdmin)
router.post('/:schoolId/students', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'grade', required: true, type: 'string' },
  { name: 'parentName', required: true, type: 'string' },
  { name: 'dateOfBirth', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { name, grade, parentName, dateOfBirth } = req.body;

    const school = await School.findByPk(schoolId);
    if (!school) {
      return res.status(404).json({ msg: 'School not found' });
    }

    const newStudent = await Student.create({
      id: `std_${Date.now()}`,
      name,
      grade,
      parentName,
      dateOfBirth,
      schoolId: parseInt(schoolId),
      status: 'Active', // Default status
      registrationDate: new Date(),
      profileImageUrl: `https://picsum.photos/seed/std_${Date.now()}/100/100`,
    });

    // Increment student count in the school
    await school.increment('studentCount');

    // Map status for frontend consistency
    const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
    const formattedStudent = {
        ...newStudent.toJSON(),
        status: statusMap[newStudent.status] || newStudent.status
    };

    res.status(201).json(formattedStudent);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/school/:schoolId/students/:studentId
// @desc    Update a student
// @access  Private (SchoolAdmin)
router.put('/:schoolId/students/:studentId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'grade', required: true, type: 'string' },
  { name: 'parentName', required: true, type: 'string' },
  { name: 'dateOfBirth', required: true, type: 'string' },
  { name: 'status', required: true, type: 'string', enum: ['نشط', 'موقوف'] },
]), async (req, res) => {
  try {
    const { name, grade, parentName, dateOfBirth, status } = req.body;
    if (!name || !grade || !parentName || !dateOfBirth || !status) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }
    const student = await Student.findByPk(req.params.studentId);
    if (!student) return res.status(404).json({ msg: 'Student not found' });
    student.name = name;
    student.grade = grade;
    student.parentName = parentName;
    student.dateOfBirth = dateOfBirth;
    student.status = status === 'نشط' ? 'Active' : status === 'موقوف' ? 'Suspended' : student.status;
    await student.save();
    const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
    res.json({ ...student.toJSON(), status: statusMap[student.status] || student.status });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});


// @route   GET api/school/:schoolId/teachers
// @desc    Get all teachers for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/teachers', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const teachers = await Teacher.findAll({ where: { schoolId: req.params.schoolId }, order: [['name', 'ASC']] });
    if (!teachers) return res.status(404).json({ msg: 'No teachers found' });
    
    const statusMap = { 'Active': 'نشط', 'OnLeave': 'في إجازة' };
    res.json(teachers.map(t => ({ ...t.toJSON(), status: statusMap[t.status] || t.status })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// Salary Structures CRUD
router.get('/:schoolId/salary-structures', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const rows = await SalaryStructure.findAll({ where: { schoolId: req.params.schoolId }, order: [['createdAt','DESC']] });
    res.json(rows.map(r => r.toJSON()));
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});
router.post('/:schoolId/salary-structures', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'type', required: true, type: 'string' },
  { name: 'baseAmount', required: false, type: 'string' },
]), async (req, res) => {
  try {
    const id = 'salstr_' + Date.now();
    const payload = req.body || {};
    const row = await SalaryStructure.create({ id, schoolId: parseInt(req.params.schoolId, 10), name: payload.name, type: payload.type, baseAmount: payload.baseAmount || 0, hourlyRate: payload.hourlyRate || null, lessonRate: payload.lessonRate || null, allowances: Array.isArray(payload.allowances) ? payload.allowances : [], deductions: Array.isArray(payload.deductions) ? payload.deductions : [], absencePenaltyPerDay: payload.absencePenaltyPerDay || null, latePenaltyPerMinute: payload.latePenaltyPerMinute || null, overtimeRatePerMinute: payload.overtimeRatePerMinute || null, appliesTo: payload.appliesTo || 'staff', isDefault: !!payload.isDefault });
    res.status(201).json(row.toJSON());
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});
router.put('/:schoolId/salary-structures/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const row = await SalaryStructure.findOne({ where: { id: req.params.id, schoolId: req.params.schoolId } });
    if (!row) return res.status(404).json({ msg: 'Not Found' });
    const p = req.body || {};
    if (p.name !== undefined) row.name = p.name;
    if (p.type !== undefined) row.type = p.type;
    if (p.baseAmount !== undefined) row.baseAmount = p.baseAmount;
    if (p.hourlyRate !== undefined) row.hourlyRate = p.hourlyRate;
    if (p.lessonRate !== undefined) row.lessonRate = p.lessonRate;
    if (p.allowances !== undefined) row.allowances = Array.isArray(p.allowances) ? p.allowances : [];
    if (p.deductions !== undefined) row.deductions = Array.isArray(p.deductions) ? p.deductions : [];
    if (p.absencePenaltyPerDay !== undefined) row.absencePenaltyPerDay = p.absencePenaltyPerDay;
    if (p.latePenaltyPerMinute !== undefined) row.latePenaltyPerMinute = p.latePenaltyPerMinute;
    if (p.overtimeRatePerMinute !== undefined) row.overtimeRatePerMinute = p.overtimeRatePerMinute;
    if (p.appliesTo !== undefined) row.appliesTo = p.appliesTo;
    if (p.isDefault !== undefined) row.isDefault = !!p.isDefault;
    await row.save();
    res.json(row.toJSON());
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});
router.delete('/:schoolId/salary-structures/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const count = await SalaryStructure.destroy({ where: { id: req.params.id, schoolId: req.params.schoolId } });
    res.json({ deleted: count > 0 });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// Assign salary structure to staff
router.put('/:schoolId/staff/:userId/salary-structure', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const staff = await User.findOne({ where: { id: req.params.userId, schoolId: req.params.schoolId, role: 'SchoolAdmin' } });
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

// Assign salary structure to teacher
router.put('/:schoolId/teachers/:teacherId/salary-structure', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ where: { id: Number(req.params.teacherId), schoolId: Number(req.params.schoolId) } });
    if (!teacher) return res.status(404).json({ msg: 'Teacher not found' });
    const { salaryStructureId } = req.body || {};
    if (!salaryStructureId) return res.status(400).json({ msg: 'salaryStructureId required' });
    const struct = await SalaryStructure.findOne({ where: { id: salaryStructureId, schoolId: req.params.schoolId } });
    if (!struct) return res.status(404).json({ msg: 'Structure not found' });
    teacher.salaryStructureId = salaryStructureId;
    await teacher.save();
    res.json({ id: teacher.id, salaryStructureId: teacher.salaryStructureId });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// Payroll processing
router.post('/:schoolId/payroll/process', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const month = String(req.query.month || '').trim();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ msg: 'Invalid month format' });
    const schoolId = parseInt(req.params.schoolId, 10);
    const staff = await User.findAll({ where: { schoolId, role: 'SchoolAdmin', isActive: { [Op.not]: false } } });
    const teachers = await Teacher.findAll({ where: { schoolId } });
    const structs = await SalaryStructure.findAll({ where: { schoolId } });
    const structMap = new Map(structs.map(s => [s.id, s]));
    const staffAttendanceRows = await StaffAttendance.findAll({ where: { schoolId, date: { [Op.like]: `${month}%` } } });
    const staffAttendanceByUser = new Map();
    for (const r of staffAttendanceRows) {
      const key = String(r.userId);
      const arr = staffAttendanceByUser.get(key) || [];
      arr.push(r);
      staffAttendanceByUser.set(key, arr);
    }
    const teacherAttendanceRows = await TeacherAttendance.findAll({ where: { schoolId, date: { [Op.like]: `${month}%` } } });
    const teacherAttendanceByTeacher = new Map();
    for (const r of teacherAttendanceRows) {
      const key = String(r.teacherId);
      const arr = teacherAttendanceByTeacher.get(key) || [];
      arr.push(r);
      teacherAttendanceByTeacher.set(key, arr);
    }
    const toCreate = [];
    function computeSlip(personType, id, structId){
      const struct = structMap.get(structId);
      if (!struct) return null;
      let base = Number(struct.baseAmount || 0);
      if (String(struct.type).toLowerCase() === 'hourly') {
        const rows = staffAttendanceByUser.get(String(id)) || [];
        const totalHours = rows.reduce((sum, r) => sum + Number(r.hoursWorked || 0), 0);
        const rate = Number(struct.hourlyRate || 0);
        base = totalHours * rate;
      }
      const allowancesArr = Array.isArray(struct.allowances) ? [...struct.allowances] : [];
      const deductionsArr = Array.isArray(struct.deductions) ? [...struct.deductions] : [];
      const rows = personType === 'staff' ? (staffAttendanceByUser.get(String(id)) || []) : (teacherAttendanceByTeacher.get(String(id)) || []);
      const absentDays = rows.filter(r => String(r.status).toLowerCase() === 'absent').length;
      const lateMinutes = rows.reduce((sum, r) => sum + Number(r.lateMinutes || 0), 0);
      const overtimeMinutes = rows.reduce((sum, r) => sum + Number(r.overtimeMinutes || 0), 0);
      const absencePenalty = Number(struct.absencePenaltyPerDay || 0) * absentDays;
      const latePenalty = Number(struct.latePenaltyPerMinute || 0) * lateMinutes;
      const overtimeRatePerMinute = struct.overtimeRatePerMinute != null ? Number(struct.overtimeRatePerMinute) : (Number(struct.hourlyRate || 0) / 60);
      const overtimeAllowance = overtimeRatePerMinute * overtimeMinutes;
      if (absencePenalty > 0) deductionsArr.push({ name: 'غياب', amount: absencePenalty });
      if (latePenalty > 0) deductionsArr.push({ name: 'تأخير', amount: latePenalty });
      if (overtimeAllowance > 0) allowancesArr.push({ name: 'ساعات إضافية', amount: overtimeAllowance });
      const allowancesTotal = allowancesArr.reduce((sum, a) => sum + Number(a.amount || 0), 0);
      const deductionsTotal = deductionsArr.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const net = base + allowancesTotal - deductionsTotal;
      return {
        id: `slip_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        schoolId,
        personType,
        personId: String(id),
        month,
        structureId: struct.id,
        baseAmount: base,
        allowancesTotal,
        deductionsTotal,
        netAmount: net,
        allowances: allowancesArr,
        deductions: deductionsArr,
        status: 'Draft',
      };
    }
    for (const s of staff) {
      if (s.salaryStructureId) {
        const draft = computeSlip('staff', s.id, s.salaryStructureId);
        if (draft) toCreate.push(draft);
      }
    }
    for (const t of teachers) {
      if (t.salaryStructureId) {
        const draft = computeSlip('teacher', t.id, t.salaryStructureId);
        if (draft) toCreate.push(draft);
      }
    }
    const created = await SalarySlip.bulkCreate(toCreate);
    res.status(201).json({ createdCount: created.length });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// Staff Attendance (Timesheet)
router.get('/:schoolId/staff-attendance', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { date, userId } = req.query;
    const where = { schoolId: Number(req.params.schoolId) };
    if (date) where.date = String(date);
    if (userId) where.userId = Number(userId);
    const rows = await StaffAttendance.findAll({ where, order: [['date','DESC']] });
    res.json(rows.map(r => r.toJSON()));
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});
router.post('/:schoolId/staff-attendance', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { userId, date, checkIn, checkOut, hoursWorked, status, overtimeMinutes } = req.body || {};
    if (!userId || !date) return res.status(400).json({ msg: 'userId and date required' });
    const id = 'stfatt_' + Date.now();
    const row = await StaffAttendance.create({ id, schoolId: Number(req.params.schoolId), userId: Number(userId), date, checkIn: checkIn || null, checkOut: checkOut || null, hoursWorked: hoursWorked || null, status: status || 'Present', overtimeMinutes: overtimeMinutes || 0 });
    res.status(201).json(row.toJSON());
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// Teacher Attendance (Timesheet)
router.get('/:schoolId/teacher-attendance', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { date, teacherId } = req.query;
    const where = { schoolId: Number(req.params.schoolId) };
    if (date) where.date = String(date);
    if (teacherId) where.teacherId = Number(teacherId);
    const rows = await TeacherAttendance.findAll({ where, order: [['date','DESC']] });
    res.json(rows.map(r => r.toJSON()));
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});
router.post('/:schoolId/teacher-attendance', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { teacherId, date, checkIn, checkOut, hoursWorked, status, overtimeMinutes, lateMinutes } = req.body || {};
    if (!teacherId || !date) return res.status(400).json({ msg: 'teacherId and date required' });
    const id = 'teachatt_' + Date.now();
    const row = await TeacherAttendance.create({ id, schoolId: Number(req.params.schoolId), teacherId: Number(teacherId), date, checkIn: checkIn || null, checkOut: checkOut || null, hoursWorked: hoursWorked || null, status: status || 'Present', overtimeMinutes: overtimeMinutes || 0, lateMinutes: lateMinutes || 0 });
    res.status(201).json(row.toJSON());
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.get('/:schoolId/payroll/salary-slips', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const month = String(req.query.month || '').trim();
    const where = { schoolId: req.params.schoolId };
    if (month) where.month = month;
    const rows = await SalarySlip.findAll({ where, order: [['createdAt','DESC']] });
    res.json(rows.map(r => r.toJSON()));
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.put('/:schoolId/payroll/salary-slips/:id/approve', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const row = await SalarySlip.findOne({ where: { id: req.params.id, schoolId: req.params.schoolId } });
    if (!row) return res.status(404).json({ msg: 'Not Found' });
    row.status = 'Approved';
    row.approvedBy = req.user?.id || null;
    await row.save();
    res.json(row.toJSON());
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// Manual receipt (سند استلام)
router.post('/:schoolId/payroll/salary-slips/:id/receipt', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), upload.single('attachment'), async (req, res) => {
  try {
    const row = await SalarySlip.findOne({ where: { id: req.params.id, schoolId: req.params.schoolId } });
    if (!row) return res.status(404).json({ msg: 'Not Found' });
    const { receiptNumber, receiptDate, receivedBy } = req.body || {};
    if (receiptNumber) row.receiptNumber = receiptNumber;
    if (receiptDate) row.receiptDate = receiptDate;
    row.receivedBy = receivedBy || (req.user?.name || '');
    if (req.file) row.receiptAttachmentUrl = `/uploads/payroll-receipts/${req.file.filename}`;
    row.status = 'Paid';
    row.paidAt = new Date();
    await row.save();
    res.json(row.toJSON());
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// @route   POST api/school/:schoolId/teachers
// @desc    Add a new teacher to a school
// @access  Private (SchoolAdmin)
router.post('/:schoolId/teachers', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'subject', required: true, type: 'string' },
  { name: 'phone', required: true, type: 'string' },
  { name: 'department', required: false, type: 'string' },
  { name: 'bankAccount', required: false, type: 'string' },
]), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { name, subject, phone, department, bankAccount } = req.body;

    const school = await School.findByPk(schoolId);
    if (!school) {
      return res.status(404).json({ msg: 'School not found' });
    }

    const newTeacher = await Teacher.create({
      name,
      subject,
      phone,
      department: department || null,
      bankAccount: bankAccount || null,
      schoolId: parseInt(schoolId),
      status: 'Active',
      joinDate: new Date(),
    });

    // Increment teacher count in the school
    await school.increment('teacherCount');

    // Map status for frontend consistency
    const statusMap = { 'Active': 'نشط', 'OnLeave': 'في إجازة' };
    const formattedTeacher = {
        ...newTeacher.toJSON(),
        status: statusMap[newTeacher.status] || newTeacher.status
    };

    res.status(201).json(formattedTeacher);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/school/:schoolId/teachers/:teacherId
// @desc    Update a teacher
// @access  Private (SchoolAdmin)
router.put('/:schoolId/teachers/:teacherId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'subject', required: true, type: 'string' },
  { name: 'phone', required: true, type: 'string' },
  { name: 'status', required: true, type: 'string', enum: ['نشط', 'في إجازة'] },
  { name: 'department', required: false, type: 'string' },
  { name: 'bankAccount', required: false, type: 'string' },
]), async (req, res) => {
  try {
    const { name, subject, phone, status, department, bankAccount } = req.body;
    if (!name || !subject || !phone || !status) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }
    const teacher = await Teacher.findByPk(Number(req.params.teacherId));
    if (!teacher) return res.status(404).json({ msg: 'Teacher not found' });
    teacher.name = name;
    teacher.subject = subject;
    teacher.phone = phone;
    if (department !== undefined) teacher.department = department || null;
    if (bankAccount !== undefined) teacher.bankAccount = bankAccount || null;
    teacher.status = status === 'نشط' ? 'Active' : status === 'في إجازة' ? 'OnLeave' : teacher.status;
    await teacher.save();
    const statusMap = { 'Active': 'نشط', 'OnLeave': 'في إجازة' };
    res.json({ ...teacher.toJSON(), status: statusMap[teacher.status] || teacher.status });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/:schoolId/staff', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const users = await User.findAll({ where: { schoolId: req.params.schoolId, role: 'SchoolAdmin' }, order: [['createdAt', 'DESC']] });
    res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, username: u.username, role: u.role, schoolId: u.schoolId, schoolRole: u.schoolRole, department: u.department, bankAccount: u.bankAccount, isActive: u.isActive })));
  } catch (err) { res.status(500).send('Server Error'); }
});

router.post('/:schoolId/staff', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'email', required: true, type: 'string' },
  { name: 'role', required: true, type: 'string' },
  { name: 'phone', required: false, type: 'string' },
]), async (req, res) => {
  try {
    const { name, email, role, phone, department, bankAccount, isActive } = req.body;
    const exists = await User.findOne({ where: { [Op.or]: [{ email }, { username: email.split('@')[0] }] } });
    if (exists) return res.status(400).json({ message: 'Email or username already exists' });
    function genPwd(){
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_+=';
      let s = '';
      for(let i=0;i<14;i++){ s += chars[Math.floor(Math.random()*chars.length)]; }
      return s;
    }
    const plain = genPwd();
    const pwd = await bcrypt.hash(plain, 10);
    const permissionsMap = {
      'مسؤول تسجيل': ['VIEW_DASHBOARD', 'MANAGE_STUDENTS', 'MANAGE_PARENTS', 'MANAGE_ATTENDANCE'],
      'مسؤول مالي': ['VIEW_DASHBOARD', 'MANAGE_FINANCE', 'MANAGE_REPORTS'],
      'منسق أكاديمي': ['VIEW_DASHBOARD', 'MANAGE_CLASSES', 'MANAGE_ATTENDANCE', 'MANAGE_GRADES', 'MANAGE_TEACHERS'],
      'سكرتير': ['VIEW_DASHBOARD', 'MANAGE_SCHEDULE', 'MANAGE_CALENDAR', 'MANAGE_MESSAGING'],
      'مشرف': ['VIEW_DASHBOARD', 'MANAGE_CLASSES', 'MANAGE_ATTENDANCE', 'MANAGE_GRADES', 'MANAGE_TEACHERS'],
      'مدير': ['VIEW_DASHBOARD', 'MANAGE_STUDENTS', 'MANAGE_TEACHERS', 'MANAGE_PARENTS', 'MANAGE_CLASSES', 'MANAGE_FINANCE', 'MANAGE_TRANSPORTATION', 'MANAGE_REPORTS', 'MANAGE_SETTINGS', 'MANAGE_MODULES', 'MANAGE_STAFF']
    };
    const user = await User.create({ name, email, phone, department: department || null, bankAccount: bankAccount || null, isActive: typeof isActive === 'boolean' ? isActive : true, username: email.split('@')[0], password: pwd, role: 'SchoolAdmin', schoolId: parseInt(req.params.schoolId, 10), schoolRole: role, permissions: permissionsMap[role] || ['VIEW_DASHBOARD'], passwordMustChange: true, tokenVersion: 0 });
    const { password: _, ...data } = user.toJSON();
    res.status(201).json({ id: data.id, name: data.name, email: data.email, username: data.username, role: data.role, schoolId: data.schoolId, schoolRole: data.schoolRole, department: data.department, bankAccount: data.bankAccount, isActive: data.isActive, tempPassword: plain });
  } catch (err) { console.error(err); res.status(500).json({ msg: String(err?.message || err) }); }
});

router.put('/:schoolId/staff/:userId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const staff = await User.findOne({ where: { id: req.params.userId, schoolId: req.params.schoolId, role: 'SchoolAdmin' } });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    const { name, email, role, phone, department, bankAccount, isActive } = req.body || {};
    if (email && email !== staff.email) {
      const dupe = await User.findOne({ where: { email, id: { [Op.ne]: staff.id } } });
      if (dupe) return res.status(400).json({ message: 'Email already in use' });
      staff.email = email;
      const uname = email.split('@')[0];
      const dupeUser = await User.findOne({ where: { username: uname, id: { [Op.ne]: staff.id } } });
      staff.username = dupeUser ? `${uname}_${Date.now()}` : uname;
    }
    if (name) staff.name = name;
    if (phone) staff.phone = phone;
    if (department !== undefined) staff.department = department || null;
    if (bankAccount !== undefined) staff.bankAccount = bankAccount || null;
    if (typeof isActive === 'boolean') staff.isActive = isActive;
    if (role) {
      staff.schoolRole = role;
      const permissionsMap = {
        'مسؤول تسجيل': ['VIEW_DASHBOARD', 'MANAGE_STUDENTS', 'MANAGE_PARENTS', 'MANAGE_ATTENDANCE'],
        'مسؤول مالي': ['VIEW_DASHBOARD', 'MANAGE_FINANCE', 'MANAGE_REPORTS'],
        'منسق أكاديمي': ['VIEW_DASHBOARD', 'MANAGE_CLASSES', 'MANAGE_ATTENDANCE', 'MANAGE_GRADES', 'MANAGE_TEACHERS'],
        'سكرتير': ['VIEW_DASHBOARD', 'MANAGE_SCHEDULE', 'MANAGE_CALENDAR', 'MANAGE_MESSAGING'],
        'مشرف': ['VIEW_DASHBOARD', 'MANAGE_CLASSES', 'MANAGE_ATTENDANCE', 'MANAGE_GRADES', 'MANAGE_TEACHERS'],
        'مدير': ['VIEW_DASHBOARD', 'MANAGE_STUDENTS', 'MANAGE_TEACHERS', 'MANAGE_PARENTS', 'MANAGE_CLASSES', 'MANAGE_FINANCE', 'MANAGE_TRANSPORTATION', 'MANAGE_REPORTS', 'MANAGE_SETTINGS', 'MANAGE_MODULES', 'MANAGE_STAFF']
      };
      staff.permissions = permissionsMap[role] || ['VIEW_DASHBOARD'];
    }
    await staff.save();
    return res.json({ id: staff.id, name: staff.name, email: staff.email, username: staff.username, role: staff.role, schoolId: staff.schoolId, schoolRole: staff.schoolRole, department: staff.department, bankAccount: staff.bankAccount, isActive: staff.isActive });
  } catch (err) { console.error(err); res.status(500).json({ msg: String(err?.message || err) }); }
});

router.delete('/:schoolId/staff/:userId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const staff = await User.findOne({ where: { id: req.params.userId, schoolId: req.params.schoolId, role: 'SchoolAdmin' } });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    if (String(staff.schoolRole || '') === 'مدير') return res.status(400).json({ message: 'Cannot delete Admin role staff' });
    if (req.user.id === staff.id) return res.status(400).json({ message: 'Cannot delete current user' });
    await staff.destroy();
    return res.json({ message: 'Deleted' });
  } catch (err) { console.error(err); res.status(500).json({ msg: String(err?.message || err) }); }
});

// @route   GET api/school/:schoolId/classes
// @desc    Get all classes for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/classes', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const classes = await Class.findAll({ where: { schoolId: req.params.schoolId }, order: [['name', 'ASC']] });
    // This model has no enums to map, but keeping structure consistent
    res.json(classes.map(c => ({...c.toJSON(), subjects: ['الرياضيات', 'العلوم', 'اللغة الإنجليزية']}))); // Adding mock subjects for now
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/classes
// @desc    Add a new class
// @access  Private (SchoolAdmin)
router.post('/:schoolId/classes', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string' },
  { name: 'gradeLevel', required: true, type: 'string' },
  { name: 'homeroomTeacherId', required: true, type: 'string' },
  { name: 'subjects', required: true },
  { name: 'capacity', required: false, type: 'number' },
]), async (req, res) => {
  try {
    const { name, gradeLevel, homeroomTeacherId, subjects, capacity } = req.body;
    if (!name || !gradeLevel || !homeroomTeacherId || !Array.isArray(subjects)) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }
    const teacher = await Teacher.findByPk(Number(homeroomTeacherId));
    if (!teacher) return res.status(404).json({ msg: 'Teacher not found' });
    const newClass = await Class.create({
      id: `cls_${Date.now()}`,
      name,
      gradeLevel,
      homeroomTeacherName: teacher.name,
      studentCount: 0,
      capacity: typeof capacity === 'number' ? capacity : 30,
      schoolId: parseInt(req.params.schoolId, 10),
      homeroomTeacherId: Number(homeroomTeacherId),
    });
    res.status(201).json({ ...newClass.toJSON(), subjects });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/:schoolId/classes/init', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const settings = await SchoolSettings.findOne({ where: { schoolId } });
    const stages = (settings && Array.isArray(settings.availableStages) && settings.availableStages.length > 0) ? settings.availableStages : ["رياض أطفال","ابتدائي","إعدادي","ثانوي"];
    const map = {
      "رياض أطفال": ["رياض أطفال"],
      "ابتدائي": ["الصف الأول","الصف الثاني","الصف الثالث","الصف الرابع","الصف الخامس","الصف السادس"],
      "إعدادي": ["أول إعدادي","ثاني إعدادي","ثالث إعدادي"],
      "ثانوي": ["أول ثانوي","ثاني ثانوي","ثالث ثانوي"],
    };
    const created = [];
    for (const stage of stages) {
      const grades = map[stage] || [];
      for (const g of grades) {
        const exists = await Class.findOne({ where: { schoolId, gradeLevel: g } });
        if (!exists) {
          const cls = await Class.create({ id: `cls_${Date.now()}_${Math.floor(Math.random()*1000)}`, name: 'الشعبة أ', gradeLevel: g, homeroomTeacherName: 'غير محدد', studentCount: 0, capacity: 30, schoolId, homeroomTeacherId: null });
          created.push(cls.toJSON());
        }
      }
    }
    res.status(201).json({ createdCount: created.length, created });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   PUT api/school/:schoolId/classes/:classId/roster
// @desc    Update class roster (student count only placeholder)
// @access  Private (SchoolAdmin)
router.put('/:schoolId/classes/:classId/roster', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds)) return res.status(400).json({ msg: 'studentIds must be an array' });
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    cls.studentCount = studentIds.length;
    await cls.save();
    res.json({ ...cls.toJSON(), subjects: ['الرياضيات', 'العلوم', 'اللغة الإنجليزية'] });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/class/:classId/students', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    if (req.user.role !== 'SUPER_ADMIN' && req.user.schoolId && Number(req.user.schoolId) !== Number(cls.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const students = await Student.findAll({ where: { schoolId: cls.schoolId, grade: cls.gradeLevel }, order: [['name','ASC']] });
    const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
    res.json(students.map(s => ({ ...s.toJSON(), status: statusMap[s.status] || s.status })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/class/:classId/attendance', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ msg: 'date is required' });
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    if (req.user.role !== 'SUPER_ADMIN' && req.user.schoolId && Number(req.user.schoolId) !== Number(cls.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const rows = await Attendance.findAll({ where: { classId: cls.id, date }, order: [['studentId','ASC']] });
    const statusMap = { 'Present': 'حاضر', 'Absent': 'غائب', 'Late': 'متأخر', 'Excused': 'بعذر' };
    res.json(rows.map(r => ({ studentId: r.studentId, date: r.date, status: statusMap[r.status] || r.status })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/class/:classId/attendance', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const { date, records } = req.body || {};
    if (!date || !Array.isArray(records)) return res.status(400).json({ msg: 'date and records are required' });
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    if (req.user.role !== 'SUPER_ADMIN' && req.user.schoolId && Number(req.user.schoolId) !== Number(cls.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const rev = { 'حاضر': 'Present', 'غائب': 'Absent', 'متأخر': 'Late', 'بعذر': 'Excused' };
    for (const rec of records) {
      const status = rev[rec.status] || rec.status;
      const existing = await Attendance.findOne({ where: { classId: cls.id, studentId: rec.studentId, date } });
      if (existing) { existing.status = status; await existing.save(); }
      else { await Attendance.create({ classId: cls.id, studentId: rec.studentId, date, status }); }
    }
    res.json({ ok: true });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/class/:classId/grades', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const { subject } = req.query;
    if (!subject) return res.status(400).json({ msg: 'subject is required' });
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    if (req.user.role !== 'SUPER_ADMIN' && req.user.schoolId && Number(req.user.schoolId) !== Number(cls.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const rows = await Grade.findAll({ where: { classId: cls.id, subject }, order: [['studentId','ASC']] });
    res.json(rows.map(r => ({ classId: String(cls.id), subject: r.subject, studentId: r.studentId, studentName: '', grades: { homework: r.homework, quiz: r.quiz, midterm: r.midterm, final: r.final } })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/:schoolId/grades', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { entries } = req.body || {};
    if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ msg: 'entries must be non-empty array' });
    for (const e of entries) {
      const existing = await Grade.findOne({ where: { studentId: e.studentId, classId: e.classId, subject: e.subject } });
      if (existing) {
        existing.homework = e.grades.homework;
        existing.quiz = e.grades.quiz;
        existing.midterm = e.grades.midterm;
        existing.final = e.grades.final;
        await existing.save();
      } else {
        await Grade.create({ studentId: e.studentId, classId: e.classId, subject: e.subject, homework: e.grades.homework, quiz: e.grades.quiz, midterm: e.grades.midterm, final: e.grades.final });
      }
    }
    res.json({ ok: true });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/class/:classId/schedule', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    if (req.user.role !== 'SUPER_ADMIN' && req.user.schoolId && Number(req.user.schoolId) !== Number(cls.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const rows = await Schedule.findAll({ where: { classId: cls.id }, order: [['day','ASC'],['timeSlot','ASC']] });
    res.json(rows.map(r => ({ id: String(r.id), classId: String(cls.id), className: cls.name, day: r.day, startTime: r.timeSlot.split(' - ')[0], endTime: r.timeSlot.split(' - ')[1] || r.timeSlot, subject: r.subject, teacher: '' })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   GET api/school/:schoolId/parents
// @desc    Get all parents for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/parents', verifyToken, requireRole('SCHOOL_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
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

// @route   GET api/school/:schoolId/invoices
// @desc    Get all invoices for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/invoices', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
        include: {
            model: Student,
            attributes: ['name'],
            where: { schoolId: req.params.schoolId },
        },
        order: [['dueDate', 'DESC']]
    });

    const statusMap = { 'PAID': 'مدفوعة', 'UNPAID': 'غير مدفوعة', 'OVERDUE': 'متأخرة' };
    res.json(invoices.map(inv => ({
        id: inv.id.toString(),
        studentId: inv.studentId,
        studentName: inv.Student.name,
        status: statusMap[inv.status] || inv.status,
        issueDate: inv.createdAt.toISOString().split('T')[0],
        dueDate: inv.dueDate.toISOString().split('T')[0],
        items: [{ description: `رسوم دراسية`, amount: parseFloat(inv.amount) }],
        totalAmount: parseFloat(inv.amount),
    })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/invoices
// @desc    Create a new invoice
// @access  Private (SchoolAdmin)
router.post('/:schoolId/invoices', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), validate([
  { name: 'studentId', required: true, type: 'string' },
  { name: 'dueDate', required: true, type: 'string' },
  { name: 'items', required: true },
]), async (req, res) => {
  try {
    const { studentId, dueDate, items } = req.body;
    if (!studentId || !dueDate || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: 'Invalid invoice data' });
    }
    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const inv = await Invoice.create({ studentId, amount: totalAmount, dueDate: new Date(dueDate), status: 'UNPAID' });
    res.status(201).json({ id: inv.id.toString(), studentId, studentName: '', status: 'غير مدفوعة', issueDate: inv.createdAt.toISOString().split('T')[0], dueDate, items, totalAmount });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/invoices/:invoiceId/payments
// @desc    Record a payment for an invoice
// @access  Private (SchoolAdmin)
router.post('/:schoolId/invoices/:invoiceId/payments', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), validate([
  { name: 'amount', required: true },
  { name: 'paymentDate', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const { amount, paymentDate, paymentMethod, notes } = req.body;
    if (!amount || !paymentDate) return res.status(400).json({ msg: 'Missing payment data' });
    const inv = await Invoice.findByPk(req.params.invoiceId);
    if (!inv) return res.status(404).json({ msg: 'Invoice not found' });
    inv.status = 'PAID';
    await inv.save();
    res.json({ id: inv.id.toString(), studentId: inv.studentId, studentName: '', status: 'مدفوعة', issueDate: inv.createdAt.toISOString().split('T')[0], dueDate: inv.dueDate.toISOString().split('T')[0], items: [{ description: 'القسط الدراسي', amount: parseFloat(inv.amount) }], totalAmount: parseFloat(inv.amount) });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// --- Student Profile Details ---
// @route   GET api/school/:schoolId/student/:studentId/details
// @desc    Get all details for a specific student
// @access  Private (SchoolAdmin)
router.get('/:schoolId/student/:studentId/details', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const { schoolId, studentId } = req.params;

        const gradesPromise = Grade.findAll({ where: { studentId }, include: Teacher, order: [['subject', 'ASC']] });
        const attendancePromise = Attendance.findAll({ where: { studentId }, order: [['date', 'DESC']] });
        const invoicesPromise = Invoice.findAll({ where: { studentId }, order: [['dueDate', 'DESC']] });
        const notesPromise = StudentNote.findAll({ where: { studentId }, order: [['date', 'DESC']] });
        const documentsPromise = StudentDocument.findAll({ where: { studentId }, order: [['uploadDate', 'DESC']] });

        const [grades, attendance, invoices, notes, documents] = await Promise.all([
            gradesPromise, attendancePromise, invoicesPromise, notesPromise, documentsPromise
        ]);
        
        // --- Map Enums to frontend friendly strings ---
        const attendanceStatusMap = { 'Present': 'حاضر', 'Absent': 'غائب', 'Late': 'متأخر', 'Excused': 'بعذر' };
        const invoiceStatusMap = { 'PAID': 'مدفوعة', 'UNPAID': 'غير مدفوعة', 'OVERDUE': 'متأخرة' };

        res.json({
            grades: grades.map(g => ({
                ...g.toJSON(),
                studentId: g.studentId,
                studentName: '', // Student name is already known on frontend
                classId: g.classId,
                grades: { homework: g.homework, quiz: g.quiz, midterm: g.midterm, final: g.final },
            })),
            attendance: attendance.map(a => ({
                studentId: a.studentId,
                studentName: '',
                status: attendanceStatusMap[a.status] || a.status,
                date: a.date,
            })),
            invoices: invoices.map(inv => ({
                id: inv.id.toString(),
                studentId: inv.studentId,
                studentName: '',
                status: invoiceStatusMap[inv.status] || inv.status,
                issueDate: inv.createdAt.toISOString().split('T')[0],
                dueDate: inv.dueDate.toISOString().split('T')[0],
                items: [{ description: `رسوم دراسية`, amount: parseFloat(inv.amount) }],
                totalAmount: parseFloat(inv.amount),
            })),
            notes,
            documents,
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   GET api/school/:schoolId/settings
// @desc    Get settings for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/settings', verifyToken, async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    let settings = await SchoolSettings.findOne({ where: { schoolId } });
    if (!settings) {
      const { School } = require('../models');
      const school = await School.findByPk(schoolId);
      const now = new Date();
      const start = new Date(now.getFullYear(), 8, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
      settings = await SchoolSettings.create({
        schoolId,
        schoolName: school?.name || 'مدرستي',
        schoolAddress: school?.address || '',
        academicYearStart: start,
        academicYearEnd: end,
        notifications: { email: true, sms: false, push: true },
        availableStages: ["رياض أطفال","ابتدائي","إعدادي","ثانوي"],
      });
    }
    res.json({
        ...settings.toJSON(),
        notifications: typeof settings.notifications === 'string' ? JSON.parse(settings.notifications) : settings.notifications,
        availableStages: Array.isArray(settings.availableStages) ? settings.availableStages : ["رياض أطفال","ابتدائي","إعدادي","ثانوي"],
        workingDays: Array.isArray(settings.workingDays) ? settings.workingDays : ['Sunday','Monday','Tuesday','Wednesday','Thursday'],
    });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   PUT api/school/:schoolId/settings
// @desc    Update settings for a specific school
// @access  Private (SchoolAdmin)
router.put('/:schoolId/settings', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), enforceActiveSubscription, async (req, res) => {
  try {
    const { 
      schoolName, schoolAddress, schoolLogoUrl, contactPhone, contactEmail, geoLocation,
      genderType, levelType, ownershipType, availableStages, workingHoursStart, workingHoursEnd, workingDays,
      academicYearStart, academicYearEnd, notifications 
    } = req.body;
    const settings = await SchoolSettings.findOne({ where: { schoolId: req.params.schoolId } });
    if (!settings) return res.status(404).json({ msg: 'Settings not found' });

    settings.schoolName = schoolName;
    settings.schoolAddress = schoolAddress;
    settings.schoolLogoUrl = schoolLogoUrl || settings.schoolLogoUrl;
    settings.contactPhone = contactPhone;
    settings.contactEmail = contactEmail;
    settings.geoLocation = geoLocation;
    settings.genderType = genderType;
    settings.levelType = levelType;
    settings.ownershipType = ownershipType;
    settings.availableStages = Array.isArray(availableStages) ? availableStages : settings.availableStages;
    settings.workingHoursStart = workingHoursStart;
    settings.workingHoursEnd = workingHoursEnd;
    if (workingDays !== undefined) settings.workingDays = Array.isArray(workingDays) ? workingDays : settings.workingDays;
    settings.academicYearStart = academicYearStart;
    settings.academicYearEnd = academicYearEnd;
    settings.notifications = notifications;
    
    await settings.save();
    res.json(settings);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});


// @route   GET api/school/:schoolId/events
// @desc    Get all events for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/events', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const events = await SchoolEvent.findAll({ 
        where: { schoolId: req.params.schoolId },
        order: [['date', 'ASC']]
    });
    const eventTypeMap = { 'Meeting': 'اجتماع', 'Activity': 'نشاط', 'Exam': 'اختبار', 'Holiday': 'عطلة' };
    res.json(events.map(e => ({...e.toJSON(), eventType: eventTypeMap[e.eventType] || e.eventType })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/:schoolId/expenses', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { Expense } = require('../models');
    const rows = await Expense.findAll({ where: { schoolId: Number(req.params.schoolId) }, order: [['date','DESC']] });
    res.json(rows.map(e => ({ id: String(e.id), date: e.date, description: e.description, category: e.category, amount: parseFloat(e.amount) })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/:schoolId/expenses', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { Expense } = require('../models');
    const { date, description, category, amount } = req.body || {};
    if (!date || !description || !category || amount === undefined) return res.status(400).json({ msg: 'Invalid payload' });
    const exp = await Expense.create({ schoolId: Number(req.params.schoolId), date, description, category, amount });
    res.status(201).json({ id: String(exp.id), date: exp.date, description: exp.description, category: exp.category, amount: parseFloat(exp.amount) });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/:schoolId/logo', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const path = require('path');
    const fse = require('fs-extra');
    const multer = require('multer');

    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        const target = path.join(__dirname, '..', 'uploads', 'school-logos');
        fse.ensureDirSync(target);
        cb(null, target);
      },
      filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = `logo_${req.params.schoolId}_${Date.now()}${ext}`;
        cb(null, safeName);
      }
    });

    const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }).single('logo');
    upload(req, res, async function (err) {
      if (err) return res.status(400).json({ msg: 'Upload failed' });
      const file = req.file;
      if (!file) return res.status(400).json({ msg: 'No file uploaded' });
      const publicUrl = `/uploads/school-logos/${file.filename}`;
      const settings = await SchoolSettings.findOne({ where: { schoolId: req.params.schoolId } });
      if (settings) { settings.schoolLogoUrl = publicUrl; await settings.save(); }
      return res.status(201).json({ url: publicUrl });
    });
  } catch (e) { console.error(e); return res.status(500).json({ msg: 'Server Error' }); }
});

module.exports = router;
