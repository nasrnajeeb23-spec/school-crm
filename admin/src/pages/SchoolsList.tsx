
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
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.getSchoolsList().then(data => {
      setSchools(data);
    }).catch(error => {
        console.error("Failed to fetch schools:", error);
        addToast("فشل تحميل قائمة المدارس. الرجاء المحاولة مرة أخرى.", 'error');
    }).finally(() => {
        setLoading(false);
    });
  }, [addToast]);
  
  const handleAddSchool = async (data: NewSchoolData) => {
      try {
          await api.addSchool(data);
          const updatedList = await api.getSchoolsList();
          setSchools(updatedList);
          addToast(`تمت إضافة مدرسة "${data.name}" بنجاح!`, 'success');
          setIsModalOpen(false);
      } catch (error) {
          console.error("Failed to add school", error);
          addToast("حدث خطأ أثناء إضافة المدرسة.", 'error');
      }
  };
  
  const handleManageSchool = (school: School) => {
    navigate(`/manage/school/${school.id}`);
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
                    <td className="px-6 py-4">{school.plan || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[school.status] || 'bg-gray-100 text-gray-800'}`}>
                        {school.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{school.students ?? 0}</td>
                    <td className={`px-6 py-4 font-semibold ${(school.balance || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>${(school.balance || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleManageSchool(school)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">
                        إدارة
                      </button>
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
