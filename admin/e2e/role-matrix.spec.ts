import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { Permission } from '../src/types';

type MatrixOutcome = 'ok' | 'redirect' | 'login' | 'accessDenied' | 'error';

type E2EUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  schoolId?: number | null;
  teacherId?: string;
  parentId?: string;
  permissions?: string[];
  passwordMustChange?: boolean;
};

type RoleCase = {
  key: string;
  user: E2EUser;
};

const allSchoolPermissions = Object.values(Permission).map(p => String(p));

const roles: RoleCase[] = [
  {
    key: 'SUPER_ADMIN',
    user: {
      id: 'e2e-super',
      email: 'super@example.local',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      schoolId: null,
    },
  },
  {
    key: 'SUPER_ADMIN_FINANCIAL',
    user: {
      id: 'e2e-super-fin',
      email: 'super.fin@example.local',
      name: 'Super Admin Financial',
      role: 'SUPER_ADMIN_FINANCIAL',
      schoolId: null,
    },
  },
  {
    key: 'SCHOOL_ADMIN',
    user: {
      id: 'e2e-school',
      email: 'admin@school.local',
      name: 'School Admin',
      role: 'SCHOOL_ADMIN',
      schoolId: 1,
      permissions: allSchoolPermissions,
    },
  },
  {
    key: 'STAFF',
    user: {
      id: 'e2e-staff',
      email: 'staff@school.local',
      name: 'Staff',
      role: 'STAFF',
      schoolId: 1,
      permissions: [
        Permission.VIEW_DASHBOARD,
        Permission.MANAGE_STUDENTS,
        Permission.MANAGE_ATTENDANCE,
        Permission.MANAGE_SCHEDULE,
        Permission.MANAGE_CALENDAR,
        Permission.MANAGE_GRADES,
      ].map(p => String(p)),
    },
  },
  {
    key: 'TEACHER',
    user: {
      id: 'e2e-teacher',
      email: 'teacher@school.local',
      name: 'Teacher',
      role: 'TEACHER',
      schoolId: 1,
      teacherId: 't_1',
    },
  },
  {
    key: 'PARENT',
    user: {
      id: 'e2e-parent',
      email: 'parent@school.local',
      name: 'Parent',
      role: 'PARENT',
      schoolId: 1,
      parentId: 'p_1',
    },
  },
];

type RouteCase = {
  key: string;
  path: string;
  allowedRoles: string[];
};

const superAdminRoles = ['SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'];

const routes: RouteCase[] = [
  { key: 'public.home', path: '/', allowedRoles: ['*'] },
  { key: 'public.login', path: '/login', allowedRoles: ['*'] },
  { key: 'public.superadminLogin', path: '/superadmin/login', allowedRoles: ['*'] },
  { key: 'public.join', path: '/join', allowedRoles: ['*'] },
  { key: 'public.apps', path: '/apps', allowedRoles: ['*'] },

  { key: 'superadmin.dashboard', path: '/superadmin/dashboard', allowedRoles: superAdminRoles },
  { key: 'superadmin.schools', path: '/superadmin/schools', allowedRoles: superAdminRoles },
  { key: 'superadmin.schoolManage', path: '/superadmin/schools/1/manage', allowedRoles: superAdminRoles },
  { key: 'superadmin.schoolAdmins', path: '/superadmin/school-admins', allowedRoles: superAdminRoles },
  { key: 'superadmin.team', path: '/superadmin/team', allowedRoles: superAdminRoles },
  { key: 'superadmin.subscriptions', path: '/superadmin/subscriptions', allowedRoles: superAdminRoles },
  { key: 'superadmin.billing', path: '/superadmin/billing', allowedRoles: superAdminRoles },
  { key: 'superadmin.modules', path: '/superadmin/modules', allowedRoles: superAdminRoles },
  { key: 'superadmin.plans', path: '/superadmin/plans', allowedRoles: superAdminRoles },
  { key: 'superadmin.content', path: '/superadmin/content', allowedRoles: superAdminRoles },
  { key: 'superadmin.onboarding', path: '/superadmin/onboarding', allowedRoles: superAdminRoles },
  { key: 'superadmin.usageLimits', path: '/superadmin/usage_limits', allowedRoles: superAdminRoles },
  { key: 'superadmin.permissions', path: '/superadmin/permissions', allowedRoles: superAdminRoles },
  { key: 'superadmin.auditLogs', path: '/superadmin/audit-logs', allowedRoles: superAdminRoles },
  { key: 'superadmin.security', path: '/superadmin/security', allowedRoles: superAdminRoles },
  { key: 'superadmin.bulkOps', path: '/superadmin/bulk-ops', allowedRoles: superAdminRoles },
  { key: 'superadmin.analytics', path: '/superadmin/analytics', allowedRoles: superAdminRoles },
  { key: 'superadmin.apiKeys', path: '/superadmin/api-keys', allowedRoles: superAdminRoles },
  { key: 'superadmin.sso', path: '/superadmin/sso', allowedRoles: superAdminRoles },
  { key: 'superadmin.tasks', path: '/superadmin/tasks', allowedRoles: superAdminRoles },
  { key: 'superadmin.messages', path: '/superadmin/messages', allowedRoles: superAdminRoles },
  { key: 'superadmin.mfa', path: '/superadmin/mfa', allowedRoles: superAdminRoles },
  { key: 'superadmin.reportsCenter', path: '/superadmin/reports_center', allowedRoles: superAdminRoles },
  { key: 'superadmin.license', path: '/superadmin/license', allowedRoles: superAdminRoles },
  { key: 'superadmin.profile', path: '/superadmin/profile', allowedRoles: superAdminRoles },
  { key: 'superadmin.schoolAdminView', path: '/manage/school/1/dashboard', allowedRoles: superAdminRoles },

  { key: 'school.dashboard', path: '/school/dashboard', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.students', path: '/school/students', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.studentProfile', path: '/school/students/std_1', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.teachers', path: '/school/teachers', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.teacherProfile', path: '/school/teachers/t_1', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.teachersAttendance', path: '/school/teachers/attendance', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.parents', path: '/school/parents', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.parentProfile', path: '/school/parents/p_1', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.staff', path: '/school/staff', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.staffAttendance', path: '/school/staff/attendance', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.classes', path: '/school/classes', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.transportation', path: '/school/transportation', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.attendance', path: '/school/attendance', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.schedule', path: '/school/schedule', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.calendar', path: '/school/calendar', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.grades', path: '/school/grades', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.messaging', path: '/school/messaging', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.financeInvoices', path: '/school/finance/invoices', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.financePayroll', path: '/school/finance/payroll', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.financeExpenses', path: '/school/finance/expenses', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.reports', path: '/school/reports', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.parentRequests', path: '/school/parent_requests', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.jobs', path: '/school/jobs', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.settings', path: '/school/settings', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.profile', path: '/school/profile', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.modules', path: '/school/modules', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },
  { key: 'school.subscriptionLocked', path: '/school/subscription-locked', allowedRoles: ['SCHOOL_ADMIN', 'STAFF'] },

  { key: 'teacher.dashboard', path: '/teacher/dashboard', allowedRoles: ['TEACHER'] },
  { key: 'teacher.myClasses', path: '/teacher/my_classes', allowedRoles: ['TEACHER'] },
  { key: 'teacher.schedule', path: '/teacher/schedule', allowedRoles: ['TEACHER'] },
  { key: 'teacher.assignments', path: '/teacher/assignments', allowedRoles: ['TEACHER'] },
  { key: 'teacher.attendance', path: '/teacher/attendance', allowedRoles: ['TEACHER'] },
  { key: 'teacher.grades', path: '/teacher/grades', allowedRoles: ['TEACHER'] },
  { key: 'teacher.finance', path: '/teacher/finance', allowedRoles: ['TEACHER'] },
  { key: 'teacher.messaging', path: '/teacher/messaging', allowedRoles: ['TEACHER'] },
  { key: 'teacher.profile', path: '/teacher/profile', allowedRoles: ['TEACHER'] },

  { key: 'parent.dashboard', path: '/parent/dashboard', allowedRoles: ['PARENT'] },
  { key: 'parent.grades', path: '/parent/grades', allowedRoles: ['PARENT'] },
  { key: 'parent.attendance', path: '/parent/attendance', allowedRoles: ['PARENT'] },
  { key: 'parent.finance', path: '/parent/finance', allowedRoles: ['PARENT'] },
  { key: 'parent.schedule', path: '/parent/schedule', allowedRoles: ['PARENT'] },
  { key: 'parent.requests', path: '/parent/requests', allowedRoles: ['PARENT'] },
  { key: 'parent.messaging', path: '/parent/messaging', allowedRoles: ['PARENT'] },
  { key: 'parent.transportation', path: '/parent/transportation', allowedRoles: ['PARENT'] },
  { key: 'parent.profile', path: '/parent/profile', allowedRoles: ['PARENT'] },
];

function expectedHomeRoute(role: string): string {
  const r = String(role).toUpperCase();
  if (superAdminRoles.includes(r)) return '/superadmin';
  if (r === 'SCHOOL_ADMIN' || r === 'STAFF') return '/school';
  if (r === 'TEACHER') return '/teacher';
  if (r === 'PARENT') return '/parent';
  return '/';
}

function isAllowed(role: string, allowedRoles: string[]): boolean {
  if (allowedRoles.includes('*')) return true;
  const r = String(role).toUpperCase();
  if (allowedRoles.some(ar => superAdminRoles.includes(String(ar).toUpperCase()))) {
    return superAdminRoles.includes(r);
  }
  return allowedRoles.map(a => String(a).toUpperCase()).includes(r);
}

async function installSession(page: any, user: E2EUser) {
  await page.addInitScript(
    ({ token, schoolId }) => {
      localStorage.setItem('auth_token', token);
      if (schoolId !== null && schoolId !== undefined) {
        localStorage.setItem('current_school_id', String(schoolId));
      } else {
        localStorage.removeItem('current_school_id');
      }
    },
    { token: 'E2E_TOKEN', schoolId: user.schoolId ?? null }
  );
}

function getMockSchool() {
  return {
    id: 1,
    name: 'مدرسة اختبار',
    status: 'Active',
    students: 0,
    teachers: 0,
    balance: 0,
    joinDate: '2025-01-01',
    logoUrl: null,
  };
}

function getMockSchoolSettings() {
  return {
    schoolName: 'مدرسة اختبار',
    schoolAddress: 'العنوان',
    academicYearStart: '2025-01-01',
    academicYearEnd: '2025-12-31',
    notifications: { email: true, sms: false, push: true },
    scheduleConfig: { periodCount: 7, periodDurationMinutes: 45, startTime: '07:30', gapMinutes: 5 },
    enabledModules: ['all_modules'],
    operationalStatus: 'ACTIVE',
    schoolLogoUrl: null,
  };
}

function getMockSubscriptionState() {
  return {
    success: true,
    data: {
      subscription: { status: 'ACTIVE', startDate: '2025-01-01', endDate: null, renewalDate: '2026-01-01', trialExpired: false, daysLeft: 30 },
      modules: { allowed: ['all_modules'], active: ['all_modules'] },
      limits: { students: 'غير محدود', teachers: 'غير محدود', invoices: 'غير محدود', storageGB: 'غير محدود', source: 'plan' },
      usage: { students: 0, teachers: 0, invoices: 0, storageGB: 0 },
    },
  };
}

async function installApiMocks(page: any, user: E2EUser) {
  await page.route('**/api/**', async (route: any) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;
    const method = req.method();

    const fulfill = async (status: number, body: any) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    };

    if (method === 'GET' && pathname.endsWith('/auth/me')) {
      return fulfill(200, user);
    }

    if (method === 'POST' && pathname.endsWith('/auth/login')) {
      return fulfill(200, { token: 'E2E_TOKEN', user });
    }

    if (method === 'GET' && (pathname.endsWith('/superadmin/action-items') || pathname.endsWith('/superadmin/action-items/'))) {
      return fulfill(200, []);
    }

    if (method === 'GET' && pathname.match(/\/schools\/?$/)) {
      return fulfill(200, { data: [], pagination: { currentPage: 1, itemsPerPage: 10, totalItems: 0, totalPages: 1 } });
    }

    if (method === 'GET' && pathname.match(/\/schools\/(\d+)\/?$/)) {
      return fulfill(200, getMockSchool());
    }

    if (method === 'GET' && pathname.includes('/school/1/settings')) {
      return fulfill(200, getMockSchoolSettings());
    }

    if (method === 'GET' && pathname.includes('/school/1/subscription-state')) {
      return fulfill(200, getMockSubscriptionState());
    }

    if (method === 'GET' && pathname.match(/\/roles\/?$/)) {
      return fulfill(200, []);
    }

    if (method === 'GET' && pathname.includes('/users/by-role')) {
      return fulfill(200, []);
    }

    if (method === 'GET' && pathname.includes('/superadmin/subscriptions')) {
      return fulfill(200, { data: [], pagination: { currentPage: 1, itemsPerPage: 10, totalItems: 0, totalPages: 1 } });
    }

    if (method === 'GET' && pathname.includes('/superadmin/audit-logs')) {
      return fulfill(200, { success: true, data: { logs: [] } });
    }

    const listKeyByPath: Array<[RegExp, string]> = [
      [/\/school\/\d+\/students\/?$/, 'students'],
      [/\/school\/\d+\/teachers\/?$/, 'teachers'],
      [/\/school\/\d+\/parents\/?$/, 'parents'],
      [/\/school\/\d+\/staff\/?$/, 'staff'],
      [/\/school\/\d+\/classes\/?$/, 'classes'],
      [/\/school\/\d+\/invoices\/?$/, 'invoices'],
      [/\/school\/\d+\/expenses\/?$/, 'expenses'],
      [/\/school\/\d+\/events\/?$/, 'events'],
    ];

    for (const [re, key] of listKeyByPath) {
      if (method === 'GET' && re.test(pathname)) {
        return fulfill(200, { success: true, data: { [key]: [] } });
      }
    }

    if (method === 'GET' && pathname.includes('/teacher/') && pathname.includes('/dashboard')) {
      return fulfill(200, { success: true, data: {} });
    }

    if (method === 'GET' && pathname.includes('/parent/') && pathname.includes('/dashboard')) {
      return fulfill(200, { success: true, data: {} });
    }

    return fulfill(200, { success: true, data: {} });
  });
}

async function detectOutcome(page: any, expectedPath: string, userRole: string): Promise<MatrixOutcome> {
  await page.waitForTimeout(700);

  const url = page.url();
  const u = new URL(url);
  const currentPath = u.pathname;

  if (currentPath === '/login') return 'login';

  const accessDenied = await page.getByText('وصول مرفوض', { exact: true }).isVisible().catch(() => false);
  if (accessDenied) return 'accessDenied';

  const hasError = await page.getByText('حدث خطأ غير متوقع', { exact: true }).isVisible().catch(() => false);
  if (hasError) return 'error';

  if (currentPath === expectedPath) return 'ok';

  const home = expectedHomeRoute(userRole);
  if (currentPath === home || currentPath.startsWith(home + '/')) return 'redirect';
  return 'redirect';
}

const matrix: Record<string, Record<string, MatrixOutcome>> = {};

test.describe.configure({ mode: 'serial' });

for (const roleCase of roles) {
  test.describe(`role=${roleCase.key}`, () => {
    test.beforeEach(async ({ page }) => {
      await installSession(page, roleCase.user);
      await installApiMocks(page, roleCase.user);
    });

    for (const routeCase of routes) {
      test(`${routeCase.key}`, async ({ page }) => {
        if (!matrix[roleCase.key]) matrix[roleCase.key] = {};

        const wantsAuthOnly = !routeCase.allowedRoles.includes('*');
        if (wantsAuthOnly && !roleCase.user.role) {
          matrix[roleCase.key][routeCase.key] = 'login';
          return;
        }

        await page.goto(routeCase.path, { waitUntil: 'domcontentloaded' });

        const allowed = isAllowed(roleCase.user.role, routeCase.allowedRoles);
        const outcome = await detectOutcome(page, routeCase.path, roleCase.user.role);
        matrix[roleCase.key][routeCase.key] = outcome;

        if (routeCase.allowedRoles.includes('*')) {
          expect(['ok', 'redirect', 'login'].includes(outcome)).toBeTruthy();
          return;
        }

        if (allowed) {
          expect(outcome === 'ok' || outcome === 'accessDenied' || outcome === 'error').toBeTruthy();
        } else {
          expect(outcome === 'login' || outcome === 'redirect').toBeTruthy();
        }
      });
    }
  });
}

test.afterAll(async () => {
  const outDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'role-matrix.json');
  fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), matrix }, null, 2));
});
