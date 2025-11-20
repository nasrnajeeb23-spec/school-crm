import React from 'react';
import { PermissionsIcon } from './icons';

const AccessDenied: React.FC = () => {
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
    </div>
  );
};

export default AccessDenied;