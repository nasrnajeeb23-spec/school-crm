import React from 'react';

interface FormInputProps {
    label: string;
    name: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    helperText?: string;
    className?: string;
    autoComplete?: string;
    min?: number;
    max?: number;
    pattern?: string;
}

const FormInput: React.FC<FormInputProps> = ({
    label,
    name,
    type = 'text',
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error,
    helperText,
    className = '',
    autoComplete,
    min,
    max,
    pattern
}) => {
    const inputId = `input-${name}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
        <div className={`mb-4 ${className}`}>
            <label
                htmlFor={inputId}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
                {label}
                {required && <span className="text-red-500 mr-1" aria-label="مطلوب">*</span>}
            </label>

            <input
                id={inputId}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                autoComplete={autoComplete}
                min={min}
                max={max}
                pattern={pattern}
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
            />

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

export default FormInput;
