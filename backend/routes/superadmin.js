const express = require('express');
const router = express.Router();
const { School, Subscription, Invoice, Payment, Plan, User, BusOperator, SecurityPolicy, SubscriptionModule } = require('../models');
const { TrialRequest } = require('../models');
const clientMetrics = require('prom-client');
clientMetrics.collectDefaultMetrics({ prefix: 'schoolsaas_', timeout: 5000 });
const { sequelize } = require('../models');
const { verifyToken, requireRole, requirePermission } = require('../middleware/auth');
const { derivePermissionsForUser, normalizeDbRole } = require('../utils/permissionMatrix');
const bcrypt = require('bcryptjs');

// Import pagination utilities
const { paginationMiddleware, buildPaginationResponse } = require('../utils/pagination');

// Import middleware (if available)
let rateLimiters, cacheMiddlewares, invalidateMiddlewares;
try {
  rateLimiters = require('../middleware/rateLimiter').rateLimiters;
} catch (e) {
  console.warn('Rate limiter middleware not found, skipping');
  rateLimiters = { api: (req, res, next) => next() };
}

try {
  const cacheModule = require('../middleware/cache');
  cacheMiddlewares = cacheModule.cacheMiddlewares;
  invalidateMiddlewares = cacheModule.invalidateMiddlewares;
} catch (e) {
  console.warn('Cache middleware not found, skipping');
  cacheMiddlewares = { schools: (req, res, next) => next() };
  invalidateMiddlewares = { schools: (req, res, next) => next() };
}

// Helper functions for Redis/JSON
const getJSON = async (redis, key, defaultValue) => {
  if (!redis) return defaultValue;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch { return defaultValue; }
};

const setJSON = async (redis, key, value) => {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value));
  } catch { }
}

const mapSuperAdminRoleToDb = (role) => {
  const key = String(role || '').toUpperCase().replace(/[^A-Z]/g, '');
  const m = {
    SUPERADMIN: 'SuperAdmin',
    SUPER_ADMIN: 'SuperAdmin',
    SUPERADMINFINANCIAL: 'SuperAdminFinancial',
    SUPER_ADMIN_FINANCIAL: 'SuperAdminFinancial',
    SUPERADMINTECHNICAL: 'SuperAdminTechnical',
    SUPER_ADMIN_TECHNICAL: 'SuperAdminTechnical',
    SUPERADMINSUPERVISOR: 'SuperAdminSupervisor',
    SUPER_ADMIN_SUPERVISOR: 'SuperAdminSupervisor',
  };
  return m[key] || null;
};

const mapSuperAdminRoleToApi = (role) => {
  const key = String(role || '').toUpperCase().replace(/[^A-Z]/g, '');
  const m = {
    SUPERADMIN: 'SUPER_ADMIN',
    SUPERADMINFINANCIAL: 'SUPER_ADMIN_FINANCIAL',
    SUPERADMINTECHNICAL: 'SUPER_ADMIN_TECHNICAL',
    SUPERADMINSUPERVISOR: 'SUPER_ADMIN_SUPERVISOR',
  };
  return m[key] || 'SUPER_ADMIN';
};

const isStrongPassword = (pwd) => {
  const lengthOk = typeof pwd === 'string' && pwd.length >= 10;
  const upper = /[A-Z]/.test(pwd);
  const lower = /[a-z]/.test(pwd);
  const digit = /[0-9]/.test(pwd);
  const special = /[^A-Za-z0-9]/.test(pwd);
  return lengthOk && upper && lower && digit && special;
}

// @route   GET api/superadmin/stats
// @desc    Get dashboard stats for SuperAdmin
// @access  Private (SuperAdmin)
// @route   GET api/superadmin/stats
// @desc    Get dashboard stats for SuperAdmin
// @access  Private (SuperAdmin)
router.get('/stats', verifyToken, requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'), requirePermission('VIEW_DASHBOARD'), async (req, res) => {
  try {
    const { School, Student, Subscription, Payment } = require('../models');

    // Execute counts in parallel for performance
    const [totalSchools, totalStudents, activeSubscriptions, revenueResult] = await Promise.all([
      School.count(),
      Student.count(),
      Subscription.count({ where: { status: 'ACTIVE' } }),
      Payment.sum('amount')
    ]);

    const totalRevenue = revenueResult || 0;

    res.json({
      totalSchools,
      totalStudents,
      totalRevenue,
      activeSubscriptions
    });
  } catch (err) {
    console.error('Stats Error:', err);
    res.status(500).json({ totalSchools: 0, totalStudents: 0, totalRevenue: 0, activeSubscriptions: 0 });
  }
});

// @route   GET api/superadmin/action-items
// @desc    Get pending action items for SuperAdmin Dashboard
// @access  Private (SuperAdmin)
router.get('/action-items', verifyToken, requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'), requirePermission('VIEW_DASHBOARD'), async (req, res) => {
  try {
    const { TrialRequest, ContactMessage, Invoice } = require('../models');
    const { Op } = require('sequelize');

    // Execute queries in parallel
    const [trialRequests, contactMessages, pendingInvoices, failedLogins] = await Promise.all([
      TrialRequest ? TrialRequest.count({ where: { status: 'PENDING' } }) : 0,
      ContactMessage ? ContactMessage.count({ where: { status: 'NEW' } }) : 0,
      Invoice ? Invoice.count({ where: { status: { [Op.in]: ['UNPAID', 'OVERDUE'] } } }) : 0,
      require('../models').AuditLog ? require('../models').AuditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }) : 0
    ]);

    res.json({
      trialRequests,
      tickets: contactMessages,
      pendingInvoices,
      securityAlerts: failedLogins
    });
  } catch (err) {
    console.error('Action Items Error:', err.message);
    res.json({ trialRequests: 0, tickets: 0, pendingInvoices: 0, securityAlerts: 0 });
  }
});

// @route   GET api/superadmin/audit-logs
// @desc    Get audit logs with filtering
// @access  Private (SuperAdmin)
router.get('/audit-logs', verifyToken, requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'), async (req, res) => {
  try {
    const { AuditLog, User } = require('../models');
    const { startDate, endDate, action, userId } = req.query;
    const { Op } = require('sequelize');

    if (!AuditLog) {
      // Fallback if table doesn't exist yet
      return res.json([]);
    }

    // Auto-heal
    if (!AuditLog) return res.json([]);
    try { await AuditLog.sync(); } catch { }

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const sd = new Date(String(startDate));
        if (!Number.isNaN(sd.getTime())) where.createdAt[Op.gte] = sd;
      }
      if (endDate) {
        const ed = new Date(String(endDate));
        if (!Number.isNaN(ed.getTime())) where.createdAt[Op.lte] = new Date(ed.setHours(23, 59, 59, 999));
      }
    }
    if (action) {
      const dialect = AuditLog.sequelize?.getDialect?.() || 'sqlite';
      const op = dialect === 'postgres' ? Op.iLike : Op.like;
      where.action = { [op]: `%${action}%` };
    }
    if (userId !== undefined && userId !== null && String(userId).trim() !== '') {
      const n = Number(userId);
      where.userId = Number.isFinite(n) ? n : userId;
    }

    let logs = [];
    try {
      logs = await AuditLog.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: 500
      });
    } catch (dbError) {
      console.warn('Audit Logs DB Error:', dbError?.message || dbError);
      return res.json([]);
    }

    const userIds = Array.from(new Set(logs.map(l => l.userId).filter(v => v !== null && v !== undefined)));
    const users = userIds.length
      ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'email'], raw: true }).catch(() => [])
      : [];
  const emailByUserId = new Map(users.map(u => [Number(u.id), u.email]));

  const formatted = logs.map(log => {
    const row = log.toJSON();
    const details = row.metadata ?? (row.oldValue || row.newValue ? { oldValue: row.oldValue, newValue: row.newValue } : null);
    return {
      ...row,
      timestamp: row.createdAt || row.timestamp || null,
      userEmail: emailByUserId.get(Number(row.userId)) || null,
      riskLevel: row.riskLevel || 'low',
      details
    };
  });

    res.json(formatted);
  } catch (err) {
    console.error('Audit Logs Error:', err);
    res.json([]);
  }
});

// @route   GET api/superadmin/revenue
// @desc    Get revenue summary for SuperAdmin (monthly series for current year)
// @access  Private (SuperAdmin)
router.get('/revenue', verifyToken, requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'), requirePermission('VIEW_FINANCE'), async (req, res) => {
  try {
    const { Payment } = require('../models');
    const { Op } = require('sequelize');

    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59);

    // Let's use JS aggregation to be safe across dialects for this specific requirement
    const payments = await Payment.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['amount', 'date']
    });

    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    // Initialize map
    const revenueMap = new Array(12).fill(0);

    for (const p of payments) {
      const d = new Date(p.date);
      const m = d.getMonth(); // 0-11
      if (m >= 0 && m < 12) {
        revenueMap[m] += Number(p.amount || 0);
      }
    }

    const revenueData = months.map((name, index) => ({
      month: name,
      revenue: revenueMap[index]
    }));

    res.json(revenueData);
  } catch (err) {
    console.error('Revenue Error:', err);
    res.json([]);
  }
});

// @route   GET api/superadmin/subscriptions
// @desc    List subscriptions with status
// @access  Private (SuperAdmin)
router.get('/subscriptions', verifyToken, requireRole('SUPER_ADMIN'), requirePermission('VIEW_FINANCE'), async (req, res) => {
  try {
    const subs = await Subscription.findAll({
      include: [
        { model: School, attributes: ['name'] },
        { model: Plan, attributes: ['name', 'price', 'limits'] },
        { model: SubscriptionModule }
      ],
      order: [['id', 'ASC']]
    });
    const formatted = subs.map(sub => ({
      id: String(sub.id),
      schoolId: sub.schoolId,
      schoolName: sub.School && sub.School.name,
      plan: sub.Plan && sub.Plan.name,
      planId: sub.planId,
      status: sub.status,
      startDate: sub.startDate ? sub.startDate.toISOString().split('T')[0] : null,
      renewalDate: sub.renewalDate ? sub.renewalDate.toISOString().split('T')[0] : null,
      amount: sub.Plan ? parseFloat(sub.Plan.price) : 0,
      customLimits: sub.customLimits,
      planLimits: sub.Plan ? sub.Plan.limits : {},
      modules: sub.SubscriptionModules ? sub.SubscriptionModules.map(m => ({
        id: m.moduleId,
        price: m.priceSnapshot,
        active: m.active,
        activationDate: m.activationDate
      })) : []
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/superadmin/subscriptions/:id
// @desc    Update subscription details (Plan, Status, Limits, Modules)
// @access  Private (SuperAdmin)
router.put('/subscriptions/:id', verifyToken, requireRole('SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { planId, status, renewalDate, customLimits, modules } = req.body;

    const sub = await Subscription.findByPk(id);
    if (!sub) {
      await t.rollback();
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Update basic fields
    if (planId) sub.planId = planId;
    if (status) sub.status = status;
    if (renewalDate) sub.renewalDate = renewalDate;
    if (customLimits) sub.customLimits = customLimits;

    await sub.save({ transaction: t });

    // Update Modules
    if (modules && Array.isArray(modules)) {
      // modules is array of { moduleId, price, active }
      // First, get existing modules
      const existingModules = await SubscriptionModule.findAll({ where: { subscriptionId: id }, transaction: t });
      const existingIds = existingModules.map(m => m.moduleId);
      const newIds = modules.map(m => m.moduleId);

      // Delete removed modules (or just deactivate? Deleting for now to keep it clean as per request "integrated")
      // Actually, let's update/create.
      for (const m of modules) {
        const existing = existingModules.find(em => em.moduleId === m.moduleId);
        if (existing) {
          existing.active = m.active !== undefined ? m.active : existing.active;
          existing.priceSnapshot = m.price !== undefined ? m.price : existing.priceSnapshot;
          await existing.save({ transaction: t });
        } else {
          await SubscriptionModule.create({
            subscriptionId: id,
            moduleId: m.moduleId,
            priceSnapshot: m.price || 0,
            active: m.active !== undefined ? m.active : true
          }, { transaction: t });
        }
      }

      // Handle removals if needed. For now, we assume the UI sends the full list of *active* or *purchased* modules.
      // If a module is not in the list, should we remove it?
      // Let's assume the list contains ALL modules that should be associated.
      const toRemove = existingModules.filter(em => !newIds.includes(em.moduleId));
      for (const rm of toRemove) {
        await rm.destroy({ transaction: t });
      }
    }

    await t.commit();

    try {
      const { AuditLog } = require('../models');
      await AuditLog.create({
        action: 'SUBSCRIPTION_UPDATE',
        userId: req.user?.id || null,
        userEmail: req.user?.email || null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: JSON.stringify({ subscriptionId: id, changes: { planId, status, renewalDate, customLimits, modules } }),
        riskLevel: 'medium'
      });
    } catch (e) { }

    // Return updated data
    const updatedSub = await Subscription.findByPk(id, {
      include: [
        { model: School, attributes: ['name'] },
        { model: Plan, attributes: ['name', 'price', 'limits'] },
        { model: SubscriptionModule }
      ]
    });

    res.json({
      success: true,
      subscription: {
        id: String(updatedSub.id),
        status: updatedSub.status,
        customLimits: updatedSub.customLimits,
        modules: updatedSub.SubscriptionModules
      }
    });

  } catch (err) {
    await t.rollback();
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Security policies (central)
router.get('/security/policies', verifyToken, requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'), requirePermission('VIEW_SETTINGS'), async (req, res) => {
  try {
    const defaults = { enforceMfaForAdmins: true, passwordMinLength: 0, lockoutThreshold: 3, allowedIpRanges: [], sessionMaxAgeHours: 24 };
    let dbPolicy = null;

    try {
      const { SecurityPolicy } = require('../models');
      if (SecurityPolicy) {
        // Auto-heal: Ensure table exists
        try { await SecurityPolicy.sync(); } catch (e) { console.warn('SecurityPolicy sync failed:', e.message); }

        dbPolicy = await SecurityPolicy.findOne();
        if (!dbPolicy) {
          try {
            dbPolicy = await SecurityPolicy.create({ ...defaults, allowedIpRanges: JSON.stringify(defaults.allowedIpRanges) });
          } catch (createErr) {
            console.warn('Could not create default security policy:', createErr.message);
          }
        }
      }
    } catch (e) { console.warn('SecurityPolicy model issue:', e.message); }

    const cfg = dbPolicy ? {
      enforceMfaForAdmins: !!dbPolicy.enforceMfaForAdmins,
      passwordMinLength: Number(dbPolicy.passwordMinLength || 0),
      lockoutThreshold: Number(dbPolicy.lockoutThreshold || 3),
      allowedIpRanges: (() => { try { return JSON.parse(dbPolicy.allowedIpRanges || '[]'); } catch { return []; } })(),
      sessionMaxAgeHours: Number(dbPolicy.sessionMaxAgeHours || 24),
    } : defaults;

    if (req.app.locals.redisClient) {
      await setJSON(req.app.locals.redisClient, 'security:policies', cfg);
    }
    res.json(cfg);
  } catch (err) { console.error('Security Policies Error:', err); res.status(500).send('Server Error'); }
});

router.put('/security/policies', verifyToken, requireRole('SUPER_ADMIN'), requirePermission('MANAGE_SETTINGS'), async (req, res) => {
  try {
    const payload = req.body || {};
    let dbPolicy = await SecurityPolicy.findOne();
    const prev = dbPolicy ? {
      enforceMfaForAdmins: !!dbPolicy.enforceMfaForAdmins,
      passwordMinLength: Number(dbPolicy.passwordMinLength || 0),
      lockoutThreshold: Number(dbPolicy.lockoutThreshold || 3),
      allowedIpRanges: (() => { try { return JSON.parse(dbPolicy.allowedIpRanges || '[]'); } catch { return []; } })(),
      sessionMaxAgeHours: Number(dbPolicy.sessionMaxAgeHours || 24),
    } : { enforceMfaForAdmins: true, passwordMinLength: 0, lockoutThreshold: 3, allowedIpRanges: [], sessionMaxAgeHours: 24 };
    const merged = {
      enforceMfaForAdmins: typeof payload.enforceMfaForAdmins === 'boolean' ? payload.enforceMfaForAdmins : (prev.enforceMfaForAdmins ?? true),
      passwordMinLength: Number(payload.passwordMinLength ?? (prev.passwordMinLength ?? 0)) || 0,
      lockoutThreshold: Number(payload.lockoutThreshold ?? (prev.lockoutThreshold ?? 3)) || 3,
      allowedIpRanges: Array.isArray(payload.allowedIpRanges) ? payload.allowedIpRanges : (prev.allowedIpRanges ?? []),
      sessionMaxAgeHours: Number(payload.sessionMaxAgeHours ?? (prev.sessionMaxAgeHours ?? 24)) || 24,
    };
    if (!dbPolicy) {
      dbPolicy = await SecurityPolicy.create({
        enforceMfaForAdmins: merged.enforceMfaForAdmins,
        passwordMinLength: merged.passwordMinLength,
        lockoutThreshold: merged.lockoutThreshold,
        allowedIpRanges: JSON.stringify(merged.allowedIpRanges),
        sessionMaxAgeHours: merged.sessionMaxAgeHours,
      });
    } else {
      await dbPolicy.update({
        enforceMfaForAdmins: merged.enforceMfaForAdmins,
        passwordMinLength: merged.passwordMinLength,
        lockoutThreshold: merged.lockoutThreshold,
        allowedIpRanges: JSON.stringify(merged.allowedIpRanges),
        sessionMaxAgeHours: merged.sessionMaxAgeHours,
      });
    }
    req.app.locals.securityPolicies = merged;
    await setJSON(req.app.locals.redisClient, 'security:policies', merged);
    res.json(merged);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// API keys management (in-memory for now)
router.get('/api-keys', verifyToken, requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'), requirePermission('VIEW_SETTINGS'), async (req, res) => {
  try {
    const { ApiKey } = require('../models');
    if (!ApiKey) return res.json([]);

    try {
      const list = await ApiKey.findAll({ order: [['createdAt', 'DESC']], raw: true });
      res.json(list.map(k => ({ id: k.id, provider: k.provider, createdAt: String(k.createdAt), mask: k.mask || '******' })));
    } catch (dbError) {
      console.warn('Error fetching API keys (table might be missing):', dbError.message);
      res.json([]);
    }
  } catch (err) { console.error('API Keys Error:', err); res.status(500).send('Server Error'); }
});

router.post('/api-keys', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { ApiKey } = require('../models');
    const { provider, key } = req.body || {};
    if (!provider || !key) return res.status(400).json({ message: 'Invalid payload' });
    const crypto = require('crypto');
    const id = provider + '_' + Date.now().toString(36);
    const digest = crypto.createHash('sha256').update(String(key)).digest('hex');
    const masked = key.length <= 6 ? '******' : (key.slice(0, 3) + '****' + key.slice(-3));
    await ApiKey.create({ id, provider, hash: digest, mask: masked });
    res.json({ id });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.delete('/api-keys/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { ApiKey } = require('../models');
    const id = req.params.id;
    await ApiKey.destroy({ where: { id } });
    res.json({ success: true });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// SSO config (in-memory for now)
router.get('/security/sso', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const defaults = { enabled: false, providers: [], callbackUrl: '' };
    const cfg = await getJSON(req.app.locals.redisClient, 'security:sso', (req.app.locals && req.app.locals.ssoConfig) || defaults);
    res.json(cfg);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.put('/security/sso', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const payload = req.body || {};
    const prev = await getJSON(req.app.locals.redisClient, 'security:sso', (req.app.locals && req.app.locals.ssoConfig) || { enabled: false, providers: [], callbackUrl: '' });
    const merged = {
      enabled: typeof payload.enabled === 'boolean' ? payload.enabled : (prev.enabled ?? false),
      callbackUrl: String(payload.callbackUrl ?? (prev.callbackUrl || '')),
      providers: Array.isArray(payload.providers) ? payload.providers.map(p => ({ id: String(p.id || p.name || 'prov_' + Date.now().toString(36)), name: String(p.name || ''), clientId: p.clientId || undefined, clientSecretSet: !!p.clientSecret })) : (prev.providers || []),
    };
    req.app.locals.ssoConfig = merged;
    await setJSON(req.app.locals.redisClient, 'security:sso', merged);
    res.json(merged);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// Jobs center
router.get('/jobs', verifyToken, requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'), async (req, res) => {
  try {
    const { Job } = require('../models');
    if (!Job) return res.json([]);

    try {
      const rows = await Job.findAll({ order: [['createdAt', 'DESC']], raw: true });
      res.json(rows.map(r => ({ id: r.id, name: r.name, status: r.status, schoolId: r.schoolId, createdAt: String(r.createdAt), updatedAt: r.updatedAt ? String(r.updatedAt) : undefined })));
    } catch (dbError) {
      console.warn('Error fetching jobs (table might be missing):', dbError.message);
      res.json([]);
    }
  } catch (err) { console.error('Jobs Error:', err); res.status(500).send('Server Error'); }
});

router.get('/jobs/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const id = String(req.params.id || '');
    const r = await require('../models').Job.findByPk(id);
    if (!r) return res.status(404).json({ message: 'Job not found' });
    res.json({ id: r.id, name: r.name, status: r.status, schoolId: r.schoolId, createdAt: String(r.createdAt), updatedAt: r.updatedAt ? String(r.updatedAt) : undefined });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// Download job output (CSV or ZIP)
router.get('/jobs/:id/download', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const id = String(req.params.id || '');
    const r = await require('../models').Job.findByPk(id);
    if (!r || r.status !== 'completed') return res.status(404).json({ message: 'No downloadable content' });
    const redis = req.app.locals.redisClient;
    if (!redis) return res.status(404).json({ message: 'No downloadable content' });
    const csv = await redis.get(`job:${id}:csv`).catch(() => null);
    const zipB64 = await redis.get(`job:${id}:zip`).catch(() => null);
    if (csv) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="report_${id}.csv"`);
      return res.send(csv);
    }
    if (zipB64) {
      const buf = Buffer.from(zipB64, 'base64');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="backup_${id}.zip"`);
      return res.send(buf);
    }
    return res.status(404).json({ message: 'No downloadable content' });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/jobs/trigger', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { schoolIds = [], jobType = 'report_generate', params = {} } = req.body || {};
    if (!Array.isArray(schoolIds) || schoolIds.length === 0) return res.status(400).json({ message: 'schoolIds required' });
    const enqueue = req.app.locals.enqueueJob;
    const ids = schoolIds.map(sid => enqueue(jobType, { schoolId: sid, params }, async (payload) => {
      if (jobType === 'report_generate') {
        const rows = await Subscription.findAll({ include: [{ model: School, attributes: ['name'] }, { model: Plan, attributes: ['name', 'price'] }], where: { schoolId: sid }, order: [['id', 'ASC']] });
        const header = ['SubscriptionId', 'School', 'Plan', 'Status', 'Price'].join(',');
        const body = rows.map(r => [r.id, r.School && r.School.name, r.Plan && r.Plan.name, r.status, r.Plan ? r.Plan.price : 0].join(',')).join('\n');
        const csv = header + '\n' + body;
        return { ok: true, jobType, schoolId: payload.schoolId, csv };
      }
      if (jobType === 'payments_report') {
        const { from, to } = payload.params || {};
        const sql = `SELECT p.id, p.amount, p."paymentDate" as paymentDate, p."paymentMethod" as paymentMethod, p."transactionId" as transactionId
                     FROM "Payments" p
                     JOIN "Invoices" i ON i.id = p."invoiceId"
                     JOIN "Students" st ON st.id = i."studentId"
                     JOIN "Schools" sc ON sc.id = st."schoolId"
                     WHERE sc.id = :sid AND (:from IS NULL OR p."paymentDate" >= :from) AND (:to IS NULL OR p."paymentDate" <= :to)
                     ORDER BY p."paymentDate" ASC`;
        const rows = await sequelize.query(sql, { replacements: { sid, from: from ? new Date(from) : null, to: to ? new Date(to) : null }, type: sequelize.QueryTypes.SELECT });
        const header = ['PaymentId', 'Amount', 'Date', 'Method', 'TransactionId'].join(',');
        const body = (rows || []).map(r => [r.id, r.amount, new Date(r.paymentDate).toISOString(), r.paymentMethod || '', r.transactionId || ''].join(',')).join('\n');
        const csv = header + '\n' + body;
        return { ok: true, jobType, schoolId: payload.schoolId, csv };
      }
      if (jobType === 'invoices_report') {
        const { from, to } = payload.params || {};
        const sql = `SELECT i.id, i."createdAt" as createdAt, i."status" as status, COALESCE(i.amount, 0) as amount
                     FROM "Invoices" i
                     JOIN "Students" st ON st.id = i."studentId"
                     JOIN "Schools" sc ON sc.id = st."schoolId"
                     WHERE sc.id = :sid AND (:from IS NULL OR i."createdAt" >= :from) AND (:to IS NULL OR i."createdAt" <= :to)
                     ORDER BY i."createdAt" ASC`;
        const rows = await sequelize.query(sql, { replacements: { sid, from: from ? new Date(from) : null, to: to ? new Date(to) : null }, type: sequelize.QueryTypes.SELECT });
        const header = ['InvoiceId', 'Amount', 'Status', 'CreatedAt'].join(',');
        const body = (rows || []).map(r => [r.id, r.amount, r.status, new Date(r.createdAt).toISOString()].join(',')).join('\n');
        const csv = header + '\n' + body;
        return { ok: true, jobType, schoolId: payload.schoolId, csv };
      }
      if (jobType === 'backup_store') {
        const archiver = require('archiver');
        const { PassThrough } = require('stream');
        const out = new PassThrough();
        const chunks = [];
        out.on('data', (d) => chunks.push(d));
        const zipDone = new Promise((resolve, reject) => {
          out.on('end', () => resolve(Buffer.concat(chunks)));
          out.on('error', reject);
        });
        const zip = archiver('zip', { zlib: { level: 9 } });
        zip.pipe(out);
        const school = await School.findByPk(sid, { attributes: ['id', 'name'], raw: true }).catch(() => null);
        const subs = await Subscription.findAll({ include: [{ model: Plan, attributes: ['name', 'price'] }], where: { schoolId: sid }, raw: true }).catch(() => []);
        zip.append(JSON.stringify({ school, subscriptions: subs }, null, 2), { name: 'data.json' });
        const header = ['SubscriptionId', 'Plan', 'Status', 'Price'].join(',');
        const body = (subs || []).map(r => [r.id, r['Plan.name'], r.status, r['Plan.price'] || 0].join(',')).join('\n');
        zip.append(header + '\n' + body, { name: 'subscriptions.csv' });
        await zip.finalize();
        const buffer = await zipDone;
        return { ok: true, jobType, schoolId: payload.schoolId, zip: buffer };
      }
      await new Promise(r => setTimeout(r, 500));
      return { ok: true, jobType, schoolId: payload.schoolId };
    }));
    res.json({ jobs: ids.length, message: 'Jobs enqueued' });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// Bulk update modules
router.post('/bulk/modules', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { schoolIds, moduleId } = req.body;
    if (!Array.isArray(schoolIds) || !moduleId) return res.status(400).json({ message: 'Invalid payload' });
    return res.json({ updated: 0, message: 'Module controls deprecated: activeModules no longer used' });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// Bulk update usage limits
router.put('/bulk/usage-limits', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { schoolIds, limits } = req.body; // limits: { students: 1000, ... }
    if (!Array.isArray(schoolIds) || !limits) return res.status(400).json({ message: 'Invalid payload' });

    const { SchoolSettings } = require('../models');
    // Update customLimits json
    const settingsList = await SchoolSettings.findAll({ where: { schoolId: schoolIds } });
    let updatedCount = 0;

    for (const settings of settingsList) {
      const prev = settings.customLimits || {};
      settings.customLimits = { ...prev, ...limits };
      await settings.save();
      updatedCount++;
    }
    res.json({ updated: updatedCount });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// Bulk backup schedule
router.put('/bulk/backup-schedule', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { schoolIds, schedule } = req.body;
    if (!Array.isArray(schoolIds) || !schedule) return res.status(400).json({ message: 'Invalid payload' });

    const { SchoolSettings } = require('../models');
    const [count] = await SchoolSettings.update({ backupSchedule: schedule }, { where: { schoolId: schoolIds } });
    try {
      const settingsList = await SchoolSettings.findAll({ where: { schoolId: schoolIds } });
      for (const s of settingsList) {
        const prev = s.backupConfig || {};
        const timeStr = String(schedule.time || '02:00');
        const merged = {
          ...prev,
          enabledDaily: !!schedule.daily,
          dailyTime: timeStr,
          enabledMonthly: !!schedule.monthly,
          monthlyDay: Math.max(1, Math.min(Number(schedule.monthlyDay || 1), 31)),
          monthlyTime: timeStr,
          types: Array.isArray(prev.types) ? prev.types : ['students', 'classes', 'subjects', 'classSubjectTeachers', 'grades', 'attendance', 'schedule', 'fees', 'teachers', 'parents'],
          retainDays: Number(prev.retainDays || 30)
        };
        s.backupConfig = merged;
        await s.save();
      }
    } catch { }
    const redis = req.app?.locals?.redisClient || null;
    if (redis) {
      const time = String(schedule.time || '02:00');
      const parts = time.split(':');
      const hh = String(parts[0] || '02').padStart(2, '0');
      const mm = String(parts[1] || '00').padStart(2, '0');
      let expr = `${mm} ${hh} * * *`;
      if (!schedule.daily && schedule.monthly) {
        const day = Math.max(1, Math.min(Number(schedule.monthlyDay || 1), 31));
        expr = `${mm} ${hh} ${day} * *`;
      }
      for (const sid of schoolIds) {
        try {
          await redis.sAdd('backup:schedule:set', String(sid));
          await redis.set(`backup:schedule:${sid}`, expr);
        } catch { }
      }
      try { const fn = req.app?.locals?.reloadBackupSchedules; if (typeof fn === 'function') await fn(); } catch { }
    }
    res.json({ scheduled: count });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});
router.post('/schedule/backups/reload', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const fn = req.app?.locals?.reloadBackupSchedules;
    if (typeof fn !== 'function') {
      return res.status(404).json({ reloaded: false, message: 'Reload handler not available' });
    }
    await fn();
    return res.json({ reloaded: true });
  } catch (err) {
    console.error(err?.message || err);
    res.status(500).json({ reloaded: false, message: 'Server Error' });
  }
});

// @route   GET api/superadmin/onboarding/requests
// @desc    Get list of onboarding/trial requests
// @access  Private (SuperAdmin)
router.get('/onboarding/requests', verifyToken, requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'), async (req, res) => {
  try {
    const { TrialRequest } = require('../models');
    if (!TrialRequest) return res.json([]);

    // Auto-create table if it doesn't exist (simple self-healing)
    try { await TrialRequest.sync(); } catch { }

    const requests = await TrialRequest.findAll({ order: [['createdAt', 'DESC']] });
    res.json(requests);
  } catch (err) {
    console.error('Onboarding Requests Error:', err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/onboarding/requests/:id/approve', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { TrialRequest, School, User, SchoolSettings, Subscription, Plan } = require('../models');
    const { id } = req.params;
    const reqData = await TrialRequest.findByPk(id);
    
    if (!reqData) {
      await t.rollback();
      return res.status(404).json({ message: 'Request not found' });
    }
    if (reqData.status !== 'NEW') {
      await t.rollback();
      return res.status(400).json({ message: 'Request already processed' });
    }

    // 1. Create School
    const school = await School.create({
      name: reqData.schoolName,
      address: '',
      phone: reqData.phone,
      email: reqData.adminEmail,
      studentCount: 0,
      teacherCount: 0,
      balance: 0,
      operationalStatus: 'ACTIVE'
    }, { transaction: t });

    // 2. Create Settings
    await SchoolSettings.create({
      schoolId: school.id,
      schoolName: reqData.schoolName,
      academicYearStart: new Date(),
      academicYearEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      notifications: { email: true, sms: false, push: true },
      contactEmail: reqData.adminEmail,
      contactPhone: reqData.phone
    }, { transaction: t });

    // 3. Create Admin User
    const randomPass = Math.random().toString(36).slice(-8) + 'Aa1@';
    const hashed = await bcrypt.hash(randomPass, 10);
    const user = await User.create({
      name: reqData.adminName,
      email: reqData.adminEmail,
      username: reqData.adminEmail.split('@')[0] + '_' + Math.floor(Math.random()*1000),
      password: hashed,
      role: 'Admin',
      schoolId: school.id,
      isActive: true,
      tokenVersion: 0
    }, { transaction: t });

    // 4. Create Subscription (Default to Basic/Trial)
    const defaultPlan = await Plan.findOne({ order: [['price', 'ASC']] }) || await Plan.create({ name: 'Basic', price: 0, pricePeriod: 'Month', limits: { students: 50, teachers: 5 } }, { transaction: t });
    
    await Subscription.create({
      schoolId: school.id,
      planId: defaultPlan.id,
      status: 'ACTIVE',
      startDate: new Date(),
      renewalDate: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days trial
      customLimits: {}
    }, { transaction: t });

    // 5. Update Request
    reqData.status = 'APPROVED';
    await reqData.save({ transaction: t });

    await t.commit();

    // In a real app, send email with randomPass. Here we return it for demo.
    res.json({ success: true, schoolId: school.id, tempPassword: randomPass });

  } catch (err) {
    await t.rollback();
    console.error('Approve Request Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/onboarding/requests/:id/reject', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { TrialRequest } = require('../models');
    const { id } = req.params;
    const reqData = await TrialRequest.findByPk(id);
    
    if (!reqData) return res.status(404).json({ message: 'Request not found' });
    
    reqData.status = 'REJECTED';
    await reqData.save();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Reject Request Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET api/superadmin/team
// @desc    Get list of super admin team members
// @access  Private (SuperAdmin)
router.get('/team', verifyToken, requireRole('SUPER_ADMIN'), requirePermission('VIEW_STAFF'), async (req, res) => {
  try {
    const { User } = require('../models');
    const { Op } = require('sequelize');
    const team = await User.findAll({
      where: {
        role: {
          [Op.in]: ['SuperAdmin', 'SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor']
        }
      },
      attributes: ['id', 'name', 'email', 'username', 'role', 'lastLoginAt', 'isActive', 'createdAt', 'permissions']
    });
    res.json((Array.isArray(team) ? team : []).map(u => {
      const j = u.toJSON ? u.toJSON() : u;
      return {
        id: String(j.id),
        name: j.name,
        email: j.email,
        username: j.username || j.email,
        role: mapSuperAdminRoleToApi(j.role),
        isActive: j.isActive !== false,
        lastLoginAt: j.lastLoginAt || null,
        createdAt: j.createdAt || null,
        permissions: Array.isArray(j.permissions) ? j.permissions : []
      };
    }));
  } catch (err) {
    console.error('Team Error:', err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/team', verifyToken, requireRole('SUPER_ADMIN'), requirePermission('MANAGE_STAFF'), async (req, res) => {
  try {
    const { name, email, username, password, role, permissions } = req.body || {};
    if (!name || !email || !username || !password || !role) {
      return res.status(400).json({ msg: 'Invalid payload' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ msg: 'Weak password' });
    }
    const dbRole = mapSuperAdminRoleToDb(role);
    if (!dbRole || dbRole === 'SuperAdmin') {
      return res.status(400).json({ msg: 'Invalid role' });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const usernameNorm = String(username).trim();
    const dupeEmail = await User.findOne({ where: { email: emailNorm } });
    if (dupeEmail) return res.status(409).json({ msg: 'Email already in use' });
    const dupeUsername = await User.findOne({ where: { username: usernameNorm } });
    if (dupeUsername) return res.status(409).json({ msg: 'Username already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const created = await User.create({
      name: String(name).trim(),
      email: emailNorm,
      username: usernameNorm,
      password: hashed,
      role: dbRole,
      schoolId: null,
      teacherId: null,
      parentId: null,
      schoolRole: null,
      isActive: true,
      permissions: Array.isArray(permissions) ? permissions.filter(Boolean).map(p => String(p)) : [],
      tokenVersion: 0
    });

    const j = created.toJSON();
    delete j.password;
    return res.status(201).json({
      id: String(j.id),
      name: j.name,
      email: j.email,
      username: j.username || j.email,
      role: mapSuperAdminRoleToApi(j.role),
      isActive: j.isActive !== false,
      lastLoginAt: j.lastLoginAt || null,
      createdAt: j.createdAt || null,
      permissions: Array.isArray(j.permissions) ? j.permissions : []
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

// @route   GET api/superadmin/pricing-config
// @desc    Get global pricing configuration
// @access  Private (SuperAdmin)
router.get('/pricing-config', verifyToken, requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL'), requirePermission('VIEW_FINANCE'), async (req, res) => {
  try {
    const { PricingConfig } = require('../models');
    // Auto-heal
    try { await PricingConfig.sync(); } catch { }

    let config = await PricingConfig.findOne({ where: { id: 'default' } });
    if (!config) {
      config = await PricingConfig.create({
        id: 'default',
        pricePerStudent: 1.5,
        pricePerTeacher: 2.0,
        pricePerGBStorage: 0.2,
        pricePerInvoice: 0.05,
        currency: 'USD',
        yearlyDiscountPercent: 0
      });
    }
    res.json(config);
  } catch (err) {
    console.error('Pricing Config Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/superadmin/pricing-config
// @desc    Update global pricing configuration
// @access  Private (SuperAdmin)
router.put('/pricing-config', verifyToken, requireRole('SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), async (req, res) => {
  try {
    const { PricingConfig, AuditLog } = require('../models');
    let config = await PricingConfig.findOne({ where: { id: 'default' } });
    if (!config) {
      config = await PricingConfig.create({ id: 'default' });
    }

    const { pricePerStudent, pricePerTeacher, pricePerGBStorage, pricePerInvoice, currency, yearlyDiscountPercent } = req.body;

    if (pricePerStudent !== undefined) config.pricePerStudent = Number(pricePerStudent);
    if (pricePerTeacher !== undefined) config.pricePerTeacher = Number(pricePerTeacher);
    if (pricePerGBStorage !== undefined) config.pricePerGBStorage = Number(pricePerGBStorage);
    if (pricePerInvoice !== undefined) config.pricePerInvoice = Number(pricePerInvoice);
    if (currency !== undefined) config.currency = String(currency);
    if (yearlyDiscountPercent !== undefined) config.yearlyDiscountPercent = Number(yearlyDiscountPercent);

    await config.save();

    try {
      await AuditLog.create({
        action: 'PRICING_CONFIG_UPDATE',
        userId: req.user?.id || null,
        userEmail: req.user?.email || null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: JSON.stringify(req.body),
        riskLevel: 'high'
      });
    } catch (e) { }

    res.json(config);
  } catch (err) {
    console.error('Pricing Config Update Error:', err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/team/:id', verifyToken, requireRole('SUPER_ADMIN'), requirePermission('MANAGE_STAFF'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ msg: 'Invalid id' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (String(user.role) === 'SuperAdmin') return res.status(400).json({ msg: 'Cannot edit SuperAdmin account' });

    const { name, email, username, password, role, permissions, isActive } = req.body || {};

    if (name !== undefined) user.name = String(name).trim();
    if (email !== undefined) {
      const emailNorm = String(email).trim().toLowerCase();
      const dupeEmail = await User.findOne({ where: { email: emailNorm } });
      if (dupeEmail && Number(dupeEmail.id) !== Number(user.id)) return res.status(409).json({ msg: 'Email already in use' });
      user.email = emailNorm;
    }
    if (username !== undefined) {
      const usernameNorm = String(username).trim();
      const dupeUsername = await User.findOne({ where: { username: usernameNorm } });
      if (dupeUsername && Number(dupeUsername.id) !== Number(user.id)) return res.status(409).json({ msg: 'Username already in use' });
      user.username = usernameNorm;
    }
    if (role !== undefined) {
      const dbRole = mapSuperAdminRoleToDb(role);
      if (!dbRole || dbRole === 'SuperAdmin') return res.status(400).json({ msg: 'Invalid role' });
      user.role = dbRole;
    }
    if (permissions !== undefined) {
      user.permissions = Array.isArray(permissions) ? permissions.filter(Boolean).map(p => String(p)) : [];
    }
    if (isActive !== undefined) user.isActive = !!isActive;
    if (password) {
      if (!isStrongPassword(password)) return res.status(400).json({ msg: 'Weak password' });
      user.password = await bcrypt.hash(password, 10);
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    await user.save();
    const j = user.toJSON();
    delete j.password;
    return res.json({
      id: String(j.id),
      name: j.name,
      email: j.email,
      username: j.username || j.email,
      role: mapSuperAdminRoleToApi(j.role),
      isActive: j.isActive !== false,
      lastLoginAt: j.lastLoginAt || null,
      createdAt: j.createdAt || null,
      permissions: Array.isArray(j.permissions) ? j.permissions : []
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

router.delete('/team/:id', verifyToken, requireRole('SUPER_ADMIN'), requirePermission('MANAGE_STAFF'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ msg: 'Invalid id' });
    if (Number(req.user?.id) === Number(id)) return res.status(400).json({ msg: 'Cannot delete self' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (String(user.role) === 'SuperAdmin') return res.status(400).json({ msg: 'Cannot delete SuperAdmin account' });

    await user.destroy();
    return res.json({ deleted: true });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

router.post('/team/permissions/recommendations/apply', verifyToken, requireRole('SUPER_ADMIN'), requirePermission('MANAGE_STAFF'), async (req, res) => {
  try {
    const modeRaw = (req.body && req.body.mode) || '';
    const overwrite = String(modeRaw).toLowerCase() === 'overwrite';
    const { Op } = require('sequelize');
    const users = await User.findAll({
      where: { role: { [Op.in]: ['SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor'] } },
      order: [['id', 'ASC']]
    });
    let updated = 0;
    for (const user of users) {
      const recommended = derivePermissionsForUser({ role: normalizeDbRole(user.role) });
      const current = Array.isArray(user.permissions) ? user.permissions : [];
      const next = overwrite ? recommended : Array.from(new Set([...current, ...recommended]));
      const a = [...current].slice().sort();
      const b = [...next].slice().sort();
      const same = JSON.stringify(a) === JSON.stringify(b);
      if (!same) {
        user.permissions = next;
        await user.save();
        updated++;
      }
    }
    return res.json({ updated, mode: overwrite ? 'overwrite' : 'merge' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

// @route   GET api/superadmin/analytics/kpi
// @desc    Get KPI metrics
// @access  Private (SuperAdmin)
router.get('/analytics/kpi', verifyToken, requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'), requirePermission('VIEW_DASHBOARD'), async (req, res) => {
  try {
    // Mock KPI data or calculate real ones
    // Real implementation would aggregate data
    res.json({
      retentionRate: 95,
      churnRate: 5,
      activeSchools: 120,
      avgRevenuePerUser: 50
    });
  } catch (err) {
    console.error('KPI Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/superadmin/metrics/summary
// @desc    Get metrics summary
// @access  Private (SuperAdmin)
router.get('/metrics/summary', verifyToken, requireRole('SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'), requirePermission('VIEW_DASHBOARD'), async (req, res) => {
  try {
    res.json({
      totalVisits: 15000,
      newSignups: 45,
      activeUsers: 3200,
      systemHealth: 'Healthy'
    });
  } catch (err) {
    console.error('Metrics Error:', err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/schools/deleted', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { SchoolSettings } = require('../models');
    const { Op } = require('sequelize');
    const deletedSettings = await SchoolSettings.findAll({ where: { operationalStatus: 'DELETED' } });
    const ids = deletedSettings.map(r => Number(r.schoolId));
    if (!ids.length) return res.json([]);
    const rows = await School.findAll({
      where: { id: { [Op.in]: ids } },
      include: [{ model: Subscription, include: { model: Plan } }],
      order: [['name', 'ASC']],
    });
    const formatted = rows.map(school => {
      const s = school.toJSON();
      return {
        id: s.id,
        name: s.name,
        plan: s.Subscription?.Plan?.name || 'N/A',
        status: 'DELETED',
        students: s.studentCount,
        teachers: s.teacherCount,
        balance: parseFloat(s.balance),
        joinDate: new Date(s.createdAt).toISOString().split('T')[0],
      };
    });
    res.json(formatted);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.put('/schools/:id/restore', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const sid = Number(req.params.id);
    const { SchoolSettings, AuditLog } = require('../models');
    let s = await SchoolSettings.findOne({ where: { schoolId: sid } });
    if (!s) s = await SchoolSettings.create({ schoolId: sid, schoolName: '', academicYearStart: new Date(), academicYearEnd: new Date(), notifications: { email: true, sms: false, push: true } });
    s.operationalStatus = 'ACTIVE';
    await s.save();
    try { await User.update({ isActive: true }, { where: { schoolId: sid } }); } catch { }
    try { await AuditLog.create({ action: 'school.restore', userId: req.user?.id || null, userEmail: req.user?.email || null, ipAddress: req.ip, userAgent: req.headers['user-agent'], details: JSON.stringify({ schoolId: sid }), timestamp: new Date(), riskLevel: 'medium' }); } catch { }
    return res.json({ restored: true, schoolId: sid });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;
