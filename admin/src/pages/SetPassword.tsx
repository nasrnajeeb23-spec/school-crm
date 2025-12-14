import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { apiCall, getCurrentUser } from '../api';

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
  const [targetRole, setTargetRole] = useState<string>('');

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('token') || '';
      setToken(t);
      if (t) {
        try {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('last_route');
        } catch {}
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tParam = params.get('token') || '';
      const hasAuth = typeof window !== 'undefined' ? !!localStorage.getItem('auth_token') : false;
      if (hasAuth && !tParam) {
        getCurrentUser().then(u => {
          const roleRaw = String(u?.role || '').toUpperCase().replace(/[^A-Z_]/g, '');
          let target = '/login';
          if (roleRaw === 'PARENT') target = '/parent';
          else if (roleRaw === 'TEACHER') target = '/teacher';
          else if (roleRaw === 'SCHOOL_ADMIN' || roleRaw === 'STAFF') target = '/school';
          else if (roleRaw === 'SUPER_ADMIN' || roleRaw === 'SUPERADMIN' || roleRaw.startsWith('SUPER_ADMIN_')) target = '/superadmin';
          addToast('أنت مسجّل دخول بالفعل. تم توجيهك للوحة التحكم.', 'info');
          setTimeout(() => { window.location.href = target; }, 500);
        }).catch(() => {});
      }
    } catch {}
  }, [addToast]);
  useEffect(() => {
    if (!token) {
      addToast('الرابط منتهي أو غير صالح. يرجى تسجيل الدخول.', 'error');
      setTimeout(() => { window.location.href = '/login'; }, 800);
      return;
    }
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const b64 = (s: string) => s.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(b64(parts[1])));
        const expMs = Number(payload?.exp || 0) * 1000;
        if (expMs && Date.now() > expMs) {
          addToast('انتهت صلاحية الرابط. يرجى تسجيل الدخول.', 'warning');
          setTimeout(() => { window.location.href = '/login'; }, 800);
        }
        const tr = String(payload?.targetRole || '').toUpperCase().replace(/[^A-Z_]/g, '');
        if (tr) setTargetRole(tr);
      }
    } catch {}
  }, [token, addToast]);

  const strengthOk = useMemo(() => isStrong(pwd), [pwd]);
  const match = useMemo(() => pwd.length > 0 && pwd === confirm, [pwd, confirm]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { addToast('رمز الدعوة غير موجود أو منتهي.', 'error'); setTimeout(() => { window.location.href = '/login'; }, 800); return; }
    if (!strengthOk) { addToast('كلمة المرور ضعيفة. يجب أن تكون 10 خانات على الأقل مع حرف كبير، صغير، رقم ورمز.', 'warning'); return; }
    if (!match) { addToast('كلمتا المرور غير متطابقتين.', 'warning'); return; }
    try {
      setSubmitting(true);
      const resp: any = await apiCall('/auth/invite/set-password', { method: 'POST', body: JSON.stringify({ token, newPassword: pwd }) });
      try {
        const t = resp?.token || '';
        const u = resp?.user || null;
        if (t) localStorage.setItem('auth_token', t);
        if (u && u.schoolId) localStorage.setItem('current_school_id', String(u.schoolId));
        const roleRaw = String(u?.role || '').toUpperCase().replace(/[^A-Z_]/g, '');
        let target = '/login';
        const desired = targetRole || roleRaw;
        if (desired === 'PARENT') target = '/parent';
        else if (desired === 'TEACHER') target = '/teacher';
        else if (desired === 'SCHOOLADMIN' || desired === 'SCHOOL_ADMIN' || desired === 'STAFF') target = '/school';
        else if (desired === 'SUPERADMIN' || desired === 'SUPER_ADMIN' || desired.startsWith('SUPER_ADMIN_')) target = '/superadmin';
        try { localStorage.removeItem('last_route'); } catch {}
        try {
          const me = await getCurrentUser();
          const meRole = String(me?.role || '').toUpperCase().replace(/[^A-Z_]/g, '');
          if (meRole === 'TEACHER') target = '/teacher';
        } catch {}
        addToast('تم تعيين كلمة المرور وتم تسجيل الدخول بنجاح.', 'success');
        setTimeout(() => { window.location.replace(target); }, 400);
      } catch {
        addToast('تم تعيين كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.', 'success');
        setTimeout(() => { window.location.replace('/login'); }, 500);
      }
    } catch (error: any) {
      addToast('الرابط منتهي أو غير صالح. يرجى تسجيل الدخول بكلمتك الجديدة.', 'error');
      setTimeout(() => { window.location.replace('/login'); }, 800);
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
