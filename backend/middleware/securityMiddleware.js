/**
 * Security Middleware Collection
 * Centralized security utilities for the application
 */

const crypto = require('crypto');
const winston = require('winston');
const { createLogger } = winston;

const securityLogger = createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({
            filename: 'logs/security.log',
            maxsize: 10485760, // 10MB
            maxFiles: 30
        })
    ]
});

/**
 * Request ID Middleware
 * Adds unique ID to each request for tracking
 */
function requestIdMiddleware(req, res, next) {
    req.id = crypto.randomBytes(16).toString('hex');
    res.setHeader('X-Request-ID', req.id);
    next();
}

/**
 * Security Event Logger
 * Logs security-related events
 */
async function logSecurityEvent(eventType, req, details = {}) {
    const event = {
        timestamp: new Date().toISOString(),
        eventType,
        requestId: req.id,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        ...details
    };

    securityLogger.info(event);

    // Also log to database for critical events
    if (['UNAUTHORIZED_ACCESS', 'INVALID_TOKEN', 'BRUTE_FORCE_ATTEMPT'].includes(eventType)) {
        try {
            const { AuditLog } = require('../models');
            await AuditLog.create({
                action: eventType,
                userId: req.user?.id,
                ipAddress: event.ip,
                userAgent: event.userAgent,
                details: JSON.stringify(details)
            });
        } catch (error) {
            console.error('Failed to log security event to database:', error);
        }
    }
}

/**
 * Sanitize Error Messages
 * Prevents leaking sensitive information in production
 */
function sanitizeError(error, env = 'production') {
    if (env === 'development') {
        return {
            message: error.message,
            stack: error.stack,
            ...error
        };
    }

    // Production: Generic error messages
    const safeErrors = {
        'ValidationError': 'Invalid input data',
        'UnauthorizedError': 'Authentication required',
        'ForbiddenError': 'Access denied',
        'NotFoundError': 'Resource not found',
        'ConflictError': 'Resource already exists',
        'SequelizeUniqueConstraintError': 'Duplicate entry',
        'SequelizeValidationError': 'Invalid data'
    };

    return {
        message: safeErrors[error.name] || 'An error occurred. Please try again later.'
    };
}

/**
 * IP Whitelist Middleware
 * Restricts access to specific IPs for sensitive endpoints
 */
function ipWhitelistMiddleware(allowedIPs = []) {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection?.remoteAddress;

        if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
            return next();
        }

        logSecurityEvent('IP_BLOCKED', req, { clientIP, allowedIPs });

        res.status(403).json({
            error: 'Access denied from this IP address'
        });
    };
}

/**
 * Suspicious Activity Detector
 * Detects and blocks suspicious patterns
 */
class SuspiciousActivityDetector {
    constructor() {
        this.attempts = new Map(); // IP -> { count, firstAttempt, lastAttempt }
        this.blockedIPs = new Set();
        this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000); // Cleanup every hour
    }

    track(ip, action) {
        const now = Date.now();
        const key = `${ip}:${action}`;

        if (!this.attempts.has(key)) {
            this.attempts.set(key, {
                count: 1,
                firstAttempt: now,
                lastAttempt: now
            });
            return false; // Not suspicious yet
        }

        const record = this.attempts.get(key);
        record.count++;
        record.lastAttempt = now;

        // Check for suspicious patterns
        const timeWindow = 60 * 1000; // 1 minute
        const timeSinceFirst = now - record.firstAttempt;

        // More than 10 attempts in 1 minute
        if (record.count > 10 && timeSinceFirst < timeWindow) {
            this.blockedIPs.add(ip);
            return true;
        }

        return false;
    }

    isBlocked(ip) {
        return this.blockedIPs.has(ip);
    }

    unblock(ip) {
        this.blockedIPs.delete(ip);
    }

    cleanup() {
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1 hour

        for (const [key, record] of this.attempts.entries()) {
            if (now - record.lastAttempt > maxAge) {
                this.attempts.delete(key);
            }
        }
    }
}

const activityDetector = new SuspiciousActivityDetector();

/**
 * Suspicious Activity Middleware
 */
function suspiciousActivityMiddleware(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress;

    if (activityDetector.isBlocked(ip)) {
        logSecurityEvent('BLOCKED_IP_ATTEMPT', req, { ip });
        return res.status(403).json({
            error: 'Your IP has been temporarily blocked due to suspicious activity'
        });
    }

    const action = `${req.method}:${req.path}`;
    const isSuspicious = activityDetector.track(ip, action);

    if (isSuspicious) {
        logSecurityEvent('SUSPICIOUS_ACTIVITY_DETECTED', req, { ip, action });
        return res.status(429).json({
            error: 'Too many requests. Your IP has been temporarily blocked.'
        });
    }

    next();
}

module.exports = {
    requestIdMiddleware,
    logSecurityEvent,
    sanitizeError,
    ipWhitelistMiddleware,
    suspiciousActivityMiddleware,
    activityDetector,
    securityLogger
};
