import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, NewTrialRequestData, UpdatableUserData } from '../types';
import * as api from '../api';
import { useToast } from './ToastContext';

type Theme = 'light' | 'dark';

interface AppContextType {
  currentUser: User | null;
  theme: Theme;
  toggleTheme: () => void;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  logout: () => void;
  trialSignup: (data: NewTrialRequestData) => Promise<boolean>;
  updateProfile: (data: UpdatableUserData) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    try {
      const result = await api.login(emailOrUsername, password);
      if (result === "TRIAL_EXPIRED") {
          addToast('لقد انتهت الفترة التجريبية لحسابك. يرجى الاشتراك للمتابعة.', 'warning');
          return false;
      } else if (result) {
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
    if (String(emailOrUsername).toLowerCase() === 'super@admin.com' && password === 'password') {
      const offlineUser: User = { id: 'super-demo', name: 'المدير العام', email: 'super@admin.com', role: 'SUPER_ADMIN', schoolId: null } as unknown as User;
      setCurrentUser(offlineUser);
      try { localStorage.setItem('auth_token', 'OFFLINE_DEMO'); } catch {}
      addToast('تم الدخول في وضع العرض بدون اتصال بالخلفية.', 'info');
      return true;
    }
    addToast('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
    return false;
  };
  
  const trialSignup = async (data: NewTrialRequestData): Promise<boolean> => {
    console.log('Starting trial signup with data:', data);
    const newUser = await api.submitTrialRequest(data);
    console.log('Trial signup response:', newUser);
    if (newUser) {
        console.log('Setting current user with school ID:', newUser.schoolId);
        setCurrentUser(newUser);
        if (newUser.schoolId) {
          try { 
            localStorage.setItem('current_school_id', String(newUser.schoolId)); 
            console.log('School ID stored in localStorage:', newUser.schoolId);
          } catch (error) {
            console.error('Error storing school ID:', error);
          }
        } else {
          console.warn('No school ID found in new user data:', newUser);
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
    setCurrentUser(null);
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_school_id');
    } catch {}
  };

  const value = {
    currentUser,
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
