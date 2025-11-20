const express = require('express');
const router = express.Router();
const { Teacher, Class, Schedule, Notification } = require('../models');
const { Op } = require('sequelize');
const { verifyToken, requireRole } = require('../middleware/auth');

// @route   GET api/teacher/:teacherId/dashboard
// @desc    Get all necessary data for the teacher dashboard
// @access  Private (Teacher)
router.get('/:teacherId/dashboard', verifyToken, requireRole('TEACHER'), async (req, res) => {
    try {
        const { teacherId } = req.params;
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

        const classesPromise = Class.findAll({
            where: {
                // Find classes where this teacher is the homeroom teacher
                // In a real app, this might be more complex (e.g., based on a junction table)
                homeroomTeacherId: teacherId
            }
        });

        const schedulePromise = Schedule.findAll({
            where: {
                teacherId: teacherId,
                day: today,
            },
            include: { model: Class, attributes: ['name'] },
            order: [['timeSlot', 'ASC']]
        });

        const actionItemsPromise = Notification.findAll({
            where: {
                teacherId: teacherId,
                isRead: false
            },
            order: [['date', 'DESC']]
        });

        const [classes, schedule, actionItems] = await Promise.all([
            classesPromise,
            schedulePromise,
            actionItemsPromise
        ]);
        
        const actionItemTypeMap = { 'Warning': 'warning', 'Info': 'info', 'Approval': 'approval' };

        res.json({
            classes: classes.map(c => c.toJSON()),
            schedule: schedule.map(s => ({
                id: s.id,
                timeSlot: s.timeSlot,
                subject: s.subject,
                classId: s.Class.name, // Use class name for display
            })),
            actionItems: actionItems.map(item => ({
                id: item.id.toString(),
                type: actionItemTypeMap[item.type] || 'info',
                title: item.title,
                description: item.description,
                date: item.date.toISOString().split('T')[0],
            })),
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;