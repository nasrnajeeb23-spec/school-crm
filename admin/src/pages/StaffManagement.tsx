import React, { useState, useEffect, useMemo } from 'react';
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
  [SchoolRole.Secretary]: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  [SchoolRole.Supervisor]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

const StaffManagement: React.FC<StaffManagementProps> = ({ schoolId }) => {
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | SchoolRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'email_asc' | 'email_desc' | 'role_asc' | 'role_desc'>('name_asc');
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

  const roleSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of staff) {
      const r = m.schoolRole || 'غير محدد';
      map.set(r, (map.get(r) || 0) + 1);
    }
    return Array.from(map.entries()).map(([role, count]) => ({ role, count }));
  }, [staff]);

  const displayedStaff = useMemo(() => {
    const filtered = staff.filter(m => {
      const byRole = roleFilter === 'all' || m.schoolRole === roleFilter;
      const q = searchQuery.trim().toLocaleLowerCase('ar');
      const bySearch = q.length === 0 || (m.name || '').toLocaleLowerCase('ar').includes(q);
      return byRole && bySearch;
    });

    const compare = (a: string | undefined, b: string | undefined) => (a || '').localeCompare(b || '', 'ar', { sensitivity: 'base' });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return compare(a.name, b.name);
        case 'name_desc':
          return -compare(a.name, b.name);
        case 'email_asc':
          return compare(a.email, b.email);
        case 'email_desc':
          return -compare(a.email, b.email);
        case 'role_asc':
          return compare(a.schoolRole || '', b.schoolRole || '');
        case 'role_desc':
          return -compare(a.schoolRole || '', b.schoolRole || '');
        default:
          return 0;
      }
    });

    return sorted;
  }, [staff, roleFilter, searchQuery, sortBy]);

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
      if (member.schoolRole === SchoolRole.Admin) {
        addToast('لا يمكن حذف الموظف بدور "مدير".', 'warning');
        return;
      }
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
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <div className="flex gap-3 min-w-max items-center">
              <button onClick={() => setRoleFilter('all')} className={`px-3 py-1 rounded-md text-sm ${roleFilter === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>الكل ({staff.length})</button>
              {Object.values(SchoolRole).map(r => (
                <button key={r} onClick={() => setRoleFilter(r as SchoolRole)} className={`px-3 py-1 rounded-md text-sm ${roleFilter === r ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                  {r} ({roleSummary.find(s => s.role === r)?.count || 0})
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <input
              type="text"
              placeholder="ابحث بالاسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="name_asc">الاسم (أ-ي)</option>
              <option value="name_desc">الاسم (ي-أ)</option>
              <option value="email_asc">البريد (أ-ي)</option>
              <option value="email_desc">البريد (ي-أ)</option>
              <option value="role_asc">الدور (أ-ي)</option>
              <option value="role_desc">الدور (ي-أ)</option>
            </select>
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
                  <th scope="col" className="px-6 py-3">رقم الهاتف</th>
                  <th scope="col" className="px-6 py-3">القسم</th>
                  <th scope="col" className="px-6 py-3">الحالة</th>
                  <th scope="col" className="px-6 py-3">الحساب البنكي</th>
                  <th scope="col" className="px-6 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {displayedStaff.map(member => (
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
                    <td className="px-6 py-4" dir="ltr">{(member as any).phone || '—'}</td>
                    <td className="px-6 py-4">{(member as any).department || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${((member as any).isActive ?? true) ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {((member as any).isActive ?? true) ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-6 py-4" dir="ltr">{(member as any).bankAccount || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditing(member); setIsModalOpen(true); }} className="font-medium text-teal-600 dark:text-teal-500 hover:underline">تعديل</button>
                        <button onClick={() => handleDeleteStaff(member)} disabled={member.schoolRole === SchoolRole.Admin} className="font-medium text-red-600 dark:text-red-500 hover:underline disabled:text-red-300 disabled:cursor-not-allowed">حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>
      </div>
      {isModalOpen && (
        <AddStaffModal 
            onClose={() => { setIsModalOpen(false); setEditing(null); }}
            onSave={editing ? handleEditStaff : handleAddStaff}
            initialData={editing ? { name: editing.name, email: editing.email, role: editing.schoolRole as any, phone: (editing as any).phone, department: (editing as any).department, bankAccount: (editing as any).bankAccount, isActive: (editing as any).isActive } : undefined}
            title={editing ? "تعديل موظف" : "إضافة موظف"}
        />
      )}
    </>
  );
};

export default StaffManagement;
