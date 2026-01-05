const express = require('express');
const router = express.Router({ mergeParams: true });
const { SchoolEvent } = require('../../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { auditLog } = require('../../middleware/auditLog');
const { Op } = require('sequelize');

// @route   GET api/school/:schoolId/events
// @desc    Get all events
router.get('/', verifyToken, requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const events = await SchoolEvent.findAll({
            where: { schoolId: req.params.schoolId },
            order: [['date', 'ASC']]
        });
        res.json(events);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/events
// @desc    Create event
router.post('/', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_EVENTS'), requireSameSchoolParam('schoolId'), validate([
    { name: 'title', required: true, type: 'string' },
    { name: 'date', required: true, type: 'string' }
]), async (req, res) => {
    try {
        const { title, description, date, type, targetAudience } = req.body;
        const event = await SchoolEvent.create({
            schoolId: parseInt(req.params.schoolId),
            title,
            description,
            date,
            type: type || 'General',
            targetAudience: targetAudience || 'All',
            createdBy: req.user.id
        });
        res.status(201).json(event);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

// @route   DELETE api/school/:schoolId/events/:id
router.delete('/:id', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_EVENTS'), requireSameSchoolParam('schoolId'), auditLog('DELETE', 'Event'), async (req, res) => {
    try {
        const event = await SchoolEvent.findOne({ where: { id: req.params.id, schoolId: req.params.schoolId } });
        if (!event) return res.status(404).json({ msg: 'Event not found' });
        await event.destroy();
        res.json({ msg: 'Event deleted' });
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

module.exports = router;
