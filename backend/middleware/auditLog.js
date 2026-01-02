const AuditLog = require('../models/AuditLog');

/**
 * Middleware to automatically log sensitive operations to AuditLogs table
 * @param {string} action - Action type: CREATE, UPDATE, DELETE
 * @param {string} entityType - Type of entity being affected
 * @param {object} options - Additional options
 * @param {string} options.riskLevel - Risk level: low, medium, high, critical
 * @param {function} options.getEntityId - Function to extract entity ID from req
 * @param {function} options.getOldValue - Function to get old value (for UPDATE/DELETE)
 * @param {function} options.getNewValue - Function to get new value (for CREATE/UPDATE)
 * @param {function} options.getMetadata - Function to get additional metadata
 */
function auditLog(action, entityType, options = {}) {
    return async (req, res, next) => {
        // Store original methods
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        // Flag to track if audit log was already created
        let auditLogged = false;

        // Helper function to extract IP address
        const getIpAddress = (req) => {
            const forwarded = req.headers['x-forwarded-for'];
            if (forwarded) {
                const ips = forwarded.split(',');
                return ips[0].trim();
            }
            return req.ip || req.connection.remoteAddress || 'unknown';
        };

        // Helper function to create audit log
        const createAuditLog = async (responseData) => {
            if (auditLogged) return; // Prevent duplicate logs
            auditLogged = true;

            try {
                // Only log if user is authenticated
                if (!req.user || !req.user.id) return;

                // Only log successful operations (2xx status codes)
                if (res.statusCode < 200 || res.statusCode >= 300) return;

                const entityId = options.getEntityId
                    ? await options.getEntityId(req, responseData)
                    : req.params.id || req.params.studentId || req.params.teacherId || req.params.userId || null;

                const oldValue = options.getOldValue
                    ? await options.getOldValue(req, responseData)
                    : null;

                const newValue = options.getNewValue
                    ? await options.getNewValue(req, responseData)
                    : null;

                const metadata = options.getMetadata
                    ? await options.getMetadata(req, responseData)
                    : {
                        method: req.method,
                        path: req.originalUrl || req.url,
                        params: req.params,
                        query: req.query,
                    };

                await AuditLog.create({
                    userId: req.user.id,
                    action: action.toUpperCase(),
                    entityType,
                    entityId: entityId ? String(entityId) : null,
                    oldValue,
                    newValue,
                    ipAddress: getIpAddress(req),
                    userAgent: req.headers['user-agent'] || null,
                    schoolId: req.user.schoolId || req.params.schoolId || null,
                    metadata,
                    riskLevel: options.riskLevel || 'low',
                });
            } catch (error) {
                // Log error but don't fail the request
                console.error('Audit log error:', error.message);
                try {
                    const logger = req.app && req.app.locals && req.app.locals.logger;
                    if (logger) {
                        logger.error('audit_log_failed', {
                            error: error.message,
                            action,
                            entityType,
                            userId: req.user?.id
                        });
                    }
                } catch { }
            }
        };

        // Override res.json
        res.json = function (data) {
            createAuditLog(data).finally(() => {
                originalJson(data);
            });
        };

        // Override res.send
        res.send = function (data) {
            createAuditLog(data).finally(() => {
                originalSend(data);
            });
        };

        next();
    };
}

/**
 * Helper function to create audit log for specific RBAC operations
 */
function auditRbacOperation(action, entityType) {
    return auditLog(action, entityType, {
        riskLevel: 'high',
        getEntityId: (req, res) => {
            return req.params.roleId || req.params.permissionId || req.params.userId || req.params.id;
        },
        getOldValue: async (req, res) => {
            // For UPDATE/DELETE, store the old value from req.locals if available
            return req.locals?.oldValue || null;
        },
        getNewValue: async (req, res) => {
            // For CREATE/UPDATE, store the new value from response or body
            if (action === 'DELETE') return null;
            return req.body || res.data || null;
        },
        getMetadata: (req, res) => {
            return {
                method: req.method,
                path: req.originalUrl || req.url,
                schoolId: req.params.schoolId,
                affectedEntity: entityType,
            };
        }
    });
}

/**
 * Helper function to create audit log for student operations
 */
function auditStudentOperation(action) {
    return auditLog(action, 'Student', {
        riskLevel: action === 'DELETE' ? 'high' : 'medium',
        getEntityId: (req, res) => {
            return req.params.id || req.params.studentId || res.data?.id;
        },
        getOldValue: async (req, res) => {
            return req.locals?.oldStudent || null;
        },
        getNewValue: async (req, res) => {
            if (action === 'DELETE') return null;
            return req.body || res.data || null;
        }
    });
}

/**
 * Helper function to create audit log for teacher operations
 */
function auditTeacherOperation(action) {
    return auditLog(action, 'Teacher', {
        riskLevel: action === 'DELETE' ? 'high' : 'medium',
        getEntityId: (req, res) => {
            return req.params.id || req.params.teacherId || res.data?.id;
        },
        getOldValue: async (req, res) => {
            return req.locals?.oldTeacher || null;
        },
        getNewValue: async (req, res) => {
            if (action === 'DELETE') return null;
            return req.body || res.data || null;
        }
    });
}

/**
 * Helper function to create audit log for user operations
 */
function auditUserOperation(action) {
    return auditLog(action, 'User', {
        riskLevel: 'critical',
        getEntityId: (req, res) => {
            return req.params.id || req.params.userId || res.data?.id;
        },
        getOldValue: async (req, res) => {
            return req.locals?.oldUser || null;
        },
        getNewValue: async (req, res) => {
            if (action === 'DELETE') return null;
            // Don't log passwords
            const data = req.body || res.data || null;
            if (data && data.password) {
                const { password, ...rest } = data;
                return rest;
            }
            return data;
        }
    });
}

/**
 * Helper function to create audit log for finance operations
 */
function auditFinanceOperation(action, entityType) {
    return auditLog(action, entityType, {
        riskLevel: 'high',
        getEntityId: (req, res) => {
            return req.params.id || req.params.invoiceId || req.params.paymentId || res.data?.id;
        },
        getOldValue: async (req, res) => {
            return req.locals?.oldValue || null;
        },
        getNewValue: async (req, res) => {
            if (action === 'DELETE') return null;
            return req.body || res.data || null;
        }
    });
}

module.exports = {
    auditLog,
    auditRbacOperation,
    auditStudentOperation,
    auditTeacherOperation,
    auditUserOperation,
    auditFinanceOperation,
};
