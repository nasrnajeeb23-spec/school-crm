const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const { School, AuditLog, Notification } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');
const { paginationMiddleware, buildPaginationResponse } = require('../utils/pagination');
=======
const { School, Subscription, Plan, Student, Invoice, SchoolSettings } = require('../models');
const { sequelize } = require('../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission, isSuperAdminUser } = require('../middleware/auth');
const { requireModule, moduleMap } = require('../middleware/modules');
const { derivePermissionsForUser } = require('../utils/permissionMatrix');
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae

// Import middleware with fallbacks
let rateLimiters, cacheMiddlewares, invalidateMiddlewares, validators;

try {
  rateLimiters = require('../middleware/rateLimiter').rateLimiters;
} catch (e) {
  rateLimiters = { api: (req, res, next) => next() };
}

try {
  const cacheModule = require('../middleware/cache');
  cacheMiddlewares = cacheModule.cacheMiddlewares;
  invalidateMiddlewares = cacheModule.invalidateMiddlewares;
} catch (e) {
  cacheMiddlewares = { schools: (req, res, next) => next(), school: (req, res, next) => next() };
  invalidateMiddlewares = { schools: (req, res, next) => next(), school: (req, res, next) => next() };
}

try {
  validators = require('../middleware/validation').validators;
} catch (e) {
  validators = { createSchool: (req, res, next) => next() };
}

// Import error handler utilities
let asyncHandler, NotFoundError;
try {
  const errorModule = require('../middleware/errorHandler');
  asyncHandler = errorModule.asyncHandler;
  NotFoundError = errorModule.NotFoundError;
} catch (e) {
  asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  NotFoundError = class extends Error {
    constructor(message) {
      super(message);
      this.statusCode = 404;
    }
  };
}

// Allow handling a public listing only when mounted under a public base URL
const onlyPublicBase = (req, res, next) => {
  const base = String(req.baseUrl || '');
  if (base.includes('/public')) return next();
  return next('route');
};

let _schoolTableCols = null;
const getSchoolTableCols = async () => {
  if (_schoolTableCols) return _schoolTableCols;
  try {
<<<<<<< HEAD
    const qi = School.sequelize.getQueryInterface();
    const desc = await qi.describeTable(School.getTableName());
    _schoolTableCols = desc && typeof desc === 'object' ? Object.keys(desc) : [];
  } catch {
    _schoolTableCols = [];
=======
    const Op = require('sequelize').Op;
    const schools = await School.findAll({
      include: [{ model: Subscription, include: { model: Plan } }],
      order: [['name', 'ASC']],
    });
    const ids = schools.map(s => s.id);
    const settingsRows = await SchoolSettings.findAll({ where: { schoolId: { [Op.in]: ids } } });
    const byId = new Map(settingsRows.map(r => [Number(r.schoolId), r]));
    const visible = schools.filter(s => {
      const st = byId.get(Number(s.id));
      return !st || String(st.operationalStatus).toUpperCase() !== 'DELETED';
    });
    const formattedSchools = visible.map(school => {
      const s = school.toJSON();
      return {
        id: s.id,
        name: s.name,
        plan: 'N/A',
        status: 'N/A',
        students: 0,
        teachers: 0,
        balance: 0,
        joinDate: ''
      };
    });
    res.json(formattedSchools);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
  }
  return _schoolTableCols;
};

<<<<<<< HEAD
const pickExistingCols = (cols, desired) => {
  const set = new Set(Array.isArray(cols) ? cols : []);
  return desired.filter(c => set.has(c));
};

// @route   GET /api/public/schools  (mounted base) -> '/'
// @desc    Public list of schools with pagination
// @access  Public
router.get('/',
  onlyPublicBase,
  rateLimiters.api,
  paginationMiddleware,
  cacheMiddlewares.schools,
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = req.pagination;
    try {
      const cols = await getSchoolTableCols();
      const attributes = pickExistingCols(cols, ['id', 'name', 'createdAt', 'plan', 'status']);
      const { count, rows } = await School.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        ...(attributes.length ? { attributes } : {}),
      });
      return res.json(buildPaginationResponse(rows, count, page, limit));
    } catch {
      return res.json(buildPaginationResponse([], 0, page, limit));
    }
  })
);

// @route   GET /api/schools
// @desc    Get all schools with pagination
=======
// @route   GET api/schools
// @desc    Get all schools with their subscription details
// @access  Private (SuperAdmin) / Public for login screen
router.get('/', async (req, res) => {
  try {
    if (req.user && !isSuperAdminUser(req.user)) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    const Op = require('sequelize').Op;
    const schools = await School.findAll({
      include: [{ model: Subscription, include: { model: Plan } }],
      order: [['name', 'ASC']],
    });
    const ids = schools.map(s => s.id);
    const settingsRows = await SchoolSettings.findAll({ where: { schoolId: { [Op.in]: ids } } });
    const byId = new Map(settingsRows.map(r => [Number(r.schoolId), r]));
    const visible = schools.filter(s => {
      const st = byId.get(Number(s.id));
      return !st || String(st.operationalStatus).toUpperCase() !== 'DELETED';
    });

    const formattedSchools = visible.map(school => {
      const schoolJSON = school.toJSON();
      if (!req.user) {
        return {
          id: schoolJSON.id,
          name: schoolJSON.name,
          plan: 'N/A',
          status: 'N/A',
          students: 0,
          teachers: 0,
          balance: 0,
          joinDate: ''
        };
      }
      return {
        id: schoolJSON.id,
        name: schoolJSON.name,
        plan: schoolJSON.Subscription?.Plan?.name || 'N/A',
        status: schoolJSON.Subscription?.status || 'N/A',
        students: schoolJSON.studentCount,
        teachers: schoolJSON.teacherCount,
        balance: parseFloat(schoolJSON.balance),
        joinDate: schoolJSON.createdAt.toISOString().split('T')[0],
      };
    });

    res.json(formattedSchools);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/schools/:id
// @desc    Get a single school by id with its subscription details
// @access  Private (SchoolAdmin) / Public where appropriate
router.get('/:id', verifyToken, requireSameSchoolParam('id'), async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id, {
      include: {
        model: Subscription,
        include: { model: Plan },
      },
    });
    if (!school) return res.status(404).json({ msg: 'School not found' });
    try {
      const settings = await SchoolSettings.findOne({ where: { schoolId: Number(req.params.id) } });
      if (settings && String(settings.operationalStatus).toUpperCase() === 'DELETED') {
        return res.status(404).json({ msg: 'School not found' });
      }
    } catch {}
    const s = school.toJSON();
    return res.json({
      id: s.id,
      name: s.name,
      plan: s.Subscription?.Plan?.name || 'N/A',
      status: s.Subscription?.status || 'N/A',
      students: s.studentCount,
      teachers: s.teacherCount,
      joinDate: new Date(s.createdAt).toISOString().split('T')[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/schools
// @desc    Add a new school with 30-day trial and initial admin
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
// @access  Private (SuperAdmin)
router.get('/',
  verifyToken,
  requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'),
  rateLimiters.api,
  paginationMiddleware,
  cacheMiddlewares.schools,
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = req.pagination;

<<<<<<< HEAD
=======
    const existingSchool = await School.findOne({ where: { name: schoolData.name } });
    if (existingSchool) return res.status(400).json({ msg: 'School already exists' });

    const school = await School.create({ name: schoolData.name, contactEmail: schoolData.contactEmail, studentCount: 0, teacherCount: 0, balance: 0 });

    // 30-day trial subscription
    const start = new Date();
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await Subscription.create({ schoolId: school.id, planId: plan.id, status: 'TRIAL', startDate: start, endDate: end, renewalDate: end });

    // Default settings
    const academicStart = new Date(start.getFullYear(), 8, 1); // Sep 1
    const academicEnd = new Date(start.getFullYear() + 1, 5, 20); // Jun 20 next year
    await SchoolSettings.create({ schoolId: school.id, schoolName: school.name, schoolAddress: schoolData.address || '', academicYearStart: academicStart, academicYearEnd: academicEnd, notifications: { email: true, sms: false, push: true }, availableStages: ["رياض أطفال","ابتدائي","إعدادي","ثانوي"], operationalStatus: 'ACTIVE' });

    // Create initial admin user
    const bcrypt = require('bcryptjs');
    const username = String(adminData.email).split('@')[0];
    const existsUser = await require('../models').User.findOne({ where: { [require('sequelize').Op.or]: [{ email: adminData.email }, { username }] } });
    if (existsUser) return res.status(400).json({ msg: 'Admin email already exists' });
    const hash = await bcrypt.hash(String(adminData.password), 10);
    const permissions = derivePermissionsForUser({ role: 'SchoolAdmin', schoolRole: 'مدير' });
    const admin = await require('../models').User.create({ name: adminData.name, email: adminData.email, username, password: hash, role: 'SchoolAdmin', schoolId: school.id, schoolRole: 'مدير', isActive: true, permissions, passwordMustChange: true, tokenVersion: 0 });

    const response = { id: school.id, name: school.name, plan: plan.name, status: 'TRIAL', students: school.studentCount, teachers: school.teacherCount, balance: parseFloat(school.balance), joinDate: school.createdAt.toISOString().split('T')[0] };
    res.status(201).json(response);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// Get subscription details for a school
router.get('/:id/subscription', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const sub = await Subscription.findOne({ where: { schoolId: Number(req.params.id) }, include: [{ model: Plan }] });
    if (!sub) return res.status(404).json({ msg: 'Subscription not found' });
    const p = sub.Plan;
    const price = p ? parseFloat(p.price) : 0;
    return res.json({
      id: String(sub.id),
      schoolId: Number(sub.schoolId),
      schoolName: '',
      plan: p?.name || 'N/A',
      status: sub.status || 'N/A',
      startDate: sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : '',
      renewalDate: sub.renewalDate ? new Date(sub.renewalDate).toISOString().split('T')[0] : '',
      amount: price,
      trialEndDate: sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : undefined,
    });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// Billing summary for a school
router.get('/:id/billing/summary', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { Invoice, Student } = require('../models');
    try { await Invoice.sync({ alter: true }); } catch (e) { console.error('Sync Invoice Error:', e); }

    const sid = Number(req.params.id);
    const rows = await Invoice.findAll({ include: [{ model: Student, where: { schoolId: sid }, attributes: [] }] });
    let paid = 0, unpaid = 0, overdue = 0, total = 0, outstanding = 0;
    rows.forEach(r => {
      const amt = parseFloat(r.amount || 0);
      total += amt;
      if (String(r.status).toUpperCase() === 'PAID') paid++;
      else if (String(r.status).toUpperCase() === 'OVERDUE') { overdue++; outstanding += amt; }
      else { unpaid++; outstanding += amt; }
    });
    return res.json({ totalInvoices: rows.length, paidCount: paid, unpaidCount: unpaid, overdueCount: overdue, totalAmount: total, outstandingAmount: outstanding });
  } catch (e) { console.error('Billing Summary Error:', e); res.status(500).json({ msg: 'Server Error: ' + e.message }); }
});

// Update operational status for a school (ACTIVE/SUSPENDED)
router.put('/:id/status', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const sid = Number(req.params.id);
    const status = String(req.body?.status || '').toUpperCase();
    if (!['ACTIVE','SUSPENDED'].includes(status)) return res.status(400).json({ msg: 'Invalid status' });
    let s = await SchoolSettings.findOne({ where: { schoolId: sid } });
    if (!s) s = await SchoolSettings.create({ schoolId: sid, schoolName: '', academicYearStart: new Date(), academicYearEnd: new Date(), notifications: { email: true, sms: false, push: true } });
    const settings = s.toJSON();
    const next = { ...(settings || {}), operationalStatus: status };
    delete next.id; delete next.createdAt; delete next.updatedAt;
    s.schoolName = next.schoolName || s.schoolName;
    s.schoolAddress = next.schoolAddress || s.schoolAddress;
    s.academicYearStart = next.academicYearStart || s.academicYearStart;
    s.academicYearEnd = next.academicYearEnd || s.academicYearEnd;
    s.notifications = next.notifications || s.notifications;
    s.availableStages = next.availableStages || s.availableStages;
    s.backupConfig = next.backupConfig || s.backupConfig;
    s.operationalStatus = next.operationalStatus;
    await s.save();
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
    try {
      const cols = await getSchoolTableCols();
      const attributes = pickExistingCols(cols, ['id', 'name', 'createdAt', 'updatedAt', 'phone', 'status', 'plan', 'logoUrl', 'city', 'address', 'website', 'description', 'contactEmail', 'email']);
      const { count, rows } = await School.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        ...(attributes.length ? { attributes } : {}),
      });
      return res.json(buildPaginationResponse(rows, count, page, limit));
    } catch {
      return res.json(buildPaginationResponse([], 0, page, limit));
    }
  })
);

// @route   GET /api/schools/:id
// @desc    Get single school
// @access  Private (SuperAdmin)
router.get('/:id',
  verifyToken,
  requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'),
  rateLimiters.api,
  cacheMiddlewares.school,
  asyncHandler(async (req, res) => {
    const school = await School.findByPk(req.params.id);

    if (!school) {
      throw new NotFoundError('المدرسة غير موجودة');
    }

    res.json(school);
  })
);

// @route   POST /api/schools
// @desc    Create new school
// @access  Private (SuperAdmin)
router.post('/',
  verifyToken,
  requireRole('SUPER_ADMIN'),
  rateLimiters.api,
  validators.createSchool,
  invalidateMiddlewares.schools,
  asyncHandler(async (req, res) => {
    const school = await School.create(req.body);
    res.status(201).json(school);
  })
);

// @route   PUT /api/schools/:id
// @desc    Update school
// @access  Private (SuperAdmin)
router.put('/:id',
  verifyToken,
  requireRole('SUPER_ADMIN'),
  rateLimiters.api,
  validators.createSchool,
  invalidateMiddlewares.schools,
  invalidateMiddlewares.school,
  asyncHandler(async (req, res) => {
    const school = await School.findByPk(req.params.id);

    if (!school) {
      throw new NotFoundError('المدرسة غير موجودة');
    }

    const oldStatus = school.status;
    await school.update(req.body);

    // Check for status change
    if (req.body.status && req.body.status !== oldStatus) {
      try {
        // Create Audit Log
        if (AuditLog) {
          await AuditLog.create({
            action: 'SCHOOL_STATUS_CHANGE',
            userId: req.user.id,
            userEmail: req.user.email,
            ipAddress: req.ip,
            details: JSON.stringify({
              schoolId: school.id,
              schoolName: school.name,
              oldStatus,
              newStatus: req.body.status
            }),
            riskLevel: req.body.status === 'Suspended' ? 'high' : 'medium'
          });
        }

        // Create System Notification
        if (Notification) {
          await Notification.create({
            type: 'Warning',
            title: `تغيير حالة مدرسة: ${school.name}`,
            description: `تم تغيير حالة المدرسة من ${oldStatus} إلى ${req.body.status} بواسطة ${req.user.name || req.user.email}`,
            status: 'Sent',
            isRead: false
          });
        }
      } catch (logError) {
        console.error('Failed to log status change:', logError);
      }
    }

    res.json(school);
  })
);

// @route   DELETE /api/schools/:id
// @desc    Delete school
// @access  Private (SuperAdmin)
router.delete('/:id',
  verifyToken,
  requireRole('SUPER_ADMIN'),
  rateLimiters.api,
  invalidateMiddlewares.schools,
  asyncHandler(async (req, res) => {
    const school = await School.findByPk(req.params.id);

    if (!school) {
      throw new NotFoundError('المدرسة غير موجودة');
    }

    await school.destroy();
    res.json({ success: true, message: 'تم حذف المدرسة بنجاح' });
  })
);

// Apply error handler
const errorHandler = require('../middleware/errorHandler').errorHandler || ((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      type: err.name || 'Error',
      message: err.message || 'حدث خطأ في الخادم'
    }
  });
});

<<<<<<< HEAD
router.use(errorHandler);
=======
router.delete('/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const sid = Number(req.params.id);
    const { User } = require('../models');
    const reason = String((req.query && req.query.reason) || '').slice(0, 500);
    let s = await SchoolSettings.findOne({ where: { schoolId: sid } });
    if (!s) s = await SchoolSettings.create({ schoolId: sid, schoolName: '', academicYearStart: new Date(), academicYearEnd: new Date(), notifications: { email: true, sms: false, push: true } });
    s.operationalStatus = 'DELETED';
    await s.save();
    await User.update({ isActive: false }, { where: { schoolId: sid } });
    try {
      const { AuditLog } = require('../models');
      await AuditLog.create({ action: 'school.delete', userId: req.user?.id || null, userEmail: req.user?.email || null, ipAddress: req.ip, userAgent: req.headers['user-agent'], details: JSON.stringify({ schoolId: sid, reason }), timestamp: new Date(), riskLevel: 'high' });
    } catch {}
    return res.json({ deleted: true });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// @route   GET api/schools/:id/modules
// @desc    Get active modules for a school (Synced with Super Admin SubscriptionModule)
// @access  Private (SchoolAdmin, SuperAdmin)
router.get('/:id/modules', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  return res.status(410).json({ code: 'DEPRECATED', msg: 'School module listing is deprecated' });
});

router.put('/:id/modules', verifyToken, requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  return res.status(410).json({ code: 'DEPRECATED', msg: 'School module update is deprecated' });
});

router.post('/:id/modules/activate', verifyToken, requireRole('SUPER_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  return res.status(410).json({ code: 'DEPRECATED', msg: 'School module activation is deprecated' });
});

router.get('/:id/stats/student-distribution', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  try {
    const rows = await Student.findAll({
      attributes: ['grade', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { schoolId: Number(req.params.id) },
      group: ['grade'],
      order: [[sequelize.literal('count'), 'DESC']]
    });
    const data = rows.map(r => ({ name: r.get('grade'), value: Number(r.get('count')) }));
    res.json(data);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/:id/invoices', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      include: { model: Student, attributes: ['name'], where: { schoolId: Number(req.params.id) } },
      order: [['dueDate', 'DESC']]
    });
    const statusMap = { PAID: 'مدفوعة', UNPAID: 'غير مدفوعة', OVERDUE: 'متأخرة' };
    res.json(invoices.map(inv => ({
      id: String(inv.id),
      studentId: inv.studentId,
      studentName: inv.Student.name,
      status: statusMap[inv.status] || inv.status,
      issueDate: inv.createdAt.toISOString().split('T')[0],
      dueDate: inv.dueDate.toISOString().split('T')[0],
      items: [{ description: 'رسوم دراسية', amount: parseFloat(inv.amount) }],
      totalAmount: parseFloat(inv.amount)
    })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae

module.exports = router;
