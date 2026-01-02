import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ParentSidebar from '../components/ParentSidebar';
import Header from '../components/Header';
import { ActionItem } from '../types';
import ThemeToggle from '../components/ThemeToggle';
import NotificationDropdown from '../components/NotificationDropdown';
import { BellIcon } from '../components/icons';
import * as api from '../api';
import { useAppContext } from '../contexts/AppContext';

const viewTitles: { [key: string]: string } = {
  dashboard: 'لوحة التحكم', grades: 'درجات الطالب', attendance: 'الحضور والغياب',
  finance: 'المالية والفواتير', assignments: 'الواجبات', schedule: 'الجدول الدراسي', requests: 'الطلبات',
  messaging: 'الرسائل', transportation: 'النقل المدرسي', profile: 'ملفي الشخصي',
};

const ParentLayout: React.FC = () => {
  const { currentUser, theme, toggleTheme } = useAppContext();
  const location = useLocation();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    api.getParentActionItems().then(setActionItems);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTitle = () => {
    const currentPath = location.pathname.split('/').pop() || 'dashboard';
    const title = viewTitles[currentPath] || 'لوحة التحكم';
    if(currentPath === 'dashboard' && currentUser) {
        return `أهلاً بك، ${currentUser.name}`;
    }
    return title;
  };

  const unreadCount = actionItems.filter(item => !item.isRead).length;

  return (
    <>
      <ParentSidebar isMobileOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="md:pr-64 transition-all duration-300">
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-wrap justify-between items-start gap-4">
             <Header title={getTitle()} onMenuToggle={() => setIsSidebarOpen(true)} />
             <div className="flex items-center gap-4">
                <div className="relative" ref={notificationRef}>
                  <button 
                    onClick={() => setIsNotificationsOpen(prev => !prev)}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 relative"
                    aria-label="Notifications"
                  >
                    <BellIcon className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {isNotificationsOpen && (
                    <NotificationDropdown items={actionItems} onClose={() => setIsNotificationsOpen(false)} />
                  )}
                </div>
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
             </div>
          </div>
          <Outlet />
        </div>
      </main>
      <TooltipGuide />
    </>
  );
};

import TooltipGuide from '../components/TooltipGuide';
export default ParentLayout;
