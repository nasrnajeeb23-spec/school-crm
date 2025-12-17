

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionStatus, School, NewSchoolData } from '../types';
import * as api from '../api';
import AddSchoolModal from '../components/AddSchoolModal';
import { PlusIcon, SchoolIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';

const statusColorMap: { [key in SubscriptionStatus]: string } = {
  [SubscriptionStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [SubscriptionStatus.Trial]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [SubscriptionStatus.PastDue]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  [SubscriptionStatus.Canceled]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const SchoolsList: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const fetcher = showDeleted ? api.getDeletedSchools : api.getSchools;
    fetcher().then(data => {
      setSchools(data);
    }).catch(error => {
      console.error("Failed to fetch schools:", error);
      addToast("فشل تحميل قائمة المدارس. الرجاء المحاولة مرة أخرى.", 'error');
    }).finally(() => {
      setLoading(false);
    });
  }, [addToast, showDeleted]);
  
  const handleAddSchool = async (data: NewSchoolData) => {
      try {
          const newSchool = await api.addSchool(data);
          setSchools(prev => [newSchool, ...prev]);
          addToast(`تمت إضافة مدرسة "${newSchool.name}" بنجاح!`, 'success');
          setIsModalOpen(false);
      } catch (error) {
          console.error("Failed to add school", error);
          addToast("حدث خطأ أثناء إضافة المدرسة.", 'error');
      }
  };
  
  const handleManageSchool = (school: School) => {
    navigate(`/superadmin/schools/${school.id}/manage`);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">قائمة المدارس</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 ml-2" />
            إضافة مدرسة
          </button>
          <button
            onClick={() => setShowDeleted(v => !v)}
            className={`ml-2 px-4 py-2 rounded-lg transition-colors ${showDeleted ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
          >
            {showDeleted ? 'عرض النشطة' : 'عرض المحذوفة'}
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton />
          ) : schools.length === 0 ? (
            <EmptyState
                icon={SchoolIcon}
                title="لا توجد مدارس بعد"
                message="ابدأ بإضافة مدرسة جديدة لإدارة اشتراكاتها وبياناتها."
                actionText="إضافة مدرسة جديدة"
                onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3">اسم المدرسة</th>
                  <th scope="col" className="px-6 py-3">الخطة</th>
                  <th scope="col" className="px-6 py-3">الحالة</th>
                  <th scope="col" className="px-6 py-3">الطلاب</th>
                  <th scope="col" className="px-6 py-3">الرصيد المستحق</th>
                  <th scope="col" className="px-6 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{school.name}</td>
                    <td className="px-6 py-4">{school.plan}</td>
                    <td className="px-6 py-4">
                      {showDeleted ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                          محذوفة
                        </span>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[school.status]}`}>
                          {school.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{school.students}</td>
                    <td className={`px-6 py-4 font-semibold ${school.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>${school.balance.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      {showDeleted ? (
                        <button
                          onClick={async () => {
                            try {
                              await api.restoreSchool(school.id);
                              setSchools(prev => prev.filter(s => s.id !== school.id));
                              addToast('تم استرجاع المدرسة.', 'success');
                            } catch (e) {
                              console.error('Restore failed', e);
                              addToast('فشل استرجاع المدرسة.', 'error');
                            }
                          }}
                          className="font-medium text-green-600 dark:text-green-400 hover:underline"
                        >
                          استرجاع
                        </button>
                      ) : (
                        <button onClick={() => handleManageSchool(school)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">
                          إدارة
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {isModalOpen && (
        <AddSchoolModal 
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddSchool}
        />
      )}
    </>
  );
};

export default SchoolsList;
