import React, { useState, useEffect } from 'react';
import { Role } from '../types';
import * as api from '../api';
import { UsersIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';

type RbacPermission = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
};

const RolesList: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsRole, setPermissionsRole] = useState<Role | null>(null);
  const [allPermissions, setAllPermissions] = useState<RbacPermission[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionsSearch, setPermissionsSearch] = useState('');
  const [formData, setFormData] = useState<{ name: string; description: string; key: string }>({
    name: '',
    description: '',
    key: ''
  });
  const { addToast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getRoles();
        setRoles(Array.isArray(data) ? data : []);
      } catch {
        addToast('فشل تحميل الأدوار', 'error');
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openCreate = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '', key: '' });
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name || '',
      description: role.description || '',
      key: role.key || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setShowModal(false);
    setEditingRole(null);
  };

  const closePermissionsModal = () => {
    if (permissionsSaving) return;
    setShowPermissionsModal(false);
    setPermissionsRole(null);
    setAllPermissions([]);
    setSelectedPermissionIds(new Set());
    setPermissionsSearch('');
  };

  const openPermissions = async (role: Role) => {
    setPermissionsRole(role);
    setShowPermissionsModal(true);
    setPermissionsLoading(true);
    try {
      const [permissionsList, rolePerms] = await Promise.all([
        api.getPermissions(),
        api.getRolePermissions(role.id)
      ]);
      const normalizedAll = (Array.isArray(permissionsList) ? permissionsList : []).map((p: any) => ({
        id: String(p?.id || ''),
        key: String(p?.key || ''),
        name: String(p?.name || ''),
        description: p?.description ?? null
      })).filter(p => p.id && p.key);
      const rolePermIds = new Set((Array.isArray(rolePerms) ? rolePerms : []).map((p: any) => String(p?.id || '')).filter(Boolean));
      setAllPermissions(normalizedAll);
      setSelectedPermissionIds(rolePermIds);
    } catch {
      addToast('فشل تحميل صلاحيات الدور', 'error');
      closePermissionsModal();
    } finally {
      setPermissionsLoading(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds(prev => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const filteredPermissions = allPermissions.filter(p => {
    const q = permissionsSearch.trim().toLocaleLowerCase('ar');
    if (!q) return true;
    const hay = `${p.key} ${p.name} ${p.description || ''}`.toLocaleLowerCase('ar');
    return hay.includes(q);
  });

  const selectAllFiltered = () => {
    setSelectedPermissionIds(prev => {
      const next = new Set(prev);
      for (const p of filteredPermissions) next.add(p.id);
      return next;
    });
  };

  const clearAllFiltered = () => {
    setSelectedPermissionIds(prev => {
      const next = new Set(prev);
      for (const p of filteredPermissions) next.delete(p.id);
      return next;
    });
  };

  const saveRolePermissions = async () => {
    if (!permissionsRole) return;
    setPermissionsSaving(true);
    try {
      await api.updateRolePermissions(permissionsRole.id, Array.from(selectedPermissionIds));
      addToast('تم تحديث صلاحيات الدور بنجاح', 'success');
      closePermissionsModal();
    } catch {
      addToast('فشل في تحديث صلاحيات الدور', 'error');
    } finally {
      setPermissionsSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`هل أنت متأكد من حذف الدور: ${role.name}؟`)) return;
    try {
      await api.deleteRole(role.id);
      setRoles(prev => prev.filter(r => r.id !== role.id));
      addToast('تم حذف الدور بنجاح', 'success');
    } catch {
      addToast('فشل في حذف الدور', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const description = formData.description.trim();
    const key = formData.key.trim();

    if (!name) {
      addToast('الرجاء إدخال اسم الدور', 'warning');
      return;
    }
    if (!editingRole && !key) {
      addToast('الرجاء إدخال مفتاح الدور (Key)', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      if (editingRole) {
        const updated = await api.updateRole(editingRole.id, { name, description });
        setRoles(prev => prev.map(r => (r.id === editingRole.id ? { ...r, ...updated } : r)));
        addToast('تم تحديث الدور بنجاح', 'success');
      } else {
        const created = await api.createRole({ name, description, key });
        setRoles(prev => [created, ...prev]);
        addToast('تم إنشاء الدور بنجاح', 'success');
      }
      setShowModal(false);
      setEditingRole(null);
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('already exists')) {
        addToast('مفتاح الدور مستخدم مسبقاً', 'error');
      } else {
        addToast('فشل في حفظ الدور', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">جاري تحميل الأدوار...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">
          إدارة أدوار المستخدمين وتحديد صلاحيات الوصول لكل دور في النظام.
        </p>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          إضافة دور جديد
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col border border-gray-200 dark:border-gray-700 transform hover:-translate-y-1 transition-transform duration-300"
          >
            <div className="flex-grow">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{role.name}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{role.description}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <UsersIcon className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0" />
                    <span>{role.userCount.toLocaleString()} مستخدم</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => openEdit(role)} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        تعديل
                    </button>
                    <button onClick={() => openPermissions(role)} className="text-xs font-medium text-gray-700 dark:text-gray-300 hover:underline">
                        الصلاحيات
                    </button>
                    <button onClick={() => handleDelete(role)} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">
                        حذف
                    </button>
                </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4 modal-content-scale-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              {editingRole ? 'تعديل الدور' : 'إضافة دور جديد'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الدور</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 dark:text-white min-h-[96px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مفتاح الدور (Key)</label>
                <input
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 dark:text-white disabled:opacity-60"
                  placeholder="مثال: SCHOOL_MANAGER"
                  disabled={!!editingRole}
                  required={!editingRole}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-60"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
                >
                  {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPermissionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={closePermissionsModal}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 modal-content-scale-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                صلاحيات الدور: {permissionsRole?.name || ''}
              </h2>
              <button
                type="button"
                onClick={closePermissionsModal}
                disabled={permissionsSaving}
                className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-60"
              >
                إغلاق
              </button>
            </div>

            {permissionsLoading ? (
              <div className="text-center p-8 text-gray-600 dark:text-gray-300">جاري تحميل الصلاحيات...</div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row gap-3 md:items-center mb-4">
                  <input
                    value={permissionsSearch}
                    onChange={(e) => setPermissionsSearch(e.target.value)}
                    placeholder="ابحث في الصلاحيات..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      تحديد الكل
                    </button>
                    <button
                      type="button"
                      onClick={clearAllFiltered}
                      className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                    >
                      إلغاء الكل
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-[420px] overflow-y-auto">
                  {filteredPermissions.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">لا توجد صلاحيات مطابقة</div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredPermissions.map(p => {
                        const checked = selectedPermissionIds.has(p.id);
                        return (
                          <label key={p.id} className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(p.id)}
                              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">{p.name || p.key}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{p.key}</span>
                              </div>
                              {!!p.description && (
                                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{p.description}</div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={closePermissionsModal}
                    disabled={permissionsSaving}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-60"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={saveRolePermissions}
                    disabled={permissionsSaving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
                  >
                    {permissionsSaving ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesList;
