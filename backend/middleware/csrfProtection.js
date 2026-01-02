/**
 * CSRF Protection Middleware
 * حماية من هجمات Cross-Site Request Forgery
 */

const crypto = require('crypto');

// تخزين الـ tokens (في الإنتاج استخدم Redis)
const csrfTokens = new Map();

// مدة صلاحية الـ token (30 دقيقة)
const TOKEN_EXPIRY = 30 * 60 * 1000;

/**
 * توليد CSRF token
 */
function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware لتوليد وإرفاق CSRF token
 */
function csrfTokenGenerator(req, res, next) {
    // تخطي للطلبات الآمنة (GET, HEAD, OPTIONS)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // توليد token جديد إذا لم يكن موجوداً
    if (!req.session.csrfToken) {
        const token = generateCsrfToken();
        req.session.csrfToken = token;
        csrfTokens.set(token, {
            createdAt: Date.now(),
            sessionId: req.session.id
        });
    }

    // إرفاق الـ token في الـ response
    res.locals.csrfToken = req.session.csrfToken;

    next();
}

/**
 * Middleware للتحقق من CSRF token
 */
function csrfProtection(req, res, next) {
    // تخطي للطلبات الآمنة
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // تخطي لنقاط نهاية API معينة (مثل webhook)
    const exemptPaths = ['/api/webhooks', '/api/public'];
    if (exemptPaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    // الحصول على الـ token من الـ header أو الـ body
    const token = req.headers['x-csrf-token'] ||
        req.headers['csrf-token'] ||
        req.body._csrf ||
        req.query._csrf;

    if (!token) {
        return res.status(403).json({
            success: false,
            message: 'CSRF token missing',
            code: 'CSRF_TOKEN_MISSING'
        });
    }

    // التحقق من الـ token
    const tokenData = csrfTokens.get(token);

    if (!tokenData) {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token',
            code: 'CSRF_TOKEN_INVALID'
        });
    }

    // التحقق من انتهاء الصلاحية
    if (Date.now() - tokenData.createdAt > TOKEN_EXPIRY) {
        csrfTokens.delete(token);
        return res.status(403).json({
            success: false,
            message: 'CSRF token expired',
            code: 'CSRF_TOKEN_EXPIRED'
        });
    }

    // التحقق من الـ session
    if (req.session.csrfToken !== token) {
        return res.status(403).json({
            success: false,
            message: 'CSRF token mismatch',
            code: 'CSRF_TOKEN_MISMATCH'
        });
    }

    next();
}

/**
 * تنظيف الـ tokens المنتهية
 */
function cleanupExpiredTokens() {
    const now = Date.now();
    for (const [token, data] of csrfTokens.entries()) {
        if (now - data.createdAt > TOKEN_EXPIRY) {
            csrfTokens.delete(token);
        }
    }
}

// تنظيف كل 10 دقائق
setInterval(cleanupExpiredTokens, 10 * 60 * 1000);

/**
 * Endpoint للحصول على CSRF token
 */
function getCsrfToken(req, res) {
    const token = req.session.csrfToken || generateCsrfToken();
    req.session.csrfToken = token;

    csrfTokens.set(token, {
        createdAt: Date.now(),
        sessionId: req.session.id
    });

    res.json({
        success: true,
        csrfToken: token
    });
}

module.exports = {
    csrfTokenGenerator,
    csrfProtection,
    getCsrfToken,
    generateCsrfToken
};
