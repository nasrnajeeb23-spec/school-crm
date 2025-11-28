import React, { useState, useEffect } from 'react';
import { Role } from '../types';
import * as api from '../api';
import { UsersIcon } from '../components/icons';

const RolesList: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRoles().then(data => {
      setRoles(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-center p-8">جاري تحميل الأدوار...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">
          إدارة أدوار المستخدمين وتحديد صلاحيات الوصول لكل دور في النظام.
        </p>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          إضافة دور جديد
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col border border-gray-200 dark:border-gray-700 transform hover:-translate-y-1 transition-transform duration-300"
          >
            <div className="flex-grow">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{role.name}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{role.description}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <UsersIcon className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0" />
                    <span>{role.userCount.toLocaleString()} مستخدم</span>
                </div>
                <div className="flex gap-2">
                    <button className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        تعديل
                    </button>
                    <button className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">
                        حذف
                    </button>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RolesList;
