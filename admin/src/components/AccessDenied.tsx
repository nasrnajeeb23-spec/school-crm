import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionsIcon } from './icons';

const AccessDenied: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="mt-12 flex flex-col items-center justify-center text-center">
      <div className="p-4 bg-red-100 dark:bg-red-900/50 rounded-full">
        <PermissionsIcon className="h-12 w-12 text-red-500 dark:text-red-400" />
      </div>
      <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white">
        وصول مرفوض
      </h2>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        عذرًا، أنت لا تملك الصلاحيات اللازمة لعرض هذه الصفحة.
      </p>
      <div className="mt-4">
        <button onClick={() => navigate('/school/modules')} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          الذهاب لتفعيل الوحدة
        </button>
      </div>
    </div>
  );
};

export default AccessDenied;
