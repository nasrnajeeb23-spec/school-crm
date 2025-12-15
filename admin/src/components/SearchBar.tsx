import React, { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
    placeholder?: string;
    onSearch: (query: string) => void;
    debounceMs?: number;
    className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
    placeholder = 'بحث...',
    onSearch,
    debounceMs = 300,
    className = ''
}) => {
    const [query, setQuery] = useState('');
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        // Clear previous timer
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        // Set new timer
        const timer = setTimeout(() => {
            onSearch(value);
        }, debounceMs);

        setDebounceTimer(timer);
    };

    const handleClear = () => {
        setQuery('');
        onSearch('');
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
    };

    return (
        <div className={`relative ${className}`}>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
                type="text"
                value={query}
                onChange={handleChange}
                placeholder={placeholder}
                className="block w-full pr-10 pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                aria-label="بحث"
            />
            {query && (
                <button
                    onClick={handleClear}
                    className="absolute inset-y-0 left-0 flex items-center pl-3 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="مسح البحث"
                >
                    <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
            )}
        </div>
    );
};

export default SearchBar;
