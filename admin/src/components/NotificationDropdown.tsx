import React from 'react';
import { ActionItemIcon, BellIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';
import * as api from '../api';
import { ActionItem } from '../types';

interface NotificationDropdownProps {
  isSuperAdmin?: boolean;
  items?: ActionItem[];
  onClose?: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isSuperAdmin = false, items: propItems, onClose }) => {
  const [internalItems, setInternalItems] = React.useState<ActionItem[]>([]);
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const isControlled = propItems !== undefined;
  const items = propItems || internalItems;
  // If controlled, we assume the parent handles the "open" state mounting/unmounting, so it's always "open" when rendered.
  // OR we can still use isOpen but default to true.
  // However, looking at usage: {isNotificationsOpen && <NotificationDropdown ... />}
  // So it is only mounted when open.
  const isOpen = isControlled ? true : internalIsOpen;

  React.useEffect(() => {
    if (!isControlled) {
      // Initial fetch for uncontrolled mode
      fetchNotifications();
    }
  }, [isSuperAdmin, isControlled]);

  React.useEffect(() => {
    if (!isControlled) {
        // Click outside handler for uncontrolled mode
        const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setInternalIsOpen(false);
        }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isControlled]);

  const fetchNotifications = async () => {
    try {
      const data = isSuperAdmin ? await api.getActionItems() : await api.getActionItems(); 
      setInternalItems(data);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  const unreadCount = items.filter(i => !i.isRead).length;

  const handleClose = () => {
      if (onClose) onClose();
      else setInternalIsOpen(false);
  };

  if (isControlled) {
      return (
        <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 z-50">
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 dark:text-white">الإشعارات</h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold">&times;</button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length > 0 ? items.map(item => (
              <div key={item.id} className={`flex items-start p-4 border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!item.isRead ? 'bg-teal-50/50 dark:bg-teal-900/20' : ''}`}>
                {!item.isRead && <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 ml-3 flex-shrink-0"></div>}
                <div className={`flex-shrink-0 mt-1 ${item.isRead ? 'ml-5' : ''}`}>
                  <ActionItemIcon type={item.type} className="h-6 w-6" />
                </div>
                <div className="mr-3 flex-grow">
                  <p className="font-semibold text-sm text-gray-800 dark:text-white">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 mr-auto whitespace-nowrap self-start">{item.date}</span>
              </div>
            )) : (
              <p className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">لا توجد إشعارات جديدة.</p>
            )}
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 text-center">
            <a href="#" className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
              عرض كل الإشعارات
            </a>
          </div>
        </div>
      );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setInternalIsOpen(!internalIsOpen)}
        className="p-2 mr-2 text-gray-400 hover:text-gray-500 relative rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition w-10 h-10 flex items-center justify-center"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 block w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 z-50">
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 dark:text-white">الإشعارات</h3>
            <button onClick={() => setInternalIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold">&times;</button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length > 0 ? items.map(item => (
              <div key={item.id} className={`flex items-start p-4 border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!item.isRead ? 'bg-teal-50/50 dark:bg-teal-900/20' : ''}`}>
                {!item.isRead && <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 ml-3 flex-shrink-0"></div>}
                <div className={`flex-shrink-0 mt-1 ${item.isRead ? 'ml-5' : ''}`}>
                  <ActionItemIcon type={item.type} className="h-6 w-6" />
                </div>
                <div className="mr-3 flex-grow">
                  <p className="font-semibold text-sm text-gray-800 dark:text-white">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 mr-auto whitespace-nowrap self-start">{item.date}</span>
              </div>
            )) : (
              <p className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">لا توجد إشعارات جديدة.</p>
            )}
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 text-center">
            <a href="#" className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
              عرض كل الإشعارات
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;