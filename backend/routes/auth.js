const express = require('express');
const router = express.Router();
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const bcrypt = require('bcryptjs');
const { verifyToken } = require('../middleware/auth');
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
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // Update last login
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