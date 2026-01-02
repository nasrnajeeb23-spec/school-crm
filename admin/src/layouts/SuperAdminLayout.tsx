import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumbs from '../components/Breadcrumbs';
import HelpWidget from '../components/HelpWidget';
import { useAppContext } from '../contexts/AppContext';
import ThemeToggle from '../components/ThemeToggle';
<<<<<<< HEAD
import NotificationDropdown from '../components/NotificationDropdown';
=======
import TooltipGuide from '../components/TooltipGuide';
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae

const viewTitles: { [key: string]: string } = {
  dashboard: 'لوحة التحكم الرئيسية',
  schools: 'إدارة المدارس',
  subscriptions: 'إدارة الاشتراكات',
  billing: 'الفوترة والمالية',
  modules: 'إدارة الخطط والأسعار',
  plans: 'إدارة الخطط والأسعار',
  usage_limits: 'إدارة حدود الاستخدام',
  permissions: 'إدارة الصلاحيات والأدوار',
  content: 'إدارة محتوى الواجهة',
  messages: 'رسائل تواصل معنا',
  profile: 'ملفي الشخصي',
};

const SuperAdminLayout: React.FC = () => {
  const { theme, toggleTheme } = useAppContext();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const getTitle = () => {
    const currentPath = location.pathname.split('/').pop() || 'dashboard';
    return viewTitles[currentPath] || 'لوحة التحكم';
  };

  return (
    <>
      <Sidebar isMobileOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="md:pr-64 transition-all duration-300">
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <Header title={getTitle()} onMenuToggle={() => setIsSidebarOpen(true)}>
              <div className="flex items-center gap-2">
                <NotificationDropdown isSuperAdmin={true} />
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
              </div>
            </Header>
          </div>
          <Breadcrumbs className="mt-4 mb-6" />
          <Outlet />
        </div>
      </main>
<<<<<<< HEAD
      <HelpWidget />
=======
      <TooltipGuide />
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
    </>
  );
};

export default SuperAdminLayout;
