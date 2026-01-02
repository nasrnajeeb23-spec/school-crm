import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'primary' | 'white' | 'gray';
    className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    color = 'primary',
    className = ''
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    const colorClasses = {
        primary: 'border-indigo-600',
        white: 'border-white',
        gray: 'border-gray-600'
    };

    return (
        <div
            className={`inline-block ${sizeClasses[size]} border-2 ${colorClasses[color]} border-t-transparent rounded-full animate-spin ${className}`}
            role="status"
            aria-label="جاري التحميل"
        >
            <span className="sr-only">جاري التحميل...</span>
        </div>
    );
};

export default LoadingSpinner;
