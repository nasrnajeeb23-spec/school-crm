import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { apiCall } from '../api';

const isStrong = (pwd: string) => {
  const lengthOk = typeof pwd === 'string' && pwd.length >= 10;
  const upper = /[A-Z]/.test(pwd);
  const lower = /[a-z]/.test(pwd);
  const digit = /[0-9]/.test(pwd);
  const special = /[^A-Za-z0-9]/.test(pwd);
  return lengthOk && upper && lower && digit && special;
};

const SetPassword: React.FC = () => {
  const { addToast } = useToast();
  const [token, setToken] = useState('');
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('token') || '';
      setToken(t);
    } catch {}
  }, []);

  const strengthOk = useMemo(() => isStrong(pwd), [pwd]);
  const match = useMemo(() => pwd.length > 0 && pwd === confirm, [pwd, confirm]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { addToast('رمز الدعوة غير موجود أو منتهي.', 'error'); return; }
    if (!strengthOk) { addToast('كلمة المرور ضعيفة. يجب أن تكون 10 خانات على الأقل مع حرف كبير، صغير، رقم ورمز.', 'warning'); return; }
    if (!match) { addToast('كلمتا المرور غير متطابقتين.', 'warning'); return; }
    try {
      setSubmitting(true);
      await apiCall('/auth/invite/set-password', { method: 'POST', body: JSON.stringify({ token, newPassword: pwd }) });
      addToast('تم تعيين كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.', 'success');
      setTimeout(() => { window.location.href = '/login'; }, 500);
    } catch (error: any) {
      addToast('فشل تعيين كلمة المرور. تحقق من صلاحية الرابط وحاول مجددًا.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">تعيين كلمة المرور</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">كلمة المرور الجديدة</label>
            <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <p className={`text-xs mt-1 ${strengthOk ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'}`}>يجب أن تكون قوية: 10+ خانات، حرف كبير/صغير، رقم ورمز.</p>
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">تأكيد كلمة المرور</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <p className={`text-xs mt-1 ${match ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'}`}>{match ? 'متطابقتان' : 'يجب أن تتطابقا'}</p>
          </div>
          <button type="submit" disabled={submitting} className={`w-full px-4 py-2 rounded-lg ${submitting ? 'bg-gray-400' : 'bg-teal-600 hover:bg-teal-700'} text-white transition-colors`}>{submitting ? 'جارٍ التعيين...' : 'تعيين كلمة المرور'}</button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;
