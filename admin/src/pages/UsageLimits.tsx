import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { Plan } from '../types';
import { StudentsIcon, UsersIcon, StorageIcon, BranchesIcon } from '../components/icons';

const LimitItem: React.FC<{ icon: React.ElementType; label: string; value: string | number }> = ({ icon: Icon, label, value }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
            <Icon className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            <p className="mr-3 text-base text-gray-600 dark:text-gray-300">{label}</p>
        </div>
        <p className="font-semibold text-gray-800 dark:text-white">
            {typeof value === 'number' ? `حتى ${value.toLocaleString()}` : value}
        </p>
    </div>
);

const UsageLimits: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPlans().then(data => {
      setPlans(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-center p-8">جاري تحميل حدود الاستخدام...</div>;
  }

  return (
    <div className="space-y-8">
      <p className="text-gray-600 dark:text-gray-400">
        هنا يمكنك تحديد و تعديل حدود الموارد والاستخدام لكل خطة من خطط الاشتراك.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {plans.map((plan: Plan) => (
          <div
            key={plan.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 flex flex-col h-full ${plan.recommended ? 'border-2 border-indigo-500' : 'border border-gray-200 dark:border-gray-700'}`}
          >
            <h3 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">{plan.name}</h3>
            
            <div className="space-y-2 flex-grow">
               <LimitItem icon={StudentsIcon} label="الطلاب" value={plan.limits.students} />
               <LimitItem icon={UsersIcon} label="المعلمون" value={plan.limits.teachers} />
               <LimitItem icon={StorageIcon} label="مساحة التخزين (GB)" value={plan.limits.storageGB} />
               <LimitItem icon={BranchesIcon} label="الفروع" value={plan.limits.branches} />
            </div>

            <div className="mt-8">
              <button
                className="w-full py-3 px-6 text-base font-medium rounded-lg transition-colors bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                تعديل الحدود
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsageLimits;
