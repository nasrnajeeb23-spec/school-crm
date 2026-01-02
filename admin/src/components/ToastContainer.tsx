import React, { useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { SuccessIcon, ErrorIcon, InfoIcon, WarningIcon, CloseIcon } from './icons';

const toastIcons: { [key: string]: React.ElementType } = {
  success: SuccessIcon,
  error: ErrorIcon,
  info: InfoIcon,
  warning: WarningIcon,
};

const toastColors: { [key: string]: string } = {
    success: 'bg-green-500 border-green-600',
    error: 'bg-red-500 border-red-600',
    info: 'bg-blue-500 border-blue-600',
    warning: 'bg-yellow-500 border-yellow-600',
};

const Toast: React.FC<{ toast: { id: number; message: string; type: string }, onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, 5000); // Auto-dismiss after 5 seconds

        return () => clearTimeout(timer);
    }, [toast.id, onRemove]);

    const Icon = toastIcons[toast.type];
    const color = toastColors[toast.type];

    return (
        <div className={`flex items-start text-white p-4 mb-4 rounded-lg shadow-lg ${color} border-l-4 animate-fade-in-right`}>
            <div className="flex-shrink-0 pt-0.5">
                <Icon className="h-6 w-6" />
            </div>
            <div className="mx-3 text-sm font-medium">
                {toast.message}
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-white hover:text-gray-200 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 inline-flex h-8 w-8"
                aria-label="Close"
            >
                <CloseIcon className="w-5 h-5" />
            </button>
        </div>
    );
};


const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-5 left-5 z-50 w-full max-w-xs sm:max-w-sm">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </div>
    );
};

export default ToastContainer;
