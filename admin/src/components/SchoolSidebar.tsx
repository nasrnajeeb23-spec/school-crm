import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { DashboardIcon, StudentsIcon, UsersIcon, ClassesIcon, FinanceIcon, ReportsIcon, AttendanceIcon, GradesIcon, ScheduleIcon, MessagingIcon, ParentsIcon, SettingsIcon, EventIcon, LogoutIcon, ProfileIcon, BusIcon, ModuleIcon, NetProfitIcon, LockIcon } from './icons';
import { Permission, ModuleId } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface SchoolSidebarProps {
  permissions: Permission[];
  activeModules: ModuleId[];
  schoolName?: string;
  schoolLogoUrl?: string;
  isSuperAdminView?: boolean;
}

const SchoolSidebar: React.FC<SchoolSidebarProps> = ({ permissions, activeModules, schoolName, schoolLogoUrl, isSuperAdminView }) => {
  const { logout } = useAppContext();
  const location = useLocation();

  const basePath = isSuperAdminView ? location.pathname.split('/').slice(0, 4).join('/') : '/school';

  const allNavItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: DashboardIcon, requiredPermission: Permission.VIEW_DASHBOARD, path: `${basePath}/dashboard` },
    { id: 'students', label: 'الطلاب', icon: StudentsIcon, requiredPermission: Permission.MANAGE_STUDENTS, path: `${basePath}/students` },
    { id: 'teachers', label: 'المعلمون', icon: UsersIcon, requiredPermission: Permission.MANAGE_TEACHERS, path: `${basePath}/teachers` },
    { id: 'teachers_attendance', label: 'حضور المعلمين', icon: AttendanceIcon, requiredPermission: Permission.MANAGE_ATTENDANCE, path: `${basePath}/teachers/attendance` },
    { id: 'parents', label: 'أولياء الأمور', icon: ParentsIcon, requiredPermission: Permission.MANAGE_PARENTS, path: `${basePath}/parents` },
    { id: 'staff', label: 'الموظفون', icon: UsersIcon, requiredPermission: Permission.MANAGE_STAFF, path: `${basePath}/staff` },
    { id: 'staff_attendance', label: 'حضور الموظفين', icon: AttendanceIcon, requiredPermission: Permission.MANAGE_STAFF, path: `${basePath}/staff/attendance` },
    { id: 'classes', label: 'الفصول', icon: ClassesIcon, requiredPermission: Permission.MANAGE_CLASSES, path: `${basePath}/classes` },
    { id: 'transportation', label: 'النقل المدرسي', icon: BusIcon, requiredPermission: Permission.MANAGE_TRANSPORTATION, requiredModule: ModuleId.Transportation, path: `${basePath}/transportation` },
    { id: 'attendance', label: 'الحضور والغياب', icon: AttendanceIcon, requiredPermission: Permission.MANAGE_ATTENDANCE, path: `${basePath}/attendance` },
    { id: 'schedule', label: 'الجدول الدراسي', icon: ScheduleIcon, requiredPermission: Permission.MANAGE_SCHEDULE, path: `${basePath}/schedule` },
    { id: 'calendar', label: 'التقويم والأحداث', icon: EventIcon, requiredPermission: Permission.MANAGE_CALENDAR, path: `${basePath}/calendar` },
    { id: 'grades', label: 'الدرجات', icon: GradesIcon, requiredPermission: Permission.MANAGE_GRADES, path: `${basePath}/grades` },
    { id: 'messaging', label: 'الرسائل', icon: MessagingIcon, requiredPermission: Permission.MANAGE_MESSAGING, path: `${basePath}/messaging` },
    { id: 'finance_fees', label: 'الرسوم الدراسية', icon: FinanceIcon, requiredPermission: Permission.MANAGE_FINANCE, requiredModule: ModuleId.FinanceFees, path: `${basePath}/finance/invoices` },
    { id: 'finance_payroll', label: 'الرواتب', icon: NetProfitIcon, requiredPermission: Permission.MANAGE_FINANCE, requiredModule: ModuleId.FinanceSalaries, path: `${basePath}/finance/payroll` },
    { id: 'finance_expenses', label: 'المصروفات', icon: FinanceIcon, requiredPermission: Permission.MANAGE_FINANCE, requiredModule: ModuleId.FinanceExpenses, path: `${basePath}/finance/expenses` },
    { id: 'reports', label: 'التقارير', icon: ReportsIcon, requiredPermission: Permission.MANAGE_REPORTS, path: `${basePath}/reports` },
    { id: 'parent_requests', label: 'طلبات أولياء الأمور', icon: ParentsIcon, requiredPermission: Permission.MANAGE_PARENTS, path: `${basePath}/parent_requests` },
    { id: 'jobs', label: 'مهام الخلفية', icon: ReportsIcon, requiredPermission: Permission.MANAGE_REPORTS, path: `${basePath}/jobs` },
    { id: 'settings', label: 'الإعدادات', icon: SettingsIcon, requiredPermission: Permission.MANAGE_SETTINGS, path: `${basePath}/settings` },
    { id: 'modules', label: 'الوحدات', icon: ModuleIcon, requiredPermission: Permission.MANAGE_MODULES, path: `${basePath}/modules` },
  ];

  const hasPermission = (item: typeof allNavItems[0]) => {
    if (isSuperAdminView) return true;
    if (!permissions.includes(item.requiredPermission)) return false;
    // Do not filter by module here anymore
    return true;
  };

  const navItems = allNavItems.filter(hasPermission);
  
  const baseLinkClasses = "relative flex items-center justify-center md:justify-start p-3 my-1 rounded-lg transition-colors duration-200";
  const activeLinkClasses = "bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300";
  const inactiveLinkClasses = "hover:bg-gray-100 dark:hover:bg-gray-700";
  const lockedLinkClasses = "text-gray-400 dark:text-gray-600 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50";


  return (
    <aside className="fixed top-0 right-0 h-full w-16 md:w-64 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex flex-col transition-all duration-300 shadow-lg z-30">
      <div className="flex items-center justify-center md:justify-start md:pr-6 h-20 border-b border-gray-200 dark:border-gray-700">
        {schoolLogoUrl ? (
            <img 
                src={schoolLogoUrl} 
                alt="School Logo" 
                className="w-10 h-10 rounded-full" 
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
        ) : (
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">S</span>
        )}
        <h1 className="hidden md:block ml-2 text-xl font-bold text-gray-800 dark:text-white truncate">{schoolName || 'لوحة التحكم'}</h1>
      </div>
      <nav className="flex-grow pt-4 overflow-y-auto">
        <ul>
          {navItems.map(item => {
             const isLocked = item.requiredModule && !activeModules.includes(item.requiredModule);
             
             if (isLocked) {
                 return (
                    <li key={item.id} className="px-2" title="هذه الوحدة غير مفعلة">
                      <div className={`${baseLinkClasses} ${lockedLinkClasses}`}>
                         <item.icon className="h-6 w-6" />
                         <span className="hidden md:block mr-4 flex-grow">{item.label}</span>
                         <LockIcon className="h-4 w-4 hidden md:block" />
                      </div>
                    </li>
                 );
             }

             return (
                <li key={item.id} className="px-2">
                  <NavLink to={item.path} className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`} end>
                    {({ isActive }) => (
                      <>
                        {isActive && <div className="absolute right-0 h-6 w-1 bg-teal-600 dark:bg-teal-400 rounded-l-full"></div>}
                        <item.icon className="h-6 w-6" />
                        <span className="hidden md:block mr-4">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <NavLink
          to={`${basePath}/profile`}
          className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : 'text-gray-600 dark:text-gray-300 ' + inactiveLinkClasses}`}
        >
          <ProfileIcon className="h-6 w-6" />
          <span className="hidden md:block mr-4">ملفي الشخصي</span>
        </NavLink>
        {!isSuperAdminView && (
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} className={`${baseLinkClasses} text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50`}>
            <LogoutIcon className="h-6 w-6" />
            <span className="hidden md:block mr-4">تسجيل الخروج</span>
            </a>
        )}
      </div>
    </aside>
  );
};

export default SchoolSidebar;
