const express = require('express');
const router = express.Router();
const { School, Student, Teacher, Class, Parent, Invoice, Expense, SchoolSettings, SchoolEvent, Grade, Attendance, Schedule, StudentNote, StudentDocument, User, Subscription, FeeSetup, Notification, AuditLog, BehaviorRecord } = require('../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { SalaryStructure, SalarySlip } = require('../models');
const { StaffAttendance, TeacherAttendance } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const archiver = require('archiver');
const baseReceiptDir = path.join(__dirname, '..', 'storage', 'payroll-receipts');
fse.ensureDirSync(baseReceiptDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const schoolId = String(req.params.schoolId || '');
      const target = path.join(baseReceiptDir, schoolId);
      fse.ensureDirSync(target);
      cb(null, target);
    } catch (e) { cb(e); }
  },
  filename: (req, file, cb) => {
    try {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const base = path.basename(file.originalname || '', ext).replace(/[^a-zA-Z0-9_.-]/g,'_');
      cb(null, `receipt_${Date.now()}_${base}${ext}`);
    } catch (e) { cb(e); }
  }
});
const allowedReceiptMimes = new Set(['application/pdf','image/png','image/jpeg']);
const allowedReceiptExts = new Set(['.pdf','.png','.jpg','.jpeg']);
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    try {
      const ext = path.extname(file.originalname || '').toLowerCase();
      if (!allowedReceiptMimes.has(file.mimetype) || !allowedReceiptExts.has(ext)) return cb(new Error('Invalid file type'));
      cb(null, true);
    } catch (e) { cb(new Error('Invalid file')); }
  }
});
const { scanFile, verifyFileSignature } = require('../utils/fileSecurity');
const { validate } = require('../middleware/validate');
const { requireModule, moduleMap } = require('../middleware/modules');

async function enforceActiveSubscription(req, res, next) {
  try {
    const schoolId = Number(req.params.schoolId);
    if (!schoolId) return res.status(400).json({ msg: 'Invalid schoolId' });
    let sub = await Subscription.findOne({ where: { schoolId } });
    if (!sub) {
      const { Plan } = require('../models');
      let plan = await Plan.findOne({ where: { recommended: true } });
      if (!plan) plan = await Plan.findOne();
      const renewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      sub = await Subscription.create({ schoolId, planId: plan?.id || null, status: 'TRIAL', startDate: new Date(), endDate: renewal, renewalDate: renewal });
    }
  const now = new Date();
  const renewal = sub.renewalDate ? new Date(sub.renewalDate) : null;
  const status = String(sub.status || '').toUpperCase();
  const trialExpired = status === 'TRIAL' && renewal && renewal.getTime() < now.getTime();
    const blocked = status === 'CANCELED' || status === 'PAST_DUE' || trialExpired;
    if (blocked) {
      // Allow access to settings, modules (to select plan), and payments (to pay)
      const pathStr = (req.path || '').toLowerCase();
      const method = req.method;
      
      // Whitelist essential endpoints for renewal
      const isSettings = method === 'GET' && pathStr.includes('/settings');
      const isModules = pathStr.includes('/modules'); // GET to list, PUT to update selection
      const isPayments = pathStr.includes('/payment') || pathStr.includes('/subscription'); // POST to pay
      const isMe = pathStr.includes('/me'); // Auth check
      
      if (isSettings || isModules || isPayments || isMe) {
        return next();
      }
      return res.status(402).json({ msg: 'انتهت النسخة التجريبية أو الاشتراك غير فعال. الرجاء دفع الرسوم لتفعيل المنصة.', code: 'SUBSCRIPTION_EXPIRED' });
    }
    next();
  } catch (e) {
    console.error('Subscription enforcement failed:', e);
    // Log detailed error but don't crash if possible, or return 500 with details
    // It's better to fail safe (allow access? or block?) - sticking to block for safety but logging well.
    // Actually, returning 500 blocks access, which is safe for subscription logic.
    if (req.logger) req.logger.error('Subscription enforcement error', { error: e.message, stack: e.stack });
    return res.status(500).json({ msg: 'Server Error during subscription check', error: e.message });
  }
}

// Note: Do not apply global enforcement to avoid blocking benign GETs.

function parseFileSizeToBytes(input){
  try {
    const s = String(input || '').trim().toLowerCase();
    if (!s) return 0;
    const numMatch = s.match(/([\d.,]+)/);
    const num = numMatch ? parseFloat(String(numMatch[1]).replace(/,/g, '')) : 0;
    if (s.includes('tb')) return num * 1024 * 1024 * 1024 * 1024;
    if (s.includes('gb')) return num * 1024 * 1024 * 1024;
    if (s.includes('mb')) return num * 1024 * 1024;
    if (s.includes('kb')) return num * 1024;
    if (s.includes('b') || s.includes('bytes')) return num;
    return num;
  } catch { return 0; }
}

// @route   GET api/school/:schoolId/stats/counts
// @desc    Get quick counts for resource usage widget (uses aggregated stats if available)
// @access  Private (SchoolAdmin)
router.get('/:schoolId/stats/counts', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    
    // Try to get latest aggregated stats first
    const { SchoolStats } = require('../models');
    if (SchoolStats) {
        const today = new Date().toISOString().split('T')[0];
        const stats = await SchoolStats.findOne({ 
            where: { schoolId, date: today },
            attributes: ['totalStudents', 'presentStudents'] // We don't have teachers in stats yet, but we can partially use it
        });
        
        // If we have stats for today, use them for students count (though stats might be end-of-day, so realtime might be better for counts?)
        // Actually, for dashboard counts, real-time is usually preferred unless expensive.
        // Let's keep real-time for simple counts as they are indexed and fast enough for now.
        // But let's add a "performance" flag query param to force using stats if client wants
    }

    const [students, teachers] = await Promise.all([
      Student.count({ where: { schoolId } }),
      Teacher.count({ where: { schoolId } })
    ]);
    res.json({ students, teachers });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/school/:schoolId/subscription
// @desc    Get school subscription plan details
// @access  Private (SchoolAdmin)
router.get('/:schoolId/subscription', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
      const schoolId = Number(req.params.schoolId);
      const { Subscription, Plan, SubscriptionModule, ModuleCatalog } = require('../models');
      const subscription = await Subscription.findOne({ 
        where: { schoolId }, 
        include: [
          { model: Plan },
          { 
            model: SubscriptionModule,
            include: [{ model: ModuleCatalog, attributes: ['id', 'name', 'description', 'monthlyPrice'] }]
          }
        ] 
      });
      
      if (!subscription) {
          return res.status(404).json({ msg: 'No subscription found' });
      }

      // Calculate days remaining
      const now = new Date();
      const end = new Date(subscription.endDate);
      const diffTime = Math.abs(end - now);
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      const isExpired = end < now;

      // Merge custom limits with plan limits
      const planLimits = subscription.Plan?.limits || {};
      const customLimits = subscription.customLimits || {};
      const finalLimits = { ...planLimits, ...customLimits };

      res.json({
        planName: subscription.Plan?.name || 'Unknown',
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: isExpired ? 'EXPIRED' : subscription.status,
        daysRemaining: isExpired ? 0 : daysRemaining,
        limits: finalLimits,
        price: subscription.Plan?.price || 0,
        interval: subscription.Plan?.interval || 'monthly',
        modules: []
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
});




// @route   GET api/school/:schoolId/stats/dashboard
// @desc    Get comprehensive dashboard stats (uses aggregation if available)
// @access  Private (SchoolAdmin)
router.get('/:schoolId/stats/dashboard', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const schoolId = Number(req.params.schoolId);
        const { SchoolStats, Subscription, Plan } = require('../models');
        
        // Fetch Subscription info
        const subscription = await Subscription.findOne({ 
            where: { schoolId },
            include: [Plan]
        });
        const planName = subscription?.Plan?.name || 'Basic';
        const subscriptionStatus = subscription?.status || 'Inactive';

        // Prepare full subscription details for display
        const subscriptionDetails = subscription ? {
            planName: subscription.Plan?.name || 'Unknown',
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            status: subscription.status,
            limits: subscription.Plan?.limits || {},
            price: subscription.Plan?.price || 0,
            interval: subscription.Plan?.interval || 'monthly'
        } : null;

        // Check for cached/aggregated stats for today
        const today = new Date().toISOString().split('T')[0];
        let stats = null;
        
        if (SchoolStats) {
            stats = await SchoolStats.findOne({ where: { schoolId, date: today } });
        }

        if (stats) {
            return res.json({
                students: stats.totalStudents,
                attendanceRate: stats.attendanceRate,
                revenue: stats.totalRevenue,
                expenses: stats.totalExpenses,
                source: 'aggregated',
                planName,
                subscriptionStatus,
                subscription: subscriptionDetails
            });
        }

        // Fallback to real-time calculation if no aggregated stats
        const [students, attendanceCount, revenue, expenses] = await Promise.all([
            Student.count({ where: { schoolId } }),
            Attendance.count({ where: { schoolId, date: today, status: 'Present' } }),
            Invoice.sum('amount', { where: { schoolId, status: 'PAID' } }), 
            Expense.sum('amount', { where: { schoolId } })
        ]);

        const attendanceRate = students > 0 ? (attendanceCount / students) * 100 : 0;

        res.json({
            students,
            attendanceRate,
            revenue: revenue || 0,
            expenses: expenses || 0,
            source: 'realtime',
            planName,
            subscriptionStatus,
            subscription: subscriptionDetails
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   GET api/schools/:id
// @desc    Get school by ID
// @access  Private (SchoolAdmin, SuperAdmin)
router.get('/schools/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  try {
    const { Subscription, Plan } = require('../models');
    const school = await School.findByPk(req.params.id, {
        include: [{
            model: Subscription,
            include: [Plan]
        }]
    });
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
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const students = await Student.findAll({ where: { schoolId: req.user.schoolId }, order: [['name', 'ASC']], limit, offset });
    if (!students) return res.error(404, 'NOT_FOUND', 'No students found');
    
    const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
    return res.success({ students: students.map(s => ({ ...s.toJSON(), status: statusMap[s.status] || s.status })), limit, offset });
  } catch (err) { console.error(err.message); return res.error(500, 'SERVER_ERROR', 'Server Error'); }
});

// @route   POST api/school/:schoolId/students
// @desc    Add a new student to a school
// @access  Private (SchoolAdmin)
const { requireWithinLimits, normalizeLimits } = require('../middleware/limits');

router.post('/:schoolId/students', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireWithinLimits('students'), validate([
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'grade', required: true, type: 'string' },
  { name: 'parentName', required: true, type: 'string' },
  { name: 'dateOfBirth', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { name, grade, parentName, dateOfBirth, address, city, homeLocation, lat, lng } = req.body;

    const school = await School.findByPk(schoolId);
    if (!school) {
        return res.error(404, 'NOT_FOUND', 'School not found');
    }

    // Check plan limits
    const { Subscription, Plan, SchoolSettings } = require('../models');
    const subscription = await Subscription.findOne({ where: { schoolId }, include: [Plan] });
    const settings = await SchoolSettings.findOne({ where: { schoolId } });
    
    // Default limits if no plan (fallback)
    let maxStudents = 50; 
    let limitSource = 'default';

    // 1. Check Custom Limits (Highest Priority)
    if (settings && settings.customLimits && settings.customLimits.students !== undefined) {
        const val = settings.customLimits.students;
        if (val === 'unlimited') maxStudents = 999999;
        else maxStudents = Number(val);
        limitSource = 'custom';
    } 
    // 2. Check Plan Limits
    else if (subscription && subscription.Plan && subscription.Plan.limits) {
        const limits = typeof subscription.Plan.limits === 'string' 
            ? JSON.parse(subscription.Plan.limits) 
            : subscription.Plan.limits;
        
        if (limits.students && limits.students !== 'unlimited') {
            maxStudents = Number(limits.students);
        } else if (limits.students === 'unlimited') {
            maxStudents = 999999;
        }
        limitSource = 'plan';
    }
    // 3. Check Subscription customLimits (Legacy/Fallback)
    else if (subscription && subscription.customLimits) {
         const limits = typeof subscription.customLimits === 'string' ? JSON.parse(subscription.customLimits) : subscription.customLimits;
         if (limits.students) maxStudents = limits.students === 'unlimited' ? 999999 : Number(limits.students);
    }

    const currentCount = await Student.count({ where: { schoolId } });
    if (currentCount >= maxStudents) {
        return res.status(403).json({ 
            msg: `لقد تجاوزت الحد الأقصى لعدد الطلاب (${maxStudents}). يرجى ترقية الاشتراك.`,
            code: 'LIMIT_EXCEEDED',
            details: { current: currentCount, max: maxStudents, source: limitSource }
        });
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
      homeLocation: homeLocation || ((address || city || lat !== undefined || lng !== undefined) ? { address: address || '', city: city || '', ...(lat !== undefined ? { lat: Number(lat) } : {}), ...(lng !== undefined ? { lng: Number(lng) } : {}) } : null),
    });

    // Increment student count in the school
    await school.increment('studentCount');

    // Map status for frontend consistency
    const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
    const formattedStudent = {
        ...newStudent.toJSON(),
        status: statusMap[newStudent.status] || newStudent.status
    };

    return res.success(formattedStudent, 'Student created', 'CREATED');
  } catch (err) {
    console.error(err.message);
    return res.error(500, 'SERVER_ERROR', 'Server Error');
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
      return res.error(400, 'VALIDATION_FAILED', 'Missing required fields');
    }
    const student = await Student.findByPk(req.params.studentId);
    if (!student) return res.error(404, 'NOT_FOUND', 'Student not found');
    student.name = name;
    student.grade = grade;
    student.parentName = parentName;
    student.dateOfBirth = dateOfBirth;
    student.status = status === 'نشط' ? 'Active' : status === 'موقوف' ? 'Suspended' : student.status;
    await student.save();
    const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
    return res.success({ ...student.toJSON(), status: statusMap[student.status] || student.status }, 'Student updated');
  } catch (err) { console.error(err.message); return res.error(500, 'SERVER_ERROR', 'Server Error'); }
});


// @route   GET api/school/:schoolId/teachers
// @desc    Get all teachers for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/teachers', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const teachers = await Teacher.findAll({ where: { schoolId: req.params.schoolId }, order: [['name', 'ASC']], limit, offset });
    if (!teachers) return res.error(404, 'NOT_FOUND', 'No teachers found');
    
    const statusMap = { 'Active': 'نشط', 'OnLeave': 'في إجازة' };
    return res.success({ teachers: teachers.map(t => ({ ...t.toJSON(), status: statusMap[t.status] || t.status })), limit, offset });
  } catch (err) { console.error(err.message); return res.error(500, 'SERVER_ERROR', 'Server Error'); }
});

// Salary Structures CRUD
router.get('/:schoolId/salary-structures', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('finance_salaries'), async (req, res) => {
  try {
    const rows = await SalaryStructure.findAll({ where: { schoolId: req.params.schoolId }, order: [['createdAt','DESC']] });
    res.json(rows.map(r => r.toJSON()));
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});
router.post('/:schoolId/salary-structures', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('finance_salaries'), validate([
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
router.put('/:schoolId/salary-structures/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('finance_salaries'), async (req, res) => {
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
router.delete('/:schoolId/salary-structures/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('finance_salaries'), async (req, res) => {
  try {
    const count = await SalaryStructure.destroy({ where: { id: req.params.id, schoolId: req.params.schoolId } });
    res.json({ deleted: count > 0 });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// Assign salary structure to staff
router.put('/:schoolId/staff/:userId/salary-structure', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('finance_salaries'), async (req, res) => {
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
router.put('/:schoolId/teachers/:teacherId/salary-structure', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('finance_salaries'), async (req, res) => {
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
router.post('/:schoolId/payroll/process', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('finance_salaries'), async (req, res) => {
  try {
    const { SalarySlip } = require('../models');
    try { await SalarySlip.sync({ alter: true }); } catch (e) { console.error('Sync SalarySlip Error:', e); } // Auto-heal

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
    return res.success({ attendance: rows.map(r => r.toJSON()) });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});
router.post('/:schoolId/staff-attendance', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { userId, date, checkIn, checkOut, hoursWorked, status, overtimeMinutes } = req.body || {};
    if (!userId || !date) return res.error(400, 'VALIDATION_FAILED', 'userId and date required');
    const id = 'stfatt_' + Date.now();
    const row = await StaffAttendance.create({ id, schoolId: Number(req.params.schoolId), userId: Number(userId), date, checkIn: checkIn || null, checkOut: checkOut || null, hoursWorked: hoursWorked || null, status: status || 'Present', overtimeMinutes: overtimeMinutes || 0 });
    return res.success(row.toJSON(), 'Staff attendance created', 'CREATED');
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
    return res.success({ attendance: rows.map(r => r.toJSON()) });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});
router.post('/:schoolId/teacher-attendance', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { teacherId, date, checkIn, checkOut, hoursWorked, status, overtimeMinutes, lateMinutes } = req.body || {};
    if (!teacherId || !date) return res.error(400, 'VALIDATION_FAILED', 'teacherId and date required');
    const id = 'teachatt_' + Date.now();
    const row = await TeacherAttendance.create({ id, schoolId: Number(req.params.schoolId), teacherId: Number(teacherId), date, checkIn: checkIn || null, checkOut: checkOut || null, hoursWorked: hoursWorked || null, status: status || 'Present', overtimeMinutes: overtimeMinutes || 0, lateMinutes: lateMinutes || 0 });
    return res.success(row.toJSON(), 'Teacher attendance created', 'CREATED');
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.get('/:schoolId/payroll/salary-slips', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('finance_salaries'), async (req, res) => {
  try {
    const month = String(req.query.month || '').trim();
    const where = { schoolId: req.params.schoolId };
    if (month) where.month = month;
    const rows = await SalarySlip.findAll({ where, order: [['createdAt','DESC']] });
    res.json(rows.map(r => r.toJSON()));
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.put('/:schoolId/payroll/salary-slips/:id/approve', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('finance_salaries'), async (req, res) => {
  try {
    const row = await SalarySlip.findOne({ where: { id: req.params.id, schoolId: req.params.schoolId } });
    if (!row) return res.status(404).json({ msg: 'Not Found' });

    if (row.status === 'Approved' || row.status === 'Paid') {
        return res.status(400).json({ msg: 'Salary slip already approved' });
    }

    row.status = 'Approved';
    row.approvedBy = req.user?.id || null;
    await row.save();

    // Auto-create Expense Record
    try {
        let personName = row.personId;
        if (row.personType === 'teacher') {
            const t = await Teacher.findByPk(row.personId);
            if (t) personName = t.name;
        } else if (row.personType === 'staff') {
            const s = await User.findByPk(row.personId);
            if (s) personName = s.name;
        }

        await Expense.create({
            schoolId: row.schoolId,
            date: new Date(),
            description: `Salary Payment - ${row.month} - ${personName}`,
            category: 'Salaries',
            amount: row.netAmount
        });
    } catch (expErr) {
        console.error('Failed to create expense for salary slip:', expErr);
        // Don't fail the approval if expense creation fails, but log it
    }

    res.json(row.toJSON());
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// Manual receipt (سند استلام)
router.post('/:schoolId/payroll/salary-slips/:id/receipt', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('finance_salaries'), upload.single('attachment'), async (req, res) => {
  try {
    const row = await SalarySlip.findOne({ where: { id: req.params.id, schoolId: req.params.schoolId } });
    if (!row) return res.status(404).json({ msg: 'Not Found' });
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'storage', 'payroll-receipts', String(req.params.schoolId), req.file.filename);
      
      // Verify File Signature (Magic Numbers)
      const sig = await verifyFileSignature(filePath);
      if (!sig.valid) {
        try { await fse.remove(filePath); } catch {}
        return res.status(400).json({ msg: 'Invalid file signature: ' + sig.reason });
      }

      // Scan for malware
      const scan = await scanFile(filePath);
      if (!scan.clean) { try { await fse.remove(filePath); } catch {} return res.status(400).json({ msg: 'Malware detected' }); }
    }
    const { receiptNumber, receiptDate, receivedBy } = req.body || {};
    if (receiptNumber) row.receiptNumber = receiptNumber;
    if (receiptDate) row.receiptDate = receiptDate;
    row.receivedBy = receivedBy || (req.user?.name || '');
    if (req.file) row.receiptAttachmentUrl = `/api/school/${req.params.schoolId}/payroll/receipts/${req.file.filename}`;
    row.status = 'Paid';
    row.paidAt = new Date();
    await row.save();
    res.json(row.toJSON());
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.get('/:schoolId/payroll/receipts/:filename', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance_salaries'), async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, '..', 'storage', 'payroll-receipts', String(req.params.schoolId), filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found' });
    res.setHeader('Content-Disposition', `inline; filename=${filename}`);
    res.type(path.extname(filename));
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// @route   POST api/school/:schoolId/teachers
// @desc    Add a new teacher to a school
// @access  Private (SchoolAdmin)
router.post('/:schoolId/teachers', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireWithinLimits('teachers'), validate([
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'subject', required: true, type: 'string' },
  { name: 'phone', required: true, type: 'string' },
  { name: 'department', required: false, type: 'string' },
  { name: 'bankAccount', required: false, type: 'string' },
]), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { name, subject, phone, department, bankAccount } = req.body;

    const school = await School.findByPk(req.user.schoolId);
    if (!school) return res.status(404).json({ msg: 'School not found' });

    // Check plan limits
    const { Subscription, Plan, SchoolSettings } = require('../models');
    const subscription = await Subscription.findOne({ where: { schoolId: req.user.schoolId }, include: [Plan] });
    const settings = await SchoolSettings.findOne({ where: { schoolId: req.user.schoolId } });
    
    // Default limits
    let maxTeachers = 5; 
    let limitSource = 'default';
    
    // 1. Check Custom Limits
    if (settings && settings.customLimits && settings.customLimits.teachers !== undefined) {
        const val = settings.customLimits.teachers;
        maxTeachers = val === 'unlimited' ? 999999 : Number(val);
        limitSource = 'custom';
    }
    // 2. Check Plan Limits
    else if (subscription && subscription.Plan && subscription.Plan.limits) {
        const limits = typeof subscription.Plan.limits === 'string' 
            ? JSON.parse(subscription.Plan.limits) 
            : subscription.Plan.limits;
        
        if (limits.teachers && limits.teachers !== 'unlimited') {
            maxTeachers = Number(limits.teachers);
        } else if (limits.teachers === 'unlimited') {
            maxTeachers = 999999;
        }
        limitSource = 'plan';
    }

    const currentCount = await Teacher.count({ where: { schoolId: req.user.schoolId } });
    if (currentCount >= maxTeachers) {
        return res.status(403).json({ 
            msg: `لقد تجاوزت الحد الأقصى لعدد المعلمين (${maxTeachers}). يرجى ترقية الاشتراك.`,
            code: 'LIMIT_EXCEEDED',
            details: { current: currentCount, max: maxTeachers, source: limitSource }
        });
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

 

 

 

 

// @route   GET api/school/:schoolId/classes
// @desc    Get all classes for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/classes', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const classes = await Class.findAll({ where: { schoolId: req.params.schoolId }, order: [['name', 'ASC']] });
    res.json(classes.map(c => {
      const json = c.toJSON();
      const displayName = `${json.gradeLevel} (${json.section || 'أ'})`;
      return { ...json, name: displayName, subjects: Array.isArray(json.subjects) ? json.subjects : [] };
    }));
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
  { name: 'section', required: false, type: 'string' },
]), async (req, res) => {
  try {
    const { name, gradeLevel, homeroomTeacherId, subjects, capacity, section } = req.body;
    if (!name || !gradeLevel || !homeroomTeacherId || !Array.isArray(subjects)) {
      return res.status(400).json({ msg: 'Missing required fields' });
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
    });
    const json = newClass.toJSON();
    const displayName = `${json.gradeLevel} (${json.section || 'أ'})`;
    res.status(201).json({ ...json, name: displayName, subjects: Array.isArray(json.subjects) ? json.subjects : [] });
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
          const cls = await Class.create({ id: `cls_${Date.now()}_${Math.floor(Math.random()*1000)}`, name: g, section: 'أ', gradeLevel: g, homeroomTeacherName: 'غير محدد', studentCount: 0, capacity: 30, schoolId, homeroomTeacherId: null });
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
    const uniqueIds = Array.from(new Set(studentIds.map(id => String(id))));
    const currentMembers = await Student.findAll({ where: { schoolId: cls.schoolId, classId: cls.id }, attributes: ['id'] });
    const currentIds = new Set(currentMembers.map(s => String(s.id)));
    const toAdd = uniqueIds.filter(id => !currentIds.has(id));
    const toRemove = Array.from(currentIds).filter(id => !uniqueIds.includes(id));
    
    // Check capacity
    if (toAdd.length > 0) {
      const currentCount = await Student.count({ where: { schoolId: cls.schoolId, classId: cls.id } });
      const available = cls.capacity - currentCount + toRemove.length; // +toRemove because they will be removed
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

router.put('/:schoolId/classes/:classId/details', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: false, type: 'string' },
  { name: 'capacity', required: false, type: 'number' },
  { name: 'homeroomTeacherId', required: false, type: 'string' },
  { name: 'section', required: false, type: 'string' }
]), async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    if (Number(cls.schoolId) !== Number(req.params.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const { name, capacity, homeroomTeacherId, section } = req.body || {};
    if (typeof name === 'string' && name.trim()) cls.name = name.trim();
    if (typeof capacity === 'number' && capacity > 0) cls.capacity = capacity;
    if (homeroomTeacherId !== undefined && homeroomTeacherId !== null && String(homeroomTeacherId).trim()) {
      const tId = Number(homeroomTeacherId);
      const teacher = await Teacher.findByPk(tId);
      if (!teacher || Number(teacher.schoolId) !== Number(cls.schoolId)) return res.status(400).json({ msg: 'Invalid homeroom teacher' });
      cls.homeroomTeacherId = tId;
      cls.homeroomTeacherName = teacher.name;
    }
    if (typeof section === 'string' && section.trim()) cls.section = section.trim();
    await cls.save();
    { const j = cls.toJSON(); const displayName = `${j.gradeLevel} (${j.section || 'أ'})`; res.json({ ...j, name: displayName, subjects: Array.isArray(j.subjects) ? j.subjects : [] }); }
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.delete('/:schoolId/classes/:classId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    if (Number(cls.schoolId) !== Number(req.params.schoolId)) return res.status(403).json({ msg: 'Access denied' });
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

router.put('/:schoolId/classes/:classId/subjects', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { subjects } = req.body || {};
    if (!Array.isArray(subjects)) return res.status(400).json({ msg: 'subjects must be an array' });
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    if (Number(cls.schoolId) !== Number(req.params.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    cls.subjects = subjects.filter(s => typeof s === 'string' && s.trim().length > 0);
    await cls.save();
    { const j = cls.toJSON(); const displayName = `${j.gradeLevel} (${j.section || 'أ'})`; res.json({ ...j, name: displayName, subjects: Array.isArray(j.subjects) ? j.subjects : [] }); }
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.put('/:schoolId/classes/:classId/subject-teachers', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const payload = req.body || {};
    if (typeof payload !== 'object' || Array.isArray(payload)) return res.status(400).json({ msg: 'Invalid payload' });
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    if (Number(cls.schoolId) !== Number(req.params.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const map = {};
    for (const [subject, teacherId] of Object.entries(payload)) {
      if (typeof subject !== 'string' || !subject.trim()) continue;
      const tId = Number(teacherId);
      if (!tId) continue;
      const teacher = await Teacher.findByPk(tId);
      if (!teacher || Number(teacher.schoolId) !== Number(cls.schoolId)) return res.status(400).json({ msg: `Invalid teacher for subject ${subject}` });
      map[subject] = tId;
    }
    cls.subjectTeacherMap = map;
    await cls.save();
    res.json({ ...cls.toJSON(), subjectTeacherMap: cls.subjectTeacherMap || {} });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/class/:classId/schedule', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    if (req.user.role !== 'SUPER_ADMIN' && req.user.schoolId && Number(req.user.schoolId) !== Number(cls.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const rows = await Schedule.findAll({ where: { classId: cls.id }, include: [{ model: Teacher, attributes: ['name'] }], order: [['day','ASC'],['timeSlot','ASC']] });
    const list = rows.map(r => ({ id: String(r.id), classId: String(cls.id), day: r.day, timeSlot: r.timeSlot, subject: r.subject, teacherName: r.Teacher ? r.Teacher.name : '' }));
    res.json(list);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/class/:classId/schedule', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { entries } = req.body || {};
    if (!Array.isArray(entries)) return res.status(400).json({ msg: 'entries must be an array' });
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    if (req.user.schoolId && Number(req.user.schoolId) !== Number(cls.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const validDays = new Set(['Sunday','Monday','Tuesday','Wednesday','Thursday']);
    function parseSlot(s) {
      try {
        const parts = String(s).split('-');
        const a = (parts[0] || '').trim();
        const b = (parts[1] || '').trim();
        const toMin = (hm) => { const t = String(hm).split(':'); const h = Number(t[0]); const m = Number(t[1]); return h*60 + m; };
        const start = toMin(a);
        const end = toMin(b);
        return { start, end, ok: Number.isFinite(start) && Number.isFinite(end) && start < end };
      } catch { return { start: 0, end: 0, ok: false }; }
    }
    const normalized = [];
    const teacherIds = new Set();
    const daysSet = new Set();
    const map = cls.subjectTeacherMap || {};
    for (const e of entries) {
      const day = String(e.day || '');
      const timeSlot = String(e.timeSlot || '');
      const subject = String(e.subject || '');
      if (!validDays.has(day)) continue;
      const ps = parseSlot(timeSlot);
      if (!ps.ok) continue;
      if (Array.isArray(cls.subjects) && cls.subjects.length > 0 && !cls.subjects.includes(subject)) {
        normalized.push({ invalidSubject: true, day, timeSlot, subject });
        continue;
      }
      const tId = map[subject] ? Number(map[subject]) : null;
      normalized.push({ day, timeSlot, subject, start: ps.start, end: ps.end, teacherId: tId || null });
      if (tId) { teacherIds.add(tId); daysSet.add(day); }
    }
    const conflicts = [];
    const byTeacherDay = {};
    for (const n of normalized) {
      if (!n.teacherId) continue;
      const key = `${n.teacherId}:${n.day}`;
      if (!byTeacherDay[key]) byTeacherDay[key] = [];
      for (const prev of byTeacherDay[key]) {
        if (n.start < prev.end && prev.start < n.end) {
          conflicts.push({ type: 'batch', teacherId: n.teacherId, day: n.day, timeSlot: n.timeSlot, otherTimeSlot: prev.timeSlot, subject: n.subject });
        }
      }
      byTeacherDay[key].push(n);
    }
    // Check for Teacher Conflicts
    if (teacherIds.size > 0) {
      const existing = await Schedule.findAll({ where: { teacherId: { [Op.in]: Array.from(teacherIds) }, day: { [Op.in]: Array.from(daysSet) } }, include: [{ model: Class, attributes: ['id','gradeLevel','section'] }] });
      for (const n of normalized) {
        if (!n.teacherId) continue;
        for (const r of existing) {
          if (Number(r.teacherId) !== Number(n.teacherId)) continue;
          if (r.day !== n.day) continue;
          const ps2 = parseSlot(r.timeSlot);
          if (!ps2.ok) continue;
          if (n.start < ps2.end && ps2.start < n.end && String(r.classId) !== String(cls.id)) {
            const cname = r.Class ? `${r.Class.gradeLevel} (${r.Class.section || 'أ'})` : '';
            conflicts.push({ type: 'teacher', teacherId: n.teacherId, day: n.day, timeSlot: n.timeSlot, existingTimeSlot: r.timeSlot, conflictWithClassId: String(r.classId), conflictWithClassName: cname });
          }
        }
      }
    }

    // Check for Room/Section Conflicts (if section represents a shared room)
    if (cls.section) {
      // Find other classes with the same section name in this school
      const sameSectionClasses = await Class.findAll({ 
        where: { 
          schoolId: cls.schoolId, 
          section: cls.section,
          id: { [Op.ne]: cls.id } // Exclude current class
        },
        attributes: ['id', 'gradeLevel', 'section']
      });

      if (sameSectionClasses.length > 0) {
        const otherClassIds = sameSectionClasses.map(c => c.id);
        const roomSchedules = await Schedule.findAll({
          where: {
            classId: { [Op.in]: otherClassIds },
            day: { [Op.in]: Array.from(daysSet) }
          },
          include: [{ model: Class, attributes: ['id', 'gradeLevel', 'section'] }]
        });

        for (const n of normalized) {
          for (const r of roomSchedules) {
            if (r.day !== n.day) continue;
            const ps2 = parseSlot(r.timeSlot);
            if (!ps2.ok) continue;
            // Check overlap
            if (n.start < ps2.end && ps2.start < n.end) {
              const cname = r.Class ? `${r.Class.gradeLevel} (${r.Class.section})` : 'Unknown Class';
              conflicts.push({ 
                type: 'room', 
                day: n.day, 
                timeSlot: n.timeSlot, 
                existingTimeSlot: r.timeSlot, 
                conflictWithClassId: String(r.classId), 
                conflictWithClassName: cname,
                message: `Room conflict (Section ${cls.section}) with ${cname}`
              });
            }
          }
        }
      }
    }

    if (conflicts.length > 0) {
      const ids = Array.from(teacherIds);
      const tMap = {};
      if (ids.length > 0) {
        const ts = await Teacher.findAll({ where: { id: { [Op.in]: ids } } });
        for (const t of ts) tMap[String(t.id)] = t.name;
      }
      return res.status(409).json({ msg: 'Conflicts detected', conflicts: conflicts.map(c => ({ ...c, teacherName: tMap[String(c.teacherId)] || '' })) });
    }
    await Schedule.destroy({ where: { classId: cls.id } });
    const created = [];
    for (const n of normalized) {
      const row = await Schedule.create({ day: n.day, timeSlot: n.timeSlot, subject: n.subject, classId: cls.id, teacherId: n.teacherId || null });
      created.push({ id: String(row.id), day: n.day, timeSlot: n.timeSlot, subject: n.subject });
    }
    res.status(201).json({ createdCount: created.length, entries: created });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/class/:classId/students', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    if (req.user.role !== 'SUPER_ADMIN' && req.user.schoolId && Number(req.user.schoolId) !== Number(cls.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const students = await Student.findAll({ where: { schoolId: cls.schoolId, classId: cls.id }, order: [['name','ASC']] });
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
    const ids = Array.from(new Set(records.map(r => String(r.studentId))));
    const students = await Student.findAll({ where: { id: { [Op.in]: ids }, schoolId: cls.schoolId } });
    const map = new Map(students.map(s => [String(s.id), s]));
    const invalid = [];
    for (const r of records) {
      const s = map.get(String(r.studentId));
      if (!s || String(s.classId || '') !== String(cls.id)) invalid.push({ studentId: r.studentId, reason: 'Student not in class' });
    }
    if (invalid.length > 0) return res.status(400).json({ msg: 'Invalid attendance records', invalid });
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
    const invalid = [];
    for (const e of entries) {
      const cls = await Class.findByPk(e.classId);
      if (!cls || Number(cls.schoolId) !== Number(req.params.schoolId)) { invalid.push({ classId: e.classId, reason: 'Invalid class for school' }); continue; }
      if (Array.isArray(cls.subjects) && cls.subjects.length > 0 && !cls.subjects.includes(e.subject)) { invalid.push({ classId: e.classId, subject: e.subject, reason: 'Subject not in class subjects' }); continue; }
      const s = await Student.findByPk(e.studentId);
      if (!s || Number(s.schoolId) !== Number(req.params.schoolId) || String(s.classId || '') !== String(cls.id)) { invalid.push({ studentId: e.studentId, classId: e.classId, reason: 'Student not in class' }); continue; }
    }
    if (invalid.length > 0) return res.status(400).json({ msg: 'Invalid grade entries', invalid });
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

router.get('/:schoolId/grades/all', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const rows = await Grade.findAll({
      include: [
        { model: Class, attributes: ['id'], where: { schoolId } },
        { model: Student, attributes: ['name'] }
      ],
      order: [["subject","ASC"],["studentId","ASC"]]
    });
    const result = rows.map(r => {
      const j = r.toJSON();
      return {
        classId: String(j.classId),
        subject: j.subject,
        studentId: j.studentId,
        studentName: j.Student ? j.Student.name : '',
        grades: { homework: j.homework, quiz: j.quiz, midterm: j.midterm, final: j.final }
      };
    });
    res.json(result);
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

// @route   POST api/school/:schoolId/parents
// @desc    Upsert a parent and link to student
// @access  Private (SchoolAdmin)
router.post('/:schoolId/parents', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('parent_portal'), validate([
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
    if (!parent) {
      parent = await Parent.create({ name, email, phone, status: 'Invited', schoolId });
    } else {
      // Ensure parent belongs to this school; if not, create a new record scoped to this school
      if (Number(parent.schoolId || 0) !== schoolId) {
        parent = await Parent.create({ name, email, phone, status: 'Invited', schoolId });
      } else {
        parent.name = name;
        parent.phone = phone;
        if (!parent.status) parent.status = 'Invited';
        await parent.save();
      }
    }

    student.parentId = parent.id;
    await student.save();

    const statusMap = { 'Active': 'نشط', 'Invited': 'مدعو' };
    return res.status(201).json({ id: String(parent.id), name: parent.name, email: parent.email, phone: parent.phone, status: statusMap[parent.status] || parent.status, studentId: student.id, studentName: student.name });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET api/school/:schoolId/invoices
// @desc    Get all invoices for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/invoices', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance_fees'), async (req, res) => {
  try {
    const { Invoice, Student } = require('../models');
    try { await Invoice.sync({ alter: true }); await Student.sync({ alter: true }); } catch (e) { console.error('Sync error in invoices:', e); }

    const invoices = await Invoice.findAll({
        include: {
            model: Student,
            attributes: ['name'],
            where: { schoolId: Number(req.params.schoolId) },
        },
        order: [['dueDate', 'DESC']]
    });

    const statusMap = { 'PAID': 'مدفوعة', 'UNPAID': 'غير مدفوعة', 'OVERDUE': 'متأخرة', 'PARTIALLY_PAID': 'مدفوعة جزئياً' };
    res.json(invoices.map(inv => ({
        id: inv.id.toString(),
        studentId: inv.studentId,
        studentName: inv.Student.name,
        status: statusMap[inv.status] || inv.status,
        issueDate: inv.createdAt.toISOString().split('T')[0],
        dueDate: inv.dueDate.toISOString().split('T')[0],
        items: [{ description: `رسوم دراسية`, amount: parseFloat(inv.amount) }],
        totalAmount: parseFloat(inv.amount),
        taxAmount: parseFloat(inv.taxAmount || 0),
        paidAmount: parseFloat(inv.paidAmount || 0),
        remainingAmount: parseFloat(inv.amount) - parseFloat(inv.paidAmount || 0)
    })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/:schoolId/billing/summary', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), async (req, res) => {
  try {
    const sid = Number(req.params.schoolId);
    const rows = await Invoice.findAll({ include: [{ model: Student, where: { schoolId: sid }, attributes: [] }] });
    let paid = 0, unpaid = 0, overdue = 0, total = 0, outstanding = 0;
    for (const r of rows) {
      const amt = parseFloat(r.amount || 0);
      total += amt;
      const s = String(r.status).toUpperCase();
      if (s === 'PAID') paid++;
      else if (s === 'OVERDUE') { overdue++; outstanding += amt; }
      else { unpaid++; outstanding += amt; }
    }
    return res.json({ totalInvoices: rows.length, paidCount: paid, unpaidCount: unpaid, overdueCount: overdue, totalAmount: total, outstandingAmount: outstanding });
  } catch (e) { console.error(e?.message || e); res.status(500).json({ msg: 'Server Error' }); }
});

// @route   POST api/school/:schoolId/invoices
// @desc    Create a new invoice
// @access  Private (SchoolAdmin)
router.post('/:schoolId/invoices', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), requireWithinLimits('invoices'), validate([
  { name: 'studentId', required: true, type: 'string' },
  { name: 'dueDate', required: true, type: 'string' },
  { name: 'items', required: true },
]), async (req, res) => {
  try {
    const { studentId, dueDate, items } = req.body;
    if (!studentId || !dueDate || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: 'Invalid invoice data' });
    }
    const settings = await SchoolSettings.findOne({ where: { schoolId: req.params.schoolId } });
    const taxRate = Number(settings?.taxRate || 0);
    const discount = Number(req.body.discount || 0);
    
    const subTotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    // Calculate taxable amount after discount (if discount is applied before tax)
    // Assuming discount is a fixed amount for now based on simple invoice structure
    const taxableAmount = Math.max(0, subTotal - discount);
    const taxAmount = taxableAmount * (taxRate / 100);
    const totalAmount = taxableAmount + taxAmount;
    
    const inv = await Invoice.create({ 
        studentId, 
        amount: totalAmount, 
        discount: discount,
        taxAmount: taxAmount,
        dueDate: new Date(dueDate), 
        status: 'UNPAID',
        items: items 
    });
    
    res.status(201).json({ 
        id: inv.id.toString(), 
        studentId, 
        studentName: '', 
        status: 'غير مدفوعة', 
        issueDate: inv.createdAt.toISOString().split('T')[0], 
        dueDate, 
        items, 
        subTotal,
        discount,
        taxAmount,
        totalAmount 
    });
  } catch (err) { console.error('Error in GET settings:', err); res.status(500).json({ msg: 'Server Error: ' + err.message }); }
});

// @route   POST api/school/:schoolId/invoices/:invoiceId/payments
// @desc    Record a payment for an invoice (Supports partial payments)
// @access  Private (SchoolAdmin)
router.post('/:schoolId/invoices/:invoiceId/payments', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), validate([
  { name: 'amount', required: true },
  { name: 'paymentDate', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const { Payment } = require('../models');
    const { amount, paymentDate, paymentMethod, notes } = req.body;
    
    if (!amount || !paymentDate) return res.status(400).json({ msg: 'Missing payment data' });
    
    const inv = await Invoice.findByPk(req.params.invoiceId);
    if (!inv) return res.status(404).json({ msg: 'Invoice not found' });

    // Create payment record
    const payment = await Payment.create({
      invoiceId: inv.id,
      amount: Number(amount),
      date: paymentDate,
      method: paymentMethod || 'Cash',
      notes: notes || '',
      recordedBy: req.user.id
    });

    // Update invoice paid amount
    const currentPaid = Number(inv.paidAmount || 0);
    const newPaid = currentPaid + Number(amount);
    inv.paidAmount = newPaid;

    // Update status
    const total = Number(inv.amount);
    if (newPaid >= total - 0.01) { // Tolerance for floating point
        inv.status = 'PAID';
    } else if (newPaid > 0) {
        inv.status = 'PARTIALLY_PAID';
    } else {
        inv.status = 'UNPAID';
    }

    await inv.save();

    // Send email notification if Student has parent email
    try {
        const { Student, Parent } = require('../models');
        const student = await Student.findByPk(inv.studentId, { include: Parent });
        if (student && student.Parent) {
            // Send internal notification
            const NotificationService = require('../services/NotificationService');
            await NotificationService.sendFinancialAlert(
                student.Parent.id,
                'تم استلام دفعة مالية',
                `تم استلام مبلغ ${amount} $ للطالب ${student.name}. رقم السند: PAY-${payment.id}`,
                req.params.schoolId
            );

            // Send email if available
            if (student.Parent.email) {
                const EmailService = require('../services/EmailService');
                await EmailService.sendPaymentReceipt(
                    student.Parent.email,
                    student.name,
                    amount,
                    '$', 
                    `PAY-${payment.id}`,
                    paymentDate
                );
            }
        }
    } catch (emailErr) {
        console.error('Failed to send payment receipt notification:', emailErr);
        // Don't fail the request just because notification failed
    }

    // Return updated invoice structure
    const statusMap = { 'PAID': 'مدفوعة', 'UNPAID': 'غير مدفوعة', 'OVERDUE': 'متأخرة', 'PARTIALLY_PAID': 'مدفوعة جزئياً' };
    
    res.json({ 
        id: inv.id.toString(), 
        studentId: inv.studentId, 
        studentName: '', // Frontend handles this or we fetch it if needed
        status: statusMap[inv.status] || inv.status, 
        issueDate: inv.createdAt.toISOString().split('T')[0], 
        dueDate: inv.dueDate.toISOString().split('T')[0], 
        items: [{ description: 'القسط الدراسي', amount: parseFloat(inv.amount) }], 
        totalAmount: parseFloat(inv.amount),
        paidAmount: parseFloat(inv.paidAmount),
        remainingAmount: parseFloat(inv.amount) - parseFloat(inv.paidAmount)
    });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/invoices/:invoiceId/remind
// @desc    Send payment reminder email
// @access  Private (SchoolAdmin)
router.post('/:schoolId/invoices/:invoiceId/remind', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { Invoice, Student, Parent } = require('../models');
    const inv = await Invoice.findByPk(req.params.invoiceId, {
        include: [{ model: Student, include: [Parent] }]
    });

    if (!inv) return res.status(404).json({ msg: 'Invoice not found' });
    
    if (inv.status === 'PAID') return res.status(400).json({ msg: 'Invoice is already paid' });

    const student = inv.Student;
    if (!student || !student.Parent) {
        return res.status(400).json({ msg: 'Parent not found' });
    }

    const NotificationService = require('../services/NotificationService');
    await NotificationService.sendFinancialAlert(
        student.Parent.id,
        'تذكير بفاتورة مستحقة',
        `نود تذكيركم بوجود فاتورة مستحقة للطالب ${student.name} بقيمة ${inv.remainingAmount || inv.amount} $. تاريخ الاستحقاق: ${inv.dueDate.toISOString().split('T')[0]}`,
        req.params.schoolId
    );

    let sent = false;
    if (student.Parent.email) {
        const EmailService = require('../services/EmailService');
        sent = await EmailService.sendInvoiceReminder(
            student.Parent.email,
            student.name,
            `${inv.remainingAmount || inv.amount} $`,
            inv.dueDate.toISOString().split('T')[0]
        );
    } else {
        // If no email, at least we sent the internal notification
        sent = true; 
    }

    if (sent) {
        res.json({ msg: 'Reminder sent successfully' });
    } else {
        res.status(200).json({ msg: 'Internal notification sent (Email failed or not provided)' });
    }

  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   GET api/school/:schoolId/finance/reports/pnl
// @desc    Get Profit & Loss Report
// @access  Private (SchoolAdmin)
router.get('/:schoolId/finance/reports/pnl', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), async (req, res) => {
  try {
    const { Expense, Payment, Invoice, Student } = require('../models');
    const { Op } = require('sequelize');
    const schoolId = Number(req.params.schoolId);
    
    // Date Range (Expect YYYY-MM-DD)
    const startStr = req.query.startDate || `${new Date().getFullYear()}-01-01`;
    const endStr = req.query.endDate || new Date().toISOString().split('T')[0];

    // 1. Calculate Revenue (Payments)
    // We need payments for invoices belonging to students of this school
    const payments = await Payment.findAll({
                where: {
                    date: { [Op.between]: [startStr, endStr] }
                },
                include: [{
            model: Invoice,
            required: true,
            include: [{
                model: Student,
                required: true,
                where: { schoolId }
            }]
        }]
    });
    
    const revenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 2. Calculate Expenses
    const expenses = await Expense.findAll({
        where: {
            schoolId,
            date: { [Op.between]: [startStr, endStr] }
        }
    });
    
    const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    // Group expenses by category
    const expenseByCategory = {};
    expenses.forEach(e => {
        const cat = e.category || 'Uncategorized';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(e.amount || 0);
    });

    res.json({
        startDate: startStr,
        endDate: endStr,
        revenue,
        expenses: expenseTotal,
        netProfit: revenue - expenseTotal,
        expenseBreakdown: expenseByCategory
    });

  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   GET api/school/:schoolId/students/:studentId/statement
// @desc    Get financial statement for a student
// @access  Private (SchoolAdmin)
router.get('/:schoolId/students/:studentId/statement', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { Invoice, Payment } = require('../models');
    const studentId = req.params.studentId;
    
    // Fetch Invoices
    const invoices = await Invoice.findAll({ 
        where: { studentId },
        order: [['createdAt', 'ASC']] 
    });

    // Fetch Payments
    const invoiceIds = invoices.map(i => i.id);
    const payments = await Payment.findAll({
        where: { invoiceId: invoiceIds },
        order: [['date', 'ASC']]
    });

    // Combine and sort
    let transactions = [];
    
    invoices.forEach(inv => {
        transactions.push({
            id: `inv_${inv.id}`,
            date: inv.createdAt,
            type: 'INVOICE',
            description: `فاتورة #${inv.id}`,
            debit: parseFloat(inv.amount),
            credit: 0,
            reference: String(inv.id)
        });
    });

    payments.forEach(pay => {
        transactions.push({
            id: `pay_${pay.id}`,
            date: new Date(pay.date),
            type: 'PAYMENT',
            description: `دفعة (${pay.method})`,
            debit: 0,
            credit: parseFloat(pay.amount),
            reference: pay.reference,
            notes: pay.notes,
            recordedBy: pay.recordedBy,
            method: pay.method
        });
    });

    // Sort by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance (Debit increases balance [Amount Owed], Credit decreases it)
    let balance = 0;
    const statement = transactions.map(t => {
        balance += (t.debit - t.credit);
        return { ...t, balance, date: new Date(t.date).toISOString().split('T')[0] };
    });

    res.json(settings);
  } catch (err) { console.error('Error in GET settings:', err); res.status(500).json({ msg: 'Server Error', error: err.message }); }
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
router.get('/:schoolId/settings', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    // Auto-heal
    try { await SchoolSettings.sync({ alter: true }); } catch (e) { console.error('Sync error settings:', e); }
    
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
    const obj = settings.toJSON();
    res.json({
        ...obj,
        notifications: typeof obj.notifications === 'string' ? JSON.parse(obj.notifications) : obj.notifications,
        availableStages: Array.isArray(obj.availableStages) ? obj.availableStages : ["رياض أطفال","ابتدائي","إعدادي","ثانوي"],
        workingDays: Array.isArray(obj.workingDays) ? obj.workingDays : ['Sunday','Monday','Tuesday','Wednesday','Thursday'],
        attendanceMethods: Array.isArray(obj.attendanceMethods) ? obj.attendanceMethods : ['Manual'],
        lessonStartTime: obj.lessonStartTime || (obj.workingHoursStart || ''),
        lateThresholdMinutes: typeof obj.lateThresholdMinutes === 'number' ? obj.lateThresholdMinutes : 10,
        departureTime: obj.departureTime || (obj.workingHoursEnd || ''),
        terms: Array.isArray(obj.terms) ? obj.terms : [ { name: 'الفصل الأول', start: obj.academicYearStart, end: '' }, { name: 'الفصل الثاني', start: '', end: obj.academicYearEnd } ],
        holidays: Array.isArray(obj.holidays) ? obj.holidays : [],
        admissionForm: typeof obj.admissionForm === 'string' ? JSON.parse(obj.admissionForm) : (obj.admissionForm || { studentFields: ['الاسم الكامل','تاريخ الميلاد','الجنس','الرقم الوطني','العنوان','المدينة'], parentFields: ['الاسم','هاتف الاتصال','بريد الإلكتروني'], requiredDocuments: [], registrationFee: 0, consentFormRequired: false, consentFormText: '', autoGenerateRegistrationInvoice: true, registrationFeeDueDays: 7 }),
    });
  } catch (err) { console.error('Error in GET settings:', err); res.status(500).json({ msg: 'Server Error: ' + err.message }); }
});

// @route   PUT api/school/:schoolId/settings
// @desc    Update settings for a specific school
// @access  Private (SchoolAdmin)
router.put('/:schoolId/settings', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), enforceActiveSubscription, async (req, res) => {
  try {
    const { 
      schoolName, schoolAddress, schoolLogoUrl, contactPhone, contactEmail, geoLocation,
      genderType, levelType, ownershipType, availableStages, workingHoursStart, workingHoursEnd, workingDays,
      academicYearStart, academicYearEnd, notifications, lessonStartTime, lateThresholdMinutes, departureTime, attendanceMethods, terms, holidays, admissionForm
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
    settings.lessonStartTime = lessonStartTime || settings.lessonStartTime;
    settings.lateThresholdMinutes = typeof lateThresholdMinutes === 'number' ? lateThresholdMinutes : settings.lateThresholdMinutes;
    settings.departureTime = departureTime || settings.departureTime;
    if (attendanceMethods !== undefined) settings.attendanceMethods = Array.isArray(attendanceMethods) ? attendanceMethods : settings.attendanceMethods;
    if (terms !== undefined) settings.terms = Array.isArray(terms) ? terms : settings.terms;
    if (holidays !== undefined) settings.holidays = Array.isArray(holidays) ? holidays : settings.holidays;
    if (admissionForm !== undefined) settings.admissionForm = admissionForm;
    
    await settings.save();
    const obj = settings.toJSON();
    res.json({
      ...obj,
      notifications: typeof obj.notifications === 'string' ? JSON.parse(obj.notifications) : obj.notifications,
      availableStages: Array.isArray(obj.availableStages) ? obj.availableStages : obj.availableStages,
      workingDays: Array.isArray(obj.workingDays) ? obj.workingDays : obj.workingDays,
      attendanceMethods: Array.isArray(obj.attendanceMethods) ? obj.attendanceMethods : obj.attendanceMethods,
      terms: Array.isArray(obj.terms) ? obj.terms : obj.terms,
      holidays: Array.isArray(obj.holidays) ? obj.holidays : obj.holidays,
      admissionForm: typeof obj.admissionForm === 'string' ? JSON.parse(obj.admissionForm) : obj.admissionForm,
    });
  } catch (err) { console.error('Error in PUT settings:', err); res.status(500).json({ msg: 'Server Error: ' + err.message }); }
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

router.get('/:schoolId/parent-requests', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const rows = await Notification.findAll({
      where: { type: 'Approval' },
      include: [{ model: Parent, attributes: ['id','name','email','phone','schoolId'], required: true }],
      order: [['createdAt','DESC']]
    });
    const statusMap = { 'Pending': 'قيد الانتظار', 'Approved': 'موافق عليه', 'Rejected': 'مرفوض' };
    let list = [];
    try {
      list = rows
        .filter(r => String(r.Parent?.schoolId || '') === String(req.params.schoolId))
        .map(r => ({ id: String(r.id), title: r.title, description: r.description, status: statusMap[r.status] || 'قيد الانتظار', parentId: String(r.Parent.id), parentName: r.Parent.name, parentEmail: r.Parent.email, parentPhone: r.Parent.phone, createdAt: (r.createdAt instanceof Date ? r.createdAt.toISOString().split('T')[0] : String(r.createdAt).toString()) }));
    } catch (mapErr) {
      try { console.error('Parent requests mapping error:', mapErr?.message || mapErr); } catch {}
      list = [];
    }
    res.json(list);
  } catch (e) { console.error(e.message); res.json([]); }
});

router.put('/:schoolId/parent-requests/:id/approve', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const row = await Notification.findByPk(req.params.id, { include: [{ model: Parent, attributes: ['id','schoolId'] }] });
    if (!row || !row.Parent) return res.status(404).json({ msg: 'Request not found' });
    if (String(row.Parent.schoolId) !== String(req.params.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    row.status = 'Approved';
    row.isRead = true;
    await row.save();
    try { await AuditLog.create({ userId: req.user.id, schoolId: Number(req.params.schoolId), action: 'parent_request_approve', description: String(row.id) }); } catch {}
    res.json({ approved: true });
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

router.put('/:schoolId/parent-requests/:id/reject', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const row = await Notification.findByPk(req.params.id, { include: [{ model: Parent, attributes: ['id','schoolId'] }] });
    if (!row || !row.Parent) return res.status(404).json({ msg: 'Request not found' });
    if (String(row.Parent.schoolId) !== String(req.params.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    row.status = 'Rejected';
    row.isRead = true;
    await row.save();
    try { await AuditLog.create({ userId: req.user.id, schoolId: Number(req.params.schoolId), action: 'parent_request_reject', description: String(row.id) }); } catch {}
    res.json({ rejected: true });
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

router.post('/:schoolId/reports/generate', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const id = req.app.locals.enqueueJob('report_generate', { schoolId }, async ({ schoolId }) => {
      const studentsCount = await Student.count({ where: { schoolId } });
      const teachersCount = await Teacher.count({ where: { schoolId } });
      const invoicesCount = await Invoice.count({ where: { schoolId } });
      const payload = JSON.stringify({ studentsCount, teachersCount, invoicesCount });
      try { await AuditLog.create({ userId: req.user.id, schoolId, action: 'report_generate', description: payload }); } catch {}
      return payload;
    });
    res.status(202).json({ jobId: id });
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

router.post('/:schoolId/import/students', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const { sourceUrl } = req.body || {};
    const id = req.app.locals.enqueueJob('import_students', { schoolId, sourceUrl }, async ({ schoolId, sourceUrl }) => {
      const axios = require('axios');
      const csv = require('csv-parse/sync');
      try {
        // Fetch the CSV file
        const response = await axios.get(sourceUrl);
        const records = csv.parse(response.data, {
          columns: true,
          skip_empty_lines: true
        });

        const studentsToCreate = [];
        for (const record of records) {
          // Basic validation
          if (!record.name || !record.grade) continue;

          studentsToCreate.push({
            id: `std_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: record.name,
            grade: record.grade,
            parentName: record.parentName || 'N/A',
            dateOfBirth: record.dateOfBirth || null,
            schoolId: schoolId,
            status: 'Active',
            registrationDate: new Date(),
            profileImageUrl: `https://picsum.photos/seed/std_${Date.now()}/100/100`
          });
        }

        // Check Limits BEFORE Bulk Create
        if (studentsToCreate.length > 0) {
            const { Subscription, Plan, SchoolSettings, Student } = require('../models');
            const sub = await Subscription.findOne({ where: { schoolId }, include: [Plan] });
            const settings = await SchoolSettings.findOne({ where: { schoolId } });
            
            let maxStudents = 50;
            // 1. Custom Limits
            if (settings && settings.customLimits && settings.customLimits.students !== undefined) {
                 const val = settings.customLimits.students;
                 maxStudents = val === 'unlimited' ? 999999 : Number(val);
            } 
            // 2. Plan Limits
            else if (sub && sub.Plan && sub.Plan.limits) {
                 const l = typeof sub.Plan.limits === 'string' ? JSON.parse(sub.Plan.limits) : sub.Plan.limits;
                 if (l.students) maxStudents = l.students === 'unlimited' ? 999999 : Number(l.students);
            }
            // 3. Subscription Legacy
            else if (sub && sub.customLimits) {
                 const l = typeof sub.customLimits === 'string' ? JSON.parse(sub.customLimits) : sub.customLimits;
                 if (l.students) maxStudents = l.students === 'unlimited' ? 999999 : Number(l.students);
            }

            const currentCount = await Student.count({ where: { schoolId } });
            if (currentCount + studentsToCreate.length > maxStudents) {
                throw new Error(`Import failed: Limit exceeded. You can only add ${Math.max(0, maxStudents - currentCount)} more students.`);
            }

            await Student.bulkCreate(studentsToCreate);
          
            // Update school student count
            const school = await School.findByPk(schoolId);
            if (school) {
              await school.increment('studentCount', { by: studentsToCreate.length });
            }
        }

        await AuditLog.create({ 
          userId: req.user.id, 
          schoolId, 
          action: 'import_students_schedule', 
          description: `Imported ${studentsToCreate.length} students from ${sourceUrl}` 
        });

        return { importedCount: studentsToCreate.length };
      } catch (error) {
        console.error('Import failed:', error);
        throw new Error(`Import failed: ${error.message}`);
      }
    });
    res.status(202).json({ jobId: id });
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});

router.get('/:schoolId/jobs/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    // Import Job model explicitly
    const { Job } = require('../models');

    // First check in-memory active jobs
    let j = req.app.locals.jobs ? req.app.locals.jobs[req.params.id] : null;
    
    // If not found in memory, check database
    if (!j) {
      if (!Job) {
        console.error('Job model is missing!');
        return res.status(500).json({ msg: 'Internal Server Error: Job model not loaded' });
      }
      
      const dbJob = await Job.findByPk(req.params.id);
      if (dbJob) {
        j = dbJob.toJSON();
        // Parse result if it's a string
        try {
            if (typeof j.result === 'string') j.result = JSON.parse(j.result);
        } catch {}
      }
    }

    if (!j) return res.status(404).json({ msg: 'Not found' });
    res.json(j);
  } catch (e) { console.error('Error in getJobById:', e); res.status(500).send('Server Error'); }
});

router.get('/:schoolId/jobs', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    // Import Job model explicitly
    const { Job } = require('../models');
    
    // Ensure schoolId is a number
    const schoolId = parseInt(req.params.schoolId, 10);
    if (isNaN(schoolId)) {
      return res.status(400).json({ msg: 'Invalid school ID' });
    }

    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    
    // Check if Job model is properly loaded
    if (!Job) {
      console.error('Job model not loaded');
      return res.status(500).send('Server Error: Model not loaded');
    }

    // Use try-catch specifically for the database query
    let jobs;
    try {
      jobs = await Job.findAll({
        where: { schoolId: schoolId },
        order: [['createdAt', 'DESC']],
        limit
      });
    } catch (dbError) {
      console.error('Database error when fetching jobs:', dbError);
      // Check if the error is due to table missing (migration issue)
      if (dbError.name === 'SequelizeDatabaseError' && (dbError.message.includes('no such table') || dbError.message.includes('does not exist'))) {
         console.warn('Jobs table missing, returning empty list');
         return res.json([]);
      }
      return res.status(500).json({ msg: 'Database query failed', error: dbError.message, details: dbError.toString() });
    }
    
    res.json(jobs.map(j => {
        const json = j.toJSON();
        try {
            if (typeof json.result === 'string') json.result = JSON.parse(json.result);
        } catch {}
        return json;
    }));
  } catch (e) { 
    console.error('Error in getJobs:', e); 
    res.status(500).json({ msg: 'Server Error', error: e.message, stack: process.env.NODE_ENV === 'development' ? e.stack : undefined }); 
  }
});

router.get('/:schoolId/expenses', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('finance_expenses'), async (req, res) => {
  try {
    const { Expense } = require('../models');
    try { await Expense.sync({ alter: true }); } catch (e) { console.error('Sync Expense Error:', e); } // Auto-heal
    const rows = await Expense.findAll({ where: { schoolId: Number(req.params.schoolId) }, order: [['date','DESC']] });
    res.json(rows.map(e => ({ id: String(e.id), date: e.date, description: e.description, category: e.category, amount: parseFloat(e.amount) })));
  } catch (err) { console.error('Get Expenses Error:', err); res.status(500).json({ msg: 'Server Error: ' + err.message }); }
});

router.post('/:schoolId/expenses', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('finance_expenses'), async (req, res) => {
  try {
    const { Expense } = require('../models');
    try { await Expense.sync({ alter: true }); } catch (e) { console.error('Sync Expense Error:', e); } // Auto-heal
    const { date, description, category, amount } = req.body || {};
    if (!date || !description || !category || amount === undefined) return res.status(400).json({ msg: 'Invalid payload' });
    const exp = await Expense.create({ schoolId: Number(req.params.schoolId), date, description, category, amount });
    res.status(201).json({ id: String(exp.id), date: exp.date, description: exp.description, category: exp.category, amount: parseFloat(exp.amount) });
  } catch (err) { console.error('Create Expense Error:', err); res.status(500).json({ msg: 'Server Error: ' + err.message }); }
});

// Fees Setup CRUD
router.get('/:schoolId/fees', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), async (req, res) => {
  try {
    const rows = await FeeSetup.findAll({ where: { schoolId: Number(req.params.schoolId) }, order: [['stage','ASC']] });
    const list = rows.map(r => {
      let plan;
      try { plan = typeof r.paymentPlanDetails === 'string' ? JSON.parse(r.paymentPlanDetails) : (r.paymentPlanDetails || {}); } catch { plan = {}; }
      let disc = r.discounts;
      if (typeof disc === 'string') { try { disc = JSON.parse(disc); } catch { disc = []; } }
      return {
        id: String(r.id),
        stage: r.stage,
        tuitionFee: parseFloat(r.tuitionFee),
        bookFees: parseFloat(r.bookFees),
        uniformFees: parseFloat(r.uniformFees),
        activityFees: parseFloat(r.activityFees),
        paymentPlanType: r.paymentPlanType,
        paymentPlanDetails: plan,
        discounts: Array.isArray(disc) ? disc : [],
      };
    });
    return res.success({ fees: list });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// حالة الاشتراك والوحدات للمدرسة
router.get('/:schoolId/subscription-state', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const { Subscription, SchoolSettings, Plan, Student, Teacher, Invoice, StudentDocument, PricingConfig } = require('../models');
    const sub = await Subscription.findOne({ where: { schoolId } });
    const settings = await SchoolSettings.findOne({ where: { schoolId } });
    const plan = sub ? await Plan.findByPk(sub.planId) : null;

    const norm = normalizeLimits(settings, plan, sub);
    const limits = norm.limits;
    const limitSource = norm.source;
    const billingMode = norm.mode;
    const packs = Array.isArray(norm.packs) ? norm.packs : [];

    // Counts
    let studentsCount = 0;
    let teachersCount = 0;
    let invoicesCount = 0;
    let storageGB = 0;
    try {
      const redis = req.app?.locals?.redisClient || null;
      const cacheKey = `usage:${schoolId}`;
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          studentsCount = Number(data.students || 0);
          teachersCount = Number(data.teachers || 0);
        }
      }
      if (!studentsCount || !teachersCount) {
        studentsCount = await Student.count({ where: { schoolId } });
        teachersCount = await Teacher.count({ where: { schoolId } });
        if (redis) {
          await redis.setEx(cacheKey, 60, JSON.stringify({ students: studentsCount, teachers: teachersCount }));
        }
      }
    } catch {}
    try {
      invoicesCount = await Invoice.count({ include: [{ model: Student, required: true, where: { schoolId } }] });
    } catch {}
    try {
      const docs = await StudentDocument.findAll({ include: [{ model: Student, required: true, where: { schoolId }, attributes: [] }], attributes: ['fileSize'] });
      let totalBytes = 0;
      for (const d of docs) {
        totalBytes += parseFileSizeToBytes(d.fileSize);
      }
      storageGB = totalBytes > 0 ? (totalBytes / (1024 * 1024 * 1024)) : 0;
    } catch {}

    const allowedModules = [];
    const activeModules = [];

    const now = Date.now();
    const endMs = sub?.renewalDate ? new Date(sub.renewalDate).getTime() : (sub?.endDate ? new Date(sub.endDate).getTime() : 0);
    const isTrial = String(sub?.status || '').toUpperCase() === 'TRIAL';
    const trialExpired = isTrial && endMs > 0 && now > endMs;
    const daysLeft = endMs > now ? Math.ceil((endMs - now) / (24 * 60 * 60 * 1000)) : 0;

    let planPrice = 0;
    let packTotal = 0;
    try { planPrice = plan ? parseFloat(plan.price || 0) : 0; } catch {}
    try { for (const p of packs) { packTotal += Number(p.price || 0); } } catch {}
    let overageEstimate = { students: 0, teachers: 0, invoices: 0, storageGB: 0, total: 0, currency: 'USD' };
    try {
      const pc = await PricingConfig.findOne({ where: { id: 'default' } });
      const pp = {
        student: Number(pc?.pricePerStudent || 1.5),
        teacher: Number(pc?.pricePerTeacher || 2.0),
        invoice: Number(pc?.pricePerInvoice || 0.05),
        storage: Number(pc?.pricePerGBStorage || 0.2),
        currency: pc?.currency || 'USD'
      };
      const os = Math.max(0, studentsCount - Number(limits.students || 0)) * pp.student;
      const ot = Math.max(0, teachersCount - Number(limits.teachers || 0)) * pp.teacher;
      const oi = Math.max(0, invoicesCount - Number(limits.invoices || 0)) * pp.invoice;
      const og = Math.max(0, storageGB - Number(limits.storageGB || 0)) * pp.storage;
      const totalOv = os + ot + oi + og;
      overageEstimate = { students: os, teachers: ot, invoices: oi, storageGB: og, total: totalOv, currency: pp.currency };
    } catch {}

    return res.success({
      subscription: {
        status: sub?.status || 'UNKNOWN',
        startDate: sub?.startDate || null,
        endDate: sub?.endDate || null,
        renewalDate: sub?.renewalDate || null,
        trialExpired,
        daysLeft,
      },
      plan: plan ? plan.toJSON() : null,
      limits: { ...limits, source: limitSource },
      usage: { students: studentsCount, teachers: teachersCount, invoices: invoicesCount, storageGB },
      modules: {
        allowed: allowedModules,
        active: activeModules,
      },
      packs,
      billing: { mode: billingMode, planPrice, packTotal, overageEstimate, totalEstimated: planPrice + packTotal + (billingMode === 'overage' ? overageEstimate.total : 0) }
    });
  } catch (e) {
    console.error(e?.message || e);
    return res.error(500, 'SERVER_ERROR', 'Server Error');
  }
});

// عرض سعر للوحدات المختارة
router.post('/:schoolId/modules/quote', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const { PricingConfig, Student, Teacher, Invoice, Subscription, Plan, SchoolSettings } = require('../models');
    const p = req.body || {};
    const period = String(p.period || 'monthly');
    const priceConfig = await PricingConfig.findOne({ where: { id: 'default' } });
    const students = await Student.count({ where: { schoolId } });
    const teachers = await Teacher.count({ where: { schoolId } });
    let invoices = 0;
    try {
      invoices = await Invoice.count({ include: [{ model: Student, where: { schoolId }, attributes: [] }] });
    } catch {}
    const sub = await Subscription.findOne({ where: { schoolId } });
    const plan = sub ? await Plan.findByPk(sub.planId) : null;
    const settings = await SchoolSettings.findOne({ where: { schoolId } });
    const norm = normalizeLimits(settings, plan, sub);
    const eff = norm.limits;
    const mode = norm.mode;
    const packs = Array.isArray(norm.packs) ? norm.packs : [];
    const storageGB = Number(p.storageGB || 0);
    let planPrice = 0;
    try { planPrice = plan ? parseFloat(plan.price || 0) : 0; } catch {}
    let packTotal = 0;
    for (const pk of packs) { packTotal += Number(pk.price || 0); }
    const pricePerStudent = Number(priceConfig?.pricePerStudent || 1.5);
    const pricePerTeacher = Number(priceConfig?.pricePerTeacher || 2.0);
    const pricePerInvoice = Number(priceConfig?.pricePerInvoice || 0.05);
    const pricePerGBStorage = Number(priceConfig?.pricePerGBStorage || 0.2);
    const ovStudentsQty = Math.max(0, students - Number(eff.students || 0));
    const ovTeachersQty = Math.max(0, teachers - Number(eff.teachers || 0));
    const ovInvoicesQty = Math.max(0, invoices - Number(eff.invoices || 0));
    const ovStorageQty = Math.max(0, storageGB - Number(eff.storageGB || 0));
    const ovStudents = ovStudentsQty * pricePerStudent;
    const ovTeachers = ovTeachersQty * pricePerTeacher;
    const ovInvoices = ovInvoicesQty * pricePerInvoice;
    const ovStorage = ovStorageQty * pricePerGBStorage;
    const overageTotal = mode === 'overage' ? (ovStudents + ovTeachers + ovInvoices + ovStorage) : 0;
    const items = [
      { key: 'plan', qty: 1, unitPrice: planPrice, amount: planPrice },
      { key: 'packs', qty: packs.length, unitPrice: packTotal, amount: packTotal },
      { key: 'overage_students', qty: ovStudentsQty, unitPrice: pricePerStudent, amount: mode === 'overage' ? ovStudents : 0 },
      { key: 'overage_teachers', qty: ovTeachersQty, unitPrice: pricePerTeacher, amount: mode === 'overage' ? ovTeachers : 0 },
      { key: 'overage_invoices', qty: ovInvoicesQty, unitPrice: pricePerInvoice, amount: mode === 'overage' ? ovInvoices : 0 },
      { key: 'overage_storageGB', qty: ovStorageQty, unitPrice: pricePerGBStorage, amount: mode === 'overage' ? ovStorage : 0 },
    ];
    const total = planPrice + packTotal + overageTotal;
    return res.success({ period, items, total, currency: priceConfig?.currency || 'USD' }, 'Quote generated');
  } catch (e) { console.error(e?.message || e); return res.error(500, 'SERVER_ERROR', 'Server Error'); }
});

router.post('/:schoolId/fees', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), validate([
  { name: 'stage', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const { stage } = req.body || {};
  const exists = await FeeSetup.findOne({ where: { schoolId, stage } });
    if (exists) return res.error(400, 'DUPLICATE', 'Stage already configured');
  const payload = req.body || {};
  const row = await FeeSetup.create({ schoolId, stage: String(payload.stage), tuitionFee: Number(payload.tuitionFee || 0), bookFees: Number(payload.bookFees || 0), uniformFees: Number(payload.uniformFees || 0), activityFees: Number(payload.activityFees || 0), paymentPlanType: payload.paymentPlanType || 'Monthly', paymentPlanDetails: payload.paymentPlanDetails || {}, discounts: Array.isArray(payload.discounts) ? payload.discounts : [] });
  let planResp; try { planResp = typeof row.paymentPlanDetails === 'string' ? JSON.parse(row.paymentPlanDetails) : (row.paymentPlanDetails || {}); } catch { planResp = {}; }
  let discResp = row.discounts; if (typeof discResp === 'string') { try { discResp = JSON.parse(discResp); } catch { discResp = []; } }
  return res.success({ id: String(row.id), stage: row.stage, tuitionFee: parseFloat(row.tuitionFee), bookFees: parseFloat(row.bookFees), uniformFees: parseFloat(row.uniformFees), activityFees: parseFloat(row.activityFees), paymentPlanType: row.paymentPlanType, paymentPlanDetails: planResp, discounts: Array.isArray(discResp) ? discResp : [] }, 'Fee setup created', 'CREATED');
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

function toCSV(headers, rows){
  const esc = (v) => { const s = v === null || v === undefined ? '' : String(v); return (s.includes(',') || s.includes('\n') || s.includes('"')) ? '"' + s.replace(/"/g,'""') + '"' : s; };
  const head = headers.join(',');
  const body = rows.map(r => headers.map(h => esc(r[h])).join(',')).join('\n');
  return head + '\n' + body + (body ? '\n' : '');
}

async function buildExportCSVMap(schoolId, types, filters){
  const map = {};
  const classes = await Class.findAll({ where: { schoolId }, order: [['name','ASC']] });
  const classNameById = new Map(classes.map(c => [String(c.id), `${c.gradeLevel} (${c.section || 'أ'})`]));
  if (types.includes('students')){
    const students = await Student.findAll({ where: { schoolId }, order: [['name','ASC']] });
    const parents = await Parent.findAll({ where: { schoolId } });
    const parentById = new Map(parents.map(p => [String(p.id), p]));
    const rows = students.map(s => {
      const p = s.parentId ? parentById.get(String(s.parentId)) || null : null;
      const className = s.classId ? (classNameById.get(String(s.classId)) || '') : '';
      return { studentId: s.id, nationalId: '', name: s.name, dateOfBirth: s.dateOfBirth || '', gender: '', city: '', address: '', admissionDate: s.registrationDate || '', parentName: s.parentName || (p ? p.name : ''), parentPhone: p ? (p.phone || '') : '', parentEmail: p ? (p.email || '') : '', className };
    });
    const f = String(filters?.className || '').trim();
    const filtered = f ? rows.filter(r => r.className === f) : rows;
    map['Export_Students.csv'] = toCSV(['studentId','nationalId','name','dateOfBirth','gender','city','address','admissionDate','parentName','parentPhone','parentEmail','className'], filtered);
  }
  if (types.includes('classes')){
    const teachers = await Teacher.findAll({ where: { schoolId } });
    const tNameById = new Map(teachers.map(t => [String(t.id), t.name]));
    const rows = classes.map(c => ({ gradeLevel: c.gradeLevel, section: c.section || 'أ', capacity: c.capacity || 30, homeroomTeacherName: c.homeroomTeacherId ? (tNameById.get(String(c.homeroomTeacherId)) || '') : '' }));
    map['Export_Classes.csv'] = toCSV(['gradeLevel','section','capacity','homeroomTeacherName'], rows);
  }
  if (types.includes('subjects')){
    const rows = [];
    for (const c of classes){
      const className = `${c.gradeLevel} (${c.section || 'أ'})`;
      const list = Array.isArray(c.subjects) ? c.subjects : [];
      if (list.length === 0){
        const sched = await Schedule.findAll({ where: { classId: c.id } });
        const subs = Array.from(new Set(sched.map(x => x.subject).filter(Boolean)));
        for (const s of subs) rows.push({ className, subjectName: s });
      } else {
        for (const s of list) rows.push({ className, subjectName: s });
      }
    }
    const f = String(filters?.className || '').trim();
    const subj = String(filters?.subjectName || '').trim();
    let filtered = f ? rows.filter(r => r.className === f) : rows;
    filtered = subj ? filtered.filter(r => String(r.subjectName||'').trim() === subj) : filtered;
    map['Export_Subjects.csv'] = toCSV(['className','subjectName'], filtered);
  }
  if (types.includes('classSubjectTeachers')){
    const rows = [];
    const teachers = await Teacher.findAll({ where: { schoolId } });
    const tNameById = new Map(teachers.map(t => [String(t.id), t.name]));
    for (const c of classes){
      const className = `${c.gradeLevel} (${c.section || 'أ'})`;
      const sched = await Schedule.findAll({ where: { classId: c.id } });
      for (const x of sched){
        const teacherName = x.teacherId ? (tNameById.get(String(x.teacherId)) || '') : '';
        rows.push({ className, subjectName: x.subject, teacherName });
      }
    }
    const f = String(filters?.className || '').trim();
    const subj = String(filters?.subjectName || '').trim();
    let filtered = f ? rows.filter(r => r.className === f) : rows;
    filtered = subj ? filtered.filter(r => String(r.subjectName||'').trim() === subj) : filtered;
    map['Export_ClassSubjectTeachers.csv'] = toCSV(['className','subjectName','teacherName'], filtered);
  }
  if (types.includes('grades')){
    const grades = await Grade.findAll({ include: [{ model: Class, attributes: ['gradeLevel','section'] }], where: { '$Class.schoolId$': schoolId } });
    const rows = grades.map(e => ({ className: `${e.Class?.gradeLevel || ''} (${e.Class?.section || 'أ'})`, subjectName: e.subject, studentId: String(e.studentId), studentName: '', homework: e.homework || 0, quiz: e.quiz || 0, midterm: e.midterm || 0, final: e.final || 0 }));
    const f = String(filters?.className || '').trim();
    const subj = String(filters?.subjectName || '').trim();
    let filtered = f ? rows.filter(r => r.className === f) : rows;
    filtered = subj ? filtered.filter(r => String(r.subjectName||'').trim() === subj) : filtered;
    map['Export_Grades.csv'] = toCSV(['className','subjectName','studentId','studentName','homework','quiz','midterm','final'], filtered);
  }
  if (types.includes('attendance')){
    const date = String(filters?.date || '').trim();
    const rows = [];
    for (const c of classes){
      const className = `${c.gradeLevel} (${c.section || 'أ'})`;
      if (String(filters?.className || '').trim() && String(filters?.className || '').trim() !== className) continue;
      const where = { classId: c.id };
      if (date) where.date = date;
      const arr = await Attendance.findAll({ where });
      for (const r of arr){ rows.push({ date: r.date, className, studentId: String(r.studentId), status: r.status }); }
    }
    map['Export_Attendance.csv'] = toCSV(['date','className','studentId','status'], rows);
  }
  if (types.includes('schedule')){
    const rows = [];
    for (const c of classes){
      const className = `${c.gradeLevel} (${c.section || 'أ'})`;
      if (String(filters?.className || '').trim() && String(filters?.className || '').trim() !== className) continue;
      const sched = await Schedule.findAll({ where: { classId: c.id } });
      for (const x of sched){ rows.push({ className, day: x.day, timeSlot: x.timeSlot, subjectName: x.subject, teacherName: '' }); }
    }
    const subj = String(filters?.subjectName || '').trim();
    const filtered = subj ? rows.filter(r => String(r.subjectName||'').trim() === subj) : rows;
    map['Export_Schedule.csv'] = toCSV(['className','day','timeSlot','subjectName','teacherName'], filtered);
  }
  if (types.includes('fees')){
    const list = await FeeSetup.findAll({ where: { schoolId } });
    const rows = list.map(x => ({ stage: x.stage, tuitionFee: Number(x.tuitionFee || 0), bookFees: Number(x.bookFees || 0), uniformFees: Number(x.uniformFees || 0), activityFees: Number(x.activityFees || 0), paymentPlanType: x.paymentPlanType || 'Monthly' }));
    map['Export_Fees.csv'] = toCSV(['stage','tuitionFee','bookFees','uniformFees','activityFees','paymentPlanType'], rows);
  }
  if (types.includes('teachers')){
    const list = await Teacher.findAll({ where: { schoolId }, order: [['name','ASC']] });
    const rows = list.map(t => ({ teacherId: String(t.id), name: t.name, phone: t.phone || '', subject: t.subject || '' }));
    map['Export_Teachers.csv'] = toCSV(['teacherId','name','phone','subject'], rows);
  }
  if (types.includes('parents')){
    const list = await Parent.findAll({ where: { schoolId }, order: [['name','ASC']] });
    const rows = list.map(p => ({ parentId: String(p.id), name: p.name, email: p.email || '', phone: p.phone || '', studentId: '' }));
    map['Export_Parents.csv'] = toCSV(['parentId','name','email','phone','studentId'], rows);
  }
  return map;
}

router.get('/:schoolId/backups', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const dir = path.join(__dirname, '..', 'uploads', 'backups', String(req.params.schoolId));
    await fse.ensureDir(dir);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.zip'));
    const list = files.map(f => {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      return { file: f, size: stat.size, createdAt: stat.birthtime || stat.mtime };
    }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.get('/:schoolId/backups/:file', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const dir = path.join(__dirname, '..', 'uploads', 'backups', String(req.params.schoolId));
    const full = path.join(dir, req.params.file);
    if (!fs.existsSync(full)) return res.status(404).json({ msg: 'Not Found' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(full)}"`);
    fs.createReadStream(full).pipe(res);
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.get('/:schoolId/backup/config', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const s = await SchoolSettings.findOne({ where: { schoolId: Number(req.params.schoolId) } });
    const cfg = s?.backupConfig || {};
    res.json({ enabledDaily: !!cfg.enabledDaily, dailyTime: cfg.dailyTime || '02:00', enabledMonthly: !!cfg.enabledMonthly, monthlyDay: Number(cfg.monthlyDay || 1), monthlyTime: cfg.monthlyTime || '03:00', retainDays: Number(cfg.retainDays || 30), types: Array.isArray(cfg.types) ? cfg.types : ['students','classes','subjects','classSubjectTeachers','grades','attendance','schedule','fees','teachers','parents'] });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.put('/:schoolId/backup/config', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    let s = await SchoolSettings.findOne({ where: { schoolId } });
    if (!s) s = await SchoolSettings.create({ schoolId, schoolName: '', academicYearStart: new Date(), academicYearEnd: new Date(), notifications: { email: true, sms: false, push: true } });
    s.backupConfig = req.body || {};
    await s.save();
    try {
      const { AuditLog } = require('../models');
      await AuditLog.create({ action: 'school.backup.config.update', userId: req.user?.id || null, userEmail: req.user?.email || null, ipAddress: req.ip, userAgent: req.headers['user-agent'], details: JSON.stringify({ schoolId, backupConfig: s.backupConfig }), timestamp: new Date(), riskLevel: 'low' });
    } catch {}
    res.json(s.backupConfig || {});
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.post('/:schoolId/backup/download', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const types = Array.isArray(req.body?.types) ? req.body.types : ['students','classes','subjects','classSubjectTeachers','grades','attendance','schedule','fees','teachers','parents'];
    const filters = req.body?.filters || {};
    const map = await buildExportCSVMap(Number(req.params.schoolId), types, filters);
    res.setHeader('Content-Type', 'application/zip');
    const fname = `Backup_${new Date().toISOString().replace(/[:]/g,'-')}.zip`;
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', err => { try { res.status(500).end(); } catch {} });
    archive.pipe(res);
    for (const [name, csv] of Object.entries(map)) archive.append(csv, { name });
    await archive.finalize();
  } catch (e) { console.error(e); try { res.status(500).json({ msg: 'Server Error' }); } catch {} }
});

router.post('/:schoolId/backup/store', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const types = Array.isArray(req.body?.types) ? req.body.types : ['students','classes','subjects','classSubjectTeachers','grades','attendance','schedule','fees','teachers','parents'];
    const filters = req.body?.filters || {};
    const map = await buildExportCSVMap(Number(req.params.schoolId), types, filters);
    const dir = path.join(__dirname, '..', 'uploads', 'backups', String(req.params.schoolId));
    await fse.ensureDir(dir);
    const fname = `Backup_${new Date().toISOString().replace(/[:]/g,'-')}.zip`;
    const full = path.join(dir, fname);
    const out = fs.createWriteStream(full);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', err => { try { out.close(); fs.unlinkSync(full); } catch {} });
    archive.pipe(out);
    for (const [name, csv] of Object.entries(map)) archive.append(csv, { name });
    await archive.finalize();
    out.on('close', async () => {
      try {
        const { AuditLog } = require('../models');
        await AuditLog.create({ action: 'school.backup.store', userId: req.user?.id || null, userEmail: req.user?.email || null, ipAddress: req.ip, userAgent: req.headers['user-agent'], details: JSON.stringify({ schoolId: Number(req.params.schoolId), file: fname, size: archive.pointer(), types }), timestamp: new Date(), riskLevel: 'low' });
      } catch {}
      res.status(201).json({ file: fname, size: archive.pointer() });
    });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.get('/:schoolId/users/last-login', verifyToken, requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { User } = require('../models');
    const sid = Number(req.params.schoolId);
    const rows = await User.findAll({ where: { schoolId: sid }, attributes: ['lastLoginAt','lastLogin'], order: [['lastLoginAt','DESC']] });
    const latest = rows.length ? (rows[0].lastLoginAt || rows[0].lastLogin || null) : null;
    return res.json({ lastLoginAt: latest });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// Unified storage usage endpoint (returns storageGB computed from StudentDocument records)
router.get('/:schoolId/storage/usage', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const { StudentDocument, Student } = require('../models');
    const docs = await StudentDocument.findAll({ include: [{ model: Student, required: true, where: { schoolId }, attributes: [] }], attributes: ['fileSize'] });
    let totalBytes = 0;
    for (const d of docs) {
      totalBytes += parseFileSizeToBytes(d.fileSize);
    }
    const storageGB = totalBytes > 0 ? (totalBytes / (1024 * 1024 * 1024)) : 0;
    return res.json({ storageGB });
  } catch (e) { console.error(e?.message || e); res.status(500).json({ msg: 'Server Error' }); }
});

router.post('/:schoolId/notify', verifyToken, requireRole('SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const msg = String(req.body?.message || '').trim();
    if (!msg) return res.status(400).json({ msg: 'Message required' });
    const { AuditLog } = require('../models');
    await AuditLog.create({ action: 'school.notify', userId: req.user?.id || null, userEmail: req.user?.email || null, ipAddress: req.ip, userAgent: req.headers['user-agent'], details: JSON.stringify({ schoolId: Number(req.params.schoolId), message: msg }), timestamp: new Date(), riskLevel: 'low' });
    return res.status(201).json({ sent: true });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.put('/:schoolId/fees/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), async (req, res) => {
  try {
    const row = await FeeSetup.findOne({ where: { id: Number(req.params.id), schoolId: Number(req.params.schoolId) } });
    if (!row) return res.error(404, 'NOT_FOUND', 'Fee setup not found');
    const p = req.body || {};
    if (p.stage !== undefined) row.stage = String(p.stage);
    if (p.tuitionFee !== undefined) row.tuitionFee = Number(p.tuitionFee || 0);
    if (p.bookFees !== undefined) row.bookFees = Number(p.bookFees || 0);
    if (p.uniformFees !== undefined) row.uniformFees = Number(p.uniformFees || 0);
    if (p.activityFees !== undefined) row.activityFees = Number(p.activityFees || 0);
    if (p.paymentPlanType !== undefined) row.paymentPlanType = p.paymentPlanType;
    if (p.paymentPlanDetails !== undefined) row.paymentPlanDetails = p.paymentPlanDetails;
    if (p.discounts !== undefined) row.discounts = Array.isArray(p.discounts) ? p.discounts : [];
  await row.save();
  let planResp2; try { planResp2 = typeof row.paymentPlanDetails === 'string' ? JSON.parse(row.paymentPlanDetails) : (row.paymentPlanDetails || {}); } catch { planResp2 = {}; }
  let discResp2 = row.discounts; if (typeof discResp2 === 'string') { try { discResp2 = JSON.parse(discResp2); } catch { discResp2 = []; } }
  return res.success({ id: String(row.id), stage: row.stage, tuitionFee: parseFloat(row.tuitionFee), bookFees: parseFloat(row.bookFees), uniformFees: parseFloat(row.uniformFees), activityFees: parseFloat(row.activityFees), paymentPlanType: row.paymentPlanType, paymentPlanDetails: planResp2, discounts: Array.isArray(discResp2) ? discResp2 : [] }, 'Fee setup updated');
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.delete('/:schoolId/fees/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), async (req, res) => {
  try {
    const count = await FeeSetup.destroy({ where: { id: Number(req.params.id), schoolId: Number(req.params.schoolId) } });
    if (count === 0) return res.error(404, 'NOT_FOUND', 'Fee setup not found');
    return res.success({ deleted: true }, 'Fee setup deleted');
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
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

      // Verify File Signature (Magic Numbers)
      const sig = await verifyFileSignature(file.path);
      if (!sig.valid) {
          try { await fse.remove(file.path); } catch {}
          return res.status(400).json({ msg: 'Invalid file signature: ' + sig.reason });
      }

      // Scan for malware
      const scan = await scanFile(file.path);
      if (!scan.clean) { try { await fse.remove(file.path); } catch {} return res.status(400).json({ msg: 'Malware detected' }); }

      const publicUrl = `/uploads/school-logos/${file.filename}`;
      const settings = await SchoolSettings.findOne({ where: { schoolId: req.params.schoolId } });
      if (settings) { settings.schoolLogoUrl = publicUrl; await settings.save(); }
      return res.status(201).json({ url: publicUrl });
    });
  } catch (e) { console.error(e); return res.status(500).json({ msg: 'Server Error' }); }
});

router.post('/:schoolId/fees/invoices/generate', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), validate([
  { name: 'dueDate', required: true, type: 'string' }
]), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const dueDate = String(req.body.dueDate);
    const stage = req.body.stage ? String(req.body.stage) : '';
    const include = req.body.include || {};
    const defaultDiscounts = Array.isArray(req.body.defaultDiscounts) ? req.body.defaultDiscounts : [];
    const discountTagsByStudentId = req.body.discountTagsByStudentId || {};
    const settings = await SchoolSettings.findOne({ where: { schoolId } });
    const stages = Array.isArray(settings?.availableStages) && settings.availableStages.length > 0 ? settings.availableStages : ["رياض أطفال","ابتدائي","إعدادي","ثانوي"];
    const map = {
      "رياض أطفال": ["رياض أطفال"],
      "ابتدائي": ["الصف الأول","الصف الثاني","الصف الثالث","الصف الرابع","الصف الخامس","الصف السادس"],
      "إعدادي": ["أول إعدادي","ثاني إعدادي","ثالث إعدادي"],
      "ثانوي": ["أول ثانوي","ثاني ثانوي","ثالث ثانوي"],
    };
    function resolveStage(grade){
      for (const st of stages) {
        const arr = map[st] || [];
        if (arr.includes(String(grade))) return st;
      }
      if (String(grade).includes('ثانوي')) return 'ثانوي';
      if (String(grade).includes('إعدادي')) return 'إعدادي';
      if (String(grade).includes('الصف')) return 'ابتدائي';
      return stages[0];
    }
    let targetStudents = [];
    if (Array.isArray(req.body.studentIds) && req.body.studentIds.length > 0) {
      targetStudents = await Student.findAll({ where: { schoolId, id: { [Op.in]: req.body.studentIds } } });
    } else if (stage) {
      const all = await Student.findAll({ where: { schoolId } });
      const clsMap = new Map();
      for (const s of all) {
        let g = s.grade;
        if (s.classId) {
          const cached = clsMap.get(String(s.classId)) || null;
          let c = cached;
          if (!c) { c = await Class.findByPk(String(s.classId)); if (c) clsMap.set(String(s.classId), c); }
          if (c) g = c.gradeLevel;
        }
        const st = resolveStage(g);
        if (st === stage) targetStudents.push(s);
      }
    } else {
      targetStudents = await Student.findAll({ where: { schoolId } });
    }
    const feeRows = await FeeSetup.findAll({ where: { schoolId } });
    const feeByStage = new Map(feeRows.map(f => [f.stage, f]));
    const taxRate = Number(settings?.taxRate || 0);

    const created = [];
    for (const s of targetStudents) {
      let g = s.grade;
      if (s.classId) {
        const c = await Class.findByPk(String(s.classId));
        if (c) g = c.gradeLevel;
      }
      const st = stage || resolveStage(g);
      const fee = feeByStage.get(st);
      if (!fee) continue;
      const tags = Array.isArray(discountTagsByStudentId[String(s.id)]) ? discountTagsByStudentId[String(s.id)] : defaultDiscounts;
      const rules = Array.isArray(fee.discounts) ? fee.discounts : [];
      const percent = rules.reduce((sum, r) => tags.includes(r.type) ? sum + Number(r.percentage || 0) : sum, 0);
      const maxPct = Math.max(0, Math.min(100, percent));
      const tuitionBase = Number(fee.tuitionFee || 0);
      const tuitionAfter = tuitionBase * (1 - maxPct / 100);
      const items = [];
      if (tuitionAfter > 0) items.push({ description: 'رسوم دراسية', amount: tuitionAfter });
      if (include.books !== false && Number(fee.bookFees || 0) > 0) items.push({ description: 'رسوم الكتب', amount: Number(fee.bookFees || 0) });
      if (include.uniform !== false && Number(fee.uniformFees || 0) > 0) items.push({ description: 'رسوم الزي', amount: Number(fee.uniformFees || 0) });
      if (include.activities !== false && Number(fee.activityFees || 0) > 0) items.push({ description: 'رسوم الأنشطة', amount: Number(fee.activityFees || 0) });
      
      const subTotal = items.reduce((sum, it) => sum + Number(it.amount || 0), 0);
      if (subTotal <= 0) continue;

      // Logic for bulk invoice discount is already handled via 'percent' reduction on tuition fee
      // But we should store the 'discount amount' explicitly if we want to track it.
      // Current logic: tuitionAfter = tuitionBase * (1 - maxPct/100).
      // Discount Amount = tuitionBase * (maxPct/100).
      const discountAmount = (tuitionBase * (maxPct / 100)) || 0;

      const taxAmount = subTotal * (taxRate / 100);
      const totalAmount = subTotal + taxAmount;

      const inv = await Invoice.create({ 
          studentId: s.id, 
          amount: totalAmount,
          discount: discountAmount,
          taxAmount: taxAmount,
          dueDate: new Date(dueDate), 
          status: 'UNPAID',
          items: items 
      });

      created.push({ 
          id: inv.id.toString(), 
          studentId: s.id, 
          studentName: s.name || '', 
          status: 'غير مدفوعة', 
          issueDate: inv.createdAt.toISOString().split('T')[0], 
          dueDate, 
          items, 
          subTotal,
          taxAmount,
          totalAmount 
      });
    }
    res.status(201).json({ createdCount: created.length, invoices: created });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// ==================== Behavior Records APIs ====================

// @route   GET api/school/:schoolId/students/:studentId/behavior
// @desc    Get behavior records for a student
// @access  Private (SchoolAdmin, Teacher, Parent)
router.get('/:schoolId/students/:studentId/behavior', verifyToken, requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const studentId = req.params.studentId;
    
    // Additional check for Parent role to ensure they only access their own children
    if (req.user.role === 'PARENT') {
       const student = await Student.findOne({ where: { id: studentId, schoolId } });
       if (!student || student.parentId !== req.user.parentId) {
           return res.status(403).json({ msg: 'Access denied' });
       }
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
router.post('/:schoolId/students/:studentId/behavior', verifyToken, requireSameSchoolParam('schoolId'), requireRole('SCHOOL_ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const studentId = req.params.studentId;
    const { type, title, description, date, actionTaken, severity } = req.body;

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

// @route   DELETE api/school/:schoolId/behavior/:recordId
// @desc    Delete a behavior record
// @access  Private (SchoolAdmin)
router.delete('/:schoolId/behavior/:recordId', verifyToken, requireSameSchoolParam('schoolId'), requireRole('SCHOOL_ADMIN'), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const recordId = parseInt(req.params.recordId);

    const record = await BehaviorRecord.findOne({ where: { id: recordId, schoolId } });
    if (!record) return res.status(404).json({ msg: 'Record not found' });

    await record.destroy();
    res.json({ msg: 'Record removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ==================== Teachers Attendance APIs ====================

// @route   GET api/school/:schoolId/teachers/attendance
// @desc    Get teachers attendance for a specific date
// @access  Private (SchoolAdmin)
router.get('/:schoolId/teachers/attendance', verifyToken, requireSameSchoolParam('schoolId'), requireRole('SCHOOL_ADMIN'), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const { date } = req.query;

    if (!date) return res.status(400).json({ msg: 'Date parameter is required' });

    const attendance = await TeacherAttendance.findAll({
      where: { schoolId, date },
      include: [{
        model: Teacher,
        attributes: ['id', 'name', 'subject']
      }]
    });

    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/school/:schoolId/teachers/attendance
// @desc    Save teachers attendance
// @access  Private (SchoolAdmin)
router.post('/:schoolId/teachers/attendance', verifyToken, requireSameSchoolParam('schoolId'), requireRole('SCHOOL_ADMIN'), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const { date, records } = req.body; // records: [{ teacherId, status }]

    if (!date || !records || !Array.isArray(records)) {
      return res.status(400).json({ msg: 'Invalid data' });
    }

    const operations = records.map(record => {
      return TeacherAttendance.upsert({
        schoolId,
        teacherId: record.teacherId,
        date,
        status: record.status,
        id: `${schoolId}-${record.teacherId}-${date}` // Custom ID to ensure uniqueness per day
      });
    });

    await Promise.all(operations);

    res.json({ msg: 'Attendance saved successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ==================== Staff Management APIs ====================

// @route   GET api/school/:schoolId/staff
// @desc    Get all staff members (non-teachers) for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/staff', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const staff = await User.findAll({ where: { schoolId, role: 'Staff' }, attributes: { exclude: ['password'] }, order: [['name', 'ASC']] });
    res.json(staff);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/school/:schoolId/staff
// @desc    Add a new staff member
// @access  Private (SchoolAdmin)
router.post('/:schoolId/staff', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string' },
  { name: 'email', required: true, type: 'string' },
  { name: 'role', required: true, type: 'string' }
]), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const { name, email, role, phone, department, bankAccount } = req.body;

    // Check if user exists
    let user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    user = await User.create({ name, email, username: email.split('@')[0], password: hashedPassword, role: 'Staff', schoolRole: role, schoolId, phone, department, bankAccount, isActive: true });

    const userJson = user.toJSON();
    delete userJson.password;
    userJson.tempPassword = tempPassword; // Return temp password for admin to share

    res.status(201).json(userJson);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/school/:schoolId/staff/:id
// @desc    Update staff member
// @access  Private (SchoolAdmin)
router.put('/:schoolId/staff/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const userId = parseInt(req.params.id);
    const { name, email, role, phone, department, bankAccount, isActive } = req.body;

    let user = await User.findOne({ where: { id: userId, schoolId } });
    if (!user) return res.status(404).json({ msg: 'Staff not found' });

    user.name = name || user.name;
    user.email = email || user.email;
    user.schoolRole = role || user.schoolRole;
    user.phone = phone || user.phone;
    user.department = department || user.department;
    user.bankAccount = bankAccount || user.bankAccount;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const userJson = user.toJSON();
    delete userJson.password;
    res.json(userJson);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/school/:schoolId/staff/:id
// @desc    Delete staff member
// @access  Private (SchoolAdmin)
router.delete('/:schoolId/staff/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const userId = parseInt(req.params.id);

    const user = await User.findOne({ where: { id: userId, schoolId } });
    if (!user) return res.status(404).json({ msg: 'Staff not found' });

    await user.destroy();
    res.json({ msg: 'Staff member removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ==================== Staff Attendance APIs ====================

// @route   GET api/school/:schoolId/staff-attendance
// @desc    Get staff attendance for a specific date
// @access  Private (SchoolAdmin)
router.get('/:schoolId/staff-attendance', verifyToken, requireSameSchoolParam('schoolId'), requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const { date } = req.query;

    if (!date) return res.status(400).json({ msg: 'Date parameter is required' });

    const attendance = await StaffAttendance.findAll({
      where: { schoolId, date },
      include: [{
        model: User,
        attributes: ['id', 'name', 'role', 'schoolRole']
      }]
    });

    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/school/:schoolId/staff-attendance
// @desc    Save staff attendance
// @access  Private (SchoolAdmin)
router.post('/:schoolId/staff-attendance', verifyToken, requireSameSchoolParam('schoolId'), requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const { date, records } = req.body; // records: [{ userId, status }]

    if (!date || !records || !Array.isArray(records)) {
      return res.status(400).json({ msg: 'Invalid data' });
    }

    const operations = records.map(record => {
      return StaffAttendance.upsert({
        schoolId,
        userId: record.userId,
        date,
        status: record.status,
        id: `${schoolId}-${record.userId}-${date}` // Custom ID to ensure uniqueness per day
      });
    });

    await Promise.all(operations);

    res.json({ msg: 'Attendance saved successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
