import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionStatus, School, NewSchoolData } from '../types';
import * as api from '../api';
import { SchoolIcon, EditIcon, CheckIcon, XIcon, MoreVerticalIcon, PlusIcon } from '../components/icons';
import ResponsiveTable from '../components/ResponsiveTable';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import AddSchoolModal from '../components/AddSchoolModal';
import { useToast } from '../contexts/ToastContext';
import { useSortableTable } from '../hooks/useSortableTable';
import EmptyState from '../components/EmptyState';

const statusColorMap: { [key in SubscriptionStatus]: string } = {
  [SubscriptionStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [SubscriptionStatus.Inactive]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  [SubscriptionStatus.Trial]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [SubscriptionStatus.PastDue]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  [SubscriptionStatus.Canceled]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const SchoolsList: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const data = await api.getSchools();
      setSchools(data);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      addToast('فشل تحميل قائمة المدارس', 'error');
    } finally {
      setLoading(false);
    }
  };

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

  const handleUpdateStatus = async (school: School, newStatus: SubscriptionStatus) => {
    if (!window.confirm(`هل أنت متأكد من تغيير حالة المدرسة إلى "${newStatus}"؟`)) return;

    try {
      await api.updateSchool(school.id, { status: newStatus });
      setSchools(prev => prev.map(s => s.id === school.id ? { ...s, status: newStatus } : s));
      addToast(`تم تحديث حالة المدرسة بنجاح`, 'success');
    } catch (error) {
      console.error("Failed to update status", error);
      addToast("فشل تحديث الحالة", 'error');
    }
  };

  const filteredSchools = useMemo(() => {
    return schools.filter(school =>
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.plan?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [schools, searchQuery]);

  const { sortedData, requestSort, sortConfig } = useSortableTable(filteredSchools);

  const paginatedSchools = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);

  const columns = [
    {
      header: 'المدرسة',
      accessor: 'name' as keyof School,
      sortable: true,
      render: (school: School) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 relative">
            {school.logoUrl ? (
              <img className="h-10 w-10 rounded-full object-cover" src={api.getAssetUrl(school.logoUrl)} alt="" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                <SchoolIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
              </div>
            )}
            <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 ${school.status === SubscriptionStatus.Active ? 'bg-green-400' : 'bg-gray-400'}`} />
          </div>
          <div className="mr-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white">{school.name}</div>
          </div>
        </div>
      )
    },
    {
      header: 'الباقة',
      accessor: 'plan' as keyof School,
      sortable: true,
      render: (school: School) => (
        <div className="text-sm text-gray-900 dark:text-white">
          {school.plan || 'مجانية'}
        </div>
      )
    },
    {
      header: 'الحالة',
      accessor: 'status' as keyof School,
      render: (school: School) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColorMap[school.status]}`}>
          {school.status}
        </span>
      )
    },
    {
      header: 'الطلاب',
      accessor: 'students' as keyof School,
      sortable: true,
      render: (school: School) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {school.students}
        </span>
      )
    },
    {
      header: 'الرصيد',
      accessor: 'balance' as keyof School,
      sortable: true,
      render: (school: School) => (
        <span className={`text-sm font-semibold ${school.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
          ${school.balance.toFixed(2)}
        </span>
      )
    },
    {
      header: 'الإجراءات',
      accessor: 'id' as keyof School,
      render: (school: School) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleManageSchool(school)}
            className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline"
          >
            إدارة
          </button>

          {school.status === SubscriptionStatus.Active ? (
            <button
              onClick={() => handleUpdateStatus(school, SubscriptionStatus.Canceled)}
              className="font-medium text-red-600 dark:text-red-500 hover:underline text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded"
            >
              تعليق
            </button>
          ) : (
            <button
              onClick={() => handleUpdateStatus(school, SubscriptionStatus.Active)}
              className="font-medium text-green-600 dark:text-green-500 hover:underline text-xs bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded"
            >
              تفعيل
            </button>
          )}
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">قائمة المدارس</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            إجمالي المدارس: {filteredSchools.length}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <PlusIcon className="h-5 w-5 ml-2" />
          إضافة مدرسة
        </button>
      </div>

      {schools.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <EmptyState
            icon={SchoolIcon}
            title="لا توجد مدارس بعد"
            message="ابدأ بإضافة مدرسة جديدة لإدارة اشتراكاتها وبياناتها."
            actionText="إضافة مدرسة جديدة"
            onAction={() => setIsModalOpen(true)}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <SearchBar
              onSearch={setSearchQuery}
              placeholder="بحث عن مدرسة..."
            />
          </div>

          <ResponsiveTable
            columns={columns}
            data={paginatedSchools}
            sortConfig={sortConfig}
            onSort={requestSort}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={filteredSchools.length}
          />
        </div>
      )}

      {isModalOpen && (
        <AddSchoolModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddSchool}
        />
      )}
    </div>
  );
};

export default SchoolsList;
