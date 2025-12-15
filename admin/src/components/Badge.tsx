import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';
    size?: 'sm' | 'md' | 'lg';
    rounded?: boolean;
    className?: string;
}

const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    rounded = true,
    className = ''
}) => {
    const variantClasses = {
        primary: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
        success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-base'
    };

    return (
        <span
            className={`inline-flex items-center font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${rounded ? 'rounded-full' : 'rounded'
                } ${className}`}
        >
            {children}
        </span>
    );
};

export default Badge;
