const express = require('express');
const router = express.Router();
const { School } = require('../models');
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

    const { count, rows } = await School.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'name', 'email', 'phone', 'plan', 'status', 'createdAt', 'updatedAt']
    });

    res.json(buildPaginationResponse(rows, count, page, limit));
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

    await school.update(req.body);
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
