import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Parent, ParentAccountStatus } from '../types';
import * as api from '../api';
import { EditIcon, DeleteIcon, EyeIcon } from '../components/icons';
import ResponsiveTable from '../components/ResponsiveTable';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { useSortableTable } from '../hooks/useSortableTable';

interface ParentsListProps {
    schoolId: number;
}

const ParentsList: React.FC<ParentsListProps> = ({ schoolId }) => {
    const [parents, setParents] = useState<Parent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const navigate = useNavigate();

    useEffect(() => {
        if (schoolId) {
            fetchParents();
        }
    }, [schoolId]);

    const fetchParents = async () => {
        setLoading(true);
        try {
            const data = await api.getSchoolParents(schoolId);
            setParents(data);
        } catch (error) {
            console.error('Failed to fetch parents:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredParents = useMemo(() => {
        return parents.filter(parent =>
            parent.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            parent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            parent.phoneNumber.includes(searchQuery)
        );
    }, [parents, searchQuery]);

    const { sortedData, requestSort, sortConfig } = useSortableTable(filteredParents);

    const paginatedParents = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(start, start + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredParents.length / itemsPerPage);

    const columns = [
        {
            header: 'اسم ولي الأمر',
            accessor: 'fullName' as keyof Parent,
            sortable: true,
            render: (parent: Parent) => (
                <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {parent.fullName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {parent.email}
                    </div>
                </div>
            )
        },
        {
            header: 'رقم الهاتف',
            accessor: 'phoneNumber' as keyof Parent,
            sortable: true,
            render: (parent: Parent) => (
                <span className="text-sm text-gray-900 dark:text-white dir-ltr">
                    {parent.phoneNumber}
                </span>
            )
        },
        {
            header: 'الحالة',
            accessor: 'accountStatus' as keyof Parent,
            sortable: true,
            render: (parent: Parent) => (
                <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${parent.accountStatus === ParentAccountStatus.Active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                    {parent.accountStatus === ParentAccountStatus.Active ? 'نشط' : 'غير نشط'}
                </span>
            )
        },
        {
            header: 'عدد الطلاب',
            accessor: 'studentsCount' as keyof Parent,
            sortable: true,
            render: (parent: Parent) => (
                <span className="text-sm text-gray-900 dark:text-white text-center block">
                    {parent.studentsCount || 0}
                </span>
            )
        },
        {
            header: 'الإجراءات',
            accessor: 'id' as keyof Parent,
            render: (parent: Parent) => (
                <div className="flex space-x-2 space-x-reverse">
                    <button
                        onClick={() => navigate(`/school/parents/${parent.id}`)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                        title="عرض التفاصيل"
                    >
                        <EyeIcon className="w-5 h-5" />
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">أولياء الأمور</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        إدارة حسابات أولياء الأمور ومتابعة أبنائهم
                    </p>
                </div>
                {/* Actions like Add Parent can differ based on implementation */}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <SearchBar
                        onSearch={setSearchQuery}
                        placeholder="بحث عن ولي أمر (الاسم، البريد، الهاتف)..."
                    />
                </div>

                <ResponsiveTable
                    columns={columns}
                    data={paginatedParents}
                    sortConfig={sortConfig}
                    onSort={requestSort}
                />

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={filteredParents.length}
                />
            </div>
        </div>
    );
};

export default ParentsList;
