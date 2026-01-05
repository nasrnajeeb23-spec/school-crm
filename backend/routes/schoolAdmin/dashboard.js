const express = require('express');
const router = express.Router({ mergeParams: true });
const { sequelize, School, Student, Teacher, Parent, User, Invoice, Expense, Attendance, SchoolStats, Subscription, Plan, CommunicationUsage, SchoolEvent } = require('../../models');
const { Op } = require('sequelize');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../../middleware/auth');

// @route   GET api/school/:schoolId/dashboard/complete
// @desc    Get complete dashboard data in one go
// @access  Private (SchoolAdmin)
router.get('/complete', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const today = new Date().toISOString().split('T')[0];

    // 1. Stats (Students, Teachers, Attendance)
    const [studentsCount, teachersCount] = await Promise.all([
      Student.count({ where: { schoolId } }),
      Teacher.count({ where: { schoolId } })
    ]);

    // Attendance Calculation
    let totalAttendance = 0;
    let presentAttendance = 0;
    const attendanceRecords = await Attendance.findAll({ where: { classId: { [Op.in]: sequelize.literal(`(SELECT id FROM Classes WHERE schoolId=${schoolId})`) }, date: today } });

    totalAttendance = attendanceRecords.length;
    presentAttendance = attendanceRecords.filter(r => String(r.status).toLowerCase() === 'present' || String(r.status) === 'Present').length;
    const attendancePercent = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;

    // 2. Financials (Revenue, Expenses)
    const revenue = await Invoice.sum('amount', { where: { schoolId, status: 'PAID' } }) || 0;
    const expenseTotal = await Expense.sum('amount', { where: { schoolId } }) || 0;
    const overdueInvoicesCount = await Invoice.count({ where: { schoolId, status: 'OVERDUE' } });

    // 3. Distribution (Gender, Stage)
    const students = await Student.findAll({ where: { schoolId }, attributes: ['gender', 'stageId', 'grade'] });
    const genderDist = { male: 0, female: 0 };
    const stageDist = {};

    students.forEach(s => {
      if (s.gender === 'Male' || s.gender === 'ذكر') genderDist.male++;
      else if (s.gender === 'Female' || s.gender === 'أنثى') genderDist.female++;

      const st = s.grade || 'Unknown'; // Fallback if stageId complex calculation needed
      stageDist[st] = (stageDist[st] || 0) + 1;
    });

    const distributionData = {
      gender: [
        { name: 'ذكر', value: genderDist.male, fill: '#8884d8' },
        { name: 'أنثى', value: genderDist.female, fill: '#82ca9d' }
      ],
      stage: Object.keys(stageDist).map(k => ({ name: k, value: stageDist[k] }))
    };

    // 4. Upcoming Events
    const upcomingEvents = await SchoolEvent.findAll({
      where: { schoolId, date: { [Op.gte]: today } },
      order: [['date', 'ASC']],
      limit: 5
    });

    // 5. Communication Usage
    let commUsage = {
      email: { count: 0, amount: 0 },
      sms: { count: 0, amount: 0 },
      total: 0,
      currency: 'EGP'
    };

    try {
      const comms = await CommunicationUsage.findAll({
        where: { schoolId },
        attributes: ['channel', [sequelize.fn('sum', sequelize.col('amount')), 'totalAmount'], [sequelize.fn('sum', sequelize.col('units')), 'totalCount']],
        group: ['channel']
      });

      comms.forEach(c => {
        const ch = c.channel.toLowerCase();
        const amt = Number(c.getDataValue('totalAmount') || 0);
        const cnt = Number(c.getDataValue('totalCount') || 0);
        if (ch === 'email') { commUsage.email = { count: cnt, amount: amt }; }
        if (ch === 'sms') { commUsage.sms = { count: cnt, amount: amt }; }
        commUsage.total += amt;
      });
    } catch (e) {
      console.warn("Comm usage fetch failed", e);
    }

    res.json({
      stats: {
        students: studentsCount,
        teachers: teachersCount,
        revenue,
        expenses: expenseTotal,
        attendanceRateValue: attendancePercent,
        overdueInvoices: overdueInvoicesCount
      },
      distribution: distributionData,
      upcomingEvents,
      communicationUsage: commUsage
    });

  } catch (err) {
    console.error("Dashboard complete error:", err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/school/:schoolId/stats/counts
// @desc    Get quick counts for resource usage widget
// @access  Private (SchoolAdmin)
router.get('/counts', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);

    // Try to get latest aggregated stats first
    if (SchoolStats) {
      const today = new Date().toISOString().split('T')[0];
      const stats = await SchoolStats.findOne({
        where: { schoolId, date: today },
        attributes: ['totalStudents', 'presentStudents']
      });
    }

    const [students, teachers, parents, staff] = await Promise.all([
      Student.count({ where: { schoolId } }),
      Teacher.count({ where: { schoolId } }),
      Parent.count({ where: { schoolId } }),
      User.count({ where: { schoolId, role: 'Staff' } })
    ]);
    res.json({ students, teachers, parents, staff });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/school/:schoolId/stats/dashboard
// @desc    Get comprehensive dashboard stats (uses aggregation if available)
// @access  Private (SchoolAdmin)
router.get('/stats', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);

    // Fetch Subscription info
    const subscription = await Subscription.findOne({
      where: { schoolId },
      include: [Plan]
    });
    const planName = subscription?.Plan?.name || 'Basic';
    const subscriptionStatus = subscription?.status || 'Inactive';

    // Prepare full subscription details for display
    const subscriptionDetails = subscription ? {
      planName: subscription.Plan?.name || 'Unknown',
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      status: subscription.status,
      limits: subscription.Plan?.limits || {},
      price: subscription.Plan?.price || 0,
      interval: subscription.Plan?.interval || 'monthly'
    } : null;

    // Check for cached/aggregated stats for today
    const today = new Date().toISOString().split('T')[0];
    let stats = null;

    if (SchoolStats) {
      stats = await SchoolStats.findOne({ where: { schoolId, date: today } });
    }

    if (stats) {
      return res.json({
        students: stats.totalStudents,
        attendanceRate: stats.attendanceRate,
        revenue: stats.totalRevenue,
        expenses: stats.totalExpenses,
        source: 'aggregated',
        planName,
        subscriptionStatus,
        subscription: subscriptionDetails
      });
    }

    // Fallback to real-time calculation if no aggregated stats
    const [students, attendanceCount, revenue, expenses] = await Promise.all([
      Student.count({ where: { schoolId } }),
      Attendance.count({ where: { schoolId, date: today, status: 'Present' } }),
      Invoice.sum('amount', { where: { schoolId, status: 'PAID' } }),
      Expense.sum('amount', { where: { schoolId } })
    ]);

    const attendanceRate = students > 0 ? (attendanceCount / students) * 100 : 0;

    res.json({
      students,
      attendanceRate,
      revenue: revenue || 0,
      expenses: expenses || 0,
      source: 'realtime',
      planName,
      subscriptionStatus,
      subscription: subscriptionDetails
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
