import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardIcon, SchoolIcon, SubscriptionIcon, BillingIcon, ModuleIcon, ContentIcon, UsageLimitsIcon, PermissionsIcon, ProfileIcon, LogoutIcon, UsersIcon, ShieldIcon, CloseIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onClose }) => {
  const { logout, currentUser } = useAppContext();
  const navContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = navContainerRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const links = Array.from(el.querySelectorAll('a[href]')) as HTMLElement[];
      if (links.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      let idx = links.findIndex(l => l === active);
      const move = (nextIdx: number) => {
        const clamped = Math.max(0, Math.min(links.length - 1, nextIdx));
        links[clamped].focus();
      };
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        move(idx >= 0 ? idx + 1 : 0);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        move(idx > 0 ? idx - 1 : 0);
      } else if (e.key === 'Home') {
        e.preventDefault();
        move(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        move(links.length - 1);
      }
    };
    el.addEventListener('keydown', onKeyDown);
    return () => { el.removeEventListener('keydown', onKeyDown); };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: DashboardIcon, path: '/superadmin/dashboard' },
    { id: 'schools', label: 'إدارة المدارس', icon: SchoolIcon, path: '/superadmin/schools' },
    { id: 'school-admins', label: 'مدراء المدارس', icon: UsersIcon, path: '/superadmin/school-admins' },
    { id: 'superadmin-team', label: 'فريق المدير العام', icon: ShieldIcon, path: '/superadmin/team' },
    { id: 'analytics', label: 'التحليلات', icon: DashboardIcon, path: '/superadmin/analytics' },
    { id: 'subscriptions', label: 'الاشتراكات', icon: SubscriptionIcon, path: '/superadmin/subscriptions' },
    { id: 'billing', label: 'الفوترة والمالية', icon: BillingIcon, path: '/superadmin/billing' },
    { id: 'modules', label: 'إدارة الخطط', icon: ModuleIcon, path: '/superadmin/plans' },
    { id: 'audit-logs', label: 'سجلات التدقيق', icon: ShieldIcon, path: '/superadmin/audit-logs' },
    { id: 'license', label: 'إدارة التراخيص', icon: ModuleIcon, path: '/superadmin/license' },
    { id: 'content', label: 'إدارة المحتوى', icon: ContentIcon, path: '/superadmin/content' },
    { id: 'onboarding', label: 'طلبات التجربة', icon: UsersIcon, path: '/superadmin/onboarding' },
    { id: 'usage_limits', label: 'حدود الاستخدام', icon: UsageLimitsIcon, path: '/superadmin/usage_limits' },
    { id: 'permissions', label: 'الصلاحيات والأدوار', icon: PermissionsIcon, path: '/superadmin/permissions' },
    { id: 'security', label: 'الأمان', icon: ShieldIcon, path: '/superadmin/security' },
    { id: 'bulk', label: 'عمليات جماعية', icon: UsersIcon, path: '/superadmin/bulk-ops' },
    { id: 'api-keys', label: 'مفاتيح API', icon: ShieldIcon, path: '/superadmin/api-keys' },
    { id: 'sso', label: 'SSO', icon: ShieldIcon, path: '/superadmin/sso' },
    { id: 'tasks', label: 'مركز المهام', icon: DashboardIcon, path: '/superadmin/tasks' },
    { id: 'mfa', label: 'MFA', icon: ShieldIcon, path: '/superadmin/mfa' },
    { id: 'reports-center', label: 'مركز التقارير', icon: DashboardIcon, path: '/superadmin/reports_center' },
  ];

  const baseLinkClasses = "relative flex items-center justify-center md:justify-start p-3 my-2 rounded-lg transition-colors duration-200";
  const activeLinkClasses = "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300";
  const inactiveLinkClasses = "hover:bg-gray-100 dark:hover:bg-gray-700";

  return (
    <>
    <aside className={`${isMobileOpen ? 'flex' : 'hidden'} md:flex fixed top-0 right-0 h-full w-64 md:w-64 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex-col transition-all duration-300 shadow-lg z-30 overflow-hidden`}
    >
      <div className="flex items-center justify-center md:justify-start md:pr-6 h-20 border-b border-gray-200 dark:border-gray-700 relative">
        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">S</span>
        <h1 className="hidden md:block ml-2 text-2xl font-bold text-gray-800 dark:text-white">SchoolSaaS</h1>
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
      <div ref={navContainerRef} className="flex-grow pt-4 overflow-y-auto" tabIndex={0}>
        <nav>
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
      </div>
      
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <NavLink
          to="/superadmin/profile"
          className={({ isActive }) => `relative flex items-center justify-center md:justify-start p-3 my-1 rounded-lg transition-colors duration-200 ${isActive ? activeLinkClasses : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <ProfileIcon className="h-6 w-6" />
          <span className="hidden md:block mr-4">ملفي الشخصي</span>
        </NavLink>
        <button
          type="button"
          onClick={() => { logout(); }}
          className={`relative flex items-center justify-center md:justify-start p-3 my-1 rounded-lg transition-colors duration-200 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50`}
        >
          <LogoutIcon className="h-6 w-6" />
          <span className="hidden md:block mr-4">تسجيل الخروج</span>
        </button>
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
    {isMobileOpen && (
      <div className="fixed inset-0 bg-black/40 md:hidden z-20" onClick={onClose} />
    )}
    </>
  );
};

export default Sidebar;
