import React from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardIcon, SchoolIcon, SubscriptionIcon, BillingIcon, ModuleIcon, ContentIcon, UsageLimitsIcon, PermissionsIcon, ProfileIcon, LogoutIcon, UsersIcon, ShieldIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';

const Sidebar: React.FC = () => {
  const { logout, currentUser } = useAppContext();

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: DashboardIcon, path: '/superadmin/dashboard' },
    { id: 'schools', label: 'إدارة المدارس', icon: SchoolIcon, path: '/superadmin/schools' },
    { id: 'school-admins', label: 'مدراء المدارس', icon: UsersIcon, path: '/superadmin/school-admins' },
    { id: 'superadmin-team', label: 'فريق المدير العام', icon: ShieldIcon, path: '/superadmin/team' },
    { id: 'subscriptions', label: 'الاشتراكات', icon: SubscriptionIcon, path: '/superadmin/subscriptions' },
    { id: 'billing', label: 'الفوترة والمالية', icon: BillingIcon, path: '/superadmin/billing' },
    { id: 'modules', label: 'إدارة الوحدات', icon: ModuleIcon, path: '/superadmin/modules' },
    { id: 'license', label: 'إدارة التراخيص', icon: ModuleIcon, path: '/superadmin/license' },
    { id: 'content', label: 'إدارة المحتوى', icon: ContentIcon, path: '/superadmin/content' },
    { id: 'usage_limits', label: 'حدود الاستخدام', icon: UsageLimitsIcon, path: '/superadmin/usage_limits' },
    { id: 'permissions', label: 'الصلاحيات والأدوار', icon: PermissionsIcon, path: '/superadmin/permissions' },
  ];

  const baseLinkClasses = "relative flex items-center justify-center md:justify-start p-3 my-2 rounded-lg transition-colors duration-200";
  const activeLinkClasses = "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300";
  const inactiveLinkClasses = "hover:bg-gray-100 dark:hover:bg-gray-700";

  return (
    <aside className="fixed top-0 right-0 h-full w-16 md:w-64 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex flex-col transition-all duration-300 shadow-lg z-30">
      <div className="flex items-center justify-center md:justify-start md:pr-6 h-20 border-b border-gray-200 dark:border-gray-700">
        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">S</span>
        <h1 className="hidden md:block ml-2 text-2xl font-bold text-gray-800 dark:text-white">SchoolSaaS</h1>
      </div>
      <nav className="flex-grow pt-4">
        <ul>
          {navItems.map(item => (
            <li key={item.id} className="px-2">
              <NavLink
                to={item.path}
                className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute right-0 h-6 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-l-full"></div>}
                    <item.icon className="h-6 w-6" />
                    <span className="hidden md:block mr-4">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <NavLink
          to="/superadmin/profile"
          className={({ isActive }) => `relative flex items-center justify-center md:justify-start p-3 my-1 rounded-lg transition-colors duration-200 ${isActive ? activeLinkClasses : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <ProfileIcon className="h-6 w-6" />
          <span className="hidden md:block mr-4">ملفي الشخصي</span>
        </NavLink>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            logout();
          }}
          className={`relative flex items-center justify-center md:justify-start p-3 my-1 rounded-lg transition-colors duration-200 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50`}
        >
          <LogoutIcon className="h-6 w-6" />
          <span className="hidden md:block mr-4">تسجيل الخروج</span>
        </a>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center md:justify-start">
            <img src="https://picsum.photos/seed/admin/40/40" alt="Admin" className="w-10 h-10 rounded-full" />
            <div className="hidden md:block mr-3">
                <p className="font-semibold text-sm">{currentUser?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Super Admin</p>
            </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
