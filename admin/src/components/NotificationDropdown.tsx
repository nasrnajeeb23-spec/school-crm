import React from 'react';
import { ActionItem } from '../types';
import { ActionItemIcon } from './icons';

interface NotificationDropdownProps {
  items: ActionItem[];
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ items, onClose }) => {
  return (
    <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 z-50">
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 dark:text-white">الإشعارات</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold">&times;</button>
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
};

export default NotificationDropdown;