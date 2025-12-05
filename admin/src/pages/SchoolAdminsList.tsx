import React, { useState, useEffect } from 'react';
import { User } from '../types';
import * as api from '../api';
import { UsersIcon, PlusIcon, EditIcon, TrashIcon, SearchIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import AddSchoolAdminModal from '../components/AddSchoolAdminModal';

const SchoolAdminsList: React.FC = () => {
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [schools, setSchools] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adminsData, schoolsData] = await Promise.all([
        api.getUsersByRole('SchoolAdmin'),
        api.getSchools()
      ]);
      setAdmins(adminsData);
      setSchools(schoolsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('فشل تحميل بيانات مدراء المدارس', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSchool = selectedSchool ? admin.schoolId === parseInt(selectedSchool) : true;
    return matchesSearch && matchesSchool;
  });

  const handleDelete = async (adminId: number) => {
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

  const handleCreateAdmin = async (data: any) => {
    try {
      await api.createUser(data);
      addToast('تم إضافة المدير بنجاح', 'success');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      addToast(error.message || 'فشل إضافة المدير', 'error');
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
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {schools.find(s => s.id === admin.schoolId)?.name || 'غير محدد'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      admin.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {admin.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(admin.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {/* TODO: Add edit modal */}}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(admin.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAdmins.length === 0 && (
        <div className="text-center py-8">
          <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            لا يوجد مدراء مدارس
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            لم يتم العثور على مدراء مدارس مطابقين للبحث
          </p>
        </div>
      )}
    </div>
  );
};

export default SchoolAdminsList;
