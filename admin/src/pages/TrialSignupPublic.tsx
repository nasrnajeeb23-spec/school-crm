import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { apiCall } from '../api';

const TrialSignupPublic: React.FC = () => {
  const { addToast } = useToast();
  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName || !adminName || !adminEmail) { addToast('أكمل جميع الحقول المطلوبة.', 'warning'); return; }
    setSaving(true);
    try {
      await apiCall('/superadmin/public/onboard', { method: 'POST', body: JSON.stringify({ schoolName, adminName, adminEmail, phone }) });
      addToast('تم استلام طلب التجربة بنجاح. سنتواصل معكم قريبًا.', 'success');
      setSchoolName(''); setAdminName(''); setAdminEmail(''); setPhone('');
    } catch { addToast('فشل إرسال الطلب.', 'error'); }
    setSaving(false);
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700";

  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">طلب نسخة تجريبية للمدرسة</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm">اسم المدرسة</label>
          <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} className={inputStyle} />
        </div>
        <div>
          <label className="block text-sm">اسم المدير</label>
          <input type="text" value={adminName} onChange={e => setAdminName(e.target.value)} className={inputStyle} />
        </div>
        <div>
          <label className="block text-sm">البريد الإلكتروني</label>
          <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className={inputStyle} />
        </div>
        <div>
          <label className="block text-sm">رقم الهاتف (اختياري)</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={inputStyle} />
        </div>
        <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">إرسال الطلب</button>
      </form>
      <p className="text-xs text-gray-500 mt-3">نتعامل مع الطلبات بسرعة لضمان شروع المدارس في الاستخدام بأسرع وقت.</p>
    </div>
  );
};

export default TrialSignupPublic;
