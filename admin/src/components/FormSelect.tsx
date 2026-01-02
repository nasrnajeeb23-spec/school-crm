import React from 'react';

interface FormSelectProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    helperText?: string;
    className?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({
    label,
    name,
    value,
    onChange,
    options,
    placeholder = 'اختر...',
    required = false,
    disabled = false,
    error,
    helperText,
    className = ''
}) => {
    const selectId = `select-${name}`;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    return (
        <div className={`mb-4 ${className}`}>
            <label
                htmlFor={selectId}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
                {label}
                {required && <span className="text-red-500 mr-1" aria-label="مطلوب">*</span>}
            </label>

            <select
                id={selectId}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
                className={`
          block w-full px-3 py-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          dark:bg-gray-700 dark:text-white dark:border-gray-600
          ${error
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }
        `}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={`${error ? errorId : ''} ${helperText ? helperId : ''}`.trim()}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

            {error && (
                <p id={errorId} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                    {error}
                </p>
            )}

            {helperText && !error && (
                <p id={helperId} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {helperText}
                </p>
            )}
        </div>
    );
};

export default FormSelect;
