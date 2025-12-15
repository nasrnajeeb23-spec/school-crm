import React from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface AlertProps {
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    message: string;
    onClose?: () => void;
    className?: string;
}

const Alert: React.FC<AlertProps> = ({
    type,
    title,
    message,
    onClose,
    className = ''
}) => {
    const config = {
        success: {
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            borderColor: 'border-green-200 dark:border-green-800',
            textColor: 'text-green-800 dark:text-green-200',
            icon: CheckCircleIcon,
            iconColor: 'text-green-600 dark:text-green-400'
        },
        error: {
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            borderColor: 'border-red-200 dark:border-red-800',
            textColor: 'text-red-800 dark:text-red-200',
            icon: XCircleIcon,
            iconColor: 'text-red-600 dark:text-red-400'
        },
        warning: {
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
            borderColor: 'border-yellow-200 dark:border-yellow-800',
            textColor: 'text-yellow-800 dark:text-yellow-200',
            icon: ExclamationTriangleIcon,
            iconColor: 'text-yellow-600 dark:text-yellow-400'
        },
        info: {
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-200 dark:border-blue-800',
            textColor: 'text-blue-800 dark:text-blue-200',
            icon: InformationCircleIcon,
            iconColor: 'text-blue-600 dark:text-blue-400'
        }
    };

    const { bgColor, borderColor, textColor, icon: Icon, iconColor } = config[type];

    return (
        <div
            className={`${bgColor} ${borderColor} ${textColor} border rounded-lg p-4 ${className}`}
            role="alert"
        >
            <div className="flex items-start">
                <Icon className={`w-5 h-5 ${iconColor} ml-3 flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                    {title && (
                        <h3 className="font-semibold mb-1">{title}</h3>
                    )}
                    <p className="text-sm">{message}</p>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="mr-2 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        aria-label="إغلاق"
                    >
                        <XCircleIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Alert;
