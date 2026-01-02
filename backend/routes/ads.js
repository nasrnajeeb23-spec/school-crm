const express = require('express');
const router = express.Router();
const { AdRequest, User, Notification } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

// @route   POST api/ads/request
// @desc    Submit an ad request
// @access  Public
router.post('/request', async (req, res) => {
    try {
        const { advertiserName, advertiserEmail, title, description, imageUrl, link } = req.body;

        // Validation
        if (!advertiserName || !advertiserEmail || !title || !description) {
            return res.status(400).json({ msg: 'Please enter all required fields' });
        }

        const newAd = await AdRequest.create({
            advertiserName,
            advertiserEmail,
            title,
            description,
            imageUrl,
            link,
            status: 'Pending'
        });

        // Notify Super Admins
        const superAdmins = await User.findAll({ where: { role: 'SUPER_ADMIN' } });
        for (const admin of superAdmins) {
            await Notification.create({
                type: 'Info', // Using 'Info' as generic type
                title: 'طلب إعلان جديد',
                description: `طلب إعلان جديد من: ${advertiserName}`,
                userId: admin.id,
                isRead: false
            });
        }

        res.status(201).json({ success: true, data: newAd });
    } catch (err) {
        console.error('Ad Request Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/ads
// @desc    Get all ad requests
// @access  Private (Super Admin)
router.get('/', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const ads = await AdRequest.findAll({ order: [['createdAt', 'DESC']] });
        res.json(ads);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT api/ads/:id/status
// @desc    Update ad request status
// @access  Private (Super Admin)
router.put('/:id/status', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const { status } = req.body;
        const ad = await AdRequest.findByPk(req.params.id);
        if (!ad) return res.status(404).json({ msg: 'Ad request not found' });

        ad.status = status;
        await ad.save();

        res.json(ad);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
