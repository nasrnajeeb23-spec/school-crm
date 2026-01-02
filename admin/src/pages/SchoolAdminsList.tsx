import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../types';
import * as api from '../api';
import ResponsiveTable from '../components/ResponsiveTable';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { useSortableTable } from '../hooks/useSortableTable';
import { EditIcon, DeleteIcon, KeyIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';

const SchoolAdminsList: React.FC = () => {
    const [admins, setAdmins] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const { addToast } = useToast();

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            // Assuming there's an API to get school admins specifically or filtering users
            // This might need adjustment based on actual API
            const data = await api.getUsersByRole(UserRole.SchoolAdmin);
            setAdmins(data);
        } catch (error) {
            console.error('Failed to fetch school admins:', error);
            // Fallback for demo if API doesn't exist
            setAdmins([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredAdmins = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return admins.filter(admin => {
            const name = String((admin as any)?.fullName || admin.name || '').toLowerCase();
            const email = String(admin.email || '').toLowerCase();
            const schoolName = String((admin as any)?.schoolName || '').toLowerCase();
            return name.includes(q) || email.includes(q) || schoolName.includes(q);
        });
    }, [admins, searchQuery]);

<<<<<<< HEAD
    const { sortedData, requestSort, sortConfig } = useSortableTable(filteredAdmins);
=======
  const handleDelete = async (adminId: number | string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المدير؟')) {
      try {
        await api.deleteUser(adminId);
        addToast('تم حذف المدير بنجاح', 'success');
        fetchData();
      } catch (error) {
        addToast('فشل حذف المدير', 'error');
      }
    }
  };
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae

    const paginatedAdmins = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(start, start + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);

<<<<<<< HEAD
    const columns = [
        {
            header: 'الاسم',
            accessor: 'name' as keyof User,
            sortable: true,
            render: (user: User) => (
                <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {(user as any)?.fullName || user.name}
=======
  const handleUpdateAdmin = async (id: number | string, data: any) => {
    try {
      await api.updateUser(id, data);
      addToast('تم تحديث بيانات المدير بنجاح', 'success');
      setIsEditModalOpen(false);
      setEditingAdmin(null);
      fetchData();
    } catch (error: any) {
      addToast(error.message || 'فشل تحديث بيانات المدير', 'error');
    }
  };

  if (loading) {
    return <div className="text-center p-8">جاري تحميل بيانات مدراء المدارس...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">إدارة مدراء المدارس</h1>
          <p className="text-gray-600 dark:text-gray-400">
            إدارة مدراء المدارس وصلاحياتهم في النظام
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          إضافة مدير مدرسة
        </button>
      </div>

      {isModalOpen && (
        <AddSchoolAdminModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleCreateAdmin} 
          schools={schools} 
        />
      )}

      {isEditModalOpen && editingAdmin && (
        <EditSchoolAdminModal 
          admin={editingAdmin}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingAdmin(null);
          }}
          onSave={handleUpdateAdmin}
          schools={schools}
        />
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث باسم المدير أو البريد الإلكتروني..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">جميع المدارس</option>
            {schools.map(school => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Admins List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  المدير
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  المدرسة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  تاريخ الإنشاء
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAdmins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        className="h-10 w-10 rounded-full"
                        src={`https://picsum.photos/seed/admin${admin.id}/40/40`}
                        alt={admin.name}
                      />
                      <div className="mr-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {admin.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {admin.email}
                        </div>
                      </div>
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
                    </div>
                </div>
            )
        },
        {
            header: 'البريد الإلكتروني',
            accessor: 'email' as keyof User,
            sortable: true,
            render: (user: User) => (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                </div>
            )
        },
        {
            header: 'المدرسة',
            accessor: 'schoolId' as keyof User,
            sortable: true,
            render: (user: User) => (
                <div className="text-sm text-gray-900 dark:text-white">
                    {(user as any)?.schoolName || (user.schoolId ? String(user.schoolId) : '-')}
                </div>
            )
        },
        {
            header: 'آخر دخول',
            accessor: 'createdAt' as keyof User,
            sortable: true,
            render: (user: User) => (
                <div className="text-sm text-gray-500 dark:text-gray-400 dir-ltr text-right">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : '-'}
                </div>
            )
        },
        {
            header: 'الإجراءات',
            accessor: 'id' as keyof User,
            render: (user: User) => (
                <div className="flex space-x-2 space-x-reverse">
                    <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors" title="تعديل">
                        <EditIcon className="w-5 h-5" />
                    </button>
                    <button className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors" title="إعادة تعيين كلمة المرور">
                        <KeyIcon className="w-5 h-5" />
                    </button>
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">مدراء المدارس</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        إدارة حسابات مدراء المدارس وصلاحياتهم
                    </p>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                    إضافة مدير جديد
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <SearchBar
                        onSearch={setSearchQuery}
                        placeholder="بحث عن مدير مدرسة..."
                    />
                </div>

                <ResponsiveTable
                    columns={columns}
                    data={paginatedAdmins}
                    sortConfig={sortConfig}
                    onSort={requestSort}
                />

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={filteredAdmins.length}
                />
            </div>
        </div>
    );
};

export default SchoolAdminsList;
