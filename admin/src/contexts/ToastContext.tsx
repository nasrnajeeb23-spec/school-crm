import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [idCounter, setIdCounter] = useState(0);
  const [lastToast, setLastToast] = useState<{ message: string; type: ToastType; time: number } | null>(null);

  const addToast = useCallback((message: string, type: ToastType) => {
    const now = Date.now();
    if (lastToast && lastToast.message === message && lastToast.type === type && (now - lastToast.time) < 4000) {
      return;
    }
    setLastToast({ message, type, time: now });
    setToasts(prevToasts => {
      const newToast = { id: idCounter, message, type };
      const updatedToasts = [...prevToasts, newToast].slice(-5);
      return updatedToasts;
    });
    setIdCounter(prevId => prevId + 1);
  }, [idCounter, lastToast]);

  const removeToast = useCallback((id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
