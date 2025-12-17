const express = require('express');
const router = express.Router();
const { School, AuditLog, Notification } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');
const { paginationMiddleware, buildPaginationResponse } = require('../utils/pagination');

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
    const qi = School.sequelize.getQueryInterface();
    const desc = await qi.describeTable(School.getTableName());
    _schoolTableCols = desc && typeof desc === 'object' ? Object.keys(desc) : [];
  } catch {
    _schoolTableCols = [];
  }
  return _schoolTableCols;
};

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
// @access  Private (SuperAdmin)
router.get('/',
  verifyToken,
  requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'),
  rateLimiters.api,
  paginationMiddleware,
  cacheMiddlewares.schools,
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = req.pagination;

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

router.use(errorHandler);

module.exports = router;
