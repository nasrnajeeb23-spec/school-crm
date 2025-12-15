// Error handling middleware for Express
const errorHandler = (err, req, res, next) => {
    // Log error for debugging
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Determine error type
    const errorType = err.name || 'ServerError';

    // Create standardized error response
    const errorResponse = {
        success: false,
        error: {
            type: errorType,
            message: err.message || 'حدث خطأ في الخادم',
            ...(process.env.NODE_ENV === 'development' && {
                stack: err.stack,
                details: err.details
            })
        },
        timestamp: new Date().toISOString(),
        path: req.path
    };

    // Send error response
    res.status(statusCode).json(errorResponse);
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
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
        this.name = 'ValidationError';
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
