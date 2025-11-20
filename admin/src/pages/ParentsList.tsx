import React, { useState, useEffect } from 'react';
import { Parent, ParentAccountStatus } from '../types';
import * as api from '../api';
import { useToast } from '../contexts/ToastContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { UsersIcon } from '../components/icons';

const statusColorMap: { [key in ParentAccountStatus]: string } = {
  [ParentAccountStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [ParentAccountStatus.Invited]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

interface ParentsListProps {
  schoolId: number;
}

const ParentsList: React.FC<ParentsListProps> = ({ schoolId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    setLoading(true);
    api.getSchoolParents(schoolId).then(data => {
      setParents(data);
    }).catch(err => {
      console.error("Failed to fetch parents:", err);
      addToast("فشل تحميل قائمة أولياء الأمور.", 'error');
    }).finally(() => {
        setLoading(false);
    });
  }, [schoolId, addToast]);

  const filteredParents = parents.filter(parent =>
    parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث باسم ولي الأمر أو الطالب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-80 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
          إضافة ولي أمر
        </button>
      </div>
      <div className="overflow-x-auto">
        {loading ? <TableSkeleton /> : filteredParents.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="لا يوجد أولياء أمور"
            message={searchTerm ? `لم يتم العثور على نتائج تطابق بحثك.` : "لم يتم إضافة أولياء أمور بعد."}
          />
        ) : (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">اسم ولي الأمر</th>
                <th scope="col" className="px-6 py-3">اسم الطالب</th>
                <th scope="col" className="px-6 py-3">البريد الإلكتروني</th>
                <th scope="col" className="px-6 py-3">حالة الحساب</th>
                <th scope="col" className="px-6 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredParents.map((parent) => (
                <tr key={parent.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{parent.name}</td>
                  <td className="px-6 py-4">{parent.studentName}</td>
                  <td className="px-6 py-4">{parent.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[parent.status]}`}>
                      {parent.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2 rtl:space-x-reverse whitespace-nowrap">
                    {parent.status === ParentAccountStatus.Invited ? (
                      <button className="font-medium text-teal-600 dark:text-teal-500 hover:underline">
                          إعادة إرسال الدعوة
                      </button>
                    ) : (
                      <button className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">
                          إعادة تعيين كلمة المرور
                      </button>
                    )}
                    <button className="font-medium text-red-600 dark:text-red-500 hover:underline">
                      إلغاء التنشيط
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ParentsList;