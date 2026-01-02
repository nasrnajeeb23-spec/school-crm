import React from 'react';

interface FormTextareaProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    helperText?: string;
    rows?: number;
    maxLength?: number;
    className?: string;
}

const FormTextarea: React.FC<FormTextareaProps> = ({
    label,
    name,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error,
    helperText,
    rows = 4,
    maxLength,
    className = ''
}) => {
    const textareaId = `textarea-${name}`;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;
    const counterId = `${textareaId}-counter`;

    return (
        <div className={`mb-4 ${className}`}>
            <label
                htmlFor={textareaId}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
                {label}
                {required && <span className="text-red-500 mr-1" aria-label="مطلوب">*</span>}
            </label>

            <textarea
                id={textareaId}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                rows={rows}
                maxLength={maxLength}
                className={`
          block w-full px-3 py-2 border rounded-lg resize-y
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          dark:bg-gray-700 dark:text-white dark:border-gray-600
          ${error
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }
        `}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={`${error ? errorId : ''} ${helperText ? helperId : ''} ${maxLength ? counterId : ''}`.trim()}
            />

            <div className="flex justify-between items-start mt-1">
                <div className="flex-1">
                    {error && (
                        <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
                            {error}
                        </p>
                    )}

                    {helperText && !error && (
                        <p id={helperId} className="text-sm text-gray-500 dark:text-gray-400">
                            {helperText}
                        </p>
                    )}
                </div>

                {maxLength && (
                    <p id={counterId} className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                        {value.length} / {maxLength}
                    </p>
                )}
            </div>
        </div>
    );
};

export default FormTextarea;
