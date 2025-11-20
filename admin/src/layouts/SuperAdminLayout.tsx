import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppContext } from '../contexts/AppContext';
import ThemeToggle from '../components/ThemeToggle';

const viewTitles: { [key: string]: string } = {
  dashboard: 'لوحة التحكم الرئيسية',
  schools: 'إدارة المدارس',
  subscriptions: 'إدارة الاشتراكات',
  billing: 'الفوترة والمالية',
  modules: 'إدارة الوحدات والأسعار',
  usage_limits: 'إدارة حدود الاستخدام',
  permissions: 'إدارة الصلاحيات والأدوار',
  content: 'إدارة محتوى الواجهة',
  profile: 'ملفي الشخصي',
};

const SuperAdminLayout: React.FC = () => {
  const { theme, toggleTheme } = useAppContext();
  const location = useLocation();

  const getTitle = () => {
    const currentPath = location.pathname.split('/').pop() || 'dashboard';
    return viewTitles[currentPath] || 'لوحة التحكم';
  };

  return (
    <>
      <Sidebar />
      <main className="pr-16 md:pr-64 transition-all duration-300">
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-start">
             <Header title={getTitle()} />
             <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
          <Outlet />
        </div>
      </main>
    </>
  );
};

export default SuperAdminLayout;
