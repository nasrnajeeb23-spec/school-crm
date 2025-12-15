import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface DropdownOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

interface DropdownProps {
    options: DropdownOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = 'اختر...',
    label,
    className = '',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`relative w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm pr-10 pl-3 py-2 text-right cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="flex items-center">
                    {selectedOption?.icon && (
                        <span className="ml-3 flex-shrink-0">{selectedOption.icon}</span>
                    )}
                    <span className="block truncate text-gray-900 dark:text-white">
                        {selectedOption?.label || placeholder}
                    </span>
                </span>
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                    <ChevronDownIcon
                        className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                        aria-hidden="true"
                    />
                </span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <ul
                        className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
                        role="listbox"
                    >
                        {options.map((option) => (
                            <li
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`cursor-pointer select-none relative py-2 pr-3 pl-9 hover:bg-gray-100 dark:hover:bg-gray-600 ${option.value === value ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                    }`}
                                role="option"
                                aria-selected={option.value === value}
                            >
                                <div className="flex items-center">
                                    {option.icon && (
                                        <span className="ml-3 flex-shrink-0">{option.icon}</span>
                                    )}
                                    <span className={`block truncate ${option.value === value ? 'font-semibold' : 'font-normal'} text-gray-900 dark:text-white`}>
                                        {option.label}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
};

export default Dropdown;
