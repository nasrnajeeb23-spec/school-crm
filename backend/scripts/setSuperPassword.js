const bcrypt = require('bcryptjs');
const { User, sequelize } = require('../models');

async function main() {
  try {
    await sequelize.authenticate();
    const email = process.env.SUPERADMIN_EMAIL || 'super@admin.com';
    const pwd = process.env.SUPERADMIN_PASSWORD || '1234567890123456';
    const u = await User.findOne({ where: { email } });
    if (!u) {
      console.error('Super admin user not found:', email);
      process.exit(2);
      return;
    }
    u.password = await bcrypt.hash(String(pwd), 10);
    u.isActive = true;
    await u.save();
    console.log('Super admin password updated for', email);
    process.exit(0);
  } catch (e) {
    console.error('Failed to set super admin password:', e?.message || e);
    process.exit(1);
  }
}

main();
