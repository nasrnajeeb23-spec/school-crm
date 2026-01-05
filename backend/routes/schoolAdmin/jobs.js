const express = require('express');
const router = express.Router({ mergeParams: true });
const { Job } = require('../../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../../middleware/auth');

// @route   GET api/school/:schoolId/jobs/:jobId
// @desc    Get status of a background job
router.get('/:jobId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const job = await Job.findOne({ where: { id: req.params.jobId, schoolId: req.params.schoolId } });
        if (!job) return res.status(404).json({ msg: 'Job not found' });
        res.json(job);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

module.exports = router;
