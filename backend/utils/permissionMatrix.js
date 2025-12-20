function uniq(list) {
  return Array.from(new Set((Array.isArray(list) ? list : []).filter(Boolean)));
}

const ALL_PERMISSIONS = [
  'VIEW_DASHBOARD',
  'VIEW_STUDENTS',
  'VIEW_TEACHERS',
  'VIEW_PARENTS',
  'VIEW_CLASSES',
  'VIEW_ATTENDANCE',
  'VIEW_SCHEDULE',
  'VIEW_CALENDAR',
  'VIEW_GRADES',
  'VIEW_MESSAGING',
  'VIEW_FINANCE',
  'VIEW_REPORTS',
  'VIEW_SETTINGS',
  'VIEW_STAFF',
  'VIEW_TRANSPORTATION',
  'VIEW_MODULES',
  'MANAGE_STUDENTS',
  'MANAGE_TEACHERS',
  'MANAGE_PARENTS',
  'MANAGE_CLASSES',
  'MANAGE_ATTENDANCE',
  'MANAGE_SCHEDULE',
  'MANAGE_CALENDAR',
  'MANAGE_GRADES',
  'MANAGE_MESSAGING',
  'MANAGE_FINANCE',
  'MANAGE_REPORTS',
  'MANAGE_SETTINGS',
  'MANAGE_STAFF',
  'MANAGE_TRANSPORTATION',
  'MANAGE_MODULES',
];

function normalizeDbRole(role) {
  const r = String(role || '').trim();
  if (!r) return '';
  const key = r.toLowerCase();
  if (key === 'superadmin') return 'SuperAdmin';
  if (key === 'superadminfinancial') return 'SuperAdminFinancial';
  if (key === 'superadmintechnical') return 'SuperAdminTechnical';
  if (key === 'superadminsupervisor') return 'SuperAdminSupervisor';
  if (key === 'schooladmin') return 'SchoolAdmin';
  if (key === 'teacher') return 'Teacher';
  if (key === 'parent') return 'Parent';
  if (key === 'staff') return 'Staff';
  if (key === 'driver') return 'Driver';
  return r;
}

function roleKind(role) {
  const r = normalizeDbRole(role);
  if (!r) return '';
  if (r.startsWith('SuperAdmin')) return 'superadmin';
  if (r === 'SchoolAdmin') return 'school_admin';
  if (r === 'Staff') return 'staff';
  if (r === 'Driver') return 'driver';
  if (r === 'Teacher') return 'teacher';
  if (r === 'Parent') return 'parent';
  return String(r).toLowerCase();
}

function normalizeSchoolRole(schoolRole) {
  return String(schoolRole || '').trim();
}

function deriveDesiredDbRole({ role, schoolRole }) {
  const rk = roleKind(role);
  const sr = normalizeSchoolRole(schoolRole);

  if (rk === 'superadmin' || rk === 'teacher' || rk === 'parent') return normalizeDbRole(role);
  if (sr === 'مدير') return 'SchoolAdmin';
  if (sr === 'سائق') return 'Driver';
  if (sr) return 'Staff';
  if (rk === 'school_admin') return 'SchoolAdmin';
  if (rk === 'staff') return 'Staff';
  if (rk === 'driver') return 'Driver';
  return normalizeDbRole(role);
}

function derivePermissionsForUser({ role, schoolRole }) {
  const rk = roleKind(role);
  const sr = normalizeSchoolRole(schoolRole);

  if (rk === 'superadmin') return ALL_PERMISSIONS.slice();

  if (rk === 'school_admin' || sr === 'مدير') return ALL_PERMISSIONS.slice();

  if (rk === 'driver') return [];
  if (sr === 'سائق') return [];

  if (rk !== 'staff') return [];

  const map = {
    'مسؤول تسجيل': ['VIEW_DASHBOARD', 'MANAGE_STUDENTS', 'MANAGE_PARENTS', 'MANAGE_ATTENDANCE'],
    'مسؤول مالي': ['VIEW_DASHBOARD', 'MANAGE_FINANCE', 'MANAGE_REPORTS'],
    'منسق أكاديمي': ['VIEW_DASHBOARD', 'MANAGE_CLASSES', 'MANAGE_TEACHERS', 'MANAGE_GRADES', 'MANAGE_SCHEDULE', 'MANAGE_ATTENDANCE'],
    'سكرتير': ['VIEW_DASHBOARD', 'MANAGE_MESSAGING'],
    'مشرف': ['VIEW_DASHBOARD', 'MANAGE_ATTENDANCE', 'MANAGE_REPORTS'],
    'منسق نقل': ['VIEW_DASHBOARD', 'MANAGE_TRANSPORTATION'],
  };

  return uniq(map[sr] || ['VIEW_DASHBOARD']);
}

module.exports = {
  ALL_PERMISSIONS,
  deriveDesiredDbRole,
  derivePermissionsForUser,
  normalizeDbRole,
  normalizeSchoolRole,
};
