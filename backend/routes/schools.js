const express = require('express');
const router = express.Router();
const { School, Subscription, Plan, Student, Invoice, SchoolSettings } = require('../models');
const { sequelize } = require('../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../middleware/auth');
const { requireModule } = require('../middleware/modules');

// @route   GET api/schools
// @desc    Get all schools with their subscription details
// @access  Private (SuperAdmin) / Public for login screen
router.get('/', async (req, res) => {
  try {
    const schools = await School.findAll({
      include: {
        model: Subscription,
        include: {
          model: Plan,
        },
      },
      order: [['name', 'ASC']], // Order alphabetically by name
    });

    // Format the response to match the frontend's expected structure
    const formattedSchools = schools.map(school => {
      const schoolJSON = school.toJSON();
      return {
        id: schoolJSON.id,
        name: schoolJSON.name,
        plan: schoolJSON.Subscription?.Plan?.name || 'N/A',
        // The frontend expects the ENUM key (e.g., 'ACTIVE')
        status: schoolJSON.Subscription?.status || 'N/A', 
        students: schoolJSON.studentCount,
        teachers: schoolJSON.teacherCount,
        balance: parseFloat(schoolJSON.balance),
        joinDate: schoolJSON.createdAt.toISOString().split('T')[0],
      }
    });

    res.json(formattedSchools);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Public endpoint alias to list schools without auth
router.get('/public', async (req, res) => {
  try {
    const schools = await School.findAll({
      include: { model: Subscription, include: { model: Plan } },
      order: [['name', 'ASC']],
    });
    const formattedSchools = schools.map(school => {
      const s = school.toJSON();
      return {
        id: s.id,
        name: s.name,
        plan: s.Subscription?.Plan?.name || 'N/A',
        status: s.Subscription?.status || 'N/A',
        students: s.studentCount,
        teachers: s.teacherCount,
        balance: parseFloat(s.balance),
        joinDate: new Date(s.createdAt).toISOString().split('T')[0],
      };
    });
    res.json(formattedSchools);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/schools/:id
// @desc    Get a single school by id with its subscription details
// @access  Private (SchoolAdmin) / Public where appropriate
router.get('/:id', async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id, {
      include: {
        model: Subscription,
        include: { model: Plan },
      },
    });
    if (!school) return res.status(404).json({ msg: 'School not found' });
    const s = school.toJSON();
    return res.json({
      id: s.id,
      name: s.name,
      plan: s.Subscription?.Plan?.name || 'N/A',
      status: s.Subscription?.status || 'N/A',
      students: s.studentCount,
      teachers: s.teacherCount,
      joinDate: new Date(s.createdAt).toISOString().split('T')[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/schools
// @desc    Add a new school with 7-day trial and initial admin
// @access  Private (SuperAdmin)
router.post('/', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const payload = req.body || {};
    const schoolData = payload.school || {};
    const adminData = payload.admin || {};
    const subData = payload.subscription || {};
    if (!schoolData.name || !schoolData.contactEmail) return res.status(400).json({ msg: 'Invalid school data' });
    if (!adminData.name || !adminData.email || !adminData.password) return res.status(400).json({ msg: 'Invalid admin data' });
    const plan = await Plan.findByPk(Number(subData.planId || 1));
    if (!plan) return res.status(400).json({ msg: 'Invalid planId' });

    const existingSchool = await School.findOne({ where: { name: schoolData.name } });
    if (existingSchool) return res.status(400).json({ msg: 'School already exists' });

    const school = await School.create({ name: schoolData.name, contactEmail: schoolData.contactEmail, studentCount: 0, teacherCount: 0, balance: 0 });

    // 7-day trial subscription
    const start = new Date();
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Subscription.create({ schoolId: school.id, planId: plan.id, status: 'TRIAL', startDate: start, endDate: end, renewalDate: end });

    // Default settings
    const academicStart = new Date(start.getFullYear(), 8, 1); // Sep 1
    const academicEnd = new Date(start.getFullYear() + 1, 5, 20); // Jun 20 next year
    await SchoolSettings.create({ schoolId: school.id, schoolName: school.name, schoolAddress: schoolData.address || '', academicYearStart: academicStart, academicYearEnd: academicEnd, notifications: { email: true, sms: false, push: true }, availableStages: ["رياض أطفال","ابتدائي","إعدادي","ثانوي"] });

    // Create initial admin user
    const bcrypt = require('bcryptjs');
    const username = String(adminData.email).split('@')[0];
    const existsUser = await require('../models').User.findOne({ where: { [require('sequelize').Op.or]: [{ email: adminData.email }, { username }] } });
    if (existsUser) return res.status(400).json({ msg: 'Admin email already exists' });
    const hash = await bcrypt.hash(String(adminData.password), 10);
    const permissions = ['VIEW_DASHBOARD','MANAGE_STUDENTS','MANAGE_TEACHERS','MANAGE_PARENTS','MANAGE_CLASSES','MANAGE_FINANCE','MANAGE_TRANSPORTATION','MANAGE_REPORTS','MANAGE_SETTINGS','MANAGE_MODULES','MANAGE_STAFF'];
    const admin = await require('../models').User.create({ name: adminData.name, email: adminData.email, username, password: hash, role: 'SchoolAdmin', schoolId: school.id, schoolRole: 'مدير', isActive: true, permissions, passwordMustChange: true, tokenVersion: 0 });

    const response = { id: school.id, name: school.name, plan: plan.name, status: 'TRIAL', students: school.studentCount, teachers: school.teacherCount, balance: parseFloat(school.balance), joinDate: school.createdAt.toISOString().split('T')[0] };
    res.status(201).json(response);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// Get subscription details for a school
router.get('/:id/subscription', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const sub = await Subscription.findOne({ where: { schoolId: Number(req.params.id) }, include: [{ model: Plan }] });
    if (!sub) return res.status(404).json({ msg: 'Subscription not found' });
    const p = sub.Plan;
    const price = p ? parseFloat(p.price) : 0;
    return res.json({
      id: String(sub.id),
      schoolId: Number(sub.schoolId),
      schoolName: '',
      plan: p?.name || 'N/A',
      status: sub.status || 'N/A',
      startDate: sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : '',
      renewalDate: sub.renewalDate ? new Date(sub.renewalDate).toISOString().split('T')[0] : '',
      amount: price,
      trialEndDate: sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : undefined,
    });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// Billing summary for a school
router.get('/:id/billing/summary', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const sid = Number(req.params.id);
    const { Invoice, Student } = require('../models');
    const rows = await Invoice.findAll({ include: [{ model: Student, where: { schoolId: sid }, attributes: [] }] });
    let paid = 0, unpaid = 0, overdue = 0, total = 0, outstanding = 0;
    rows.forEach(r => {
      const amt = parseFloat(r.amount || 0);
      total += amt;
      if (String(r.status).toUpperCase() === 'PAID') paid++;
      else if (String(r.status).toUpperCase() === 'OVERDUE') { overdue++; outstanding += amt; }
      else { unpaid++; outstanding += amt; }
    });
    return res.json({ totalInvoices: rows.length, paidCount: paid, unpaidCount: unpaid, overdueCount: overdue, totalAmount: total, outstandingAmount: outstanding });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

// Update operational status for a school (ACTIVE/SUSPENDED)
router.put('/:id/status', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const sid = Number(req.params.id);
    const status = String(req.body?.status || '').toUpperCase();
    if (!['ACTIVE','SUSPENDED'].includes(status)) return res.status(400).json({ msg: 'Invalid status' });
    let s = await SchoolSettings.findOne({ where: { schoolId: sid } });
    if (!s) s = await SchoolSettings.create({ schoolId: sid, schoolName: '', academicYearStart: new Date(), academicYearEnd: new Date(), notifications: { email: true, sms: false, push: true } });
    const settings = s.toJSON();
    const next = { ...(settings || {}), operationalStatus: status };
    delete next.id; delete next.createdAt; delete next.updatedAt;
    s.schoolName = next.schoolName || s.schoolName;
    s.schoolAddress = next.schoolAddress || s.schoolAddress;
    s.academicYearStart = next.academicYearStart || s.academicYearStart;
    s.academicYearEnd = next.academicYearEnd || s.academicYearEnd;
    s.notifications = next.notifications || s.notifications;
    s.availableStages = next.availableStages || s.availableStages;
    s.backupConfig = next.backupConfig || s.backupConfig;
    s.operationalStatus = next.operationalStatus;
    await s.save();
    try {
      const { AuditLog } = require('../models');
      await AuditLog.create({ action: 'school.status.update', userId: req.user?.id || null, userEmail: req.user?.email || null, ipAddress: req.ip, userAgent: req.headers['user-agent'], details: JSON.stringify({ schoolId: sid, operationalStatus: status }), timestamp: new Date(), riskLevel: 'medium' });
    } catch {}
    return res.json({ schoolId: sid, status });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.delete('/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const sid = Number(req.params.id);
    const { User } = require('../models');
    let s = await SchoolSettings.findOne({ where: { schoolId: sid } });
    if (!s) s = await SchoolSettings.create({ schoolId: sid, schoolName: '', academicYearStart: new Date(), academicYearEnd: new Date(), notifications: { email: true, sms: false, push: true } });
    s.operationalStatus = 'DELETED';
    await s.save();
    await User.update({ isActive: false }, { where: { schoolId: sid } });
    try {
      const { AuditLog } = require('../models');
      await AuditLog.create({ action: 'school.delete', userId: req.user?.id || null, userEmail: req.user?.email || null, ipAddress: req.ip, userAgent: req.headers['user-agent'], details: JSON.stringify({ schoolId: sid }), timestamp: new Date(), riskLevel: 'high' });
    } catch {}
    return res.json({ deleted: true });
  } catch (e) { console.error(e); res.status(500).json({ msg: 'Server Error' }); }
});

router.get('/:id/modules', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  try {
    const schoolId = Number(req.params.id);
    const allowedGlobal = req.app?.locals?.allowedModules || [];
    const catalog = req.app?.locals?.modulesCatalog || [];
    const catalogIds = catalog.map(m => m.id);
    const settings = await SchoolSettings.findOne({ where: { schoolId } });
    const sub = await Subscription.findOne({ where: { schoolId } });
    const now = new Date();
    let active = Array.isArray(settings?.activeModules) && settings.activeModules.length > 0 ? settings.activeModules : allowedGlobal;
    if (sub && String(sub.status).toUpperCase() === 'TRIAL') {
      const expiry = sub.endDate || sub.renewalDate;
      if (!expiry || now <= new Date(expiry)) {
        active = catalogIds; // كل الوحدات خلال التجربة
      } else {
        active = []; // انتهت التجربة: لا وحدات فعّالة
      }
    } else {
      // فلترة حسب الترخيص العالمي
      active = (active || []).filter(m => allowedGlobal.includes(m));
    }
    const list = (active || []).map(m => ({ schoolId, moduleId: m }));
    res.json(list);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.put('/:id/modules', verifyToken, requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  try {
    const schoolId = Number(req.params.id);
    const requestedIds = Array.isArray(req.body?.moduleIds) ? req.body.moduleIds : [];
    const catalog = Array.isArray(req.app?.locals?.modulesCatalog) ? req.app.locals.modulesCatalog : [];
    const byId = new Map(catalog.map(m => [String(m.id), m]));
    const role = String(req.user?.role || '').toUpperCase();
    const isSchoolAdmin = role.includes('SCHOOL') && role.includes('ADMIN');
    const moduleIds = isSchoolAdmin ? requestedIds.filter(id => {
      const m = byId.get(String(id));
      return m && m.isCore === true;
    }) : requestedIds;
    const settings = await SchoolSettings.findOrCreate({ where: { schoolId }, defaults: { schoolName: '', academicYearStart: new Date(), academicYearEnd: new Date(), notifications: { email: true, sms: false, push: true } } });
    const settingsInstance = Array.isArray(settings) ? settings[0] : settings;
    settingsInstance.activeModules = moduleIds;
    await settingsInstance.save();
    const list = moduleIds.map(m => ({ schoolId, moduleId: m }));
    res.json(list);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/:id/modules/activate', verifyToken, requireRole('SUPER_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  try {
    const { Subscription, SchoolSettings } = require('../models');
    const schoolId = Number(req.params.id);
    const moduleIds = Array.isArray(req.body?.moduleIds) ? req.body.moduleIds.map(String) : [];
    const renewalDate = req.body?.renewalDate ? new Date(req.body.renewalDate) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    const settings = await SchoolSettings.findOrCreate({ where: { schoolId }, defaults: { schoolName: '', academicYearStart: new Date(), academicYearEnd: new Date(), notifications: { email: true, sms: false, push: true }, activeModules: moduleIds } });
    const settingsInstance = Array.isArray(settings) ? settings[0] : settings;
    settingsInstance.activeModules = moduleIds;
    await settingsInstance.save();
    const sub = await Subscription.findOne({ where: { schoolId } });
    if (sub) { sub.status = 'ACTIVE'; sub.renewalDate = renewalDate; await sub.save(); }
    res.json({ activated: true, activeModules: moduleIds, renewalDate: renewalDate.toISOString() });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/:id/stats/student-distribution', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  try {
    const rows = await Student.findAll({
      attributes: ['grade', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { schoolId: Number(req.params.id) },
      group: ['grade'],
      order: [[sequelize.literal('count'), 'DESC']]
    });
    const data = rows.map(r => ({ name: r.get('grade'), value: Number(r.get('count')) }));
    res.json(data);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/:id/invoices', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('id'), async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      include: { model: Student, attributes: ['name'], where: { schoolId: Number(req.params.id) } },
      order: [['dueDate', 'DESC']]
    });
    const statusMap = { PAID: 'مدفوعة', UNPAID: 'غير مدفوعة', OVERDUE: 'متأخرة' };
    res.json(invoices.map(inv => ({
      id: String(inv.id),
      studentId: inv.studentId,
      studentName: inv.Student.name,
      status: statusMap[inv.status] || inv.status,
      issueDate: inv.createdAt.toISOString().split('T')[0],
      dueDate: inv.dueDate.toISOString().split('T')[0],
      items: [{ description: 'رسوم دراسية', amount: parseFloat(inv.amount) }],
      totalAmount: parseFloat(inv.amount)
    })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;
