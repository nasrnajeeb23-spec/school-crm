import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import SchoolSidebar from '../components/SchoolSidebar';
import Header from '../components/Header';
import { School, Student, Teacher, InvoiceStatus, ActionItem, User, SchoolSettings, Permission, ActionItemType, SchoolRole, UserRole } from '../types';

import { BackIcon, BellIcon } from '../components/icons';
import ThemeToggle from '../components/ThemeToggle';
import NotificationDropdown from '../components/NotificationDropdown';
import { useAppContext } from '../contexts/AppContext';
import * as api from '../api';
import AccessDenied from '../components/AccessDenied';
import TrialBanner from '../components/TrialBanner';
import Breadcrumbs from '../components/Breadcrumbs';
import HelpWidget from '../components/HelpWidget';
import TooltipGuide from '../components/TooltipGuide';

// Lazy load pages
const SchoolDashboard = React.lazy(() => import('../pages/SchoolDashboard'));
const StudentsList = React.lazy(() => import('../pages/StudentsList'));
const StudentProfile = React.lazy(() => import('../pages/StudentProfile'));
const TeachersList = React.lazy(() => import('../pages/TeachersList'));
const TeacherProfile = React.lazy(() => import('../pages/TeacherProfile'));
const ClassesList = React.lazy(() => import('../pages/ClassesList'));
const Attendance = React.lazy(() => import('../pages/Attendance'));
const Grades = React.lazy(() => import('../pages/Grades'));
const Schedule = React.lazy(() => import('../pages/Schedule'));
const Messaging = React.lazy(() => import('../pages/Messaging'));
const FinanceFees = React.lazy(() => import('../pages/finance/FinanceFees'));
const FinancePayroll = React.lazy(() => import('../pages/finance/FinancePayroll'));
const FinanceExpenses = React.lazy(() => import('../pages/finance/FinanceExpenses'));
const Reports = React.lazy(() => import('../pages/Reports'));
const ParentsList = React.lazy(() => import('../pages/ParentsList'));
const ParentManagement = React.lazy(() => import('../pages/ParentManagement'));
const Settings = React.lazy(() => import('../pages/Settings'));
const Calendar = React.lazy(() => import('../pages/Calendar'));
const UserProfile = React.lazy(() => import('../pages/UserProfile'));
const StaffManagement = React.lazy(() => import('../pages/StaffManagement'));
const TeachersAttendance = React.lazy(() => import('../pages/TeachersAttendance'));
const StaffAttendance = React.lazy(() => import('../pages/StaffAttendance'));
const Transportation = React.lazy(() => import('../pages/Transportation'));
const DriversList = React.lazy(() => import('../pages/DriversList'));
const DriverProfile = React.lazy(() => import('../pages/DriverProfile'));
const ModulesPage = React.lazy(() => import('../pages/ModulesPage'));
const SchoolParentRequests = React.lazy(() => import('../pages/SchoolParentRequests'));
const BackgroundJobs = React.lazy(() => import('../pages/BackgroundJobs'));
const HelpCenter = React.lazy(() => import('../pages/HelpCenter'));

interface SchoolAdminLayoutProps {
  isSuperAdminView?: boolean;
}

const viewTitles: { [key: string]: string } = {
  dashboard: 'لوحة التحكم',
  students: 'إدارة الطلاب',
  teachers: 'إدارة المعلمين',
  parents: 'إدارة أولياء الأمور',
  staff: 'إدارة الموظفين',
  classes: 'إدارة الفصول',
  transportation: 'النقل المدرسي',
  drivers: 'إدارة السائقين',
  attendance: 'الحضور والغياب',
  schedule: 'الجدول الدراسي',
  calendar: 'التقويم والأحداث',
  grades: 'إدارة الدرجات',
  messaging: 'الرسائل',
  finance: 'المالية والرسوم',
  reports: 'التقارير',
  settings: 'الإعدادات',
  profile: 'ملفي الشخصي',
  modules: 'الوحدات',
};



const SchoolAdminLayout: React.FC<SchoolAdminLayoutProps> = ({ isSuperAdminView = false }) => {
  const { currentUser, theme, toggleTheme, logout } = useAppContext();

  const { schoolId: urlSchoolId } = useParams<{ schoolId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [school, setSchool] = useState<School | null>(null);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTrial, setIsTrial] = useState<boolean>(false);
  const [currentPermissions, setCurrentPermissions] = useState<Permission[]>([]);

  const storedId = typeof window !== 'undefined' ? parseInt(localStorage.getItem('current_school_id') || '0') : 0;
  const effectiveSchoolId = isSuperAdminView ? parseInt(urlSchoolId || '0') : (currentUser?.schoolId || storedId);

  // Helper to derive permissions from active modules
  const getPermissionsFromModules = (activeModules: string[]): Permission[] => {
    const perms = new Set<Permission>();
    const mods = new Set(activeModules.map(m => m.toLowerCase()));

    // Core Permissions (Always active if basic modules present)
    if (mods.has('student_management') || mods.has('all_modules')) {
      perms.add(Permission.MANAGE_STUDENTS);
      perms.add(Permission.MANAGE_CLASSES);
      perms.add(Permission.VIEW_DASHBOARD);
    }
    if (mods.has('academic_management') || mods.has('all_modules')) {
      perms.add(Permission.MANAGE_SCHEDULE);
      perms.add(Permission.MANAGE_CALENDAR);
      perms.add(Permission.MANAGE_GRADES);
    }
    if (mods.has('teacher_portal') || mods.has('all_modules')) {
      perms.add(Permission.MANAGE_TEACHERS);
      perms.add(Permission.MANAGE_ATTENDANCE); // Teachers attendance
    }
    if (mods.has('parent_portal') || mods.has('all_modules')) {
      perms.add(Permission.MANAGE_PARENTS);
    }

    // Add-ons
    if (mods.has('finance') || mods.has('all_modules')) {
      perms.add(Permission.MANAGE_FINANCE);
    }
    if (mods.has('hr_payroll') || mods.has('all_modules')) {
      perms.add(Permission.MANAGE_STAFF);
      // HR often implies Payroll which uses Finance permission in sidebar
      perms.add(Permission.MANAGE_FINANCE);
    }
    if (mods.has('transportation') || mods.has('all_modules')) {
      perms.add(Permission.MANAGE_TRANSPORTATION);
    }
    if (mods.has('advanced_reports') || mods.has('all_modules')) {
      perms.add(Permission.MANAGE_REPORTS);
    }
    if (mods.has('messaging') || mods.has('all_modules')) {
      perms.add(Permission.MANAGE_MESSAGING);
    }

    // Always allow settings for Admin
    perms.add(Permission.MANAGE_SETTINGS);
    perms.add(Permission.MANAGE_MODULES);

    return Array.from(perms);
  };

  const isDriverStaff = !isSuperAdminView
    && currentUser?.role === UserRole.Staff
    && String(currentUser?.schoolRole || '') === String(SchoolRole.Driver);

  const hasPermission = (permission: Permission) => {
    if (isSuperAdminView) return true;
    return currentPermissions.includes(permission);
  };

  useEffect(() => {
    if (isDriverStaff) {
      navigate('/driver', { replace: true });
    }
  }, [isDriverStaff, navigate]);

  useEffect(() => {
    if (effectiveSchoolId && !isDriverStaff) {
      setLoading(true);

      const actionItemsPromise = isSuperAdminView
        ? api.getActionItems()
        : api.getSchoolParentRequests(effectiveSchoolId).then(reqs => reqs.map(r => ({
          id: r.id,
          type: ActionItemType.Approval,
          title: r.title || 'طلب جديد',
          description: `${r.parentName || 'ولي أمر'}: ${r.description || ''}`,
          date: r.createdAt || new Date().toISOString().split('T')[0],
          isRead: false
        } as ActionItem))).catch(() => []);

      Promise.allSettled([
        api.getSchoolById(effectiveSchoolId),
        actionItemsPromise,
        api.getSchoolSettings(effectiveSchoolId),
        api.getSubscriptionState(effectiveSchoolId)
      ]).then(results => {
        const [schoolRes, actionsRes, settingsRes, subStateRes] = results as any;
        if (schoolRes.status === 'fulfilled') {
          setSchool(schoolRes.value);
        } else if (schoolRes.status === 'rejected') {
          // Check if rejected due to subscription expired
          if (schoolRes.reason?.code === 'SUBSCRIPTION_EXPIRED' || schoolRes.reason?.response?.status === 402) {
            navigate('/school/subscription-locked');
            return;
          }
        }
        if (actionsRes.status === 'fulfilled') {
          setActionItems(actionsRes.value);
        }
        if (settingsRes.status === 'fulfilled') {
          setSettings(settingsRes.value);
        } else if (schoolRes.status === 'fulfilled') {
          setSettings({
            schoolName: schoolRes.value.name,
            schoolAddress: schoolRes.value.address || '',
            academicYearStart: '',
            academicYearEnd: '',
            notifications: { email: true, sms: false, push: true },
          } as any);
        }

        let calculatedPermissions = Object.values(Permission); // Default fallback

        if (subStateRes && subStateRes.status === 'fulfilled') {
          const ss = subStateRes.value;
          const status = String(ss?.subscription?.status || '').toUpperCase();
          const expired = !!ss?.subscription?.trialExpired;
          setIsTrial(status === 'TRIAL' && !expired);

          // CRITICAL: Update permissions based on active modules
          if (ss.modules && Array.isArray(ss.modules.active)) {
            calculatedPermissions = getPermissionsFromModules(ss.modules.active);
          }
        } else {
          setIsTrial(false);
        }
        setCurrentPermissions(calculatedPermissions);

      }).catch(err => {
        console.error('School data load error:', err);
      }).finally(() => setLoading(false));
    }
  }, [effectiveSchoolId, isDriverStaff]);



  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setIsNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSidebarOpen]);

  const getHeaderTitle = () => {
    const pathParts = location.pathname.split('/');
    const currentView = pathParts[pathParts.length - 1];
    const parentView = pathParts[pathParts.length - 2];
    if (parentView === 'students' && currentView !== 'students') return 'ملف الطالب';
    if (parentView === 'teachers' && currentView !== 'teachers') return 'ملف المعلم';
    if (parentView === 'parents' && currentView !== 'parents') return 'إدارة ولي الأمر';
    if (parentView === 'drivers' && currentView !== 'drivers') return 'إدارة السائق';
    return viewTitles[currentView] || 'لوحة التحكم';
  };

  if (isDriverStaff) return null;
  if (loading) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900"><p className="dark:text-white">جاري تحميل بيانات المدرسة...</p></div>;
  if (!school) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900"><p className="dark:text-red-400">لم يتم العثور على المدرسة.</p></div>;

  const unreadCount = actionItems.filter(item => !item.isRead).length;

  const ProtectedPage: React.FC<{ permission: Permission, children: React.ReactNode }> = ({ permission, children }) => {
    return hasPermission(permission) ? <>{children}</> : <AccessDenied />;
  };

  return (
    <>
      <SchoolSidebar
        permissions={isSuperAdminView ? Object.values(Permission) : currentPermissions}
        isTrial={isTrial}
        schoolName={settings?.schoolName || school.name}
        schoolLogoUrl={api.getAssetUrl(settings?.schoolLogoUrl as string)}
        isSuperAdminView={isSuperAdminView}
        isMobileOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="md:pr-64 transition-all duration-300">
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Header title={getHeaderTitle()} schoolName={settings?.schoolName || school.name} onMenuToggle={() => setIsSidebarOpen(true)} />
            <div className="flex items-center gap-4">
              {isSuperAdminView && (
                <button onClick={() => navigate('/superadmin/schools')} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <BackIcon className="h-5 w-5 ml-2" /><span>العودة للوحة الرئيسية</span>
                </button>
              )}
              <div className="relative" ref={notificationRef}>
                <button onClick={() => setIsNotificationsOpen(p => !p)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 relative"><BellIcon className="h-6 w-6" />
                  {unreadCount > 0 && <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">{unreadCount}</span>}
                </button>
                {isNotificationsOpen && <NotificationDropdown items={actionItems} onClose={() => setIsNotificationsOpen(false)} />}
              </div>
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
            <TrialBanner />
          </div>

          <Breadcrumbs className="mt-4 mb-6" />
          
          <Suspense fallback={<div className="text-center p-8">جاري التحميل...</div>}>
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<ProtectedPage permission={Permission.VIEW_DASHBOARD}><SchoolDashboard school={school} /></ProtectedPage>} />
              <Route path="students" element={<ProtectedPage permission={Permission.MANAGE_STUDENTS}><StudentsList schoolId={school.id} /></ProtectedPage>} />
              <Route path="students/:studentId" element={<ProtectedPage permission={Permission.MANAGE_STUDENTS}><StudentProfile schoolId={school.id} schoolSettings={settings} /></ProtectedPage>} />
              <Route path="teachers" element={<ProtectedPage permission={Permission.MANAGE_TEACHERS}><TeachersList schoolId={school.id} /></ProtectedPage>} />
              <Route path="teachers/:teacherId" element={<ProtectedPage permission={Permission.MANAGE_TEACHERS}><TeacherProfile schoolId={school.id} schoolSettings={settings} /></ProtectedPage>} />
              <Route path="teachers/attendance" element={<ProtectedPage permission={Permission.MANAGE_ATTENDANCE}><TeachersAttendance schoolId={school.id} /></ProtectedPage>} />
              <Route path="parents" element={<ProtectedPage permission={Permission.MANAGE_PARENTS}><ParentsList schoolId={school.id} /></ProtectedPage>} />
              <Route path="parents/:parentId" element={<ProtectedPage permission={Permission.MANAGE_PARENTS}><ParentManagement schoolId={school.id} /></ProtectedPage>} />
              <Route path="staff" element={<ProtectedPage permission={Permission.MANAGE_STAFF}><StaffManagement schoolId={school.id} /></ProtectedPage>} />
              <Route path="staff/attendance" element={<ProtectedPage permission={Permission.MANAGE_STAFF}><StaffAttendance schoolId={school.id} /></ProtectedPage>} />
              <Route path="classes" element={<ProtectedPage permission={Permission.MANAGE_CLASSES}><ClassesList schoolId={school.id} schoolSettings={settings} /></ProtectedPage>} />
              <Route path="transportation" element={<ProtectedPage permission={Permission.MANAGE_TRANSPORTATION}><Transportation schoolId={school.id} /></ProtectedPage>} />
              <Route path="transportation/drivers" element={<ProtectedPage permission={Permission.MANAGE_TRANSPORTATION}><DriversList schoolId={school.id} detailsPathPrefix="" /></ProtectedPage>} />
              <Route path="transportation/drivers/:operatorId" element={<ProtectedPage permission={Permission.MANAGE_TRANSPORTATION}><DriverProfile schoolId={school.id} /></ProtectedPage>} />
              <Route path="attendance" element={<ProtectedPage permission={Permission.MANAGE_ATTENDANCE}><Attendance schoolId={school.id} /></ProtectedPage>} />
              <Route path="schedule" element={<ProtectedPage permission={Permission.MANAGE_SCHEDULE}><Schedule schoolId={school.id} /></ProtectedPage>} />
              <Route path="calendar" element={<ProtectedPage permission={Permission.MANAGE_CALENDAR}><Calendar schoolId={school.id} /></ProtectedPage>} />
              <Route path="grades" element={<ProtectedPage permission={Permission.MANAGE_GRADES}><Grades schoolId={school.id} /></ProtectedPage>} />
              <Route path="messaging" element={<ProtectedPage permission={Permission.MANAGE_MESSAGING}><Messaging /></ProtectedPage>} />
              <Route path="finance/invoices" element={<ProtectedPage permission={Permission.MANAGE_FINANCE}><FinanceFees schoolId={school.id} schoolSettings={settings} /></ProtectedPage>} />
              <Route path="finance/payroll" element={<ProtectedPage permission={Permission.MANAGE_FINANCE}><FinancePayroll schoolId={school.id} schoolSettings={settings} /></ProtectedPage>} />
              <Route path="finance/expenses" element={<ProtectedPage permission={Permission.MANAGE_FINANCE}><FinanceExpenses schoolId={school.id} schoolSettings={settings} /></ProtectedPage>} />
              <Route path="finance" element={<Navigate to="finance/invoices" replace />} />
              <Route path="reports" element={<ProtectedPage permission={Permission.MANAGE_REPORTS}><Reports schoolSettings={settings} /></ProtectedPage>} />
              <Route path="parent_requests" element={<ProtectedPage permission={Permission.MANAGE_PARENTS}><SchoolParentRequests schoolId={school.id} /></ProtectedPage>} />
              <Route path="jobs" element={<ProtectedPage permission={Permission.MANAGE_REPORTS}><BackgroundJobs schoolId={school.id} /></ProtectedPage>} />
              <Route path="settings" element={<ProtectedPage permission={Permission.MANAGE_SETTINGS}><Settings schoolId={school.id} /></ProtectedPage>} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="modules" element={<ProtectedPage permission={Permission.MANAGE_MODULES}><ModulesPage school={school} /></ProtectedPage>} />
              <Route path="help-center" element={<HelpCenter />} />
            </Routes>
          </Suspense>
        </div>

        {/* Help Widget */}
        <HelpWidget />
      </main>
      <TooltipGuide />
    </>
  );
};
export default SchoolAdminLayout;
