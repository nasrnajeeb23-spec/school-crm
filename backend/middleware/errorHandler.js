const errorHandler = (err, req, res, next) => {
    const isTest = process.env.NODE_ENV === 'test';
    if (!isTest) {
        try {
            console.error('Error:', {
                message: err.message,
                stack: err.stack,
                path: req?.path,
                method: req?.method,
                ip: req?.ip,
                timestamp: new Date().toISOString()
            });
        } catch { }
    }

    const statusCode = err.statusCode || err.status || 500;
    const errorType = err.name || 'ServerError';
    const isDev = process.env.NODE_ENV === 'development';
    const isProd = process.env.NODE_ENV === 'production';

    const response = {
        success: false,
        error: {
            type: errorType,
            message: isProd ? 'حدث خطأ في الخادم' : (err.message || 'حدث خطأ في الخادم')
        }
    };

    if (err && err.details) {
        response.error.details = err.details;
    }
    if (isDev) {
        response.error.stack = err.stack;
        if (err && err.details && !response.error.details) {
            response.error.details = err.details;
        }
    }

    res.status(statusCode).json(response);
};

// Validation error handler
const validationErrorHandler = (errors) => {
    const formattedErrors = errors.map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
    }));

    return {
        success: false,
        error: {
            type: 'ValidationError',
            message: 'فشل التحقق من صحة البيانات',
            errors: formattedErrors
        }
    };
};

// Not found handler
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            type: 'NotFoundError',
            message: 'المسار المطلوب غير موجود',
            path: req.path
        },
        timestamp: new Date().toISOString()
    });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error classes
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400);
        this.name = 'ValidationError';
        this.details = details;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'غير مصرح') {
        super(message, 401);
        this.name = 'AuthenticationError';
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'ليس لديك صلاحية للوصول') {
        super(message, 403);
        this.name = 'AuthorizationError';
    }
}

class NotFoundError extends AppError {
    constructor(message = 'المورد غير موجود') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
}

module.exports = {
    errorHandler,
    validationErrorHandler,
    notFoundHandler,
    asyncHandler,
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError
};
