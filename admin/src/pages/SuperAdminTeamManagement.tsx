import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { showToast } from '../utils/toast';
import { ShieldIcon, PlusIcon, EditIcon, TrashIcon, KeyIcon, UsersIcon } from '../components/icons';
import * as api from '../api';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  permissions: string[];
}

interface CreateTeamMemberForm {
  name: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  permissions: string[];
}

const ROLE_PERMISSIONS = {
  [UserRole.SuperAdminFinancial]: {
    label: 'مسؤول مالي',
    permissions: ['view_financial_reports', 'manage_billing', 'view_subscriptions', 'manage_invoices']
  },
  [UserRole.SuperAdminTechnical]: {
    label: 'مسؤول فني',
    permissions: ['manage_system_settings', 'view_logs', 'manage_features', 'monitor_performance', 'manage_api_keys']
  },
  [UserRole.SuperAdminSupervisor]: {
    label: 'مشرف عام',
    permissions: ['view_all_schools', 'manage_school_admins', 'view_reports', 'manage_content', 'view_user_analytics']
  }
};

const ALL_PERMISSIONS = {
  view_financial_reports: 'عرض التقارير المالية',
  manage_billing: 'إدارة الفواتير',
  view_subscriptions: 'عرض الاشتراكات',
  manage_invoices: 'إدارة الفواتير',
  manage_system_settings: 'إدارة إعدادات النظام',
  view_logs: 'عرض سجلات النظام',
  manage_features: 'إدارة المميزات',
  monitor_performance: 'مراقبة الأداء',
  manage_api_keys: 'إدارة مفاتيح API',
  view_all_schools: 'عرض جميع المدارس',
  manage_school_admins: 'إدارة مسؤولي المدارس',
  view_reports: 'عرض التقارير',
  manage_content: 'إدارة المحتوى',
  view_user_analytics: 'عرض تحليلات المستخدمين'
};

export default function SuperAdminTeamManagement() {
  const { currentUser } = useAppContext();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState<CreateTeamMemberForm>({
    name: '',
    email: '',
    username: '',
    password: '',
    role: UserRole.SuperAdminFinancial,
    permissions: []
  });

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await api.getSuperAdminTeamMembers();
      setTeamMembers(response);
    } catch (error) {
      showToast('فشل في تحميل بيانات الفريق', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.createSuperAdminTeamMember(formData);
      setTeamMembers([...teamMembers, response]);
      setShowCreateForm(false);
      resetForm();
      showToast('تم إنشاء حساب فريق بنجاح', 'success');
    } catch (error) {
      showToast('فشل في إنشاء حساب الفريق', 'error');
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    
    try {
      const response = await api.updateSuperAdminTeamMember(editingMember.id, formData);
      setTeamMembers(teamMembers.map(member => 
        member.id === editingMember.id ? response : member
      ));
      setEditingMember(null);
      resetForm();
      showToast('تم تحديث بيانات الفريق بنجاح', 'success');
    } catch (error) {
      showToast('فشل في تحديث بيانات الفريق', 'error');
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العضو؟')) return;
    
    try {
      await api.deleteSuperAdminTeamMember(memberId);
      setTeamMembers(teamMembers.filter(member => member.id !== memberId));
      showToast('تم حذف عضو الفريق بنجاح', 'success');
    } catch (error) {
      showToast('فشل في حذف عضو الفريق', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      username: '',
      password: '',
      role: UserRole.SuperAdminFinancial,
      permissions: []
    });
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const getRoleLabel = (role: UserRole) => {
    return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]?.label || role;
  };

  const getRolePermissions = (role: UserRole) => {
    return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]?.permissions || [];
  };

  const handleRoleChange = (role: UserRole) => {
    const defaultPermissions = getRolePermissions(role);
    setFormData(prev => ({
      ...prev,
      role,
      permissions: defaultPermissions
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة فريق المدير العام</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">إدارة أعضاء فريق الإدارة العليا وتحديد صلاحياتهم</p>
          </div>
          <button
            onClick={() => {
              setShowCreateForm(true);
              setEditingMember(null);
              resetForm();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            إضافة عضو جديد
          </button>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">أعضاء الفريق</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الاسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">اسم المستخدم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الدور</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">آخر دخول</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {teamMembers.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="mr-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{member.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      {getRoleLabel(member.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {member.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString('ar') : 'لم يدخل'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setFormData({
                            name: member.name,
                            email: member.email,
                            username: member.username,
                            password: '',
                            role: member.role,
                            permissions: member.permissions
                          });
                          setShowCreateForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member.id)}
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
          {teamMembers.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              لا يوجد أعضاء في الفريق حالياً
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingMember ? 'تعديل عضو الفريق' : 'إضافة عضو جديد للفريق'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingMember(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            
            <form onSubmit={editingMember ? handleUpdateMember : handleCreateMember} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الاسم الكامل</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم المستخدم</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {editingMember ? 'كلمة المرور الجديدة (اتركها فارغة للإبقاء على القديمة)' : 'كلمة المرور'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required={!editingMember}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الدور الوظيفي</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value={UserRole.SuperAdminFinancial}>مسؤول مالي</option>
                  <option value={UserRole.SuperAdminTechnical}>مسؤول فني</option>
                  <option value={UserRole.SuperAdminSupervisor}>مشرف عام</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الصلاحيات</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-3">
                  {Object.entries(ALL_PERMISSIONS).map(([permission, label]) => (
                    <label key={permission} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="ml-2 rtl:mr-2 rtl:ml-0 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingMember(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingMember ? 'تحديث' : 'إنشاء'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
