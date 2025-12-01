const express = require('express');
const router = express.Router();
const { User, Teacher, Parent, Student } = require('../models');
const { verifyToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

function isStrongPassword(pwd){
  const lengthOk = typeof pwd === 'string' && pwd.length >= 10;
  const upper = /[A-Z]/.test(pwd);
  const lower = /[a-z]/.test(pwd);
  const digit = /[0-9]/.test(pwd);
  const special = /[^A-Za-z0-9]/.test(pwd);
  return lengthOk && upper && lower && digit && special;
}

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ msg: 'Invalid user id' });
    if (req.user.id !== id) return res.status(403).json({ msg: 'Access denied' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const { name, phone, currentPassword, newPassword, mobilePushToken, appPlatform, appVersion, deviceId } = req.body || {};
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (mobilePushToken !== undefined) user.mobilePushToken = mobilePushToken;
    if (appPlatform !== undefined) user.appPlatform = appPlatform;
    if (appVersion !== undefined) user.appVersion = appVersion;
    if (deviceId !== undefined) user.deviceId = deviceId;

    if (newPassword) {
      const ok = await bcrypt.compare(currentPassword || '', user.password);
      if (!ok) return res.status(401).json({ msg: 'Invalid current password' });
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
 
router.get('/by-role', verifyToken, async (req, res) => {
  try {
    const userRole = String(req.user.role || '').toUpperCase();
    if (!['SCHOOLADMIN','SUPERADMIN','SCHOOL_ADMIN','SUPER_ADMIN'].includes(userRole)) return res.status(403).json({ msg: 'Access denied' });
    const role = String(req.query.role || '').toUpperCase();
    const schoolId = req.query.schoolId ? Number(req.query.schoolId) : null;
    if (userRole.startsWith('SCHOOL') && !schoolId) return res.status(400).json({ msg: 'schoolId is required' });
    if (userRole.startsWith('SCHOOL') && Number(req.user.schoolId || 0) !== Number(schoolId || 0)) return res.status(403).json({ msg: 'Access denied' });
    if (!['TEACHER','PARENT'].includes(role)) return res.status(400).json({ msg: 'Invalid role' });
    if (role === 'TEACHER') {
      const rows = await Teacher.findAll({ where: schoolId ? { schoolId } : {}, order: [['name','ASC']] });
      return res.json(rows.map(t => ({ id: String(t.id), name: t.name })));
    } else {
      const parents = await Parent.findAll({ order: [['name','ASC']] });
      if (!schoolId) return res.json(parents.map(p => ({ id: String(p.id), name: p.name })));
      const studentParents = await Student.findAll({ where: { schoolId }, attributes: ['parentId'] });
      const parentIds = Array.from(new Set(studentParents.map(sp => sp.parentId).filter(Boolean)));
      const filtered = parents.filter(p => parentIds.includes(p.id));
      return res.json(filtered.map(p => ({ id: String(p.id), name: p.name })));
    }
  } catch (e) { console.error(e.message); res.status(500).send('Server Error'); }
});
