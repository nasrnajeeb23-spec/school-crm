import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { mfaSetupSuperAdmin, mfaEnableSuperAdmin, mfaDisableSuperAdmin } from '../api';

const MfaSettings: React.FC = () => {
  const { addToast } = useToast();
  const [base32, setBase32] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const setup = async () => {
    setLoading(true);
    try {
      const data = await mfaSetupSuperAdmin();
      setBase32(data.base32 || '');
      setOtpauthUrl(data.otpauthUrl || '');
      addToast('تم إنشاء مفتاح MFA. استخدمه مع تطبيق المصادقة.', 'success');
    } catch { addToast('فشل إنشاء مفتاح MFA.', 'error'); }
    setLoading(false);
  };

  const enable = async () => {
    if (!base32 || !code) { addToast('أكمل الإعداد وأدخل رمز التحقق.', 'warning'); return; }
    setLoading(true);
    try { await mfaEnableSuperAdmin(base32, code); addToast('تم تفعيل المصادقة متعددة العوامل.', 'success'); } catch { addToast('فشل تفعيل MFA.', 'error'); }
    setLoading(false);
  };

  const disable = async () => {
    setLoading(true);
    try { await mfaDisableSuperAdmin(); addToast('تم تعطيل المصادقة متعددة العوامل.', 'success'); setBase32(''); setOtpauthUrl(''); setCode(''); } catch { addToast('فشل التعطيل.', 'error'); }
    setLoading(false);
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700";

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">إعداد المصادقة متعددة العوامل (MFA)</h2>
          <div className="flex gap-2">
            <button onClick={setup} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">إنشاء مفتاح</button>
            <button onClick={disable} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400">تعطيل</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">السر (Base32)</label>
            <input type="text" value={base32} readOnly className={`${inputStyle} select-all`} />
            <p className="text-xs text-gray-500 mt-2">انسخ هذه القيمة إذا لزم لإعداد تطبيق المصادقة.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رابط إعداد OTP</label>
            <input type="text" value={otpauthUrl} readOnly className={`${inputStyle} select-all`} />
            <p className="text-xs text-gray-500 mt-2">يمكن استخدام هذا الرابط لتوليد QR في أدوات خارجية.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رمز التحقق</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value)} className={inputStyle} placeholder="أدخل رمز 6 أرقام" />
          </div>
          <div className="flex items-end">
            <button onClick={enable} disabled={loading} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">تفعيل</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MfaSettings;
