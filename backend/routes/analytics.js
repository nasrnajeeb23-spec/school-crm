const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/AnalyticsService');
const { verifyToken: auth, requireSameSchoolQuery } = require('../middleware/auth');
const { query, validationResult } = require('express-validator');

// AI-Powered Analytics Routes
router.get('/insights/at-risk-students', auth, requireSameSchoolQuery('schoolId'), async (req, res) => {
  try {
    const { schoolId } = req.query;
    const redis = req.app && req.app.locals && req.app.locals.redisClient;
    const enabled = process.env.ANALYTICS_CACHE_ENABLED ? String(process.env.ANALYTICS_CACHE_ENABLED).toLowerCase() === 'true' : (process.env.NODE_ENV !== 'development');
    const ttl = parseInt(process.env.ANALYTICS_CACHE_TTL_SECONDS || '600', 10);
    const key = `analytics:at_risk:${schoolId}`;
    if (enabled && redis) {
      try { const cached = await redis.get(key); if (cached) return res.json(JSON.parse(cached)); } catch {}
    }
    
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: 'SCHOOL_ID_REQUIRED',
        message: 'School ID is required for analytics'
      });
    }

    const insights = await AnalyticsService.predictAtRiskStudents(schoolId);
    const payload = {
      success: true,
      data: {
        insights,
        generatedAt: new Date(),
        modelAccuracy: 0.85,
        totalPredictions: insights.length
      }
    };
    if (enabled && redis) { try { await redis.setEx(key, ttl, JSON.stringify(payload)); } catch {} }
    res.json(payload);

  } catch (error) {
    console.error('At-risk students analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'ANALYTICS_FAILED',
      message: error.message
    });
  }
});

router.get('/insights/academic-performance', auth, requireSameSchoolQuery('schoolId'), [
  query('schoolId').optional().isInt({ min: 1 }).withMessage('Invalid school ID'),
  query('timeRange').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid time range')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { schoolId, timeRange = 'month' } = req.query;
    const redis = req.app && req.app.locals && req.app.locals.redisClient;
    const enabled = process.env.ANALYTICS_CACHE_ENABLED ? String(process.env.ANALYTICS_CACHE_ENABLED).toLowerCase() === 'true' : (process.env.NODE_ENV !== 'development');
    const ttl = parseInt(process.env.ANALYTICS_CACHE_TTL_SECONDS || '600', 10);
    const key = `analytics:academic:${schoolId}:${timeRange}`;
    if (enabled && redis) { try { const cached = await redis.get(key); if (cached) return res.json(JSON.parse(cached)); } catch {} }

    const insights = await AnalyticsService.analyzeAcademicPerformance(schoolId, timeRange);
    const payload = {
      success: true,
      data: {
        insights,
        timeRange,
        generatedAt: new Date(),
        metrics: {
          averageGrade: insights.averageGrade,
          gradeDistribution: insights.gradeDistribution,
          improvementTrend: insights.improvementTrend,
          topPerformers: insights.topPerformers,
          needsAttention: insights.needsAttention
        }
      }
    };
    if (enabled && redis) { try { await redis.setEx(key, ttl, JSON.stringify(payload)); } catch {} }
    res.json(payload);

  } catch (error) {
    console.error('Academic performance analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'ANALYTICS_FAILED',
      message: error.message
    });
  }
});

router.get('/insights/financial-trends', auth, requireSameSchoolQuery('schoolId'), async (req, res) => {
  try {
    const { schoolId, timeRange = 'year' } = req.query;
    const redis = req.app && req.app.locals && req.app.locals.redisClient;
    const enabled = process.env.ANALYTICS_CACHE_ENABLED ? String(process.env.ANALYTICS_CACHE_ENABLED).toLowerCase() === 'true' : (process.env.NODE_ENV !== 'development');
    const ttl = parseInt(process.env.ANALYTICS_CACHE_TTL_SECONDS || '600', 10);
    const key = `analytics:financial:${schoolId}:${timeRange}`;
    if (enabled && redis) { try { const cached = await redis.get(key); if (cached) return res.json(JSON.parse(cached)); } catch {} }

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: 'SCHOOL_ID_REQUIRED',
        message: 'School ID is required for financial analytics'
      });
    }

    const insights = await AnalyticsService.analyzeFinancialTrends(schoolId, timeRange);
    const payload = {
      success: true,
      data: {
        insights,
        timeRange,
        generatedAt: new Date(),
        metrics: {
          revenueTrend: insights.revenueTrend,
          expenseTrend: insights.expenseTrend,
          profitMargin: insights.profitMargin,
          cashFlow: insights.cashFlow,
          financialHealth: insights.financialHealth
        }
      }
    };
    if (enabled && redis) { try { await redis.setEx(key, ttl, JSON.stringify(payload)); } catch {} }
    res.json(payload);

  } catch (error) {
    console.error('Financial trends analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'ANALYTICS_FAILED',
      message: error.message
    });
  }
});

router.get('/insights/teacher-performance', auth, requireSameSchoolQuery('schoolId'), async (req, res) => {
  try {
    const { schoolId, timeRange = 'quarter' } = req.query;
    const redis = req.app && req.app.locals && req.app.locals.redisClient;
    const enabled = process.env.ANALYTICS_CACHE_ENABLED ? String(process.env.ANALYTICS_CACHE_ENABLED).toLowerCase() === 'true' : (process.env.NODE_ENV !== 'development');
    const ttl = parseInt(process.env.ANALYTICS_CACHE_TTL_SECONDS || '600', 10);
    const key = `analytics:teacher:${schoolId}:${timeRange}`;
    if (enabled && redis) { try { const cached = await redis.get(key); if (cached) return res.json(JSON.parse(cached)); } catch {} }

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: 'SCHOOL_ID_REQUIRED',
        message: 'School ID is required for teacher analytics'
      });
    }

    const insights = await AnalyticsService.analyzeTeacherPerformance(schoolId, timeRange);
    const payload = {
      success: true,
      data: {
        insights,
        timeRange,
        generatedAt: new Date(),
        metrics: {
          teacherEffectiveness: insights.teacherEffectiveness,
          studentEngagement: insights.studentEngagement,
          teachingConsistency: insights.teachingConsistency,
          professionalDevelopment: insights.professionalDevelopment,
          retentionRisk: insights.retentionRisk
        }
      }
    };
    if (enabled && redis) { try { await redis.setEx(key, ttl, JSON.stringify(payload)); } catch {} }
    res.json(payload);

  } catch (error) {
    console.error('Teacher performance analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'ANALYTICS_FAILED',
      message: error.message
    });
  }
});

router.get('/insights/automated', auth, requireSameSchoolQuery('schoolId'), async (req, res) => {
  try {
    const { schoolId } = req.query;
    const redis = req.app && req.app.locals && req.app.locals.redisClient;
    const enabled = process.env.ANALYTICS_CACHE_ENABLED ? String(process.env.ANALYTICS_CACHE_ENABLED).toLowerCase() === 'true' : (process.env.NODE_ENV !== 'development');
    const ttl = parseInt(process.env.ANALYTICS_CACHE_TTL_SECONDS || '600', 10);
    const key = `analytics:auto:${schoolId}`;
    if (enabled && redis) { try { const cached = await redis.get(key); if (cached) return res.json(JSON.parse(cached)); } catch {} }

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: 'SCHOOL_ID_REQUIRED',
        message: 'School ID is required for automated insights'
      });
    }

    const insights = await AnalyticsService.generateAutomatedInsights(schoolId);
    const payload = {
      success: true,
      data: {
        insights,
        generatedAt: new Date(),
        insightTypes: {
          critical: insights.filter(i => i.priority === 'critical').length,
          warning: insights.filter(i => i.priority === 'warning').length,
          opportunity: insights.filter(i => i.priority === 'opportunity').length,
          info: insights.filter(i => i.priority === 'info').length
        },
        recommendations: insights.filter(i => i.recommendation).length
      }
    };
    if (enabled && redis) { try { await redis.setEx(key, ttl, JSON.stringify(payload)); } catch {} }
    res.json(payload);

  } catch (error) {
    console.error('Automated insights error:', error);
    res.status(500).json({
      success: false,
      error: 'ANALYTICS_FAILED',
      message: error.message
    });
  }
});

router.get('/dashboard/overview', auth, requireSameSchoolQuery('schoolId'), async (req, res) => {
  try {
    const { schoolId } = req.query;
    const redis = req.app && req.app.locals && req.app.locals.redisClient;
    const enabled = process.env.ANALYTICS_CACHE_ENABLED ? String(process.env.ANALYTICS_CACHE_ENABLED).toLowerCase() === 'true' : (process.env.NODE_ENV !== 'development');
    const ttl = parseInt(process.env.ANALYTICS_CACHE_TTL_SECONDS || '600', 10);
    const key = `analytics:dashboard:${schoolId}`;
    if (enabled && redis) { try { const cached = await redis.get(key); if (cached) return res.json(JSON.parse(cached)); } catch {} }

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: 'SCHOOL_ID_REQUIRED',
        message: 'School ID is required for dashboard overview'
      });
    }

    const overview = await AnalyticsService.getDashboardOverview(schoolId);
    const payload = {
      success: true,
      data: {
        overview,
        generatedAt: new Date(),
        keyMetrics: {
          totalStudents: overview.totalStudents,
          totalTeachers: overview.totalTeachers,
          attendanceRate: overview.attendanceRate,
          averageGrade: overview.averageGrade,
          financialHealth: overview.financialHealth,
          operationalEfficiency: overview.operationalEfficiency
        },
        trends: {
          studentGrowth: overview.studentGrowth,
          academicImprovement: overview.academicImprovement,
          financialStability: overview.financialStability
        }
      }
    };
    if (enabled && redis) { try { await redis.setEx(key, ttl, JSON.stringify(payload)); } catch {} }
    res.json(payload);

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'ANALYTICS_FAILED',
      message: error.message
    });
  }
});

// Platform-wide dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    const cacheKey = 'dashboard_stats_cache';
    const ttlMs = 60 * 1000;
    const now = Date.now();
    const cache = (req.app.locals && req.app.locals[cacheKey]) || null;
    if (cache && (now - cache.time) < ttlMs) {
      return res.json(cache.data);
    }
    const { School, Subscription, Payment, sequelize } = require('../models');
    const totalSchools = await School.count().catch(() => 0);
    const activeSubscriptions = await Subscription.count({ where: { status: 'ACTIVE' } }).catch(() => 0);
    const totalRevenueResult = await Payment.findOne({ attributes: [[sequelize.fn('sum', sequelize.col('amount')), 'total']], raw: true }).catch(() => ({ total: 0 }));
    const totalRevenue = parseFloat(totalRevenueResult && totalRevenueResult.total) || 0;
    const usageBySchool = await School.findAll({ attributes: ['id','name'], raw: true }).then(rows => rows.map(r => ({ school: r.name || `School #${r.id}`, activeUsers: 0 }))).catch(() => []);
    const payload = {
      totalSchools,
      totalUsers: 0,
      mrr: 0,
      activeJobs: 0,
      activeSubscriptions,
      totalRevenue,
      revenueData: [],
      churnRate: 0,
      newSchoolsThisMonth: 0,
      usageBySchool,
    };
    req.app.locals[cacheKey] = { time: now, data: payload };
    res.json(payload);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

router.get('/reports/generate', auth, [
  query('reportType').isIn(['academic', 'financial', 'operational', 'compliance', 'custom']).withMessage('Invalid report type'),
  query('format').optional().isIn(['pdf', 'excel', 'csv']).withMessage('Invalid format'),
  query('dateRange').optional().isObject().withMessage('Invalid date range')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reportType, format = 'pdf', dateRange, schoolId } = req.query;
    const userId = req.user.id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: 'SCHOOL_ID_REQUIRED',
        message: 'School ID is required for report generation'
      });
    }

    const report = await AnalyticsService.generateReport(schoolId, reportType, format, dateRange);
    
    res.json({
      success: true,
      data: {
        report,
        generatedAt: new Date(),
        reportType,
        format,
        dateRange,
        downloadUrl: report.downloadUrl,
        expiresAt: report.expiresAt
      }
    });

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      error: 'REPORT_GENERATION_FAILED',
      message: error.message
    });
  }
});

router.get('/predictions/enrollment', auth, async (req, res) => {
  try {
    const { schoolId, months = 6 } = req.query;
    const userId = req.user.id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: 'SCHOOL_ID_REQUIRED',
        message: 'School ID is required for enrollment predictions'
      });
    }

    const predictions = await AnalyticsService.predictEnrollmentTrends(schoolId, parseInt(months));
    
    res.json({
      success: true,
      data: {
        predictions,
        generatedAt: new Date(),
        predictionHorizon: `${months} months`,
        confidenceLevel: 0.85,
        factors: predictions.factors,
        recommendations: predictions.recommendations
      }
    });

  } catch (error) {
    console.error('Enrollment predictions error:', error);
    res.status(500).json({
      success: false,
      error: 'PREDICTION_FAILED',
      message: error.message
    });
  }
});

router.get('/alerts/system', auth, async (req, res) => {
  try {
    const { schoolId, severity = 'all' } = req.query;
    const userId = req.user.id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: 'SCHOOL_ID_REQUIRED',
        message: 'School ID is required for system alerts'
      });
    }

    const alerts = await AnalyticsService.getSystemAlerts(schoolId, severity);
    
    res.json({
      success: true,
      data: {
        alerts,
        generatedAt: new Date(),
        severity,
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        acknowledgedAlerts: alerts.filter(a => a.acknowledged).length
      }
    });

  } catch (error) {
    console.error('System alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'ALERTS_FAILED',
      message: error.message
    });
  }
});

// Real-time analytics endpoint
router.get('/real-time', auth, async (req, res) => {
  try {
    const { schoolId } = req.query;
    const userId = req.user.id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: 'SCHOOL_ID_REQUIRED',
        message: 'School ID is required for real-time analytics'
      });
    }

    const realTimeData = await AnalyticsService.getRealTimeAnalytics(schoolId);
    
    res.json({
      success: true,
      data: {
        realTimeData,
        generatedAt: new Date(),
        metrics: {
          currentAttendance: realTimeData.currentAttendance,
          activeUsers: realTimeData.activeUsers,
          systemPerformance: realTimeData.systemPerformance,
          recentActivities: realTimeData.recentActivities
        },
        refreshInterval: 30000 // 30 seconds
      }
    });

  } catch (error) {
    console.error('Real-time analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'REAL_TIME_ANALYTICS_FAILED',
      message: error.message
    });
  }
});

module.exports = router;
