const express = require('express');
const router = express.Router();
const { User } = require('../models');
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

    const { name, phone, currentPassword, newPassword } = req.body || {};
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;

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