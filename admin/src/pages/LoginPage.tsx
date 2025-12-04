import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoIcon, SchoolIcon, EmailIcon, LockIcon, EyeIcon, EyeOffIcon, ShieldIcon, AlertTriangleIcon } from '../components/icons';
import { School } from '../types';
import * as api from '../api';
import { useAppContext } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

interface LoginPageProps {
  mode?: 'default' | 'superadmin';
}

const LoginPage: React.FC<LoginPageProps> = ({ mode = 'default' }) => {
  const { login, completeLoginWithToken } = useAppContext() as any;
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; username?: string; password?: string; school?: string }>({});
  
  // Security features for SuperAdmin
  const [mfaCode, setMfaCode] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [showReset, setShowReset] = useState(false);
  const [resetStage, setResetStage] = useState<'request' | 'reset'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const isSuperAdminLogin = mode === 'superadmin';

  // Security lockout logic for SuperAdmin
  useEffect(() => {
    if (isSuperAdminLogin) {
      const attempts = parseInt(localStorage.getItem('superadmin_login_attempts') || '0');
      const lockTime = localStorage.getItem('superadmin_lock_time');
      
      if (lockTime) {
        const timeDiff = Date.now() - parseInt(lockTime);
        const lockDuration = 15 * 60 * 1000; // 15 minutes
        
        if (timeDiff < lockDuration) {
          setIsLocked(true);
          setLockTimer(Math.ceil((lockDuration - timeDiff) / 1000));
          const interval = setInterval(() => {
            setLockTimer(prev => {
              if (prev <= 1) {
                setIsLocked(false);
                localStorage.removeItem('superadmin_lock_time');
                localStorage.removeItem('superadmin_login_attempts');
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          return () => clearInterval(interval);
        } else {
          localStorage.removeItem('superadmin_lock_time');
          localStorage.removeItem('superadmin_login_attempts');
        }
      }
      
      setLoginAttempts(attempts);
    }
    
    if (!isSuperAdminLogin) {
      // Load schools only for regular login (not superadmin)
      api.getSchools()
        .then(setSchools)
        .catch(error => {
          console.error('Error loading schools:', error);
          // Set empty schools array if API fails
          setSchools([]);
        });
    }
  }, [isSuperAdminLogin]);
  useEffect(() => { if (isSuperAdminLogin) setResetEmail(email); }, [email, isSuperAdminLogin]);
  
  const validate = () => {
    const newErrors: { email?: string; password?: string; school?: string } = {};
    if (!email || !/\S+@\S+\.\S+/.test(email)) newErrors.email = 'الرجاء إدخال بريد إلكتروني صحيح.';
    if (!password) newErrors.password = 'كلمة المرور مطلوبة.';
    
    if (!isSuperAdminLogin && !selectedSchool) newErrors.school = 'الرجاء اختيار المدرسة.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    if (isSuperAdminLogin && isLocked) {
      addToast('الحساب مغلق مؤقتًا. حاول مرة أخرى لاحقًا.', 'error');
      return;
    }
    
    setIsLoading(true);
    
    if (isSuperAdminLogin) {
      // Use enhanced SuperAdmin authentication
      try {
        const loginIdentifier = email;
        const result = await api.superAdminLogin(loginIdentifier, password);
        
        if (result.requiresMfa) {
          setTempToken(result.tempToken);
          setShowMfa(true);
          addToast('أدخل رمز المصادقة الثنائية', 'info');
        } else if (result.success) {
          // Reset attempts on successful login
          localStorage.removeItem('superadmin_login_attempts');
          localStorage.removeItem('superadmin_lock_time');
          const ok = await login(loginIdentifier, password);
          if (ok) navigate('/superadmin', { replace: true });
        } else {
          handleLoginError(result.message);
        }
      } catch (error: any) {
        handleLoginError(error.message || 'Login failed');
      }
    } else {
      const ok = await login(email, password, selectedSchool ? Number(selectedSchool) : undefined);
      if (ok) navigate('/school', { replace: true });
    }
    
    setIsLoading(false);
  };
  
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mfaCode || !tempToken) {
      addToast('أدخل رمز المصادقة الثنائية', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await api.verifySuperAdminMfa(tempToken, mfaCode);
      
      if (result.success) {
        localStorage.removeItem('superadmin_login_attempts');
        localStorage.removeItem('superadmin_lock_time');
        const ok = await completeLoginWithToken(result.token);
        if (ok) navigate('/superadmin', { replace: true });
      } else {
        addToast('رمز المصادقة غير صحيح', 'error');
      }
    } catch (error) {
      addToast('فشل التحقق من المصادقة الثنائية', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLoginError = (message: string) => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    localStorage.setItem('superadmin_login_attempts', newAttempts.toString());
    
    if (newAttempts >= 3) {
      setIsLocked(true);
      localStorage.setItem('superadmin_lock_time', Date.now().toString());
      addToast('تم قفل الحساب مؤقتًا بعد 3 محاولات فاشلة', 'error');
    } else {
      addToast(message || 'بيانات الدخول غير صحيحة', 'error');
    }
  };

  if (isSuperAdminLogin && isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangleIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">حساب محظور مؤقتًا</h2>
            <p className="text-gray-600 dark:text-gray-400">
              تم قفل الحساب بعد عدة محاولات دخول فاشلة
            </p>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600 dark:text-red-400">
              الوقت المتبقي للإلغاء: {Math.floor(lockTimer / 60)}:{(lockTimer % 60).toString().padStart(2, '0')}
            </p>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 relative ${
      isSuperAdminLogin 
        ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900' 
        : 'bg-gray-100 dark:bg-gray-900'
    }`}>
        {!isSuperAdminLogin && (
          <button onClick={() => navigate('/')} className="absolute top-4 right-4 text-sm text-gray-600 dark:text-gray-400 hover:underline">
              &rarr; العودة للصفحة الرئيسية
          </button>
        )}
      <div className="w-full max-w-md">
        {isSuperAdminLogin && (
          <div className="text-center mb-4">
            <a href="/" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              ← العودة للصفحة الرئيسية
            </a>
          </div>
        )}
        <div className={`shadow-xl rounded-2xl p-8 space-y-6 ${
          isSuperAdminLogin 
            ? 'bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700' 
            : 'bg-white dark:bg-gray-800'
        }`}>
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
               <div className={`p-3 rounded-full ${
                 isSuperAdminLogin 
                   ? 'bg-indigo-100 dark:bg-indigo-900' 
                   : 'bg-indigo-100 dark:bg-indigo-900/50'
               }`}>
                 {isSuperAdminLogin ? (
                   <ShieldIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                 ) : (
                   <LogoIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                 )}
               </div>
            </div>
            <h1 className={`text-3xl font-bold ${
              isSuperAdminLogin 
                ? 'text-indigo-800 dark:text-indigo-200' 
                : 'text-gray-800 dark:text-white'
            }`}>
              {isSuperAdminLogin ? 'بوابة المدير العام المحمية' : 'تسجيل دخول المدرسة'}
            </h1>
            <p className={`mt-2 ${
              isSuperAdminLogin 
                ? 'text-indigo-600 dark:text-indigo-300' 
                : 'text-gray-500 dark:text-gray-400'
            }`}>
                {isSuperAdminLogin ? 'تسجيل دخول مأمون' : 'دخول مدير المدرسة، المعلمين، وولياء الأمور'}
            </p>
            
            {/* Security Warning for SuperAdmin */}
            {isSuperAdminLogin && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
                <div className="flex items-center">
                  <AlertTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 ml-2" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    هذه المنطقة محمية. يتم تسجيل جميع محاولات الدخول.
                  </p>
                </div>
              </div>
            )}
          </div>
          <form onSubmit={showMfa ? handleMfaSubmit : handleSubmit} className="space-y-4">
            {!showMfa ? (
              <>
                {!isSuperAdminLogin && (
                  <div>
                    <label htmlFor="school" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">المدرسة</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><SchoolIcon className="h-5 w-5 text-gray-400" /></div>
                        <select id="school" name="school" value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)} required={!isSuperAdminLogin} className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="" disabled>اختر مدرستك...</option>
                          {schools.map(school => (<option key={school.id} value={school.id}>{school.name}</option>))}
                        </select>
                    </div>
                     {errors.school && <p className="text-red-500 text-xs mt-1">{errors.school}</p>}
                  </div>
                )}
                {isSuperAdminLogin ? (
                  <div>
                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">البريد الإلكتروني</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><EmailIcon className="h-5 w-5 text-gray-400" /></div>
                      <input 
                        id="email" 
                        name="email" 
                        type="email" 
                        autoComplete="email"
                        required 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                        placeholder="أدخل بريدك الإلكتروني"
                      />
                    </div>
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    {!errors.email && email && !/\S+@\S+\.\S+/.test(email) && (
                      <p className="text-red-500 text-xs mt-1">صيغة البريد الإلكتروني غير صحيحة.</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">هذا الحقل يقبل البريد الإلكتروني فقط.</p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">البريد الإلكتروني</label>
                    <div className="relative">
                       <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><EmailIcon className="h-5 w-5 text-gray-400" /></div>
                      <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                )}
              </>
            ) : (
              // MFA Input
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                  رمز المصادقة الثنائية
                </label>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl font-mono"
                  placeholder="123456"
                  maxLength={6}
                  required
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة
                </p>
              </div>
            )}
            {!showMfa && (
              <div>
                <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">كلمة المرور</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><LockIcon className="h-5 w-5 text-gray-400" /></div>
                  <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pr-10 pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>
                          {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                      </button>
                  </div>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>
            )}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={
                  isLoading ||
                  (isSuperAdminLogin && !/\S+@\S+\.\S+/.test(email)) ||
                  (showMfa && mfaCode.length !== 6)
                } 
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed ${
                  isSuperAdminLogin 
                    ? 'bg-indigo-700 hover:bg-indigo-800 focus:ring-indigo-500 disabled:bg-indigo-400' 
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-indigo-400'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري التحقق...
                  </>
                ) : (
                  showMfa ? 'التحقق والدخول' : 'تسجيل الدخول'
                )}
              </button>
              {isSuperAdminLogin && !showMfa && (
                <div className="mt-3 text-center">
                  <button type="button" onClick={() => { setShowReset(true); setResetStage('request'); }} className="text-sm text-indigo-600 dark:text-indigo-300 hover:underline">
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}
            </div>
            
            {/* Attempts counter for SuperAdmin */}
            {isSuperAdminLogin && loginAttempts > 0 && !showMfa && (
              <div className="text-center">
                <p className="text-sm text-red-600 dark:text-red-400">
                  محاولات متبقية: {3 - loginAttempts}
                </p>
              </div>
            )}
            

          </form>
          
          {/* Security footer for SuperAdmin */}
          {isSuperAdminLogin && (
            <div className="mt-6 text-center text-sm text-gray-400">
              <p>يتم تشفير الاتصال باستخدام TLS 1.3</p>
              <p>آخر تحديث للأمان: {new Date().toLocaleDateString('ar-SA')}</p>
            </div>
          )}
          

        </div>
      </div>
      {isSuperAdminLogin && showReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setShowReset(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">إعادة تعيين كلمة المرور</h2>
            {resetStage === 'request' ? (
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">البريد الإلكتروني</label>
                  <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowReset(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg dark:bg-gray-700 dark:text-gray-200">إلغاء</button>
                  <button type="button" disabled={resetLoading || !/\S+@\S+\.\S+/.test(resetEmail)} onClick={async () => { try { setResetLoading(true); const r = await api.requestSuperAdminReset(resetEmail); setResetToken(r.resetToken); setResetStage('reset'); } catch { addToast('فشل طلب رمز إعادة التعيين.', 'error'); } finally { setResetLoading(false); } }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-indigo-400">{resetLoading ? 'جاري الطلب...' : 'طلب رمز'}</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">كلمة المرور الجديدة</label>
                  <input type="password" value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">تأكيد كلمة المرور</label>
                  <input type="password" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowReset(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg dark:bg-gray-700 dark:text-gray-200">إلغاء</button>
                  <button type="button" disabled={resetLoading || !resetNewPassword || resetNewPassword !== resetConfirm} onClick={async () => { try { setResetLoading(true); await api.resetSuperAdminPassword(resetToken, resetNewPassword); addToast('تم تعيين كلمة المرور الجديدة بنجاح.', 'success'); setShowReset(false); setPassword(resetNewPassword); } catch { addToast('فشل إعادة التعيين.', 'error'); } finally { setResetLoading(false); } }} className="px-4 py-2 bg-teal-600 text-white rounded-lg disabled:bg-teal-400">{resetLoading ? 'جارٍ التعيين...' : 'تعيين'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
