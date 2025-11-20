import React, { useState, useEffect } from 'react';
import { User, SchoolRole, NewStaffData } from '../types';
import * as api from '../api';
import { PlusIcon, UsersIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import AddStaffModal from '../components/AddStaffModal';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';


interface StaffManagementProps {
  schoolId: number;
}

const roleColors: { [key in SchoolRole]: string } = {
  [SchoolRole.Admin]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  [SchoolRole.Registrar]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [SchoolRole.Accountant]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [SchoolRole.AcademicCoordinator]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

const StaffManagement: React.FC<StaffManagementProps> = ({ schoolId }) => {
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchStaff();
  }, [schoolId]);

  const fetchStaff = () => {
    setLoading(true);
    api.getSchoolStaff(schoolId)
      .then(setStaff)
      .catch(err => {
          console.error("Failed to fetch staff", err);
          addToast("فشل تحميل قائمة الموظفين.", 'error');
      })
      .finally(() => setLoading(false));
  };

  const handleAddStaff = async (staffData: NewStaffData) => {
    try {
      const newStaff = await api.addSchoolStaff(schoolId, staffData);
      setStaff(prev => [newStaff, ...prev]);
      setIsModalOpen(false);
      const uname = (newStaff as any).username || (newStaff.email?.split('@')[0] || '');
      const tempPwd = (newStaff as any).tempPassword || 'password';
      addToast(`تمت إضافة الموظف "${newStaff.name}". اسم المستخدم: ${uname}، كلمة المرور المؤقتة: ${tempPwd}`, 'success');
    } catch (error) {
      console.error("Failed to add staff:", error);
      addToast("فشل إضافة الموظف. قد يكون البريد الإلكتروني مستخدمًا.", 'error');
    }
  };

  const handleEditStaff = async (staffData: NewStaffData) => {
    try {
      if (!editing) return;
      const updated = await api.updateSchoolStaff(schoolId, (editing as any).id, staffData);
      setStaff(prev => prev.map(s => ((s as any).id === (editing as any).id ? updated : s)));
      setIsModalOpen(false);
      setEditing(null);
      addToast(`تم تعديل الموظف "${updated.name}" بنجاح.`, 'success');
    } catch (error) {
      console.error("Failed to update staff:", error);
      addToast("فشل تعديل بيانات الموظف.", 'error');
    }
  };

  const handleDeleteStaff = async (member: User) => {
    try {
      if (!confirm(`هل أنت متأكد من حذف "${member.name}"؟`)) return;
      await api.deleteSchoolStaff(schoolId, (member as any).id);
      setStaff(prev => prev.filter(s => (s as any).id !== (member as any).id));
      addToast("تم حذف الموظف بنجاح.", 'success');
    } catch (error) {
      console.error("Failed to delete staff:", error);
      addToast("فشل حذف الموظف.", 'error');
    }
  };

  return (
    <>
      <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">إدارة الموظفين</h2>
          <button 
            onClick={() => { setEditing(null); setIsModalOpen(true); }}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 ml-2" />
            إضافة موظف جديد
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? <TableSkeleton /> : staff.length === 0 ? (
            <EmptyState 
                icon={UsersIcon}
                title="لا يوجد موظفون"
                message="ابدأ بإضافة موظفي المدرسة وتعيين أدوارهم."
                actionText="إضافة موظف"
                onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3">الاسم</th>
                  <th scope="col" className="px-6 py-3">البريد الإلكتروني</th>
                  <th scope="col" className="px-6 py-3">الدور</th>
                  <th scope="col" className="px-6 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(member => (
                  <tr key={member.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{member.name}</td>
                    <td className="px-6 py-4">{member.email}</td>
                    <td className="px-6 py-4">
                      {member.schoolRole && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[member.schoolRole]}`}>
                          {member.schoolRole}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 space-x-2 rtl:space-x-reverse whitespace-nowrap">
                      <button onClick={() => { setEditing(member); setIsModalOpen(true); }} className="font-medium text-teal-600 dark:text-teal-500 hover:underline">تعديل</button>
                      <button onClick={() => handleDeleteStaff(member)} className="font-medium text-red-600 dark:text-red-500 hover:underline">حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {isModalOpen && (
        <AddStaffModal 
            onClose={() => { setIsModalOpen(false); setEditing(null); }}
            onSave={editing ? handleEditStaff : handleAddStaff}
            initialData={editing ? { name: editing.name, email: editing.email, role: editing.schoolRole as any } : undefined}
            title={editing ? "تعديل موظف" : "إضافة موظف"}
        />
      )}
    </>
  );
};

export default StaffManagement;