const express = require('express');
const router = express.Router();
const { User, School, Plan, Subscription, SchoolSettings, Parent, Teacher, InvitationLog } = require('../models');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, isSuperAdminUser, normalizeUserRole, canAccessSchool } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const bcrypt = require('bcryptjs');
const { verifyToken, requireRole, requirePermission } = require('../middleware/auth');
const { requireModule } = require('../middleware/modules');
const { rateLimit } = require('../middleware/rateLimit');
const { deriveDesiredDbRole, derivePermissionsForUser } = require('../utils/permissionMatrix');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const rateLimit = require('express-rate-limit');
const InvitationAuditLogger = require('../utils/InvitationAuditLogger');
const emailValidator = require('../utils/EmailValidator');
const inputSanitizer = require('../utils/InputSanitizer');

<<<<<<< HEAD
// Initialize Audit Logger
const auditLogger = new InvitationAuditLogger(InvitationLog);

// Rate limiter for invite endpoints
const inviteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute
  message: 'Too many invite requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

function isStrongPassword(pwd) {
=======
async function verifyHCaptchaToken(token, ip) {
  try {
    const enabled = String(process.env.HCAPTCHA_ENABLED || '').toLowerCase() === 'true';
    if (!enabled) return true;
    const secret = process.env.HCAPTCHA_SECRET || '';
    if (!secret) return false;
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token || '');
    if (ip) params.append('remoteip', String(ip));
    const resp = await fetch('https://hcaptcha.com/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
    const data = await resp.json().catch(() => ({}));
    return !!data.success;
  } catch {
    return false;
  }
}
function isStrongPassword(pwd){
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
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
router.post('/login', rateLimit({ name: 'login', windowMs: 60000, max: 5 }), validate([
  { name: 'email', required: false, type: 'string' },
  { name: 'username', required: false, type: 'string' },
  { name: 'password', required: true, type: 'string' },
]), async (req, res) => {
  const { email, username, password } = req.body;

  try {
    const client = String(req.body?.client || req.headers['x-client'] || '').toLowerCase();
    const captchaToken = String(req.body?.hcaptchaToken || '');
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString();
    if (client === 'web') {
      const okCaptcha = await verifyHCaptchaToken(captchaToken, ip);
      if (!okCaptcha) return res.status(400).json({ msg: 'Captcha verification failed' });
    }
    // Support both email and username login
    const loginField = email ? { email } : { username };
    if (!loginField.email && !loginField.username) {
      return res.status(400).json({ msg: 'Either email or username is required' });
    }

    const user = await User.findOne({ where: loginField });
    if (!user) {
      try {
        await require('../models').AuditLog.create({
          action: 'LOGIN_FAILED',
          userId: 0,
          userEmail: email || username || 'unknown',
          ipAddress: ip,
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ reason: 'User not found', loginField }),
          riskLevel: 'medium'
        });
      } catch {}
      return res.status(401).json({ msg: 'Invalid credentials' });
    }
    const stored = String(user.password || '');
    let ok = false;
    try {
      ok = await bcrypt.compare(password, stored);
    } catch { ok = false; }
    if (!ok) {
      try {
        await require('../models').AuditLog.create({
          action: 'LOGIN_FAILED',
          userId: user.id,
          userEmail: user.email,
          ipAddress: ip,
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ reason: 'Invalid password' }),
          riskLevel: 'medium'
        });
      } catch {}
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    try { /* تم إزالة قيود الوحدات: الوصول يعتمد على حالة الاشتراك فقط */ } catch { }

    const isSuperAdmin = isSuperAdminUser(user);

    // منع الدخول إذا كانت المدرسة موقوفة
    if (!isSuperAdmin && user.schoolId) {
      try {
        const s = await SchoolSettings.findOne({ where: { schoolId: user.schoolId } });
        const st = String(s?.operationalStatus || 'ACTIVE').toUpperCase();
        if (st === 'SUSPENDED') {
          return res.status(403).json({ msg: 'تم إيقاف المدرسة مؤقتًا. الرجاء التواصل مع الإدارة.' });
        }
      } catch { }
    }

    // التحقق من مطابقة المدرسة المختارة في واجهة الدخول مع مدرسة المستخدم
    try {
      const requestedSchoolId = Number(req.body?.schoolId || 0);
      if (requestedSchoolId && !isSuperAdmin) {
        const userSchoolId = Number(user.schoolId || 0);
        if (!canAccessSchool(user, requestedSchoolId)) {
          return res.status(403).json({ msg: 'Access denied for this school' });
        }
        const isParent = normalizeUserRole(user) === 'PARENT';
        if (isParent) {
          const parent = await Parent.findOne({ where: { id: user.parentId, schoolId: userSchoolId } });
          if (!parent) {
            return res.status(403).json({ msg: 'ولي الأمر غير موجود في هذه المدرسة.' });
          }
        }
      }
    } catch { }

    user.lastLogin = new Date();
    user.lastLoginAt = new Date();
    await user.save();

    const effectiveRole = deriveDesiredDbRole({ role: user.role, schoolRole: user.schoolRole });
    const effectivePermissions = derivePermissionsForUser({ role: effectiveRole, schoolRole: user.schoolRole });

    const payload = {
      id: user.id,
      role: effectiveRole,
      schoolId: user.schoolId || null,
      teacherId: user.teacherId || null,
      parentId: user.parentId || null,
      name: user.name,
      email: user.email,
      username: user.username,
      permissions: effectivePermissions,
      tokenVersion: user.tokenVersion || 0
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h', algorithm: 'HS256' });
    const refreshSecret = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
    const refreshToken = jwt.sign({ id: user.id, tokenVersion: user.tokenVersion || 0 }, refreshSecret, { expiresIn: '7d', algorithm: 'HS256' });

    const { password: _, ...userData } = user.toJSON();
    userData.role = effectiveRole;
    userData.permissions = effectivePermissions;
    try {
      const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
      const baseCookie = { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', path: '/' };
      res.cookie('access_token', token, { ...baseCookie, maxAge: 12 * 60 * 60 * 1000 });
      res.cookie('refresh_token', refreshToken, { ...baseCookie, maxAge: 7 * 24 * 60 * 60 * 1000 });
    } catch {}
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
  { name: 'planId', required: false, type: 'string' },
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

    const school = await School.create({ name: schoolName, email: adminEmail });
    await SchoolSettings.create({
      schoolId: school.id,
      schoolName,
      schoolAddress: '',
      academicYearStart: new Date().toISOString().split('T')[0],
      academicYearEnd: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notifications: JSON.stringify({ email: true, sms: false, push: true })
    });

    let plan = null;
    try {
      const inputPlanId = req.body?.planId;
      if (inputPlanId !== undefined && inputPlanId !== null && String(inputPlanId).trim() !== '') {
        const pid = String(inputPlanId);
        plan = await Plan.findOne({ where: { id: pid } });
      }
    } catch { }
    if (!plan) {
      plan = await Plan.findOne({ where: { recommended: true } });
    }
    if (!plan) {
      plan = await Plan.findOne();
    }
    // 30 Days Trial Period
    const renewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await Subscription.create({ schoolId: school.id, planId: plan?.id || null, status: 'TRIAL', startDate: new Date(), endDate: renewal, renewalDate: renewal });

    const hashed = await bcrypt.hash(adminPassword, 10);
<<<<<<< HEAD
    const user = await User.create({ name: adminName, email: adminEmail, username: adminEmail, password: hashed, role: 'SchoolAdmin', schoolId: school.id, schoolRole: 'مدير', permissions: ['VIEW_DASHBOARD', 'MANAGE_STUDENTS', 'MANAGE_TEACHERS', 'MANAGE_PARENTS', 'MANAGE_CLASSES', 'MANAGE_FINANCE', 'MANAGE_TRANSPORTATION', 'MANAGE_ATTENDANCE', 'MANAGE_GRADES', 'MANAGE_REPORTS', 'MANAGE_SETTINGS', 'MANAGE_MODULES'] });

    const payload = { id: user.id, role: user.role, schoolId: user.schoolId || null, name: user.name, email: user.email, username: user.username, permissions: user.permissions || [], tokenVersion: user.tokenVersion || 0 };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h', algorithm: 'HS256' });
=======
    const user = await User.create({ name: adminName, email: adminEmail, username: adminEmail, password: hashed, role: 'SchoolAdmin', schoolId: school.id, schoolRole: 'مدير', permissions: derivePermissionsForUser({ role: 'SchoolAdmin', schoolRole: 'مدير' }) });

    const effectiveRole = deriveDesiredDbRole({ role: user.role, schoolRole: user.schoolRole });
    const effectivePermissions = derivePermissionsForUser({ role: effectiveRole, schoolRole: user.schoolRole });
    const payload = { id: user.id, role: effectiveRole, schoolId: user.schoolId || null, name: user.name, email: user.email, username: user.username, permissions: effectivePermissions, tokenVersion: user.tokenVersion || 0 };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
    const refreshSecret = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
    const refreshToken = jwt.sign({ id: user.id, tokenVersion: user.tokenVersion || 0 }, refreshSecret, { expiresIn: '7d', algorithm: 'HS256' });

    const data = user.toJSON();
    delete data.password;
    data.role = effectiveRole;
    data.permissions = effectivePermissions;
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
    const effectiveRole = deriveDesiredDbRole({ role: data.role, schoolRole: data.schoolRole });
    const effectivePermissions = derivePermissionsForUser({ role: effectiveRole, schoolRole: data.schoolRole });
    data.role = effectiveRole;
    data.permissions = effectivePermissions;
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
    const payload = jwt.verify(token, refreshSecret, { algorithms: ['HS256'] });
    const user = await User.findByPk(payload.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (Number(user.tokenVersion || 0) !== Number(payload.tokenVersion || 0)) return res.status(401).json({ msg: 'Token revoked' });
<<<<<<< HEAD
    const access = jwt.sign({ id: user.id, role: user.role, schoolId: user.schoolId || null, teacherId: user.teacherId || null, parentId: user.parentId || null, name: user.name, email: user.email, username: user.username, permissions: user.permissions || [], tokenVersion: user.tokenVersion || 0 }, JWT_SECRET, { expiresIn: '12h', algorithm: 'HS256' });
=======
    const effectiveRole = deriveDesiredDbRole({ role: user.role, schoolRole: user.schoolRole });
    const effectivePermissions = derivePermissionsForUser({ role: effectiveRole, schoolRole: user.schoolRole });
    const access = jwt.sign({ id: user.id, role: effectiveRole, schoolId: user.schoolId || null, teacherId: user.teacherId || null, parentId: user.parentId || null, name: user.name, email: user.email, username: user.username, permissions: effectivePermissions, tokenVersion: user.tokenVersion || 0 }, JWT_SECRET, { expiresIn: '12h' });
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
    res.json({ token: access });
  } catch (e) {
    res.status(401).json({ msg: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const baseCookie = { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', path: '/' };
    res.clearCookie('access_token', baseCookie);
    res.clearCookie('refresh_token', baseCookie);
    res.json({ msg: 'Logged out' });
  } catch (e) {
    res.status(500).json({ msg: 'Server Error' });
  }
});
// Set password via invite token
router.post('/invite/set-password', validate([
  { name: 'token', required: true, type: 'string' },
  { name: 'newPassword', required: true, type: 'string' }
]), async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    let payload;
    try { payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }); } catch { return res.status(401).json({ msg: 'Invalid or expired token' }); }
    if (String(payload.type || '') !== 'invite') return res.status(401).json({ msg: 'Invalid token type' });
    const user = await User.findByPk(Number(payload.id));
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const tr = String(payload.targetRole || '').toUpperCase();
    const ur = String(user.role || '').toUpperCase();
    if (tr && tr !== ur) {
      const isLegacyDriverToken = tr === 'STAFF' && ur === 'DRIVER' && String(user.schoolRole || '') === 'سائق';
      if (!isLegacyDriverToken) return res.status(403).json({ msg: 'Invalid role for invite token' });
    }
    const ptv = Number(payload.tokenVersion || 0);
    const utv = Number(user.tokenVersion || 0);
    if (ptv !== utv) return res.status(401).json({ msg: 'Token revoked' });
    if (!isStrongPassword(newPassword)) return res.status(400).json({ msg: 'Weak password' });
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordMustChange = false;
    user.lastPasswordChangeAt = new Date();
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    const effectiveRole = deriveDesiredDbRole({ role: user.role, schoolRole: user.schoolRole });
    const effectivePermissions = derivePermissionsForUser({ role: effectiveRole, schoolRole: user.schoolRole });
    const accessPayload = {
      id: user.id,
      role: effectiveRole,
      schoolId: user.schoolId || null,
      teacherId: user.teacherId || null,
      parentId: user.parentId || null,
      name: user.name,
      email: user.email,
      username: user.username,
      permissions: effectivePermissions,
      tokenVersion: user.tokenVersion || 0
    };
    const accessToken = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: '12h', algorithm: 'HS256' });
    const refreshSecret = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
    const refreshToken = jwt.sign({ id: user.id, tokenVersion: user.tokenVersion || 0 }, refreshSecret, { expiresIn: '7d', algorithm: 'HS256' });
    const userJson = user.toJSON();
    delete userJson.password;
    userJson.role = effectiveRole;
    userJson.permissions = effectivePermissions;
    return res.json({ token: accessToken, refreshToken, user: userJson });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ msg: 'Server Error' });
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

<<<<<<< HEAD
router.post('/parent/invite', inviteLimiter, verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'STAFF'), validate([
=======
router.post('/parent/invite', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'STAFF'), requirePermission('MANAGE_PARENTS'), requireModule('parent_portal'), rateLimit({ name: 'invite_parent', windowMs: 60000, max: 5 }), validate([
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
  { name: 'parentId', required: true, type: 'string' },
  { name: 'channel', required: false, type: 'string' }
]), async (req, res) => {
  try {
    const pid = Number(req.body.parentId);
    if (!pid) return res.status(400).json({ msg: 'Invalid parentId' });
    const parent = await Parent.findByPk(pid);
<<<<<<< HEAD
    if (!parent) {
      await auditLogger.logInviteFailed(req, {
        targetType: 'Parent',
        targetId: pid,
        channel: req.body.channel,
        errorMessage: 'Parent not found',
        metadata: { parentId: pid }
      });
      return res.status(404).json({ msg: 'Parent not found' });
    }
    if (req.user.role !== 'SUPER_ADMIN' && Number(req.user.schoolId || 0) !== Number(parent.schoolId || 0)) {
      await auditLogger.logInviteFailed(req, {
        targetType: 'Parent',
        targetId: pid,
        channel: req.body.channel,
        errorMessage: 'Access denied - different school',
        metadata: { parentId: pid, parentSchoolId: parent.schoolId }
      });
      return res.status(403).json({ msg: 'Access denied' });
    }
    const channel = String(req.body.channel || 'email').toLowerCase();

    // Validate email if channel is email
    if (channel === 'email' && parent.email) {
      const emailValidation = await emailValidator.quickValidate(parent.email);
      if (!emailValidation.valid) {
        await auditLogger.logInviteFailed(req, {
          targetType: 'Parent',
          targetId: pid,
          channel: 'email',
          errorMessage: `Invalid email: ${emailValidation.errors.join(', ')}`,
          metadata: { email: parent.email, errors: emailValidation.errors }
        });
        return res.status(400).json({
          msg: 'Invalid email address',
          errors: emailValidation.errors
        });
      }
    }
=======
    if (!parent) return res.status(404).json({ msg: 'Parent not found' });
    if (!canAccessSchool(req.user, parent.schoolId)) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    const channel = String(req.body.channel || 'email').toLowerCase();
    const emailValid = /.+@.+\..+/.test(String(parent.email || '').trim());
    const phoneValid = /^[0-9+\-()\s]{5,}$/.test(String(parent.phone || '').trim());
    const expHours = Number(process.env.INVITE_TOKEN_EXPIRY_HOURS || 72);
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const baseEnv = process.env.FRONTEND_URL || '';
    const computedBase = (baseEnv || String(req.headers.origin || 'http://localhost:3000')).replace(/\/$/, '');
    if (!baseEnv && isProd) return res.status(500).json({ msg: 'FRONTEND_URL not configured' });
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
    let user = await User.findOne({ where: { parentId: parent.id } });
    if (!user) {
      const placeholder = Math.random().toString(36).slice(-12) + 'Aa!1';
      const hashed = await bcrypt.hash(placeholder, 10);
      user = await User.create({ email: parent.email, username: parent.email, password: hashed, name: parent.name, role: 'Parent', schoolId: parent.schoolId, parentId: parent.id, passwordMustChange: true, isActive: true, tokenVersion: 0 });
    } else {
      user.email = parent.email;
      user.username = parent.email;
      user.name = parent.name;
      user.role = 'Parent';
      user.schoolId = parent.schoolId;
      user.parentId = parent.id;
      user.isActive = true;
      user.passwordMustChange = true;
      user.tokenVersion = Number(user.tokenVersion || 0) + 1;
      user.lastPasswordChangeAt = new Date();
      await user.save();
    }
    parent.status = 'Invited';
    await parent.save();

<<<<<<< HEAD
    const inviteToken = jwt.sign({ id: user.id, type: 'invite', targetRole: 'Parent', tokenVersion: user.tokenVersion || 0 }, JWT_SECRET, { expiresIn: '72h' });
    const base = process.env.FRONTEND_URL || 'http://localhost:3000';
    const activationLink = `${base.replace(/\/$/, '')}/set-password?token=${encodeURIComponent(inviteToken)}`;

    // Record invite metadata
    try {
      user.lastInviteAt = new Date();
      user.lastInviteChannel = channel;
      await user.save();
    } catch { }

=======
    const inviteToken = jwt.sign({ id: user.id, type: 'invite', targetRole: 'Parent', tokenVersion: user.tokenVersion || 0 }, JWT_SECRET, { expiresIn: `${expHours}h` });
    const activationLink = `${computedBase}/set-password?token=${encodeURIComponent(inviteToken)}`;
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
    if (channel === 'email') {
      if (!emailValid) {
        await require('../models').AuditLog.create({
          action: 'invite_parent_invalid_email',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ parentId: String(parent.id), channel: 'email', reason: 'invalid_email', activationLink })
        }).catch(() => {});
        return res.status(400).json({ invited: false, parentId: String(parent.id), userId: String(user.id), inviteSent: false, channel: 'email', code: 'INVALID_CHANNEL', activationLink });
      }
      try {
        const EmailService = require('../services/EmailService');
        await EmailService.sendActivationInvite(parent.email, parent.name, 'Parent', activationLink, '', parent.schoolId);
        await require('../models').AuditLog.create({
          action: 'invite_parent_email',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ parentId: String(parent.id), channel: 'email', inviteSent: true })
        }).catch(() => {});
        return res.status(201).json({ invited: true, parentId: String(parent.id), userId: String(user.id), inviteSent: true, channel: 'email', activationLink });
      } catch (e) {
        await require('../models').AuditLog.create({
          action: 'invite_parent_email_failed',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ parentId: String(parent.id), channel: 'email', inviteSent: false, error: e?.message || String(e) })
        }).catch(() => {});
        return res.status(201).json({ invited: true, parentId: String(parent.id), userId: String(user.id), inviteSent: false, channel: 'email' });
      }
    }
    if (channel === 'sms') {
      if (!phoneValid) {
        await require('../models').AuditLog.create({
          action: 'invite_parent_invalid_phone',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ parentId: String(parent.id), channel: 'sms', reason: 'invalid_phone', activationLink })
        }).catch(() => {});
        return res.status(400).json({ invited: false, parentId: String(parent.id), userId: String(user.id), inviteSent: false, channel: 'sms', code: 'INVALID_CHANNEL', activationLink });
      }
      try {
        const SmsService = require('../services/SmsService');
        const ok = await SmsService.sendActivationInvite(parent.phone, parent.name, 'Parent', activationLink, '', parent.schoolId);
        await require('../models').AuditLog.create({
          action: 'invite_parent_sms',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ parentId: String(parent.id), channel: 'sms', inviteSent: !!ok })
        }).catch(() => {});
        return res.status(201).json({ invited: true, parentId: String(parent.id), userId: String(user.id), inviteSent: !!ok, channel: 'sms', activationLink });
      } catch (e) {
        return res.status(201).json({ invited: true, parentId: String(parent.id), userId: String(user.id), inviteSent: false, channel: 'sms' });
      }
    }
    await require('../models').AuditLog.create({
      action: 'invite_parent_manual',
      userId: req.user.id,
      userEmail: req.user.email || null,
      ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
      userAgent: req.headers['user-agent'] || '',
      details: JSON.stringify({ parentId: String(parent.id), channel: 'manual' })
    }).catch(() => {});
    return res.status(201).json({ invited: true, parentId: String(parent.id), userId: String(user.id), inviteSent: false, channel: 'manual', activationLink });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

<<<<<<< HEAD
router.post('/teacher/invite', inviteLimiter, verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'STAFF'), validate([
=======
router.post('/teacher/invite', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'STAFF'), requirePermission('MANAGE_TEACHERS'), requireModule('teacher_portal'), rateLimit({ name: 'invite_teacher', windowMs: 60000, max: 5 }), validate([
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
  { name: 'teacherId', required: true, type: 'string' },
  { name: 'channel', required: false, type: 'string' }
]), async (req, res) => {
  try {
    const tid = Number(req.body.teacherId);
    if (!Number.isFinite(tid) || tid <= 0) return res.status(400).json({ msg: 'Invalid teacherId' });
    const teacher = await Teacher.findByPk(tid);
    if (!teacher) return res.status(404).json({ msg: 'Teacher not found' });
    if (!canAccessSchool(req.user, teacher.schoolId)) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    const channel = String(req.body.channel || 'email').toLowerCase();
    const rawIdentifier = String(teacher.email || teacher.username || '').trim().toLowerCase();
    const isValidEmail = /.+@.+\..+/.test(rawIdentifier);
    const emailForUser = isValidEmail ? rawIdentifier : `teacher-${teacher.id}-school-${teacher.schoolId}@no-reply.example.com`;
    const usernameForUser = isValidEmail ? rawIdentifier : (String(teacher.username || '').trim() || `teacher_${teacher.id}`);
    const phoneValid = /^[0-9+\-()\s]{5,}$/.test(String(teacher.phone || '').trim());
    const expHours = Number(process.env.INVITE_TOKEN_EXPIRY_HOURS || 72);
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const baseEnv = process.env.FRONTEND_URL || '';
    const computedBase = (baseEnv || String(req.headers.origin || 'http://localhost:3000')).replace(/\/$/, '');
    if (!baseEnv && isProd) return res.status(500).json({ msg: 'FRONTEND_URL not configured' });
    let tUser = await User.findOne({ where: { teacherId: teacher.id } });
    if (!tUser) {
      const placeholder = Math.random().toString(36).slice(-12) + 'Aa!1';
      const hashed = await bcrypt.hash(placeholder, 10);
      tUser = await User.create({ email: emailForUser, username: usernameForUser || null, password: hashed, name: teacher.name, role: 'Teacher', schoolId: teacher.schoolId, teacherId: teacher.id, passwordMustChange: true, isActive: true, tokenVersion: 0 });
    } else {
      tUser.email = emailForUser;
      if (usernameForUser) tUser.username = usernameForUser;
      tUser.name = teacher.name;
      tUser.role = 'Teacher';
      tUser.schoolId = teacher.schoolId;
      tUser.teacherId = teacher.id;
      tUser.isActive = true;
      tUser.passwordMustChange = true;
      tUser.tokenVersion = Number(tUser.tokenVersion || 0) + 1;
      tUser.lastPasswordChangeAt = new Date();
      await tUser.save();
    }
    const inviteToken = jwt.sign({ id: tUser.id, type: 'invite', targetRole: 'Teacher', tokenVersion: tUser.tokenVersion || 0 }, JWT_SECRET, { expiresIn: `${expHours}h` });
    const activationLink = `${computedBase}/set-password?token=${encodeURIComponent(inviteToken)}`;
    // Record invite metadata
    try { tUser.lastInviteAt = new Date(); tUser.lastInviteChannel = channel; await tUser.save(); } catch { }
    if (channel === 'email' && isValidEmail) {
      try {
        const EmailService = require('../services/EmailService');
        await EmailService.sendActivationInvite(rawIdentifier, teacher.name, 'Teacher', activationLink, '', teacher.schoolId);
        await require('../models').AuditLog.create({
          action: 'invite_teacher_email',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ teacherId: String(teacher.id), channel: 'email', inviteSent: true })
        }).catch(() => {});
        return res.status(201).json({ invited: true, teacherId: String(teacher.id), userId: String(tUser.id), inviteSent: true, channel: 'email', activationLink });
      } catch (e2) {
        await require('../models').AuditLog.create({
          action: 'invite_teacher_email_failed',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ teacherId: String(teacher.id), channel: 'email', inviteSent: false, error: e2?.message || String(e2) })
        }).catch(() => {});
        return res.status(201).json({ invited: true, teacherId: String(teacher.id), userId: String(tUser.id), inviteSent: false, channel: 'email' });
      }
    }
    if (channel === 'sms') {
      if (!phoneValid) {
        await require('../models').AuditLog.create({
          action: 'invite_teacher_invalid_phone',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ teacherId: String(teacher.id), channel: 'sms', reason: 'invalid_phone', activationLink })
        }).catch(() => {});
        return res.status(400).json({ invited: false, teacherId: String(teacher.id), userId: String(tUser.id), inviteSent: false, channel: 'sms', code: 'INVALID_CHANNEL', activationLink });
      }
      try {
        const SmsService = require('../services/SmsService');
        const ok = await SmsService.sendActivationInvite(teacher.phone, teacher.name, 'Teacher', activationLink, '', teacher.schoolId);
        await require('../models').AuditLog.create({
          action: 'invite_teacher_sms',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ teacherId: String(teacher.id), channel: 'sms', inviteSent: !!ok })
        }).catch(() => {});
        return res.status(201).json({ invited: true, teacherId: String(teacher.id), userId: String(tUser.id), inviteSent: !!ok, channel: 'sms', activationLink });
      } catch (e) {
        return res.status(201).json({ invited: true, teacherId: String(teacher.id), userId: String(tUser.id), inviteSent: false, channel: 'sms' });
      }
    }
    await require('../models').AuditLog.create({
      action: 'invite_teacher_manual',
      userId: req.user.id,
      userEmail: req.user.email || null,
      ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
      userAgent: req.headers['user-agent'] || '',
      details: JSON.stringify({ teacherId: String(teacher.id), channel: 'manual' })
    }).catch(() => {});
    return res.status(201).json({ invited: true, teacherId: String(teacher.id), userId: String(tUser.id), inviteSent: false, channel: 'manual', activationLink });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

<<<<<<< HEAD
router.post('/staff/invite', inviteLimiter, verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'STAFF'), validate([
=======
router.post('/parent/invite/revoke', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'STAFF'), requirePermission('MANAGE_PARENTS'), requireModule('parent_portal'), validate([{ name: 'parentId', required: true, type: 'string' }]), async (req, res) => {
  try {
    const pid = Number(req.body.parentId);
    if (!pid) return res.status(400).json({ msg: 'Invalid parentId' });
    const parent = await Parent.findByPk(pid);
    if (!parent) return res.status(404).json({ msg: 'Parent not found' });
    if (!canAccessSchool(req.user, parent.schoolId)) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    const user = await User.findOne({ where: { parentId: parent.id } });
    if (!user) return res.status(404).json({ msg: 'User not found' });
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    user.lastInviteAt = null;
    await user.save();
    await require('../models').AuditLog.create({
      action: 'invite_parent_revoke',
      userId: req.user.id,
      userEmail: req.user.email || null,
      ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
      userAgent: req.headers['user-agent'] || '',
      details: JSON.stringify({ parentId: String(parent.id), userId: String(user.id) })
    }).catch(() => {});
    return res.status(200).json({ revoked: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.post('/teacher/invite/revoke', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'STAFF'), requirePermission('MANAGE_TEACHERS'), requireModule('teacher_portal'), validate([{ name: 'teacherId', required: true, type: 'string' }]), async (req, res) => {
  try {
    const tid = Number(req.body.teacherId);
    if (!Number.isFinite(tid) || tid <= 0) return res.status(400).json({ msg: 'Invalid teacherId' });
    const teacher = await Teacher.findByPk(tid);
    if (!teacher) return res.status(404).json({ msg: 'Teacher not found' });
    if (!canAccessSchool(req.user, teacher.schoolId)) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    const user = await User.findOne({ where: { teacherId: teacher.id } });
    if (!user) return res.status(404).json({ msg: 'User not found' });
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    user.lastInviteAt = null;
    await user.save();
    await require('../models').AuditLog.create({
      action: 'invite_teacher_revoke',
      userId: req.user.id,
      userEmail: req.user.email || null,
      ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
      userAgent: req.headers['user-agent'] || '',
      details: JSON.stringify({ teacherId: String(teacher.id), userId: String(user.id) })
    }).catch(() => {});
    return res.status(200).json({ revoked: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.post('/staff/invite', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'STAFF'), requirePermission('MANAGE_STAFF'), rateLimit({ name: 'invite_staff', windowMs: 60000, max: 5 }), validate([
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
  { name: 'userId', required: true, type: 'string' },
  { name: 'channel', required: false, type: 'string' }
]), async (req, res) => {
  try {
    const uid = Number(req.body.userId);
    if (!uid) return res.status(400).json({ msg: 'Invalid userId' });
    let staff = await User.findByPk(uid);
    if (!staff) return res.status(404).json({ msg: 'Staff not found' });
    if (!canAccessSchool(req.user, staff.schoolId)) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    const staffRole = normalizeUserRole(staff);
    if (staffRole !== 'STAFF' && staffRole !== 'SCHOOL_ADMIN') {
      return res.status(400).json({ msg: 'Not a staff user' });
    }
    const channel = String(req.body.channel || 'email').toLowerCase();
    const emailRaw = String(staff.email || staff.username || '').trim().toLowerCase();
    const isValidEmail = /.+@.+\..+/.test(emailRaw);
    const phoneValid = /^[0-9+\-()\s]{5,}$/.test(String(staff.phone || '').trim());
    if (!staff.password || staff.passwordMustChange === undefined) {
      const placeholder = Math.random().toString(36).slice(-12) + 'Aa!1';
      const hashed = await bcrypt.hash(placeholder, 10);
      staff.password = hashed;
    }
    staff.passwordMustChange = true;
    staff.isActive = true;
    staff.tokenVersion = Number(staff.tokenVersion || 0) + 1;
    staff.lastPasswordChangeAt = new Date();
    staff.lastInviteAt = new Date();
    staff.lastInviteChannel = channel;
    await staff.save();

<<<<<<< HEAD
    const inviteToken = jwt.sign({ id: staff.id, type: 'invite', targetRole: 'Staff', tokenVersion: staff.tokenVersion || 0 }, JWT_SECRET, { expiresIn: '72h' });
    const base = process.env.FRONTEND_URL || 'http://localhost:3000';
    const activationLink = `${base.replace(/\/$/, '')}/set-password?token=${encodeURIComponent(inviteToken)}`;

    // Record invite metadata
    try {
      staff.lastInviteAt = new Date();
      staff.lastInviteChannel = channel;
      await staff.save();
    } catch { }

=======
    const expHours = Number(process.env.INVITE_TOKEN_EXPIRY_HOURS || 72);
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const baseEnv = process.env.FRONTEND_URL || '';
    const computedBase = (baseEnv || String(req.headers.origin || 'http://localhost:3000')).replace(/\/$/, '');
    if (!baseEnv && isProd) return res.status(500).json({ msg: 'FRONTEND_URL not configured' });
    const normalizedRole = String(staff.role || '').toUpperCase();
    const targetRole = normalizedRole === 'SCHOOLADMIN' ? 'SchoolAdmin' : 'Staff';
    const inviteToken = jwt.sign({ id: staff.id, type: 'invite', targetRole, tokenVersion: staff.tokenVersion || 0 }, JWT_SECRET, { expiresIn: `${expHours}h` });
    const activationLink = `${computedBase}/set-password?token=${encodeURIComponent(inviteToken)}`;
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
    if (channel === 'email') {
      if (!isValidEmail) {
        await require('../models').AuditLog.create({
          action: 'invite_staff_invalid_email',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ staffId: String(staff.id), channel: 'email', reason: 'invalid_email', activationLink })
        }).catch(() => {});
        return res.status(400).json({ invited: false, userId: String(staff.id), inviteSent: false, channel: 'email', code: 'INVALID_CHANNEL', activationLink });
      }
      try {
        const EmailService = require('../services/EmailService');
        await EmailService.sendActivationInvite(emailRaw, staff.name, targetRole, activationLink, '', staff.schoolId);
        await require('../models').AuditLog.create({
          action: 'invite_staff_email',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ staffId: String(staff.id), channel: 'email', inviteSent: true })
        }).catch(() => {});
        return res.status(201).json({ invited: true, userId: String(staff.id), inviteSent: true, channel: 'email', activationLink });
      } catch (e2) {
        await require('../models').AuditLog.create({
          action: 'invite_staff_email_failed',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ staffId: String(staff.id), channel: 'email', inviteSent: false, error: e2?.message || String(e2) })
        }).catch(() => {});
        return res.status(201).json({ invited: true, userId: String(staff.id), inviteSent: false, channel: 'email' });
      }
    }
    if (channel === 'sms') {
      if (!phoneValid) {
        await require('../models').AuditLog.create({
          action: 'invite_staff_invalid_phone',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ staffId: String(staff.id), channel: 'sms', reason: 'invalid_phone', activationLink })
        }).catch(() => {});
        return res.status(400).json({ invited: false, userId: String(staff.id), inviteSent: false, channel: 'sms', code: 'INVALID_CHANNEL', activationLink });
      }
      try {
        const SmsService = require('../services/SmsService');
        const ok = await SmsService.sendActivationInvite(staff.phone, staff.name, targetRole, activationLink, '', staff.schoolId);
        await require('../models').AuditLog.create({
          action: 'invite_staff_sms',
          userId: req.user.id,
          userEmail: req.user.email || null,
          ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
          userAgent: req.headers['user-agent'] || '',
          details: JSON.stringify({ staffId: String(staff.id), channel: 'sms', inviteSent: !!ok })
        }).catch(() => {});
        return res.status(201).json({ invited: true, userId: String(staff.id), inviteSent: !!ok, channel: 'sms', activationLink });
      } catch (e3) {
        return res.status(201).json({ invited: true, userId: String(staff.id), inviteSent: false, channel: 'sms' });
      }
    }
    await require('../models').AuditLog.create({
      action: 'invite_staff_manual',
      userId: req.user.id,
      userEmail: req.user.email || null,
      ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString(),
      userAgent: req.headers['user-agent'] || '',
      details: JSON.stringify({ staffId: String(staff.id), channel: 'manual' })
    }).catch(() => {});
    return res.status(201).json({ invited: true, userId: String(staff.id), inviteSent: false, channel: 'manual', activationLink });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});
