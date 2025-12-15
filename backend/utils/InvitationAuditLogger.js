const crypto = require('crypto');

/**
 * Audit Logger for Invitation System
 * Logs all invitation-related activities for security and compliance
 */
class InvitationAuditLogger {
    constructor(InvitationLog) {
        this.InvitationLog = InvitationLog;
    }

    /**
     * Extract IP address from request
     */
    getIpAddress(req) {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.headers['x-real-ip'] ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            req.ip ||
            'unknown';
    }

    /**
     * Hash token for secure storage
     */
    hashToken(token) {
        if (!token) return null;
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Log invitation sent
     */
    async logInviteSent(req, { targetType, targetId, channel, success, errorMessage, metadata, activationToken }) {
        try {
            await this.InvitationLog.create({
                userId: req.user?.id,
                schoolId: req.user?.schoolId,
                targetType,
                targetId,
                action: 'INVITE_SENT',
                channel,
                ipAddress: this.getIpAddress(req),
                userAgent: req.headers['user-agent'],
                success,
                errorMessage,
                metadata,
                activationToken: this.hashToken(activationToken)
            });
        } catch (error) {
            console.error('Failed to log invite sent:', error);
        }
    }

    /**
     * Log invitation failed
     */
    async logInviteFailed(req, { targetType, targetId, channel, errorMessage, metadata }) {
        try {
            await this.InvitationLog.create({
                userId: req.user?.id,
                schoolId: req.user?.schoolId,
                targetType,
                targetId,
                action: 'INVITE_FAILED',
                channel,
                ipAddress: this.getIpAddress(req),
                userAgent: req.headers['user-agent'],
                success: false,
                errorMessage,
                metadata
            });
        } catch (error) {
            console.error('Failed to log invite failure:', error);
        }
    }

    /**
     * Log password set (when user completes invitation)
     */
    async logPasswordSet(req, { targetType, targetId, activationToken }) {
        try {
            await this.InvitationLog.create({
                userId: null, // User not authenticated yet
                schoolId: null,
                targetType,
                targetId,
                action: 'PASSWORD_SET',
                channel: null,
                ipAddress: this.getIpAddress(req),
                userAgent: req.headers['user-agent'],
                success: true,
                metadata: null,
                activationToken: this.hashToken(activationToken)
            });
        } catch (error) {
            console.error('Failed to log password set:', error);
        }
    }

    /**
     * Log token expired
     */
    async logTokenExpired(req, { targetType, targetId, activationToken }) {
        try {
            await this.InvitationLog.create({
                userId: null,
                schoolId: null,
                targetType,
                targetId,
                action: 'TOKEN_EXPIRED',
                channel: null,
                ipAddress: this.getIpAddress(req),
                userAgent: req.headers['user-agent'],
                success: false,
                errorMessage: 'Token has expired',
                activationToken: this.hashToken(activationToken)
            });
        } catch (error) {
            console.error('Failed to log token expired:', error);
        }
    }

    /**
     * Update email status (from webhook)
     */
    async updateEmailStatus(activationToken, emailStatus) {
        try {
            const hashedToken = this.hashToken(activationToken);
            await this.InvitationLog.update(
                { emailStatus },
                {
                    where: {
                        activationToken: hashedToken,
                        channel: 'email'
                    },
                    order: [['createdAt', 'DESC']],
                    limit: 1
                }
            );
        } catch (error) {
            console.error('Failed to update email status:', error);
        }
    }

    /**
     * Update SMS status
     */
    async updateSmsStatus(activationToken, smsStatus) {
        try {
            const hashedToken = this.hashToken(activationToken);
            await this.InvitationLog.update(
                { smsStatus },
                {
                    where: {
                        activationToken: hashedToken,
                        channel: 'sms'
                    },
                    order: [['createdAt', 'DESC']],
                    limit: 1
                }
            );
        } catch (error) {
            console.error('Failed to update SMS status:', error);
        }
    }

    /**
     * Get invitation logs for a user
     */
    async getUserInvitationLogs(userId, limit = 50) {
        try {
            return await this.InvitationLog.findAll({
                where: { userId },
                order: [['createdAt', 'DESC']],
                limit
            });
        } catch (error) {
            console.error('Failed to get user invitation logs:', error);
            return [];
        }
    }

    /**
     * Get invitation logs for a target
     */
    async getTargetInvitationLogs(targetType, targetId, limit = 50) {
        try {
            return await this.InvitationLog.findAll({
                where: { targetType, targetId },
                order: [['createdAt', 'DESC']],
                limit
            });
        } catch (error) {
            console.error('Failed to get target invitation logs:', error);
            return [];
        }
    }

    /**
     * Detect suspicious activity
     */
    async detectSuspiciousActivity(userId, timeWindowMinutes = 60) {
        try {
            const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
            const logs = await this.InvitationLog.findAll({
                where: {
                    userId,
                    createdAt: { [require('sequelize').Op.gte]: since }
                }
            });

            const suspiciousIndicators = {
                rapidInvites: logs.length > 10,
                multipleFailures: logs.filter(l => !l.success).length > 5,
                differentIPs: new Set(logs.map(l => l.ipAddress)).size > 3,
                score: 0
            };

            if (suspiciousIndicators.rapidInvites) suspiciousIndicators.score += 2;
            if (suspiciousIndicators.multipleFailures) suspiciousIndicators.score += 3;
            if (suspiciousIndicators.differentIPs) suspiciousIndicators.score += 2;

            return {
                isSuspicious: suspiciousIndicators.score >= 3,
                indicators: suspiciousIndicators,
                logs
            };
        } catch (error) {
            console.error('Failed to detect suspicious activity:', error);
            return { isSuspicious: false, indicators: {}, logs: [] };
        }
    }
}

module.exports = InvitationAuditLogger;
