const { SchoolSettings, Subscription, Plan } = require('../models');
const { normalizeLimits, getSystemDefaults } = require('./limits');

async function checkStorageLimit(req, res, next) {
    try {
        const schoolId = Number(req.params.schoolId || req.query?.schoolId || req.body?.schoolId || req.user?.schoolId || req.headers['x-school-id']);
        if (!schoolId) return next();

        // Get content length header as a preliminary check
        const contentLength = Number(req.headers['content-length'] || 0);

        // We need to fetch current usage and limits
        const settings = await SchoolSettings.findOne({ where: { schoolId } });
        const sub = await Subscription.findOne({ where: { schoolId } });
        const plan = sub ? await Plan.findByPk(sub.planId) : null;

        const defaults = await getSystemDefaults();
        const { limits } = normalizeLimits(settings, plan, sub, defaults);

        let limitGB = limits.storageGB;

        // Strict Logic:
        // -1 or null => Unlimited
        // 0 => Strictly Blocked (No storage allowed)

        if (limitGB === -1 || limitGB === null || String(limitGB).toLowerCase() === 'unlimited') {
            // Unlimited
            req.storageCheck = { limitBytes: -1, currentUsed: Number(settings?.usedStorage || 0), schoolSettings: settings };
            return next();
        }

        limitGB = Number(limitGB || 0);

        // If strictly 0, block all uploads
        if (limitGB === 0) {
            return res.status(403).json({
                code: 'STORAGE_DISABLED',
                msg: 'Storage is disabled for your plan.',
                data: { limit: 0 }
            });
        }

        const limitBytes = limitGB * 1024 * 1024 * 1024;
        const currentUsed = Number(settings?.usedStorage || 0);

        // Check if limit exceeded before upload
        if ((currentUsed + contentLength) > limitBytes) {
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
