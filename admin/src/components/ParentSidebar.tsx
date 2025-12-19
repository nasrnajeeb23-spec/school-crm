import React from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardIcon, GradesIcon, AttendanceIcon, FinanceIcon, ScheduleIcon, RequestIcon, LogoutIcon, ProfileIcon, BusIcon, MessagingIcon, CloseIcon, AssignmentIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';

interface ParentSidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

const ParentSidebar: React.FC<ParentSidebarProps> = ({ isMobileOpen = false, onClose }) => {
  const { currentUser, logout } = useAppContext();

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: DashboardIcon, path: '/parent/dashboard' },
    { id: 'grades', label: 'الدرجات', icon: GradesIcon, path: '/parent/grades' },
    { id: 'attendance', label: 'الحضور', icon: AttendanceIcon, path: '/parent/attendance' },
    { id: 'finance', label: 'المالية', icon: FinanceIcon, path: '/parent/finance' },
    { id: 'assignments', label: 'الواجبات', icon: AssignmentIcon, path: '/parent/assignments' },
    { id: 'schedule', label: 'الجدول', icon: ScheduleIcon, path: '/parent/schedule' },
    { id: 'requests', label: 'الطلبات', icon: RequestIcon, path: '/parent/requests' },
    { id: 'messaging', label: 'الرسائل', icon: MessagingIcon, path: '/parent/messaging' },
    { id: 'transportation', label: 'النقل المدرسي', icon: BusIcon, path: '/parent/transportation' },
  ];

  const baseLinkClasses = "relative flex items-center justify-center md:justify-start p-3 my-2 rounded-lg transition-colors duration-200";
  const activeLinkClasses = "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300";
  const inactiveLinkClasses = "hover:bg-gray-100 dark:hover:bg-gray-700";

  return (
    <>
    <aside className={`${isMobileOpen ? 'flex' : 'hidden'} md:flex fixed top-0 right-0 h-full w-64 md:w-64 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex-col transition-all duration-300 shadow-lg z-30`}
    >
      <div className="flex items-center justify-center md:justify-start md:pr-6 h-20 border-b border-gray-200 dark:border-gray-700 relative">
        <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">P</span>
        <h1 className="hidden md:block ml-2 rtl:mr-2 rtl:ml-0 text-xl font-bold text-gray-800 dark:text-white">بوابة ولي الأمر</h1>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden absolute left-4 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="إغلاق القائمة"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-grow pt-4 overflow-y-auto">
        <ul>
          {navItems.map(item => (
            <li key={item.id} className="px-2">
              <NavLink
                to={item.path}
                className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
              >
                {({ isActive }) => (
                    <>
                        {isActive && <div className="absolute right-0 h-6 w-1 bg-rose-600 dark:bg-rose-400 rounded-l-full"></div>}
                        <item.icon className="h-6 w-6" />
                        <span className="hidden md:block mr-4 rtl:ml-4 rtl:mr-0">{item.label}</span>
                    </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <NavLink
          to="/parent/profile"
          className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : 'text-gray-600 dark:text-gray-300 ' + inactiveLinkClasses}`}
        >
          <ProfileIcon className="h-6 w-6" />
          <span className="hidden md:block mr-4 rtl:ml-4 rtl:mr-0">ملفي الشخصي</span>
        </NavLink>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); logout(); }}
          className={`${baseLinkClasses} text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50`}
        >
          <LogoutIcon className="h-6 w-6" />
          <span className="hidden md:block mr-4 rtl:ml-4 rtl:mr-0">تسجيل الخروج</span>
        </a>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center md:justify-start">
            <img src="https://picsum.photos/seed/parent/40/40" alt="Parent" className="w-10 h-10 rounded-full" />
            <div className="hidden md:block mr-3 rtl:ml-3 rtl:mr-0">
                <p className="font-semibold text-sm">{currentUser?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">ولي أمر</p>
            </div>
        </div>
      </div>
    </aside>
    {isMobileOpen && (
      <div className="fixed inset-0 bg-black/40 md:hidden z-20" onClick={onClose} />
    )}
    </>
  );
};

export default ParentSidebar;
