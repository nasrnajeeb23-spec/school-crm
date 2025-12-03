const express = require('express');
const router = express.Router();
const { School, Subscription, Invoice, Payment, Plan, User, BusOperator, SecurityPolicy } = require('../models');
const { TrialRequest } = require('../models');
const clientMetrics = require('prom-client');
clientMetrics.collectDefaultMetrics({ prefix: 'schoolsaas_', timeout: 5000 });
const { sequelize } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// @route   GET api/superadmin/stats
// @desc    Get dashboard stats for SuperAdmin
// @access  Private (SuperAdmin)
router.get('/stats', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const totalSchools = await School.count();
        const activeSubscriptions = await Subscription.count({
            where: { status: 'ACTIVE' }
        });

        // Calculate total revenue from all paid invoices
        const totalRevenueResult = await Payment.findOne({
            attributes: [[sequelize.fn('sum', sequelize.col('amount')), 'total']],
            raw: true,
        });
        const totalRevenue = parseFloat(totalRevenueResult.total) || 0;
        
        // This is a simplified revenue chart data
        const revenueData = [
            { month: 'يناير', revenue: 18000 },
            { month: 'فبراير', revenue: 21000 },
            { month: 'مارس', revenue: 25000 },
            { month: 'أبريل', revenue: 23000 },
            { month: 'مايو', revenue: 28000 },
            { month: 'يونيو', revenue: 32000 },
        ];


        res.json({
            totalSchools,
            activeSubscriptions,
            totalRevenue,
            revenueData
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/superadmin/revenue
// @desc    Get revenue summary for SuperAdmin (monthly series)
// @access  Private (SuperAdmin)
router.get('/revenue', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const cacheKey = 'superadmin_revenue_cache';
    const ttlMs = 60 * 1000;
    const now = Date.now();
    const cache = (req.app.locals && req.app.locals[cacheKey]) || null;
    if (cache && (now - cache.time) < ttlMs) {
      return res.json(cache.data);
    }
    // Aggregate monthly revenue from payments (Postgres)
    const rows = await Payment.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('paymentDate')), 'month'],
        [sequelize.fn('sum', sequelize.col('amount')), 'amount']
      ],
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('paymentDate'))],
      order: [[sequelize.fn('date_trunc', 'month', sequelize.col('paymentDate')), 'ASC']],
      raw: true,
    });
    const data = (rows || []).map(r => {
      const d = new Date(r.month);
      const label = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      return { month: label, amount: parseFloat(r.amount) || 0 };
    });
    req.app.locals[cacheKey] = { time: now, data };
    res.json(data);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/superadmin/subscriptions
// @desc    List subscriptions with status
// @access  Private (SuperAdmin)
router.get('/subscriptions', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const subs = await Subscription.findAll({ include: [{ model: School, attributes: ['name'] }, { model: Plan, attributes: ['name','price'] }], order: [['id','ASC']] });
    const formatted = subs.map(sub => ({
      id: String(sub.id),
      schoolId: sub.schoolId,
      schoolName: sub.School && sub.School.name,
      plan: sub.Plan && sub.Plan.name,
      status: sub.status,
      startDate: sub.startDate ? sub.startDate.toISOString().split('T')[0] : null,
      renewalDate: sub.renewalDate ? sub.renewalDate.toISOString().split('T')[0] : null,
      amount: sub.Plan ? parseFloat(sub.Plan.price) : 0,
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Security policies (central)
router.get('/security/policies', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const defaults = { enforceMfaForAdmins: true, passwordMinLength: 10, lockoutThreshold: 3, allowedIpRanges: [], sessionMaxAgeHours: 24 };
    let dbPolicy = await SecurityPolicy.findOne();
    if (!dbPolicy) {
      dbPolicy = await SecurityPolicy.create({ ...defaults, allowedIpRanges: JSON.stringify(defaults.allowedIpRanges) });
    }
    const cfg = {
      enforceMfaForAdmins: !!dbPolicy.enforceMfaForAdmins,
      passwordMinLength: Number(dbPolicy.passwordMinLength || 10),
      lockoutThreshold: Number(dbPolicy.lockoutThreshold || 3),
      allowedIpRanges: (() => { try { return JSON.parse(dbPolicy.allowedIpRanges || '[]'); } catch { return []; } })(),
      sessionMaxAgeHours: Number(dbPolicy.sessionMaxAgeHours || 24),
    };
    req.app.locals.securityPolicies = cfg;
    await setJSON(req.app.locals.redisClient, 'security:policies', cfg);
    res.json(cfg);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.put('/security/policies', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const payload = req.body || {};
    let dbPolicy = await SecurityPolicy.findOne();
    const prev = dbPolicy ? {
      enforceMfaForAdmins: !!dbPolicy.enforceMfaForAdmins,
      passwordMinLength: Number(dbPolicy.passwordMinLength || 10),
      lockoutThreshold: Number(dbPolicy.lockoutThreshold || 3),
      allowedIpRanges: (() => { try { return JSON.parse(dbPolicy.allowedIpRanges || '[]'); } catch { return []; } })(),
      sessionMaxAgeHours: Number(dbPolicy.sessionMaxAgeHours || 24),
    } : { enforceMfaForAdmins: true, passwordMinLength: 10, lockoutThreshold: 3, allowedIpRanges: [], sessionMaxAgeHours: 24 };
    const merged = {
      enforceMfaForAdmins: typeof payload.enforceMfaForAdmins === 'boolean' ? payload.enforceMfaForAdmins : (prev.enforceMfaForAdmins ?? true),
      passwordMinLength: Number(payload.passwordMinLength ?? (prev.passwordMinLength ?? 10)) || 10,
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
router.get('/api-keys', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { ApiKey } = require('../models');
    const list = await ApiKey.findAll({ order: [['createdAt','DESC']], raw: true });
    res.json(list.map(k => ({ id: k.id, provider: k.provider, createdAt: String(k.createdAt), mask: k.mask || '******' })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
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
      providers: Array.isArray(payload.providers) ? payload.providers.map(p => ({ id: String(p.id || p.name || 'prov_'+Date.now().toString(36)), name: String(p.name || ''), clientId: p.clientId || undefined, clientSecretSet: !!p.clientSecret })) : (prev.providers || []),
    };
    req.app.locals.ssoConfig = merged;
    await setJSON(req.app.locals.redisClient, 'security:sso', merged);
    res.json(merged);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// Jobs center
router.get('/jobs', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const rows = await require('../models').Job.findAll({ order: [['createdAt','DESC']], raw: true });
    res.json(rows.map(r => ({ id: r.id, name: r.name, status: r.status, schoolId: r.schoolId, createdAt: String(r.createdAt), updatedAt: r.updatedAt ? String(r.updatedAt) : undefined })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
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
        const rows = await Subscription.findAll({ include: [{ model: School, attributes: ['name'] }, { model: Plan, attributes: ['name','price'] }], where: { schoolId: sid }, order: [['id','ASC']] });
        const header = ['SubscriptionId','School','Plan','Status','Price'].join(',');
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
        const header = ['PaymentId','Amount','Date','Method','TransactionId'].join(',');
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
        const header = ['InvoiceId','Amount','Status','CreatedAt'].join(',');
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
        const school = await School.findByPk(sid, { attributes: ['id','name'], raw: true }).catch(() => null);
        const subs = await Subscription.findAll({ include: [{ model: Plan, attributes: ['name','price'] }], where: { schoolId: sid }, raw: true }).catch(() => []);
        zip.append(JSON.stringify({ school, subscriptions: subs }, null, 2), { name: 'data.json' });
        const header = ['SubscriptionId','Plan','Status','Price'].join(',');
        const body = (subs || []).map(r => [r.id, r['Plan.name'], r.status, r['Plan.price'] || 0].join(',')).join('\n');
        zip.append(header + '\n' + body, { name: 'subscriptions.csv' });
        await zip.finalize();
        const buffer = await zipDone;
        return { ok: true, jobType, schoolId: payload.schoolId, zip: buffer };
      }
      await new Promise(r => setTimeout(r, 500));
      return { ok: true, jobType, schoolId: payload.schoolId };
    }));
    res.json({ started: ids.length, jobIds: ids });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/bulk/modules', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { schoolIds = [], moduleId = '', enable = true } = req.body || {};
    if (!Array.isArray(schoolIds) || schoolIds.length === 0 || !moduleId) return res.status(400).json({ message: 'Invalid payload' });
    const enqueue = req.app.locals.enqueueJob;
    schoolIds.forEach(sid => enqueue('modules_update', { schoolId: sid, moduleId, enable }, async () => ({ ok: true })));
    res.json({ updated: schoolIds.length });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.put('/bulk/usage-limits', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { schoolIds = [], planId = '', limits = {} } = req.body || {};
    if (!Array.isArray(schoolIds) || schoolIds.length === 0) return res.status(400).json({ message: 'Invalid payload' });
    const enqueue = req.app.locals.enqueueJob;
    schoolIds.forEach(sid => enqueue('usage_limits_update', { schoolId: sid, planId, limits }, async () => ({ ok: true })));
    res.json({ updated: schoolIds.length });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.put('/bulk/backup-schedule', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { schoolIds = [], schedule = {} } = req.body || {};
    const { daily = true, monthly = false, time = '02:00' } = schedule || {};
    if (!Array.isArray(schoolIds) || schoolIds.length === 0) return res.status(400).json({ message: 'Invalid payload' });
    const parts = String(time).split(':');
    const hh = Math.max(0, Math.min(23, parseInt(parts[0] || '2')));
    const mm = Math.max(0, Math.min(59, parseInt(parts[1] || '0')));
    const day = monthly ? '1' : '*';
    const expr = `${mm} ${hh} ${day} * *`;
    const redis = req.app.locals.redisClient;
    const setKey = 'backup:schedule:set';
    for (const sid of schoolIds) {
      const key = `backup:schedule:${sid}`;
      if (redis) {
        await redis.set(key, expr).catch(() => {});
        await redis.sAdd(setKey, String(sid)).catch(() => {});
      }
      await req.app.locals.scheduleBackupForSchool(Number(sid), expr);
    }
    res.json({ scheduled: schoolIds.length });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/schedule/backups/reload', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try { await req.app.locals.reloadBackupSchedules(); res.json({ reloaded: true }); } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/backup/retention', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const redis = req.app.locals.redisClient;
    const daysStr = redis ? await redis.get('backup:retention:days').catch(() => null) : null;
    const days = Number(daysStr || 30) || 30;
    res.json({ days });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.put('/backup/retention', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const redis = req.app.locals.redisClient;
    const v = Number((req.body || {}).days || 30) || 30;
    if (redis) await redis.set('backup:retention:days', String(v)).catch(() => {});
    res.json({ days: v });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/schools/create', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { name, planId, adminEmail, adminUsername, adminPassword } = req.body || {};
    if (!name || !planId || !adminEmail || !adminUsername || !adminPassword) return res.status(400).json({ message: 'Invalid payload' });
    const bcrypt = require('bcryptjs');
    const school = await School.create({ name });
    const plan = await Plan.findByPk(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    const start = new Date();
    const renewal = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    await Subscription.create({ schoolId: school.id, planId: plan.id, status: 'TRIAL', startDate: start, renewalDate: renewal });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(String(adminPassword), salt);
    const existing = await User.findOne({ where: { email: adminEmail } });
    if (existing) return res.status(400).json({ message: 'Admin email already exists' });
    const admin = await User.create({ name: adminUsername, email: adminEmail, username: adminUsername, password: hashedPassword, role: 'SchoolAdmin', schoolId: school.id, isActive: true });
    res.json({ school: { id: school.id, name: school.name }, admin: { id: admin.id, email: admin.email, username: admin.username }, subscription: { status: 'TRIAL', renewalDate: renewal.toISOString() } });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   GET api/superadmin/team
// @desc    Get all SuperAdmin team members
// @access  Private (SuperAdmin and team roles)
router.get('/team', verifyToken, async (req, res) => {
    try {
        // Allow all SuperAdmin team roles to view team members
        const allowedRoles = ['SuperAdmin', 'SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const teamMembers = await User.findAll({
            where: {
                role: {
                    [require('sequelize').Op.in]: ['SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor']
                }
            },
            attributes: ['id', 'name', 'email', 'username', 'role', 'isActive', 'lastLoginAt', 'createdAt', 'permissions']
        });

        res.json(teamMembers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/superadmin/team
// @desc    Create a new SuperAdmin team member
// @access  Private (SuperAdmin only)
router.post('/team', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const { name, email, username, password, role, permissions } = req.body;

        // Validate role
        const allowedRoles = ['SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role for team member' });
        }

        // Check if username or email already exists
        const existingUser = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { username: username },
                    { email: email }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new team member
        const newTeamMember = await User.create({
            name,
            email,
            username,
            password: hashedPassword,
            role,
            permissions: permissions || getDefaultPermissions(role),
            isActive: true,
            schoolId: null // SuperAdmin team members don't belong to a specific school
        });

        // Remove password from response
        const { password: _, ...memberWithoutPassword } = newTeamMember.toJSON();
        
        res.status(201).json(memberWithoutPassword);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/superadmin/team/:id
// @desc    Update a SuperAdmin team member
// @access  Private (SuperAdmin only)
router.put('/team/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const { name, email, username, password, role, permissions } = req.body;
        const memberId = req.params.id;

        // Find the team member
        const teamMember = await User.findOne({
            where: {
                id: memberId,
                role: {
                    [require('sequelize').Op.in]: ['SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor']
                }
            }
        });

        if (!teamMember) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        // Validate role if provided
        if (role) {
            const allowedRoles = ['SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor'];
            if (!allowedRoles.includes(role)) {
                return res.status(400).json({ message: 'Invalid role for team member' });
            }
        }

        // Check if new username or email already exists (excluding current member)
        if (username || email) {
            const existingUser = await User.findOne({
                where: {
                    id: {
                        [require('sequelize').Op.ne]: memberId
                    },
                    [require('sequelize').Op.or]: [
                        username ? { username: username } : null,
                        email ? { email: email } : null
                    ].filter(Boolean)
                }
            });

            if (existingUser) {
                return res.status(400).json({ message: 'Username or email already exists' });
            }
        }

        // Update fields
        if (name) teamMember.name = name;
        if (email) teamMember.email = email;
        if (username) teamMember.username = username;
        if (role) teamMember.role = role;
        if (permissions) teamMember.permissions = permissions;
        
        // Update password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            teamMember.password = await bcrypt.hash(password, salt);
        }

        await teamMember.save();

        // Remove password from response
        const { password: _, ...memberWithoutPassword } = teamMember.toJSON();
        
        res.json(memberWithoutPassword);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/superadmin/team/:id
// @desc    Delete a SuperAdmin team member
// @access  Private (SuperAdmin only)
router.delete('/team/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const memberId = req.params.id;

        // Find the team member
        const teamMember = await User.findOne({
            where: {
                id: memberId,
                role: {
                    [require('sequelize').Op.in]: ['SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor']
                }
            }
        });

        if (!teamMember) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        await teamMember.destroy();
        res.json({ message: 'Team member deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Helper function to get default permissions for a role
function getDefaultPermissions(role) {
    const defaultPermissions = {
        'SuperAdminFinancial': ['view_financial_reports', 'manage_billing', 'view_subscriptions', 'manage_invoices'],
        'SuperAdminTechnical': ['manage_system_settings', 'view_logs', 'manage_features', 'monitor_performance', 'manage_api_keys'],
        'SuperAdminSupervisor': ['view_all_schools', 'manage_school_admins', 'view_reports', 'manage_content', 'view_user_analytics']
    };
    return defaultPermissions[role] || [];
}

 

router.get('/action-items', verifyToken, async (req, res) => {
  try {
    const role = String(req.user.role || '').toUpperCase();
    const isSuper = ['SUPER_ADMIN','SUPER_ADMIN_FINANCIAL','SUPER_ADMIN_TECHNICAL','SUPER_ADMIN_SUPERVISOR'].includes(role);
    const schoolId = isSuper ? Number(req.query.schoolId || 0) : Number(req.user.schoolId || 0);
    const whereInv = schoolId ? { '$Student.schoolId$': schoolId } : {};
    const invoices = await Invoice.findAll({ include: { model: require('../models').Student, attributes: [], where: schoolId ? { schoolId } : {} }, where: {}, limit: 50 });
    const unpaid = invoices.filter(i => i.status === 'UNPAID');
    const ops = await BusOperator.findAll({ where: schoolId ? { schoolId, status: 'Pending' } : { status: 'Pending' }, limit: 20 });
    const items = [];
    if (unpaid.length > 0) items.push({ id: 'act_inv_'+Date.now(), type: 'payment_verification', title: 'فواتير غير مدفوعة', description: `يوجد ${unpaid.length} فاتورة تحتاج متابعة`, date: new Date().toISOString(), isRead: false });
    if (ops.length > 0) items.push({ id: 'act_drv_'+Date.now(), type: 'driver_application', title: 'طلبات سائقين قيد المراجعة', description: `يوجد ${ops.length} طلبات سائقين تنتظر الموافقة`, date: new Date().toISOString(), isRead: false });
    res.json(items);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;
function getJSON(redis, key, fallback) {
  if (redis && typeof redis.get === 'function') {
    return redis.get(key).then(val => {
      try { return val ? JSON.parse(val) : fallback; } catch { return fallback; }
    }).catch(() => fallback);
  }
  return Promise.resolve(fallback);
}

function setJSON(redis, key, obj) {
  if (redis && typeof redis.set === 'function') {
    return redis.set(key, JSON.stringify(obj)).catch(() => {});
  }
  return Promise.resolve();
}
// Operational metrics for SuperAdmin
router.get('/metrics', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    res.setHeader('Content-Type', clientMetrics.register.contentType);
    res.end(await clientMetrics.register.metrics());
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// KPI analytics (MRR, ARPU, Churn)
router.get('/analytics/kpi', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const now = new Date();
    const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const activeCount = await Subscription.count({ where: { status: 'ACTIVE' } }).catch(() => 0);
    const activeRows = await Subscription.findAll({ include: [{ model: Plan, attributes: ['price'] }], where: { status: 'ACTIVE' }, raw: true }).catch(() => []);
    const mrr = (activeRows || []).reduce((sum, r) => sum + Number(r['Plan.price'] || 0), 0);
    const arpu = activeCount > 0 ? (mrr / activeCount) : 0;
    const churnCount = await Subscription.count({ where: { status: 'CANCELED', endDate: { [require('sequelize').Op.between]: [past30, now] } } }).catch(() => 0);
    const churnRate = activeCount > 0 ? (churnCount / activeCount) : 0;
    res.json({ activeSubscriptions: activeCount, mrr, arpu, churnRate });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
router.get('/metrics/summary', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const mem = process.memoryUsage();
    const uptimeSec = process.uptime();
    const schools = await School.count().catch(() => 0);
    const subs = await Subscription.count({ where: { status: 'ACTIVE' } }).catch(() => 0);
    res.json({
      memory: { rssMB: Math.round(mem.rss / 1048576), heapUsedMB: Math.round(mem.heapUsed / 1048576) },
      uptimeSec,
      totals: { schools, activeSubscriptions: subs },
    });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// Plans catalog for SuperAdmin
router.get('/plans', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const rows = await Plan.findAll({ attributes: ['id','name','price'], order: [['id','ASC']], raw: true });
    res.json(rows.map(r => ({ id: r.id, name: r.name, price: Number(r.price || 0) })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});
// Public onboarding request
router.post('/public/onboard', async (req, res) => {
  try {
    const { schoolName, adminName, adminEmail, phone } = req.body || {};
    if (!schoolName || !adminName || !adminEmail) return res.status(400).json({ message: 'Invalid payload' });
    const r = await TrialRequest.create({ schoolName, adminName, adminEmail, phone });
    res.json({ success: true, id: r.id });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// List onboarding requests
router.get('/onboarding/requests', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const rows = await TrialRequest.findAll({ order: [['createdAt','DESC']], raw: true });
    res.json(rows);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// Approve onboarding request -> create school
router.post('/onboarding/requests/:id/approve', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reqRow = await TrialRequest.findByPk(id);
    if (!reqRow) return res.status(404).json({ message: 'Request not found' });
    const { schoolName, adminName, adminEmail } = reqRow;
    const plan = await Plan.findOne({ order: [['id','ASC']] });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    const bcrypt = require('bcryptjs');
    const school = await School.create({ name: schoolName });
    const start = new Date();
    const renewal = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    await Subscription.create({ schoolId: school.id, planId: plan.id, status: 'TRIAL', startDate: start, renewalDate: renewal });
    const pass = Math.random().toString(36).slice(2,10);
    const hashedPassword = await bcrypt.hash(pass, 10);
    const admin = await User.create({ name: adminName, email: adminEmail, username: adminEmail, password: hashedPassword, role: 'SchoolAdmin', schoolId: school.id, isActive: true });
    await reqRow.update({ status: 'APPROVED' });
    res.json({ school: { id: school.id, name: school.name }, admin: { email: admin.email, tempPassword: pass }, subscription: { status: 'TRIAL', renewalDate: renewal.toISOString() } });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});
