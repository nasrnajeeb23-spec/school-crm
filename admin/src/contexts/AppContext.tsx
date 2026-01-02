import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, NewTrialRequestData, UpdatableUserData } from '../types';
import * as api from '../api';
import { useToast } from './ToastContext';

type Theme = 'light' | 'dark';

interface AppContextType {
  currentUser: User | null;
  hydrating: boolean;
  theme: Theme;
  toggleTheme: () => void;
  login: (emailOrUsername: string, password: string, schoolId?: number, hcaptchaToken?: string) => Promise<boolean>;
  logout: () => void;
  trialSignup: (data: NewTrialRequestData) => Promise<boolean>;
  updateProfile: (data: UpdatableUserData) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hydrating, setHydrating] = useState<boolean>(true);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
        if (localStorage.getItem('theme')) {
            return localStorage.getItem('theme') as Theme;
        }
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
    }
    return 'light';
  });
  const { addToast } = useToast();

  useEffect(() => {
    try {
      const root = window.document.documentElement;
      if (root.getAttribute('dir') !== 'rtl') {
        root.setAttribute('dir', 'rtl');
      }
    } catch {}
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    const isLoginPage = (() => {
      if (typeof window === 'undefined') return false;
      const p = window.location?.pathname || '';
      return /^\/(login|superadmin\/login)\/?$/i.test(p);
    })();
    if (isLoginPage) { setHydrating(false); return; }
    const isInviteFlow = (() => {
      if (typeof window === 'undefined') return false;
      const p = window.location?.pathname || '';
      if (!/^\/set-password\/?$/.test(p)) return false;
      const q = new URLSearchParams(window.location.search);
      return !!q.get('token');
    })();
    if (isInviteFlow) { setHydrating(false); return; }
    
    let cancelled = false;
    (async () => {
      // Try immediately first
      try {
        const me = await api.getCurrentUser();
        if (me && !cancelled) {
          setCurrentUser(me as User);
          if ((me as any).schoolId) {
            try { localStorage.setItem('current_school_id', String((me as any).schoolId)); } catch {}
          }
          setHydrating(false);
          return;
        }
      } catch (err: any) {
        // If 401/403, stop immediately (invalid token)
        if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
          if (!cancelled) setHydrating(false);
          return;
        }
        if (err.message && err.message.includes('429')) {
          if (!cancelled) setHydrating(false);
          return;
        }
      }

      // Retry only on network errors or server errors
      const delays = [1000, 2000, 4000]; 
      for (let i = 0; i < delays.length && !cancelled; i++) {
        await new Promise(r => setTimeout(r, delays[i]));
        if (cancelled) break;
        
        try {
          const me = await api.getCurrentUser();
          if (me) {
            setCurrentUser(me as User);
            if ((me as any).schoolId) {
              try { localStorage.setItem('current_school_id', String((me as any).schoolId)); } catch {}
            }
            break;
          }
        } catch (err: any) {
           // Stop on auth error
           if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
             break;
           }
           if (err.message && err.message.includes('429')) {
             break;
           }
        }
      }
      if (!cancelled) setHydrating(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const login = async (emailOrUsername: string, password: string, schoolId?: number, hcaptchaToken?: string): Promise<boolean> => {
    try {
<<<<<<< HEAD
      const result = await api.login(emailOrUsername, password, schoolId);
      if (result === "TRIAL_EXPIRED") {
          addToast('لقد انتهت الفترة التجريبية لحسابك. يرجى الاشتراك للمتابعة.', 'warning');
          return false;
      } else if (result && typeof result === 'object') {
=======
      const result = await api.login(emailOrUsername, password, schoolId, hcaptchaToken);
      if (result) {
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
        setCurrentUser(result);
        if (result.schoolId) {
          try { localStorage.setItem('current_school_id', String(result.schoolId)); } catch {}
        }
        if ((result as any).passwordMustChange) {
          addToast('يرجى تغيير كلمة المرور فوراً لبدء الاستخدام.', 'warning');
        } else {
          addToast(`أهلاً بك مرة أخرى، ${result.name}!`, 'success');
        }
        return true;
      }
    } catch {}
    const isProd = (() => {
      try {
        const v = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
        const mode = String(v?.MODE || '').toLowerCase();
        const appEnv = String((process as any)?.env?.REACT_APP_ENVIRONMENT || '').toLowerCase();
        const nodeEnv = String((process as any)?.env?.NODE_ENV || '').toLowerCase();
        return mode === 'production' || appEnv === 'production' || nodeEnv === 'production';
      } catch {
        return true;
      }
    })();

    if (!isProd) {
      try {
        const overrideEmail = (typeof window !== 'undefined' ? (localStorage.getItem('superadmin_override_email') || 'super@admin.com') : 'super@admin.com');
        const overridePassword = (typeof window !== 'undefined' ? (localStorage.getItem('superadmin_override_password') || '') : '');
        const emailOk = String(emailOrUsername).toLowerCase() === String(overrideEmail).toLowerCase();
        const passOk = !!overridePassword && password === overridePassword;
        if (emailOk && passOk) {
          const offlineUser: User = { id: 'super-demo', name: 'المدير العام', email: overrideEmail, role: 'SUPER_ADMIN', schoolId: null } as unknown as User;
          setCurrentUser(offlineUser);
          try { localStorage.setItem('auth_token', 'OFFLINE_DEMO'); } catch {}
          addToast('تم الدخول في وضع العرض بدون اتصال بالخلفية.', 'info');
          return true;
        }
      } catch {}
      if (String(emailOrUsername).toLowerCase() === 'super@admin.com' && password === 'password') {
        const offlineUser: User = { id: 'super-demo', name: 'المدير العام', email: 'super@admin.com', role: 'SUPER_ADMIN', schoolId: null } as unknown as User;
        setCurrentUser(offlineUser);
        addToast('تم الدخول في وضع العرض بدون اتصال بالخلفية.', 'info');
        return true;
      }
<<<<<<< HEAD
=======
    } catch {}
    if (String(emailOrUsername).toLowerCase() === 'super@admin.com' && password === 'password') {
      const offlineUser: User = { id: 'super-demo', name: 'المدير العام', email: 'super@admin.com', role: 'SUPER_ADMIN', schoolId: null } as unknown as User;
      setCurrentUser(offlineUser);
      addToast('تم الدخول في وضع العرض بدون اتصال بالخلفية.', 'info');
      return true;
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
    }
    addToast('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
    return false;
  };
  
  const trialSignup = async (data: NewTrialRequestData): Promise<boolean> => {
    const newUser = await api.submitTrialRequest(data);
    if (newUser) {
        setCurrentUser(newUser);
        if (newUser.schoolId) {
          try { 
            localStorage.setItem('current_school_id', String(newUser.schoolId)); 
          } catch (error) {
            void error;
          }
        } else {
          void newUser;
        }
        addToast(`أهلاً بك ${newUser.name}! تم إنشاء حسابك التجريبي بنجاح.`, 'success');
        return true;
    } else {
        addToast('حدث خطأ أثناء إنشاء الحساب. قد يكون البريد الإلكتروني مستخدماً بالفعل.', 'error');
        return false;
    }
  };

  const updateProfile = async (data: UpdatableUserData): Promise<boolean> => {
    if (!currentUser) return false;
    const updatedUser = await api.updateCurrentUser(currentUser.id, data);
    if (updatedUser) {
        setCurrentUser(updatedUser);
        addToast('تم تحديث ملفك الشخصي بنجاح.', 'success');
        return true;
    }
    addToast('فشل تحديث الملف الشخصي.', 'error');
    return false;
  };

  const logout = () => {
    addToast('تم تسجيل خروجك بنجاح.', 'info');
    try { api.logout().catch(() => {}); } catch {}
    setCurrentUser(null);
    try {
      localStorage.removeItem('current_school_id');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    } catch {}
  };

  const value = {
    currentUser,
    hydrating,
    theme,
    toggleTheme,
    login,
    logout,
    trialSignup,
    updateProfile,
  };

  if (typeof window !== 'undefined') {
    try { (window as any).__addToast = addToast; } catch {}
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
