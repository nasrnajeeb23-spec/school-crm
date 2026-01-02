import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import ThemeToggle from '../components/ThemeToggle';
import DriverSidebar from '../components/DriverSidebar';
import { useAppContext } from '../contexts/AppContext';

const viewTitles: { [key: string]: string } = {
  dashboard: 'لوحة التحكم',
  profile: 'ملفي الشخصي',
};

const DriverLayout: React.FC = () => {
  const { currentUser, theme, toggleTheme } = useAppContext();
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
    const title = viewTitles[currentPath] || 'لوحة التحكم';
    if (currentPath === 'dashboard' && currentUser) {
      return `أهلاً بك، ${currentUser.name}`;
    }
    return title;
  };

  return (
    <>
      <DriverSidebar isMobileOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="md:pr-64 transition-all duration-300">
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <Header title={getTitle()} onMenuToggle={() => setIsSidebarOpen(true)} />
            <div className="flex items-center gap-4">
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
          </div>
          <Outlet />
        </div>
      </main>
    </>
  );
};

export default DriverLayout;

