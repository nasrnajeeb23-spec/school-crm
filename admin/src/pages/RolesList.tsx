import React, { useState, useEffect, useMemo } from 'react';
import { Role } from '../types';
import * as api from '../api';
import { UsersIcon, EditIcon, DeleteIcon } from '../components/icons';
import ResponsiveTable from '../components/ResponsiveTable';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { useSortableTable } from '../hooks/useSortableTable';

const RolesList: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await api.getRoles();
      setRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = useMemo(() => {
    return roles.filter(role =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [roles, searchQuery]);

  const { sortedData, requestSort, sortConfig } = useSortableTable(filteredRoles);

  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);

  const columns = [
    {
      header: 'اسم الدور',
      accessor: 'name' as keyof Role,
      sortable: true,
      render: (role: Role) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {role.name}
          </div>
        </div>
      )
    },
    {
      header: 'الوصف',
      accessor: 'description' as keyof Role,
      sortable: true,
      render: (role: Role) => (
        <div className="text-sm text-gray-500 dark:text-gray-300">
          {role.description}
        </div>
      )
    },
    {
      header: 'عدد المستخدمين',
      accessor: 'userCount' as keyof Role,
      sortable: true,
      render: (role: Role) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <UsersIcon className="w-3 h-3 ml-1" />
          {role.userCount.toLocaleString()}
        </span>
      )
    },
    {
      header: 'الإجراءات',
      accessor: 'id' as keyof Role,
      render: (role: Role) => (
        <div className="flex space-x-2 space-x-reverse">
          <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
            <EditIcon className="w-5 h-5" />
          </button>
          <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors">
            <DeleteIcon className="w-5 h-5" />
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">الأدوار والصلاحيات</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            إدارة أدوار المستخدمين وتحديد صلاحيات الوصول لكل دور في النظام
          </p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
          إضافة دور جديد
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="بحث في الأدوار..."
          />
        </div>

        <ResponsiveTable
          columns={columns}
          data={paginatedRoles}
          sortConfig={sortConfig}
          onSort={requestSort}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          totalItems={filteredRoles.length}
        />
      </div>
    </div>
  );
};

export default RolesList;
