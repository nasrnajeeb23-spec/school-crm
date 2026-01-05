const express = require('express');
const router = express.Router({ mergeParams: true });
const { Subscription, Plan, ModuleCatalog } = require('../../models');
const { verifyToken, requireRole, requireSameSchoolParam } = require('../../middleware/auth');

// @route   GET api/school/:schoolId/subscription
// @desc    Get subscription status
router.get('/', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const sub = await Subscription.findOne({
            where: { schoolId: req.params.schoolId },
            include: [Plan]
        });

        // If no subscription, might want to return dummy or 404, but frontend likely expects object.
        const response = sub ? sub.toJSON() : { status: 'No Subscription', planId: null };

        // Enhance with plan details if available
        if (sub && sub.Plan) {
            response.planName = sub.Plan.name;
            response.features = sub.Plan.features;
        }

        res.json(response);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});


// @route   GET api/school/:schoolId/subscription/quote
// @desc    Calculate quote for additional modules
router.post('/quote', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const { modules } = req.body; // Array of module keys
        if (!Array.isArray(modules)) return res.status(400).json({ msg: 'Modules must be array' });

        let total = 0;
        const currency = 'SAR'; // Default from settings usually
        const details = [];

        for (const m of modules) {
            const mod = await ModuleCatalog.findOne({ where: { key: m } });
            if (mod) {
                total += parseFloat(mod.price || 0);
                details.push({ name: mod.name, price: mod.price });
            }
        }
        res.json({ total, currency, details });
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

module.exports = router;
