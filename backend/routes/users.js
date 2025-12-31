const express = require('express');
const router = express.Router();
const { User, Teacher, Parent, Student } = require('../models');
const { verifyToken, isSuperAdminUser, requireRole, requireSameSchoolQuery, normalizeRole, normalizeUserRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

function isStrongPassword(pwd){
  const lengthOk = typeof pwd === 'string' && pwd.length >= 10;
  const upper = /[A-Z]/.test(pwd);
  const lower = /[a-z]/.test(pwd);
  const digit = /[0-9]/.test(pwd);
  const special = /[^A-Za-z0-9]/.test(pwd);
  return lengthOk && upper && lower && digit && special;
}

// @route   POST api/users
// @desc    Create a new user (SuperAdmin only for SchoolAdmin role)
// @access  Private (SuperAdmin)
router.post('/', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { name, email, password, role, schoolId, phone } = req.body;
    
    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Check if user exists
    let user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ msg: 'Password is too weak. Must be at least 10 characters with uppercase, lowercase, number, and special character.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      schoolId: schoolId ? parseInt(schoolId) : null,
      phone,
      isActive: true,
      isVerified: true
    });

    const userJson = user.toJSON();
    delete userJson.password;

    res.json(userJson);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ msg: 'Invalid user id' });
    
    // Check permissions: User can update self, or SuperAdmin can update anyone
    const isSelf = req.user.id === id;
    const isSuperAdmin = isSuperAdminUser(req.user);
    
    if (!isSelf && !isSuperAdmin) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const { name, email, phone, currentPassword, newPassword, mobilePushToken, appPlatform, appVersion, deviceId, schoolId, isActive, role } = req.body || {};
    
    // Update basic fields
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (mobilePushToken !== undefined) user.mobilePushToken = mobilePushToken;
    if (appPlatform !== undefined) user.appPlatform = appPlatform;
    if (appVersion !== undefined) user.appVersion = appVersion;
    if (deviceId !== undefined) user.deviceId = deviceId;

    // SuperAdmin only fields
    if (isSuperAdmin) {
        if (email !== undefined) {
          const e = String(email || '').trim().toLowerCase();
          const dupe = await User.findOne({ where: { email: e } });
          if (dupe && Number(dupe.id) !== Number(user.id)) {
            return res.status(409).json({ msg: 'Email already in use' });
          }
          user.email = e;
          user.username = e;
        }
        if (schoolId !== undefined) user.schoolId = schoolId;
        if (isActive !== undefined) user.isActive = isActive;
        if (role !== undefined) user.role = role;
    } else if (isSelf && email !== undefined) {
        const e = String(email || '').trim().toLowerCase();
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
        if (!valid) return res.status(400).json({ msg: 'Invalid email format' });
        const ok = await bcrypt.compare(currentPassword || '', user.password);
        if (!ok) return res.status(401).json({ msg: 'Invalid current password' });
        const dupe = await User.findOne({ where: { email: e } });
        if (dupe && Number(dupe.id) !== Number(user.id)) {
          return res.status(409).json({ msg: 'Email already in use' });
        }
        user.email = e;
        user.username = e;
        user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    if (newPassword) {
      // If updating self, require current password. SuperAdmin can reset without it.
      if (isSelf && !isSuperAdmin) {
        const ok = await bcrypt.compare(currentPassword || '', user.password);
        if (!ok) return res.status(401).json({ msg: 'Invalid current password' });
      }
      
      if (!isStrongPassword(newPassword)) return res.status(400).json({ msg: 'Weak password' });
      user.password = await bcrypt.hash(newPassword, 10);
      user.passwordMustChange = false;
      user.lastPasswordChangeAt = new Date();
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    await user.save();
    const data = user.toJSON();
    delete data.password;
    return res.json({ user: data });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
 
const requireSchoolIdForSchoolAdmins = (req, res, next) => {
  const role = normalizeUserRole(req.user);
  if (role === 'SCHOOL_ADMIN') {
    const sid = Number((req.query && req.query.schoolId) || 0);
    if (!sid) return res.status(400).json({ msg: 'schoolId is required' });
  }
  return next();
};

router.get('/by-role', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSchoolIdForSchoolAdmins, requireSameSchoolQuery('schoolId'), async (req, res) => {
  try {
    const role = normalizeRole(String(req.query.role || ''));
    const schoolId = req.query.schoolId ? Number(req.query.schoolId) : null;
    if (!['TEACHER','PARENT','SCHOOL_ADMIN'].includes(role)) return res.status(400).json({ msg: 'Invalid role' });
    if (role === 'TEACHER') {
      const rows = await Teacher.findAll({ where: schoolId ? { schoolId } : {}, order: [['name','ASC']] });
      return res.json(rows.map(t => ({ id: String(t.id), name: t.name })));
    } else if (role === 'PARENT') {
      const parents = await Parent.findAll({ order: [['name','ASC']] });
      if (!schoolId) return res.json(parents.map(p => ({ id: String(p.id), name: p.name })));
      const studentParents = await Student.findAll({ where: { schoolId }, attributes: ['parentId'] });
      const parentIds = Array.from(new Set(studentParents.map(sp => sp.parentId).filter(Boolean)));
      const filtered = parents.filter(p => parentIds.includes(p.id));
      return res.json(filtered.map(p => ({ id: String(p.id), name: p.name })));
    } else {
      const { User } = require('../models');
      const where = schoolId ? { schoolId } : {};
      const rows = await User.findAll({ where, order: [['createdAt','DESC']] });
      const admins = rows.filter(u => {
        return normalizeUserRole(u) === 'SCHOOL_ADMIN';
      });
      const list = admins.map(u => {
        const j = u.toJSON();
        delete j.password;
        return { id: Number(j.id), name: j.name, email: j.email, schoolId: Number(j.schoolId || 0), isActive: !!j.isActive, createdAt: j.createdAt };
      });
      return res.json(list);
    }
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});
