import React from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardIcon, ClassesIcon, AttendanceIcon, GradesIcon, MessagingIcon, LogoutIcon, ProfileIcon, ScheduleIcon, FinanceIcon, AssignmentIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';

interface TeacherSidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

const TeacherSidebar: React.FC<TeacherSidebarProps> = ({ isMobileOpen = false, onClose }) => {
  const { currentUser, logout } = useAppContext();

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: DashboardIcon, path: '/teacher/dashboard' },
    { id: 'my_classes', label: 'فصولي', icon: ClassesIcon, path: '/teacher/my_classes' },
    { id: 'schedule', label: 'الجدول الدراسي', icon: ScheduleIcon, path: '/teacher/schedule' },
    { id: 'assignments', label: 'الواجبات', icon: AssignmentIcon, path: '/teacher/assignments' },
    { id: 'attendance', label: 'الحضور', icon: AttendanceIcon, path: '/teacher/attendance' },
    { id: 'grades', label: 'الدرجات', icon: GradesIcon, path: '/teacher/grades' },
    { id: 'finance', label: 'المالية', icon: FinanceIcon, path: '/teacher/finance' },
    { id: 'messaging', label: 'الرسائل', icon: MessagingIcon, path: '/teacher/messaging' },
  ];

  const baseLinkClasses = "relative flex items-center justify-center md:justify-start p-3 my-2 rounded-lg transition-colors duration-200";
  const activeLinkClasses = "bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300";
  const inactiveLinkClasses = "hover:bg-gray-100 dark:hover:bg-gray-700";

  return (
    <>
    <aside className={`${isMobileOpen ? 'flex' : 'hidden'} md:flex fixed top-0 right-0 h-full w-64 md:w-64 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex-col transition-all duration-300 shadow-lg z-30`}
    >
      <div className="flex items-center justify-center md:justify-start md:pr-6 h-20 border-b border-gray-200 dark:border-gray-700">
        <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">T</span>
        <h1 className="hidden md:block ml-2 rtl:mr-2 rtl:ml-0 text-xl font-bold text-gray-800 dark:text-white">بوابة المعلم</h1>
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
                        {isActive && <div className="absolute right-0 h-6 w-1 bg-teal-600 dark:bg-teal-400 rounded-l-full"></div>}
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
          to="/teacher/profile"
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
            <img src="https://picsum.photos/seed/teacher/40/40" alt="Teacher" className="w-10 h-10 rounded-full" />
            <div className="hidden md:block mr-3 rtl:ml-3 rtl:mr-0">
                <p className="font-semibold text-sm">{currentUser?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">معلم</p>
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

export default TeacherSidebar;
