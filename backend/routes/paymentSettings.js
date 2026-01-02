const express = require('express');
const router = express.Router();
const { PaymentMethod } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

// @route   GET api/payment-settings/methods
// @desc    Get active payment methods (Public for schools/authenticated users)
// @access  Private (Authenticated)
router.get('/methods', verifyToken, async (req, res) => {
    try {
        const methods = await PaymentMethod.findAll({
            where: { isActive: true },
            order: [['createdAt', 'DESC']]
        });
        res.json(methods);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/payment-settings/methods/all
// @desc    Get all payment methods (SuperAdmin)
// @access  Private (SuperAdmin)
router.get('/methods/all', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const methods = await PaymentMethod.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(methods);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/payment-settings/methods
// @desc    Create a payment method
// @access  Private (SuperAdmin)
router.post('/methods', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const { type, provider, accountName, accountNumber, iban, swift, description, logoUrl, isActive } = req.body;

        const method = await PaymentMethod.create({
            type,
            provider,
            accountName,
            accountNumber,
            iban,
            swift,
            description,
            logoUrl,
            isActive: isActive !== undefined ? isActive : true
        });

        res.json(method);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/payment-settings/methods/:id
// @desc    Update a payment method
// @access  Private (SuperAdmin)
router.put('/methods/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const { type, provider, accountName, accountNumber, iban, swift, description, logoUrl, isActive } = req.body;
        let method = await PaymentMethod.findByPk(req.params.id);

        if (!method) return res.status(404).json({ msg: 'Payment method not found' });

        method.type = type || method.type;
        method.provider = provider || method.provider;
        method.accountName = accountName || method.accountName;
        method.accountNumber = accountNumber || method.accountNumber;
        method.iban = iban || method.iban;
        method.swift = swift || method.swift;
        method.description = description !== undefined ? description : method.description; // allow empty string
        method.logoUrl = logoUrl || method.logoUrl;
        if (isActive !== undefined) method.isActive = isActive;

        await method.save();
        res.json(method);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/payment-settings/methods/:id
// @desc    Delete a payment method
// @access  Private (SuperAdmin)
router.delete('/methods/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const method = await PaymentMethod.findByPk(req.params.id);
        if (!method) return res.status(404).json({ msg: 'Payment method not found' });

        await method.destroy();
        res.json({ msg: 'Payment method removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
