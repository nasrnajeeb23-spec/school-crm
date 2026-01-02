// Example: Applying middleware to schools routes
const express = require('express');
const router = express.Router();
const { School } = require('../models');
const { errorHandler, asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { validators } = require('../middleware/validation');
const { rateLimiters } = require('../middleware/rateLimiter');
const { cacheMiddlewares, invalidateMiddlewares } = require('../middleware/cache');
const { auditLog } = require('../middleware/security');
const { paginationMiddleware, buildPaginationResponse } = require('../utils/pagination');

// GET /api/schools - List all schools with pagination and caching
router.get('/',
    rateLimiters.api,
    paginationMiddleware,
    cacheMiddlewares.schools,
    asyncHandler(async (req, res) => {
        const { page, limit, offset } = req.pagination;

        const { count, rows } = await School.findAndCountAll({
            limit,
            offset,
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'name', 'email', 'phone', 'plan', 'status', 'createdAt']
        });

        res.json(buildPaginationResponse(rows, count, page, limit));
    })
);

// GET /api/schools/:id - Get single school with caching
router.get('/:id',
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

// POST /api/schools - Create new school with validation and audit
router.post('/',
    rateLimiters.api,
    validators.createSchool,
    auditLog('SCHOOL_CREATE'),
    invalidateMiddlewares.schools,
    asyncHandler(async (req, res) => {
        const school = await School.create(req.body);
        res.status(201).json(school);
    })
);

// PUT /api/schools/:id - Update school
router.put('/:id',
    rateLimiters.api,
    validators.createSchool,
    auditLog('SCHOOL_UPDATE'),
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

// DELETE /api/schools/:id - Delete school
router.delete('/:id',
    rateLimiters.api,
    auditLog('SCHOOL_DELETE'),
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
router.use(errorHandler);

module.exports = router;
