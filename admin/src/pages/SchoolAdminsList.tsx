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

    const { sortedData, requestSort, sortConfig } = useSortableTable(filteredAdmins);

    const paginatedAdmins = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(start, start + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);

    const columns = [
        {
            header: 'الاسم',
            accessor: 'name' as keyof User,
            sortable: true,
            render: (user: User) => (
                <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {(user as any)?.fullName || user.name}
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
