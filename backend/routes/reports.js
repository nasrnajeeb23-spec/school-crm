const express = require('express');
const router = express.Router();
const { verifyToken, requireRole, requireSameSchoolParam, normalizeUserRole, canTeacherAccessStudent, canParentAccessStudent } = require('../middleware/auth');
const ReportService = require('../services/ReportService');

// @route   GET api/reports/:schoolId/student/:studentId/card
// @desc    Download Student Report Card PDF
// @access  Private (SchoolAdmin, Teacher, Parent, Student)
router.get('/:schoolId/student/:studentId/card', verifyToken, requireRole('SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { schoolId, studentId } = req.params;

    const role = normalizeUserRole(req.user);
    if (role === 'PARENT') {
      const ok = await canParentAccessStudent(req, schoolId, studentId);
      if (!ok) return res.status(403).json({ msg: 'Access denied' });
    }
    if (role === 'TEACHER') {
      const ok = await canTeacherAccessStudent(req, schoolId, studentId);
      if (!ok) return res.status(403).json({ msg: 'Access denied' });
    }

    const pdfBuffer = await ReportService.generateReportCard(studentId, schoolId);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-card-${studentId}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    
    res.send(pdfBuffer);

  } catch (err) {
    console.error('Report Error:', err);
    res.status(500).send('Server Error: ' + err.message);
  }
});

module.exports = router;
