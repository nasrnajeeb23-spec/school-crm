const express = require('express');
const router = express.Router({ mergeParams: true });
const { Student, Teacher, Grade, Attendance, Class } = require('../../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../../middleware/auth');
const fs = require('fs-extra');
const path = require('path');
const { Parser } = require('json2csv');

// @route   GET api/school/:schoolId/reports/export/:type
// @desc    Export data as CSV
router.get('/export/:type', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const { type } = req.params;
        const schoolId = parseInt(req.params.schoolId);
        let data = [];
        let fields = [];

        switch (type) {
            case 'students':
                data = await Student.findAll({ where: { schoolId }, attributes: ['name', 'grade', 'parentName', 'phone', 'email', 'status'] });
                fields = ['name', 'grade', 'parentName', 'phone', 'email', 'status'];
                break;
            case 'teachers':
                data = await Teacher.findAll({ where: { schoolId }, attributes: ['name', 'subject', 'phone', 'status'] });
                fields = ['name', 'subject', 'phone', 'status'];
                break;
            // Add other cases (grades, attendance, etc.) as needed
            default:
                return res.status(400).json({ msg: 'Invalid report type' });
        }

        if (data.length === 0) return res.status(404).json({ msg: 'No data to export' });

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data.map(d => d.toJSON()));

        res.header('Content-Type', 'text/csv');
        res.attachment(`${type}-${Date.now()}.csv`);
        return res.send(csv);

    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

module.exports = router;
