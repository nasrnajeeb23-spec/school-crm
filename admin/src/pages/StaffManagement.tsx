import React, { useState, useEffect, useMemo } from 'react';
import { User, SchoolRole, NewStaffData, Role } from '../types';
import * as api from '../api';
import { PlusIcon, UsersIcon, KeyIcon, ShieldIcon } from '../components/icons';
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
  [SchoolRole.Driver]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
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

  const [sendingId, setSendingId] = useState<string | number | null>(null);
  const [channelByStaff, setChannelByStaff] = useState<Record<string, 'email' | 'sms' | 'manual'>>({});
  const [showManualShare, setShowManualShare] = useState(false);
  const [manualLink, setManualLink] = useState('');
  const [cooldownByStaff, setCooldownByStaff] = useState<Record<string, number>>({});
  const [sharing, setSharing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);
  const [savedLinks, setSavedLinks] = useState<Record<string, string>>({});

  const handleInviteStaff = async (userId: string | number) => {
    try {
      setSendingId(userId);
      const channel = channelByStaff[String(userId)] || 'manual';
      const res = await api.inviteStaff(String(userId), channel);
      if (channel === 'manual') {
        if (res.activationLink) { 
          setManualLink(res.activationLink); 
          setShowManualShare(true); 
          try { 
            localStorage.setItem(`staff_invite_link_${String(userId)}`, res.activationLink); 
            setSavedLinks(prev => ({ ...prev, [String(userId)]: res.activationLink }));
          } catch {} 
        }
        addToast('تم إنشاء رابط التفعيل للمشاركة اليدوية.', 'success');
      } else {
        if (res.inviteSent) {
          if (channel === 'sms') addToast('تم إرسال الدعوة عبر الرسائل النصية.', 'success');
          else addToast('تم إرسال الدعوة عبر البريد الإلكتروني.', 'success');
        } else {
          if (res.activationLink) { 
            setManualLink(res.activationLink); 
            setShowManualShare(true); 
            try { 
              localStorage.setItem(`staff_invite_link_${String(userId)}`, res.activationLink); 
              setSavedLinks(prev => ({ ...prev, [String(userId)]: res.activationLink }));
            } catch {} 
          }
          addToast('تعذّر الإرسال عبر القناة المحددة. تم تجهيز رابط يدوي.', 'warning');
        }
      }
    } catch (e) {
      addToast('فشل إرسال دعوة الموظف.', 'error');
    } finally {
      setSendingId(null);
      setCooldownByStaff(prev => ({ ...prev, [String(userId)]: Date.now() + 2500 }));
    }
  };
  
  const handleToggleActive = async (member: User) => {
    try {
      const id = (member as any).id;
      setUpdatingId(id);
      const current = ((member as any).isActive ?? true) as boolean;
      const updated = await api.updateSchoolStaff(schoolId, id, { isActive: !current });
      setStaff(prev => prev.map(s => ((s as any).id === id ? updated : s)));
      addToast(!current ? 'تم تفعيل حساب الموظف.' : 'تم إلغاء تفعيل حساب الموظف.', 'success');
    } catch (e) {
      addToast('فشل تحديث حالة حساب الموظف.', 'error');
    } finally {
      setUpdatingId(null);
    }
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

  useEffect(() => {
    try {
      const map: Record<string, string> = {};
      for (const m of staff) {
        const id = String((m as any).id);
        const k = `staff_invite_link_${id}`;
        const v = typeof window !== 'undefined' ? localStorage.getItem(k) : null;
        if (v) map[id] = v;
      }
      setSavedLinks(map);
    } catch {}
  }, [staff]);

  const handleAddStaff = async (staffData: NewStaffData) => {
    try {
      const newStaff: any = await api.addSchoolStaff(schoolId, staffData);
      setStaff(prev => [newStaff, ...prev]);
      setIsModalOpen(false);
      const uname = (newStaff as any).username || (newStaff.email?.split('@')[0] || '');
      if (newStaff.activationLink) {
          setManualLink(newStaff.activationLink);
          setShowManualShare(true);
          addToast(`تمت إضافة الموظف "${newStaff.name}". تم تجهيز رابط التفعيل.`, 'success');
      } else {
          addToast(`تمت إضافة الموظف "${newStaff.name}". اسم المستخدم: ${uname}. تم تجهيز الحساب بنجاح.`, 'success');
      }
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

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState<User | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [scopesList, setScopesList] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<{ roleId: string; scopeId?: string | null; roleName?: string; scopeName?: string }[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedScopeId, setSelectedScopeId] = useState<string | ''>('');
  const openAssignRoles = async (member: User) => {
    try {
      setAssignTarget(member);
      setShowAssignModal(true);
      setAssignLoading(true);
      const [roles, scopes, current] = await Promise.all([
        api.getSchoolRbacRoles(schoolId),
        api.getSchoolRbacScopes(schoolId),
        api.getUserRoleAssignmentsForSchool(schoolId, (member as any).id)
      ]);
      setRolesList(Array.isArray(roles) ? roles : []);
      setScopesList(Array.isArray(scopes) ? scopes : []);
      const mapped = (Array.isArray(current) ? current : []).map((r: any) => ({
        roleId: String(r.roleId || (r.RbacRole?.id || '')),
        scopeId: r.scopeId ? String(r.scopeId) : null,
        roleName: r.RbacRole?.name || roles.find((x: any) => String(x.id) === String(r.roleId))?.name || '',
        scopeName: r.RbacScope?.name || ''
      })).filter(a => a.roleId);
      setAssignments(mapped);
      setSelectedRoleId('');
      setSelectedScopeId('');
    } catch {
      addToast('فشل تحميل الأدوار والتعيينات.', 'error');
    } finally {
      setAssignLoading(false);
    }
  };
  const addAssignmentRow = () => {
    const rid = String(selectedRoleId || '');
    if (!rid) return;
    const sid = selectedScopeId ? String(selectedScopeId) : '';
    const exists = assignments.some(a => String(a.roleId) === rid && String(a.scopeId || '') === sid);
    if (exists) return;
    const role = rolesList.find(r => String(r.id) === rid);
    const scope = scopesList.find((s: any) => String(s.id) === sid);
    setAssignments(prev => [...prev, { roleId: rid, scopeId: sid || null, roleName: role?.name || '', scopeName: scope?.name || '' }]);
    setSelectedScopeId('');
  };
  const removeAssignmentRow = (idx: number) => {
    setAssignments(prev => prev.filter((_, i) => i !== idx));
  };
  const saveAssignments = async () => {
    if (!assignTarget) return;
    try {
      setAssignSaving(true);
      const payload = assignments.map(a => ({ roleId: String(a.roleId), scopeId: a.scopeId ? String(a.scopeId) : null }));
      await api.updateUserRolesForSchool(schoolId, (assignTarget as any).id, payload);
      addToast('تم حفظ التعيينات بنجاح.', 'success');
      setShowAssignModal(false);
      setAssignTarget(null);
      setAssignments([]);
    } catch {
      addToast('فشل حفظ التعيينات.', 'error');
    } finally {
      setAssignSaving(false);
    }
  };

  const [showRolesModal, setShowRolesModal] = useState(false);
  const [rolesManageLoading, setRolesManageLoading] = useState(false);
  const [rolesManageSaving, setRolesManageSaving] = useState(false);
  const [rolesManageList, setRolesManageList] = useState<Role[]>([]);
  const [permissionsList, setPermissionsList] = useState<any[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermKeys, setSelectedPermKeys] = useState<Set<string>>(new Set());
  const [newRoleKey, setNewRoleKey] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const openRolesManage = async () => {
    try {
      setShowRolesModal(true);
      setRolesManageLoading(true);
      const [roles, perms] = await Promise.all([
        api.getSchoolRbacRoles(schoolId),
        api.getSchoolRbacPermissions(schoolId)
      ]);
      setRolesManageList(Array.isArray(roles) ? roles : []);
      setPermissionsList(Array.isArray(perms) ? perms : []);
      setEditingRole(null);
      setSelectedPermKeys(new Set());
    } catch {
      addToast('فشل تحميل الأدوار والصلاحيات.', 'error');
    } finally {
      setRolesManageLoading(false);
    }
  };
  const createRole = async () => {
    try {
      if (!newRoleKey.trim() || !newRoleName.trim()) return;
      setRolesManageSaving(true);
      const r = await api.createSchoolRbacRole(schoolId, { key: newRoleKey.trim(), name: newRoleName.trim(), description: newRoleDesc.trim() });
      setRolesManageList(prev => [r, ...prev]);
      setNewRoleKey('');
      setNewRoleName('');
      setNewRoleDesc('');
      addToast('تم إنشاء الدور.', 'success');
    } catch {
      addToast('فشل إنشاء الدور.', 'error');
    } finally {
      setRolesManageSaving(false);
    }
  };
  const startEditRolePerms = async (role: Role) => {
    try {
      setEditingRole(role);
      setRolesManageSaving(true);
      const current = await api.getRolePermissions(String(role.id));
      const keys = new Set((Array.isArray(current) ? current : []).map((p: any) => String(p.key)));
      setSelectedPermKeys(keys);
    } catch {
      addToast('فشل تحميل صلاحيات الدور.', 'error');
    } finally {
      setRolesManageSaving(false);
    }
  };
  const togglePermKey = (key: string) => {
    setSelectedPermKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const saveRolePerms = async () => {
    if (!editingRole) return;
    try {
      setRolesManageSaving(true);
      const keys = Array.from(selectedPermKeys.values());
      await api.updateSchoolRolePermissions(schoolId, String(editingRole.id), keys);
      addToast('تم حفظ صلاحيات الدور.', 'success');
      setEditingRole(null);
      setSelectedPermKeys(new Set());
    } catch {
      addToast('فشل حفظ صلاحيات الدور.', 'error');
    } finally {
      setRolesManageSaving(false);
    }
  };

  return (
    <>
      <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">إدارة الموظفين</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={openRolesManage}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <ShieldIcon className="h-5 w-5 ml-2" />
              أدوار وصلاحيات المدرسة
            </button>
            <button 
              onClick={() => { setEditing(null); setIsModalOpen(true); }}
              className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 ml-2" />
              إضافة موظف جديد
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <div className="flex gap-3 min-w-max items-center">
              <button onClick={() => setRoleFilter('all')} className={`px-3 py-1 rounded-md text-sm ${roleFilter === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>الكل ({staff.length})</button>
              {Object.values(SchoolRole).filter(r => r !== SchoolRole.Driver).map(r => (
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
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[member.schoolRole as SchoolRole] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
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
                      <div className="flex items-center gap-3">
                        <select
                          value={channelByStaff[String((member as any).id)] || 'manual'}
                          onChange={(e) => setChannelByStaff(prev => ({ ...prev, [String((member as any).id)]: e.target.value as 'email' | 'sms' | 'manual' }))}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
                        >
                          <option value="email" disabled={!((member as any).email && String((member as any).email).trim() !== '')}>البريد الإلكتروني (مدفوع)</option>
                          <option value="sms" disabled={!((member as any).phone && String((member as any).phone).trim() !== '')}>رسالة نصية (مدفوعة)</option>
                          <option value="manual">مشاركة يدوية (مجاني)</option>
                        </select>
                        {(() => {
                          const cool = (cooldownByStaff[String((member as any).id)] || 0) > Date.now();
                          const disabled = sendingId === (member as any).id || cool;
                          const label = sendingId === (member as any).id ? 'جاري الإرسال...' : cool ? 'انتظر لحظة...' : 'دعوة';
                          return (
                            <button
                              onClick={() => handleInviteStaff((member as any).id)}
                              disabled={disabled}
                              aria-disabled={disabled}
                              className={`font-medium ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-indigo-600 dark:text-indigo-500'} hover:underline`}
                            >
                              {label}
                            </button>
                          );
                        })()}
                        {(() => {
                          const id = (member as any).id;
                          const isActive = ((member as any).isActive ?? true) as boolean;
                          const disabled = updatingId === id;
                          const label = disabled ? 'جاري التحديث...' : (isActive ? 'إلغاء التفعيل' : 'تفعيل');
                          const color = disabled ? 'text-gray-400 dark:text-gray-500' : (isActive ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500');
                          return (
                            <button
                              onClick={() => handleToggleActive(member)}
                              disabled={disabled}
                              aria-disabled={disabled}
                              className={`font-medium ${color} hover:underline`}
                            >
                              {label}
                            </button>
                          );
                        })()}
                        {(() => {
                          const id = String((member as any).id);
                          const link = savedLinks[id];
                          if (!link) return null;
                          const disabled = sharing;
                          return (
                            <button
                              onClick={() => { setManualLink(link); setShowManualShare(true); }}
                              disabled={disabled}
                              aria-disabled={disabled}
                              className={`font-medium ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-teal-600 dark:text-teal-500'} hover:underline`}
                            >
                              عرض الرابط المحفوظ
                            </button>
                          );
                        })()}
                        <button onClick={() => { setEditing(member); setIsModalOpen(true); }} className="font-medium text-teal-600 dark:text-teal-500 hover:underline">تعديل</button>
                        <button onClick={() => handleDeleteStaff(member)} disabled={member.schoolRole === SchoolRole.Admin} className="font-medium text-red-600 dark:text-red-500 hover:underline disabled:text-red-300 disabled:cursor-not-allowed">حذف</button>
                        <button onClick={() => openAssignRoles(member)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline flex items-center gap-1">
                          <KeyIcon className="h-4 w-4" />
                          تعيين الأدوار
                        </button>
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
      {showManualShare && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md w-[90%] max-w-lg text-right">
            <h3 className="text-lg font-semibold mb-3">رابط التفعيل للمشاركة اليدوية</h3>
            <a href={manualLink} target="_blank" rel="noopener noreferrer" dir="ltr" className="break-all p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 underline">{manualLink}</a>
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => { try { navigator.clipboard.writeText(manualLink); addToast('تم نسخ الرابط.', 'success'); } catch { addToast('تعذر نسخ الرابط. انسخه يدويًا.', 'error'); } }}
                className="px-3 py-2 bg-teal-600 text-white rounded-md"
              >نسخ الرابط</button>
              <button
                onClick={async () => {
                  try {
                    setSharing(true);
                    const anyNav = navigator as any;
                    if (anyNav.share) {
                      await anyNav.share({ title: 'تفعيل الحساب', text: 'رابط تفعيل الحساب', url: manualLink });
                      addToast('تمت المشاركة بنجاح.', 'success');
                    } else {
                      await navigator.clipboard.writeText(manualLink);
                      addToast('تم نسخ الرابط. يمكنك مشاركته يدويًا.', 'info');
                    }
                  } catch {
                    try { await navigator.clipboard.writeText(manualLink); addToast('تعذرت المشاركة. تم نسخ الرابط.', 'warning'); } catch { addToast('تعذر نسخ الرابط. انسخه يدويًا.', 'error'); }
                  } finally {
                    setSharing(false);
                  }
                }}
                disabled={sharing}
                aria-disabled={sharing}
                className={`px-3 py-2 ${sharing ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md`}
              >{sharing ? 'جارٍ المشاركة...' : 'مشاركة'}</button>
              <button onClick={() => setShowManualShare(false)} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md">إغلاق</button>
            </div>
          </div>
        </div>
      )}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md w-[95%] max-w-3xl text-right">
            <h3 className="text-lg font-semibold mb-3">تعيين الأدوار للموظف</h3>
            {assignLoading ? (
              <div className="py-8 text-center text-gray-600 dark:text-gray-300">جاري التحميل...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-sm mb-1">الدور</label>
                    <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                      <option value="">اختر دورًا</option>
                      {rolesList.map(r => (
                        <option key={r.id} value={String(r.id)}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">النطاق (اختياري)</label>
                    <select value={selectedScopeId} onChange={(e) => setSelectedScopeId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                      <option value="">بدون نطاق</option>
                      {scopesList.map((s: any) => (
                        <option key={s.id} value={String(s.id)}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={addAssignmentRow} className="px-3 py-2 bg-indigo-600 text-white rounded-md">إضافة تعيين</button>
                </div>
                <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-md">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-2">الدور</th>
                        <th className="px-4 py-2">النطاق</th>
                        <th className="px-4 py-2">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-600 dark:text-gray-300">لا توجد تعيينات</td></tr>
                      ) : assignments.map((a, i) => (
                        <tr key={`${a.roleId}-${a.scopeId || ''}`} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                          <td className="px-4 py-2">{a.roleName || rolesList.find(r => String(r.id) === String(a.roleId))?.name || a.roleId}</td>
                          <td className="px-4 py-2">{a.scopeName || (a.scopeId ? (scopesList.find((s: any) => String(s.id) === String(a.scopeId))?.name || a.scopeId) : '—')}</td>
                          <td className="px-4 py-2">
                            <button onClick={() => removeAssignmentRow(i)} className="font-medium text-red-600 dark:text-red-500 hover:underline">إزالة</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3 mt-4 justify-end">
                  <button onClick={() => { setShowAssignModal(false); setAssignTarget(null); }} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md">إغلاق</button>
                  <button onClick={saveAssignments} disabled={assignSaving} aria-disabled={assignSaving} className={`px-3 py-2 ${assignSaving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md`}>{assignSaving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {showRolesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md w-[95%] max-w-4xl text-right">
            <h3 className="text-lg font-semibold mb-3">أدوار وصلاحيات المدرسة</h3>
            {rolesManageLoading ? (
              <div className="py-8 text-center text-gray-600 dark:text-gray-300">جاري التحميل...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-sm mb-1">المعرف</label>
                    <input value={newRoleKey} onChange={(e) => setNewRoleKey(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700" placeholder="مثال: STAFF_MANAGER" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">الاسم</label>
                    <input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700" placeholder="اسم الدور" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">الوصف</label>
                    <input value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700" placeholder="وصف اختياري" />
                  </div>
                  <button onClick={createRole} disabled={rolesManageSaving} aria-disabled={rolesManageSaving} className={`px-3 py-2 ${rolesManageSaving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md`}>{rolesManageSaving ? 'جارٍ الإنشاء...' : 'إنشاء دور'}</button>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        <th className="px-6 py-3">الاسم</th>
                        <th className="px-6 py-3">المعرف</th>
                        <th className="px-6 py-3">المدرسة</th>
                        <th className="px-6 py-3">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rolesManageList.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">لا توجد أدوار</td></tr>
                      ) : rolesManageList.map(r => (
                        <tr key={r.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                          <td className="px-6 py-4">{r.name}</td>
                          <td className="px-6 py-4">{r.key || '—'}</td>
                          <td className="px-6 py-4">{typeof r.schoolId === 'number' ? r.schoolId : 'نظام'}</td>
                          <td className="px-6 py-4">
                            {typeof r.schoolId === 'number' ? (
                              <button onClick={() => startEditRolePerms(r)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">تعديل صلاحيات</button>
                            ) : (
                              <span className="text-gray-400">غير قابل للتعديل</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {editingRole && (
                  <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-md p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ShieldIcon className="h-5 w-5 text-indigo-600" />
                        <span className="font-semibold">{editingRole.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingRole(null); setSelectedPermKeys(new Set()); }} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md">إلغاء</button>
                        <button onClick={saveRolePerms} disabled={rolesManageSaving} aria-disabled={rolesManageSaving} className={`px-3 py-2 ${rolesManageSaving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md`}>{rolesManageSaving ? 'جارٍ الحفظ...' : 'حفظ الصلاحيات'}</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {permissionsList.map((p: any) => (
                        <label key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700">
                          <input
                            type="checkbox"
                            checked={selectedPermKeys.has(String(p.key))}
                            onChange={() => togglePermKey(String(p.key))}
                          />
                          <span>{p.name || p.key}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 mt-4 justify-end">
                  <button onClick={() => setShowRolesModal(false)} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md">إغلاق</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default StaffManagement;
