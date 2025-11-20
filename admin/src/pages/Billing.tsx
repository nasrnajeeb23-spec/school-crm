import React, { useState, useEffect } from 'react';
import { School, SubscriptionStatus } from '../types';
import * as api from '../api';
import StatsCard from '../components/StatsCard';
import { TotalDebtIcon, PastDueIcon, SchoolIcon } from '../components/icons';

const Billing: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSchools().then(data => {
      setSchools(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-center p-8">جاري تحميل بيانات الفوترة...</div>;
  }

  const schoolsWithDebt = schools.filter(school => school.balance > 0);
  const totalDebt = schoolsWithDebt.reduce((acc, school) => acc + school.balance, 0);
  const averageDebt = schoolsWithDebt.length > 0 ? totalDebt / schoolsWithDebt.length : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard 
          icon={TotalDebtIcon} 
          title="إجمالي المديونية" 
          value={`$${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          description="مجموع الأرصدة المستحقة" 
        />
        <StatsCard 
          icon={SchoolIcon} 
          title="مدارس عليها مستحقات" 
          value={schoolsWithDebt.length.toString()}
          description="عدد المدارس ذات رصيد مستحق"
        />
        <StatsCard 
          icon={PastDueIcon} 
          title="متوسط المديونية" 
          value={`$${averageDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          description="لكل مدرسة عليها مستحقات"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">المدارس ذات المديونيات المستحقة</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">اسم المدرسة</th>
                <th scope="col" className="px-6 py-3">الخطة</th>
                <th scope="col" className="px-6 py-3">المبلغ المستحق</th>
                <th scope="col" className="px-6 py-3">حالة الدفع</th>
                <th scope="col" className="px-6 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {schoolsWithDebt.length > 0 ? schoolsWithDebt.map((school: School) => (
                <tr key={school.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{school.name}</td>
                  <td className="px-6 py-4">{school.plan}</td>
                  <td className="px-6 py-4 font-semibold text-red-500">${school.balance.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                      {SubscriptionStatus.PastDue}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2 rtl:space-x-reverse whitespace-nowrap">
                    <a href="#" className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">
                      إرسال تذكير
                    </a>
                    <a href="#" className="font-medium text-gray-600 dark:text-gray-400 hover:underline">
                      عرض الفاتورة
                    </a>
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        لا توجد مدارس عليها مديونيات حاليًا.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Billing;
