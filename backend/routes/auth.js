const express = require('express');
const router = express.Router();
const { User, School, Plan, Subscription, SchoolSettings, Parent } = require('../models');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const bcrypt = require('bcryptjs');
const { verifyToken, requireRole } = require('../middleware/auth');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

function isStrongPassword(pwd){
  const lengthOk = typeof pwd === 'string' && pwd.length >= 10;
  const upper = /[A-Z]/.test(pwd);
  const lower = /[a-z]/.test(pwd);
  const digit = /[0-9]/.test(pwd);
  const special = /[^A-Za-z0-9]/.test(pwd);
  return lengthOk && upper && lower && digit && special;
}

// @route   POST api/auth/login
// @desc    Authenticate user & get token (supports both email and username)
// @access  Public
router.post('/login', validate([
  { name: 'email', required: false, type: 'string' },
  { name: 'username', required: false, type: 'string' },
  { name: 'password', required: true, type: 'string' },
]), async (req, res) => {
  const { email, username, password } = req.body;

  try {
    // Support both email and username login
    const loginField = email ? { email } : { username };
    if (!loginField.email && !loginField.username) {
      return res.status(400).json({ msg: 'Either email or username is required' });
    }

    const user = await User.findOne({ where: loginField });
    if (!user) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }
    const stored = String(user.password || '');
    const isBcrypt = /^\$2[aby]\$/.test(stored);
    let ok = false;
    try {
      ok = isBcrypt ? await bcrypt.compare(password, stored) : (process.env.NODE_ENV !== 'production' && stored === password);
    } catch { ok = false; }
    if (!ok) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    try {
      if (user.role === 'PARENT') {
        const allowedGlobal = req.app?.locals?.allowedModules || [];
        let active = allowedGlobal;
        try {
          if (user.schoolId) {
            const settings = await SchoolSettings.findOne({ where: { schoolId: user.schoolId } });
            if (Array.isArray(settings?.activeModules) && (settings.activeModules || []).length > 0) {
              active = settings.activeModules;
            }
          }
        } catch {}
        if (!active.includes('parent_portal')) {
          return res.status(403).json({ msg: 'وحدة بوابة ولي الأمر غير مفعلة لهذه المدرسة.' });
        }
      }
      if (user.role === 'TEACHER') {
        const allowedGlobal = req.app?.locals?.allowedModules || [];
        let active = allowedGlobal;
        try {
          if (user.schoolId) {
            const settings = await SchoolSettings.findOne({ where: { schoolId: user.schoolId } });
            if (Array.isArray(settings?.activeModules) && (settings.activeModules || []).length > 0) {
              active = settings.activeModules;
            }
          }
        } catch {}
        const teacherAccessEnabled = active.includes('teacher_portal') || active.includes('teacher_app');
        if (!teacherAccessEnabled) {
          return res.status(403).json({ msg: 'وحدات دخول المعلم غير مفعّلة لهذه المدرسة.' });
        }
      }
    } catch {}

    // منع الدخول إذا كانت المدرسة موقوفة
    if (user.role !== 'SUPER_ADMIN' && user.schoolId) {
      try {
        const s = await SchoolSettings.findOne({ where: { schoolId: user.schoolId } });
        const st = String(s?.operationalStatus || 'ACTIVE').toUpperCase();
        if (st === 'SUSPENDED') {
          return res.status(403).json({ msg: 'تم إيقاف المدرسة مؤقتًا. الرجاء التواصل مع الإدارة.' });
        }
      } catch {}
    }

    user.lastLogin = new Date();
    user.lastLoginAt = new Date();
    await user.save();

    const payload = {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId || null,
      teacherId: user.teacherId || null,
      parentId: user.parentId || null,
      name: user.name,
      email: user.email,
      username: user.username,
      permissions: user.permissions || [],
      tokenVersion: user.tokenVersion || 0
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
    const refreshSecret = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
    const refreshToken = jwt.sign({ id: user.id, tokenVersion: user.tokenVersion || 0 }, refreshSecret, { expiresIn: '7d' });

    const { password: _, ...userData } = user.toJSON();
    res.json({ token, refreshToken, user: userData });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/trial-signup', validate([
  { name: 'schoolName', required: true, type: 'string' },
  { name: 'adminName', required: true, type: 'string' },
  { name: 'adminEmail', required: true, type: 'string' },
  { name: 'adminPassword', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const { schoolName, adminName, adminEmail, adminPassword } = req.body;
    if (!isStrongPassword(adminPassword)) {
        return res.status(400).json({ 
            msg: 'كلمة المرور ضعيفة. يجب أن تكون 10 خانات على الأقل وتحتوي على حرف كبير، حرف صغير، رقم، ورمز خاص.',
            code: 'WEAK_PASSWORD' 
        });
    }

    const exists = await User.findOne({ where: { email: adminEmail } });
    if (exists) return res.status(400).json({ msg: 'Email already in use' });

    const school = await School.create({ name: schoolName, contactEmail: adminEmail });
    await SchoolSettings.create({
      schoolId: school.id,
      schoolName,
      schoolAddress: '',
      academicYearStart: new Date().toISOString().split('T')[0],
      academicYearEnd: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notifications: JSON.stringify({ email: true, sms: false, push: true }),
      activeModules: ['student_management','academic_management','parent_portal','teacher_portal','teacher_app','finance','transportation']
    });

    let plan = await Plan.findOne({ where: { recommended: true } });
    if (!plan) plan = await Plan.findOne();
    // 30 Days Trial Period
    const renewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await Subscription.create({ schoolId: school.id, planId: plan?.id || null, status: 'TRIAL', startDate: new Date(), endDate: renewal, renewalDate: renewal });

    const hashed = await bcrypt.hash(adminPassword, 10);
    const user = await User.create({ name: adminName, email: adminEmail, username: adminEmail, password: hashed, role: 'SchoolAdmin', schoolId: school.id, schoolRole: 'مدير', permissions: ['VIEW_DASHBOARD','MANAGE_STUDENTS','MANAGE_TEACHERS','MANAGE_PARENTS','MANAGE_CLASSES','MANAGE_FINANCE','MANAGE_TRANSPORTATION','MANAGE_ATTENDANCE','MANAGE_GRADES','MANAGE_REPORTS','MANAGE_SETTINGS','MANAGE_MODULES'] });

    const payload = { id: user.id, role: user.role, schoolId: user.schoolId || null, name: user.name, email: user.email, username: user.username, permissions: user.permissions || [], tokenVersion: user.tokenVersion || 0 };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
    const refreshSecret = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
    const refreshToken = jwt.sign({ id: user.id, tokenVersion: user.tokenVersion || 0 }, refreshSecret, { expiresIn: '7d' });

    const data = user.toJSON();
    delete data.password;
    return res.status(201).json({ token, refreshToken, user: data });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.post('/change-password', verifyToken, validate([
  { name: 'currentPassword', required: true, type: 'string' },
  { name: 'newPassword', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ msg: 'Invalid current password' });
    if (!isStrongPassword(newPassword)) return res.status(400).json({ msg: 'Weak password' });
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordMustChange = false;
    user.lastPasswordChangeAt = new Date();
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    return res.json({ msg: 'Password changed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const { User } = require('../models');
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const data = user.toJSON();
    delete data.password;
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', (req, res) => {
  // Placeholder for registration logic
  res.json({ msg: 'Register route placeholder' });
});

module.exports = router;
router.post('/refresh', async (req, res) => {
  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
    const token = req.body?.refreshToken || req.headers['x-refresh-token'] || '';
    if (!token) return res.status(400).json({ msg: 'Missing refresh token' });
    const payload = jwt.verify(token, refreshSecret);
    const user = await User.findByPk(payload.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (Number(user.tokenVersion || 0) !== Number(payload.tokenVersion || 0)) return res.status(401).json({ msg: 'Token revoked' });
    const access = jwt.sign({ id: user.id, role: user.role, schoolId: user.schoolId || null, teacherId: user.teacherId || null, parentId: user.parentId || null, name: user.name, email: user.email, username: user.username, permissions: user.permissions || [], tokenVersion: user.tokenVersion || 0 }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token: access });
  } catch (e) {
    res.status(401).json({ msg: 'Invalid refresh token' });
  }
});

router.post('/mfa/enroll', verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const secret = speakeasy.generateSecret({ name: `SchoolCRM (${user.email})` });
    user.mfaSecret = secret.base32;
    await user.save();
    const otpAuth = secret.otpauth_url;
    const dataUrl = await qrcode.toDataURL(otpAuth);
    res.json({ otpauth: otpAuth, qrcode: dataUrl });
  } catch (e) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.post('/mfa/verify', verifyToken, validate([{ name: 'token', required: true, type: 'string' }]), async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || !user.mfaSecret) return res.status(400).json({ msg: 'MFA not enrolled' });
    const ok = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token: req.body.token, window: 1 });
    if (!ok) return res.status(401).json({ msg: 'Invalid token' });
    user.mfaEnabled = true;
    await user.save();
    res.json({ msg: 'MFA enabled' });
  } catch (e) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.post('/parent/invite', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), validate([
  { name: 'parentId', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const pid = Number(req.body.parentId);
    if (!pid) return res.status(400).json({ msg: 'Invalid parentId' });
    const parent = await Parent.findByPk(pid);
    if (!parent) return res.status(404).json({ msg: 'Parent not found' });
    if (req.user.role !== 'SUPER_ADMIN' && Number(req.user.schoolId || 0) !== Number(parent.schoolId || 0)) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    let user = await User.findOne({ where: { parentId: parent.id } });
    if (!user) {
      const rawPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
      const hashed = await bcrypt.hash(rawPassword, 10);
      user = await User.create({ email: parent.email, username: parent.email, password: hashed, name: parent.name, role: 'Parent', schoolId: parent.schoolId, parentId: parent.id, passwordMustChange: true });
    } else {
      user.email = parent.email;
      user.username = parent.email;
      user.name = parent.name;
      user.role = 'Parent';
      user.schoolId = parent.schoolId;
      user.parentId = parent.id;
      user.isActive = true;
      user.passwordMustChange = true;
      await user.save();
    }
    parent.status = 'Invited';
    await parent.save();
    return res.status(201).json({ invited: true, parentId: String(parent.id), userId: String(user.id) });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});
