const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Create rate limiter with Redis store
const createRateLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        max = 100, // limit each IP to 100 requests per windowMs
        message = 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة لاحقاً',
        skipSuccessfulRequests = false,
        skipFailedRequests = false,
        keyGenerator = (req) => {
            // If authenticated, use user ID to handle NAT/School WiFi scenarios
            if (req.user && req.user.id) {
                return `user_${req.user.id}`;
            }
            // Fallback to IP for unauthenticated requests
            return req.ip;
        },
        handler = (req, res) => {
            res.status(429).json({
                success: false,
                error: {
                    type: 'RateLimitError',
                    message: message
                }
            });
        }
    } = options;

    const limiterOptions = {
        windowMs,
        max,
        message,
        skipSuccessfulRequests,
        skipFailedRequests,
        keyGenerator,
        handler,
        passOnStoreError: true,
        standardHeaders: true,
        legacyHeaders: false
    };

    // Use Redis store if available
    if (process.env.REDIS_URL && process.env.NODE_ENV !== 'test') {
        try {
            limiterOptions.store = new RedisStore({
                sendCommand: (...args) => require('../config/redis').sendCommand(...args)
            });
        } catch (error) {
            console.warn('Redis store not available for rate limiting, using memory store');
        }
    }

    return rateLimit(limiterOptions);
};

// Different rate limiters for different endpoints
const rateLimiters = {
    // General API rate limiter
    general: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // 100 requests per 15 minutes
    }),

    // Strict rate limiter for authentication
    auth: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per 15 minutes
        message: 'تم تجاوز عدد محاولات تسجيل الدخول، يرجى المحاولة بعد 15 دقيقة',
        skipSuccessfulRequests: true
    }),

    // Rate limiter for password reset
    passwordReset: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 attempts per hour
        message: 'تم تجاوز عدد محاولات إعادة تعيين كلمة المرور، يرجى المحاولة بعد ساعة'
    }),

    // Rate limiter for API endpoints
    api: createRateLimiter({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 300 // 300 requests per minute (increased for dashboard concurrency)
    }),

    // Rate limiter for invitations
    invite: createRateLimiter({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 5 // 5 invites per minute
    }),

    // Rate limiter for file uploads
    upload: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10 // 10 uploads per hour
    }),

    // Rate limiter for expensive operations
    expensive: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 5 // 5 requests per hour
    })
};

module.exports = {
    createRateLimiter,
    rateLimiters
};
