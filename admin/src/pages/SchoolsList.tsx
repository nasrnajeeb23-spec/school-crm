import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionStatus, School, NewSchoolData } from '../types';
import * as api from '../api';
import AddSchoolModal from '../components/AddSchoolModal';
import Pagination from '../components/Pagination';
import ResponsiveTable from '../components/ResponsiveTable';
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchSchools();
  }, [currentPage, itemsPerPage]);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const data = await api.getSchools();
      setSchools(data);
      setTotalItems(data.length);
    } catch (error) {
      console.error("Failed to fetch schools:", error);
      addToast("فشل تحميل قائمة المدارس. الرجاء المحاولة مرة أخرى.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchool = async (data: NewSchoolData) => {
    try {
      const newSchool = await api.addSchool(data);
      setSchools(prev => [newSchool, ...prev]);
      setTotalItems(prev => prev + 1);
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

  // Pagination logic
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSchools = schools.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Render table row for desktop
  const renderRow = (school: School) => (
    <>
      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{school.name}</td>
      <td className="px-6 py-4">{school.plan}</td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[school.status]}`}>
          {school.status}
        </span>
      </td>
      <td className="px-6 py-4">{school.students}</td>
      <td className={`px-6 py-4 font-semibold ${school.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
        ${school.balance.toFixed(2)}
      </td>
      <td className="px-6 py-4">
        <button
          onClick={() => handleManageSchool(school)}
          className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline"
        >
          إدارة
        </button>
      </td>
    </>
  );

  // Render card for mobile
  const renderCard = (school: School) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">{school.name}</h3>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[school.status]}`}>
          {school.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">الخطة:</span>
          <span className="mr-2 text-gray-900 dark:text-white">{school.plan}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">الطلاب:</span>
          <span className="mr-2 text-gray-900 dark:text-white">{school.students}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">الرصيد:</span>
          <span className={`mr-2 font-semibold ${school.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
            ${school.balance.toFixed(2)}
          </span>
        </div>
      </div>
      <button
        onClick={() => handleManageSchool(school)}
        className="w-full mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        إدارة المدرسة
      </button>
    </div>
  );

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">قائمة المدارس</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                إجمالي المدارس: {totalItems}
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 ml-2" />
              إضافة مدرسة
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <TableSkeleton />
          </div>
        ) : schools.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={SchoolIcon}
              title="لا توجد مدارس بعد"
              message="ابدأ بإضافة مدرسة جديدة لإدارة اشتراكاتها وبياناتها."
              actionText="إضافة مدرسة جديدة"
              onAction={() => setIsModalOpen(true)}
            />
          </div>
        ) : (
          <>
            <div className="p-6">
              <ResponsiveTable
                headers={['اسم المدرسة', 'الخطة', 'الحالة', 'الطلاب', 'الرصيد المستحق', 'إجراءات']}
                data={paginatedSchools}
                renderRow={renderRow}
                renderCard={renderCard}
                keyExtractor={(school) => String(school.id)}
                emptyMessage="لا توجد مدارس في هذه الصفحة"
              />
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
          </>
        )}
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
