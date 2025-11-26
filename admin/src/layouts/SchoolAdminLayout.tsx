import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import SchoolSidebar from '../components/SchoolSidebar';
import Header from '../components/Header';
import { School, Student, Teacher, InvoiceStatus, ActionItem, User, ModuleId, SchoolSettings, Permission } from '../types';

import { BackIcon, BellIcon } from '../components/icons';
import ThemeToggle from '../components/ThemeToggle';
import NotificationDropdown from '../components/NotificationDropdown';
import { useAppContext } from '../contexts/AppContext';
import * as api from '../api';
import AccessDenied from '../components/AccessDenied';

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
const Finance = React.lazy(() => import('../pages/Finance'));
const Reports = React.lazy(() => import('../pages/Reports'));
const ParentsList = React.lazy(() => import('../pages/ParentsList'));
const Settings = React.lazy(() => import('../pages/Settings'));
const Calendar = React.lazy(() => import('../pages/Calendar'));
const UserProfile = React.lazy(() => import('../pages/UserProfile'));
const StaffManagement = React.lazy(() => import('../pages/StaffManagement'));
const Transportation = React.lazy(() => import('../pages/Transportation'));
const ModulesPage = React.lazy(() => import('../pages/ModulesPage'));

interface SchoolAdminLayoutProps {
  isSuperAdminView?: boolean;
}

const viewTitles: { [key: string]: string } = {
    dashboard: 'لوحة التحكم', students: 'إدارة الطلاب', teachers: 'إدارة المعلمين', parents: 'إدارة أولياء الأمور',
    staff: 'إدارة الموظفين', classes: 'إدارة الفصول', transportation: 'النقل المدرسي', attendance: 'الحضور والغياب',
    schedule: 'الجدول الدراسي', calendar: 'التقويم والأحداث', grades: 'إدارة الدرجات', messaging: 'الرسائل',
    finance: 'المالية والرسوم', reports: 'التقارير', settings: 'الإعدادات', profile: 'ملفي الشخصي', modules: 'الوحدات',
};

const modulePermissions: { [key in ModuleId]?: Permission } = {
    [ModuleId.Finance]: Permission.MANAGE_FINANCE,
    [ModuleId.Transportation]: Permission.MANAGE_TRANSPORTATION,
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
  const [activeModules, setActiveModules] = useState<ModuleId[]>([]);
  
  const effectiveSchoolId = isSuperAdminView ? parseInt(urlSchoolId || '0') : currentUser?.schoolId;
  const userRolePermissions = Object.values(Permission);

  const hasPermission = (permission: Permission) => {
    if (isSuperAdminView) return true; // Super admin has all permissions
    if (!userRolePermissions.includes(permission)) return false;
    const requiredModule = Object.entries(modulePermissions).find(([, p]) => p === permission)?.[0] as ModuleId;
    if (requiredModule && !activeModules.includes(requiredModule)) return false;
    return true;
  };
  
  useEffect(() => {
    if (effectiveSchoolId) {
        console.log('Loading school data for school ID:', effectiveSchoolId);
        setLoading(true);
        Promise.all([
            api.getSchoolById(effectiveSchoolId),
            api.getActionItems(),
            api.getSchoolModules(effectiveSchoolId),
            api.getSchoolSettings(effectiveSchoolId)
        ]).then(([schoolData, actionItemsData, schoolModulesData, settingsData]) => {
            console.log('School data loaded:', schoolData);
            setSchool(schoolData);
            setActionItems(actionItemsData);
            setActiveModules(schoolModulesData.map(sm => sm.moduleId));
            setSettings(settingsData);
        }).catch(err => {
            console.error("Failed to fetch school data", err);
            console.error('School ID that failed:', effectiveSchoolId);
        }).finally(() => setLoading(false));
    } else {
        console.log('No effective school ID available. Current user:', currentUser);
    }
  }, [effectiveSchoolId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setIsNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getHeaderTitle = () => {
    const pathParts = location.pathname.split('/');
    const currentView = pathParts[pathParts.length - 1];
    const parentView = pathParts[pathParts.length - 2];
    if (parentView === 'students' && currentView !== 'students') return 'ملف الطالب';
    if (parentView === 'teachers' && currentView !== 'teachers') return 'ملف المعلم';
    return viewTitles[currentView] || 'لوحة التحكم';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900"><p className="dark:text-white">جاري تحميل بيانات المدرسة...</p></div>;
  if (!school) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900"><p className="dark:text-red-400">لم يتم العثور على المدرسة.</p></div>;

  const unreadCount = actionItems.filter(item => !item.isRead).length;

  const ProtectedPage: React.FC<{ permission: Permission, children: React.ReactNode }> = ({ permission, children }) => {
    return hasPermission(permission) ? <>{children}</> : <AccessDenied />;
  };

  return (
    <>
      <SchoolSidebar 
        permissions={userRolePermissions} 
        activeModules={activeModules}
        schoolName={settings?.schoolName || school.name}
        schoolLogoUrl={settings?.schoolLogoUrl as string}
        isSuperAdminView={isSuperAdminView}
      />
      <main className="pr-16 md:pr-64 transition-all duration-300">
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <Header title={getHeaderTitle()} schoolName={settings?.schoolName || school.name} />
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
            </div>
          
            <Suspense fallback={<div className="text-center p-8">جاري التحميل...</div>}>
                <Routes>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<ProtectedPage permission={Permission.VIEW_DASHBOARD}><SchoolDashboard school={school} /></ProtectedPage>} />
                    <Route path="students" element={<ProtectedPage permission={Permission.MANAGE_STUDENTS}><StudentsList schoolId={school.id} /></ProtectedPage>} />
                    <Route path="students/:studentId" element={<ProtectedPage permission={Permission.MANAGE_STUDENTS}><StudentProfile schoolId={school.id} schoolSettings={settings} /></ProtectedPage>} />
                    <Route path="teachers" element={<ProtectedPage permission={Permission.MANAGE_TEACHERS}><TeachersList schoolId={school.id} /></ProtectedPage>} />
                    <Route path="teachers/:teacherId" element={<ProtectedPage permission={Permission.MANAGE_TEACHERS}><TeacherProfile schoolId={school.id} schoolSettings={settings} /></ProtectedPage>} />
                    <Route path="parents" element={<ProtectedPage permission={Permission.MANAGE_PARENTS}><ParentsList schoolId={school.id} /></ProtectedPage>} />
                    <Route path="staff" element={<ProtectedPage permission={Permission.MANAGE_STAFF}><StaffManagement schoolId={school.id} /></ProtectedPage>} />
                    <Route path="classes" element={<ProtectedPage permission={Permission.MANAGE_CLASSES}><ClassesList schoolId={school.id} /></ProtectedPage>} />
                    <Route path="transportation" element={<ProtectedPage permission={Permission.MANAGE_TRANSPORTATION}><Transportation schoolId={school.id} /></ProtectedPage>} />
                    <Route path="attendance" element={<ProtectedPage permission={Permission.MANAGE_ATTENDANCE}><Attendance schoolId={school.id} /></ProtectedPage>} />
                    <Route path="schedule" element={<ProtectedPage permission={Permission.MANAGE_SCHEDULE}><Schedule schoolId={school.id} /></ProtectedPage>} />
                    <Route path="calendar" element={<ProtectedPage permission={Permission.MANAGE_CALENDAR}><Calendar schoolId={school.id} /></ProtectedPage>} />
                    <Route path="grades" element={<ProtectedPage permission={Permission.MANAGE_GRADES}><Grades schoolId={school.id} /></ProtectedPage>} />
                    <Route path="messaging" element={<ProtectedPage permission={Permission.MANAGE_MESSAGING}><Messaging /></ProtectedPage>} />
                    <Route path="finance" element={<ProtectedPage permission={Permission.MANAGE_FINANCE}><Finance schoolId={school.id} schoolSettings={settings} /></ProtectedPage>} />
                    <Route path="reports" element={<ProtectedPage permission={Permission.MANAGE_REPORTS}><Reports schoolSettings={settings} /></ProtectedPage>} />
                    <Route path="settings" element={<ProtectedPage permission={Permission.MANAGE_SETTINGS}><Settings schoolId={school.id} /></ProtectedPage>} />
                    <Route path="profile" element={<UserProfile />} />
                    <Route path="modules" element={<ProtectedPage permission={Permission.MANAGE_MODULES}><ModulesPage school={school} /></ProtectedPage>} />
                </Routes>
            </Suspense>
        </div>
      </main>
    </>
  );
};

export default SchoolAdminLayout;
