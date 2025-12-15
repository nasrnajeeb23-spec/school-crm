const { body, param, query, validationResult } = require('express-validator');
const { validationErrorHandler } = require('./errorHandler');

// Common validation rules
const validationRules = {
    // Email validation
    email: () => body('email')
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح')
        .normalizeEmail(),

    // Password validation
    password: () => body('password')
        .isLength({ min: 8 })
        .withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم'),

    // Name validation
    name: (field = 'name') => body(field)
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('الاسم يجب أن يكون بين 2 و 100 حرف'),

    // ID validation
    id: (field = 'id') => param(field)
        .isInt({ min: 1 })
        .withMessage('المعرف غير صحيح'),

    // Phone validation
    phone: (field = 'phone') => body(field)
        .optional()
        .matches(/^[0-9+\-\s()]+$/)
        .withMessage('رقم الهاتف غير صحيح'),

    // Date validation
    date: (field) => body(field)
        .optional()
        .isISO8601()
        .withMessage('التاريخ غير صحيح'),

    // Number validation
    number: (field, min = 0, max = Infinity) => body(field)
        .isInt({ min, max })
        .withMessage(`يجب أن يكون رقماً بين ${min} و ${max}`),

    // Boolean validation
    boolean: (field) => body(field)
        .isBoolean()
        .withMessage('يجب أن تكون القيمة true أو false'),

    // Array validation
    array: (field) => body(field)
        .isArray()
        .withMessage('يجب أن تكون القيمة مصفوفة'),

    // String validation
    string: (field, min = 1, max = 255) => body(field)
        .trim()
        .isLength({ min, max })
        .withMessage(`يجب أن يكون النص بين ${min} و ${max} حرف`)
};

// Validation middleware
const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        // Check for errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(validationErrorHandler(errors.array()));
        }

        next();
    };
};

// Specific validation sets
const validators = {
    // School creation
    createSchool: validate([
        validationRules.name('name'),
        validationRules.email('contactEmail'),
        validationRules.phone('contactPhone'),
        body('plan').isIn(['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE']).withMessage('الخطة غير صحيحة')
    ]),

    // User creation
    createUser: validate([
        validationRules.name('name'),
        validationRules.email(),
        validationRules.password(),
        body('role').isIn(['SuperAdmin', 'SchoolAdmin', 'Teacher', 'Parent', 'Student']).withMessage('الدور غير صحيح')
    ]),

    // Login
    login: validate([
        body('emailOrUsername').notEmpty().withMessage('البريد الإلكتروني أو اسم المستخدم مطلوب'),
        body('password').notEmpty().withMessage('كلمة المرور مطلوبة')
    ]),

    // Update subscription
    updateSubscription: validate([
        validationRules.id('id'),
        body('status').optional().isIn(['ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELED']).withMessage('الحالة غير صحيحة'),
        body('renewalDate').optional().isISO8601().withMessage('تاريخ التجديد غير صحيح')
    ]),

    // Pagination
    pagination: validate([
        query('page').optional().isInt({ min: 1 }).withMessage('رقم الصفحة غير صحيح'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('عدد العناصر يجب أن يكون بين 1 و 100')
    ])
};

module.exports = {
    validationRules,
    validate,
    validators
};
