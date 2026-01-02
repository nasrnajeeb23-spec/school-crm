import React, { useState, useEffect, useMemo } from 'react';
import { Subscription, SubscriptionStatus } from '../types';
import * as api from '../api';
import ResponsiveTable from '../components/ResponsiveTable';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { useSortableTable } from '../hooks/useSortableTable';
import { RefreshIcon } from '../components/icons';

const SubscriptionsList: React.FC = () => {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        setLoading(true);
        try {
            const data = await api.getSubscriptions();
            setSubscriptions(data);
        } catch (error) {
            console.error('Failed to fetch subscriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSubscriptions = useMemo(() => {
        return subscriptions.filter(sub =>
            sub.schoolName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.planName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [subscriptions, searchQuery]);

    const { sortedData, requestSort, sortConfig } = useSortableTable(filteredSubscriptions);

    const paginatedSubscriptions = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(start, start + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage);

    const columns = [
        {
            header: 'المدرسة',
            accessor: 'schoolName' as keyof Subscription,
            sortable: true,
            render: (sub: Subscription) => (
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {sub.schoolName}
                </span>
            )
        },
        {
            header: 'الباقة',
            accessor: 'planName' as keyof Subscription,
            sortable: true,
            render: (sub: Subscription) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {sub.planName}
                </span>
            )
        },
        {
            header: 'الحالة',
            accessor: 'status' as keyof Subscription,
            sortable: true,
            render: (sub: Subscription) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
            ${sub.status === SubscriptionStatus.Active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                        sub.status === SubscriptionStatus.Trial ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {sub.status === SubscriptionStatus.Active ? 'نشط' :
                        sub.status === SubscriptionStatus.Trial ? 'تجريبي' : 'غير نشط'}
                </span>
            )
        },
        {
            header: 'تاريخ البدء',
            accessor: 'startDate' as keyof Subscription,
            sortable: true,
            render: (sub: Subscription) => (
                <span className="text-sm text-gray-500 dark:text-gray-400 dir-ltr text-right block">
                    {new Date(sub.startDate).toLocaleDateString('ar-SA')}
                </span>
            )
        },
        {
            header: 'تاريخ الانتهاء',
            accessor: 'endDate' as keyof Subscription,
            sortable: true,
            render: (sub: Subscription) => (
                <span className="text-sm text-gray-500 dark:text-gray-400 dir-ltr text-right block">
                    {new Date(sub.endDate).toLocaleDateString('ar-SA')}
                </span>
            )
        },
        {
            header: 'السعر',
            accessor: 'amount' as keyof Subscription,
            sortable: true,
            render: (sub: Subscription) => (
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    ${sub.amount}
                </span>
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">الاشتراكات</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        متابعة اشتراكات المدارس وتواريخ التجديد
                    </p>
                </div>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
                    <RefreshIcon className="w-5 h-5" />
                    تحديث
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <SearchBar
                        onSearch={setSearchQuery}
                        placeholder="بحث في الاشتراكات..."
                    />
                </div>

                <ResponsiveTable
                    columns={columns}
                    data={paginatedSubscriptions}
                    sortConfig={sortConfig}
                    onSort={requestSort}
                />

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={filteredSubscriptions.length}
                />
            </div>
        </div>
    );
};

export default SubscriptionsList;
