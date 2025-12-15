const express = require('express');
const router = express.Router();
const { ContactMessage } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

// @route   POST api/contact
// @desc    Submit a contact message
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }

        const newMessage = await ContactMessage.create({
            name,
            email,
            message,
            status: 'NEW'
        });

        // Notify Super Admins
        try {
            const { User, Notification } = require('../models');
            const superAdmins = await User.findAll({ where: { role: 'SUPER_ADMIN' } });
            for (const admin of superAdmins) {
                await Notification.create({
                    type: 'Info',
                    title: 'رسالة تواصل جديدة',
                    description: `رسالة جديدة من: ${name}`,
                    userId: admin.id,
                    isRead: false
                });
            }
        } catch (notifyErr) {
            console.error('Notification Error:', notifyErr);
        }

        res.status(201).json(newMessage);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/contact
// @desc    Get all contact messages
// @access  Private (SuperAdmin)
router.get('/', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const messages = await ContactMessage.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/contact/:id
// @desc    Update message status
// @access  Private (SuperAdmin)
router.put('/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const { status } = req.body;
        const message = await ContactMessage.findByPk(req.params.id);

        if (!message) {
            return res.status(404).json({ msg: 'Message not found' });
        }

        if (status) message.status = status;

        await message.save();
        res.json(message);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/contact/:id
// @desc    Delete a message
// @access  Private (SuperAdmin)
router.delete('/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const message = await ContactMessage.findByPk(req.params.id);

        if (!message) {
            return res.status(404).json({ msg: 'Message not found' });
        }

        await message.destroy();
        res.json({ msg: 'Message removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
