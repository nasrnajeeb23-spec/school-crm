const bcrypt = require('bcryptjs');
const { sequelize, User, School } = require('../models');

async function ensureSchool(id) {
  const school = await School.findByPk(id);
  if (!school) throw new Error(`School with id ${id} not found`);
}

async function up() {
  try {
    await ensureSchool(1);

    const staffList = [
      { name: 'مدير مدرسة النهضة', email: 'admin2@school.com', role: 'SchoolAdmin', schoolId: 1, schoolRole: 'مدير' },
      { name: 'فهد عبدالعزيز', email: 'registrar@school.com', role: 'SchoolAdmin', schoolId: 1, schoolRole: 'مسؤول تسجيل' },
      { name: 'سارة الحسن', email: 'accountant@school.com', role: 'SchoolAdmin', schoolId: 1, schoolRole: 'مسؤول مالي' },
      { name: 'عبدالعزيز العتيبي', email: 'academic@school.com', role: 'SchoolAdmin', schoolId: 1, schoolRole: 'منسق أكاديمي' },
    ];

    const permissionsMap = {
      'مسؤول تسجيل': ['VIEW_DASHBOARD', 'MANAGE_STUDENTS', 'MANAGE_PARENTS', 'MANAGE_ATTENDANCE'],
      'مسؤول مالي': ['VIEW_DASHBOARD', 'MANAGE_FINANCE', 'MANAGE_REPORTS'],
      'منسق أكاديمي': ['VIEW_DASHBOARD', 'MANAGE_CLASSES', 'MANAGE_ATTENDANCE', 'MANAGE_GRADES', 'MANAGE_TEACHERS'],
      'مدير': ['VIEW_DASHBOARD', 'MANAGE_STUDENTS', 'MANAGE_TEACHERS', 'MANAGE_PARENTS', 'MANAGE_CLASSES', 'MANAGE_FINANCE', 'MANAGE_TRANSPORTATION', 'MANAGE_REPORTS', 'MANAGE_SETTINGS', 'MANAGE_MODULES'],
    };

    let created = 0;
    for (const s of staffList) {
      const existing = await User.findOne({ where: { email: s.email } });
      if (existing) continue;
      const usernameBase = s.email.split('@')[0];
      let username = usernameBase;
      const dupe = await User.findOne({ where: { username } });
      if (dupe) username = `${usernameBase}_${Date.now()}`;
      const tempPassword = 'password';
      const hashed = await bcrypt.hash(tempPassword, 10);
      await User.create({
        name: s.name,
        email: s.email,
        username,
        password: hashed,
        role: s.role,
        schoolId: s.schoolId,
        schoolRole: s.schoolRole,
        permissions: permissionsMap[s.schoolRole] || ['VIEW_DASHBOARD'],
        passwordMustChange: true,
        tokenVersion: 0,
      });
      created++;
    }

    console.log(`Seeded ${created} staff accounts for school 1.`);
  } catch (e) {
    console.error('Failed to seed staff:', e.message || e);
    process.exitCode = 1;
  } finally {
    try { await sequelize.close(); } catch {}
  }
}

up();