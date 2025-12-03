import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { getSecurityPolicies, updateSecurityPolicies, logSuperAdminAction } from '../api';

const SecuritySettings: React.FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState<{ enforceMfaForAdmins: boolean; passwordMinLength: number; lockoutThreshold: number; allowedIpRanges: string[]; sessionMaxAgeHours: number; } | null>(null);

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700";

  const [unsupported, setUnsupported] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const data = await getSecurityPolicies();
        setPolicies(data);
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg.includes('HTTP 404')) setUnsupported(true);
        addToast('فشل تحميل إعدادات الأمان.', 'error');
      } finally { setLoading(false); }
    })();
  }, [addToast]);

  const save = async () => {
    if (!policies) return;
    setSaving(true);
    try {
      await updateSecurityPolicies(policies);
      await logSuperAdminAction('platform.security.update', { policies });
      addToast('تم حفظ إعدادات الأمان بنجاح.', 'success');
    } catch {
      addToast('فشل حفظ إعدادات الأمان.', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="text-center p-8">جاري التحميل...</div>;
  if (unsupported) return <div className="text-center p-8 text-yellow-700">هذه الصفحة غير مدعومة على الخادم الحالي (404). يرجى تمكين المسار /superadmin/security/policies.</div>;
  if (!policies) return <div className="text-center p-8">لا توجد إعدادات متاحة.</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">إعدادات الأمان المركزية</h2>
        <button onClick={save} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">فرض MFA لجميع المدراء</label>
          <select value={String(policies.enforceMfaForAdmins)} onChange={e => setPolicies(p => p ? ({ ...p, enforceMfaForAdmins: e.target.value === 'true' }) : p)} className={inputStyle}>
            <option value="true">مفعل</option>
            <option value="false">معطل</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">أدنى طول لكلمة المرور</label>
          <input type="number" value={policies.passwordMinLength} onChange={e => setPolicies(p => p ? ({ ...p, passwordMinLength: Number(e.target.value) || 0 }) : p)} className={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">حد محاولات تسجيل الدخول قبل القفل</label>
          <input type="number" value={policies.lockoutThreshold} onChange={e => setPolicies(p => p ? ({ ...p, lockoutThreshold: Number(e.target.value) || 0 }) : p)} className={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">النطاقات المسموحة (IP)</label>
          <textarea value={(policies.allowedIpRanges || []).join('\n')} onChange={e => setPolicies(p => p ? ({ ...p, allowedIpRanges: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) }) : p)} className={`${inputStyle} min-h-[100px]`}></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مدة الجلسة القصوى (ساعات)</label>
          <input type="number" value={policies.sessionMaxAgeHours} onChange={e => setPolicies(p => p ? ({ ...p, sessionMaxAgeHours: Number(e.target.value) || 24 }) : p)} className={inputStyle} />
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
