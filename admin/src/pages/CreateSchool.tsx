import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { apiCall } from '../api';

const CreateSchool: React.FC = () => {
  const { addToast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [planId, setPlanId] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    try { const list = await apiCall('/superadmin/plans', { method: 'GET' }); setPlans(Array.isArray(list) ? list : []); } catch { addToast('فشل تحميل الخطط.', 'error'); }
    setLoading(false);
  })(); }, [addToast]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !planId || !adminEmail || !adminUsername || !adminPassword) { addToast('أكمل جميع الحقول.', 'warning'); return; }
    setSaving(true);
    try {
      const payload = { name, planId, adminEmail, adminUsername, adminPassword };
      const res = await apiCall('/superadmin/schools/create', { method: 'POST', body: JSON.stringify(payload) });
      addToast('تم إنشاء المدرسة والحساب التجريبي بنجاح.', 'success');
      setName(''); setPlanId(''); setAdminEmail(''); setAdminUsername(''); setAdminPassword('');
    } catch { addToast('فشل إنشاء المدرسة.', 'error'); }
    setSaving(false);
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700";

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white">إنشاء مدرسة جديدة (نسخة تجريبية)</h2>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        {loading ? (<div>جاري تحميل الخطط...</div>) : (
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm">اسم المدرسة</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm">الخطة</label>
              <select value={planId} onChange={e => setPlanId(e.target.value)} className={inputStyle}>
                <option value="">اختر الخطة</option>
                {plans.map((p: any) => (<option key={p.id} value={p.id}>{p.name} - ${p.price}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm">بريد مدير المدرسة</label>
              <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm">اسم المستخدم لمدير المدرسة</label>
              <input type="text" value={adminUsername} onChange={e => setAdminUsername(e.target.value)} className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm">كلمة المرور لمدير المدرسة</label>
              <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className={inputStyle} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">إنشاء</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateSchool;
