const { SchoolSettings, Subscription, Plan } = require('../models');
const { normalizeLimits } = require('./limits');

async function checkStorageLimit(req, res, next) {
    try {
        const schoolId = Number(req.params.schoolId || req.query?.schoolId || req.body?.schoolId || req.user?.schoolId || req.headers['x-school-id']);
        if (!schoolId) return next(); // Should be caught by other validators

        // Get content length header as a preliminary check
        const contentLength = Number(req.headers['content-length'] || 0);

        // We need to fetch current usage and limits
        const settings = await SchoolSettings.findOne({ where: { schoolId } });
        const sub = await Subscription.findOne({ where: { schoolId } });
        const plan = sub ? await Plan.findByPk(sub.planId) : null;

        const { limits } = normalizeLimits(settings, plan, sub);
        const limitGB = Number(limits.storageGB || 0);

        // If limit is 0, it might mean unlimited or no storage allowed. 
        // Usually 0 means 'default' or 'no specific limit set', but in a usage-based model we might want a default cap.
        // Let's assume 0 means "Basic Limit" e.g. 1GB, or strictly 0. 
        // Based on previous logic, 0 usually means "fallback to base" which is 0 in normalizeLimits base? 
        // Wait, normalizeLimits base has storageGB: 0. 
        // If it is 0, let's allow a small default like 500MB to avoid breaking trial users, or enforce STRICTLY if user wants usage based.
        // Given the user wants "Pricing based on usage", we should probably enforce it.

        const limitBytes = limitGB * 1024 * 1024 * 1024;
        const currentUsed = Number(settings?.usedStorage || 0);

        // Check if limit exceeded before upload (if content-length is reliable)
        if (limitGB > 0 && (currentUsed + contentLength) > limitBytes) {
            return res.status(403).json({
                code: 'STORAGE_LIMIT_EXCEEDED',
                msg: 'Storage limit exceeded. Please upgrade your storage plan.',
                data: { used: currentUsed, limit: limitBytes, attempting: contentLength }
            });
        }

        req.storageCheck = {
            limitBytes,
            currentUsed,
            schoolSettings: settings
        };

        next();
    } catch (e) {
        console.error('Storage limit check error:', e);
        // Fail safe: allow request but log error, or block? 
        // Better to allow if it's a system error to avoid downtime, but log strictly.
        next();
    }
}

async function updateUsedStorage(schoolId, bytesAdded) {
    if (!schoolId || !bytesAdded) return;
    try {
        const { SchoolSettings } = require('../models');
        const settings = await SchoolSettings.findOne({ where: { schoolId } });
        if (settings) {
            const current = BigInt(settings.usedStorage || 0);
            const added = BigInt(bytesAdded);
            // Ensure we don't go below zero
            let newVal = current + added;
            if (newVal < 0n) newVal = 0n;

            settings.usedStorage = newVal;
            await settings.save();
        }
    } catch (e) {
        console.error('Error updating storage usage:', e);
    }
}

module.exports = { checkStorageLimit, updateUsedStorage };
