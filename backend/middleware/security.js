const helmet = require('helmet');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

// Security headers middleware
const securityHeaders = () => {
    return helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                connectSrc: ["'self'", process.env.API_URL || 'http://localhost:5000'],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"]
            }
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        noSniff: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        xssFilter: true,
        hidePoweredBy: true
    });
};

// CSRF protection middleware
const csrfProtection = () => {
    return csrf({ cookie: true });
};

// IP whitelist middleware
const ipWhitelist = (allowedIps = []) => {
    return (req, res, next) => {
        if (allowedIps.length === 0) {
            return next();
        }

        const clientIp = req.ip || req.connection.remoteAddress;

        if (allowedIps.includes(clientIp)) {
            return next();
        }

        res.status(403).json({
            success: false,
            error: {
                type: 'ForbiddenError',
                message: 'الوصول مرفوض من هذا العنوان'
            }
        });
    };
};

// Sanitize input middleware
const sanitizeInput = () => {
    return (req, res, next) => {
        // Sanitize body
        if (req.body) {
            Object.keys(req.body).forEach(key => {
                if (typeof req.body[key] === 'string') {
                    req.body[key] = req.body[key].trim();
                }
            });
        }

        // Sanitize query
        if (req.query) {
            Object.keys(req.query).forEach(key => {
                if (typeof req.query[key] === 'string') {
                    req.query[key] = req.query[key].trim();
                }
            });
        }

        next();
    };
};

// Request logging middleware
const requestLogger = () => {
    return (req, res, next) => {
        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;
            console.log({
                method: req.method,
                path: req.path,
                status: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip,
                userAgent: req.get('user-agent'),
                timestamp: new Date().toISOString()
            });
        });

        next();
    };
};

// Audit log middleware
const auditLog = (action) => {
    return async (req, res, next) => {
        try {
            const { AuditLog } = require('../models');

            if (AuditLog) {
                await AuditLog.create({
                    action,
                    userId: req.user?.id || null,
                    userEmail: req.user?.email || null,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    details: JSON.stringify({
                        method: req.method,
                        path: req.path,
                        body: req.body,
                        query: req.query
                    }),
                    riskLevel: determineRiskLevel(action)
                });
            }
        } catch (error) {
            console.error('Audit log error:', error);
        }

        next();
    };
};

// Determine risk level based on action
const determineRiskLevel = (action) => {
    const highRiskActions = ['DELETE', 'SUBSCRIPTION_UPDATE', 'USER_DELETE', 'SCHOOL_DELETE'];
    const mediumRiskActions = ['UPDATE', 'CREATE', 'PASSWORD_CHANGE'];

    if (highRiskActions.some(a => action.includes(a))) {
        return 'high';
    } else if (mediumRiskActions.some(a => action.includes(a))) {
        return 'medium';
    }

    return 'low';
};

module.exports = {
    securityHeaders,
    csrfProtection,
    ipWhitelist,
    sanitizeInput,
    requestLogger,
    auditLog
};
