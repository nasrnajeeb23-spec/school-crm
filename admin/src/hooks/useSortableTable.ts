import { useState, useMemo } from 'react';

export type SortOrder = 'asc' | 'desc';

export type SortConfig<T> = {
    key: keyof T;
    direction: SortOrder;
} | null;

interface UseSortableTableResult<T> {
    sortedData: T[];
    sortKey: keyof T | null;
    sortOrder: SortOrder;
    sortConfig: SortConfig<T>;
    handleSort: (key: keyof T) => void;
    requestSort: (key: keyof T) => void;
    getSortIcon: (key: keyof T) => string;
}

/**
 * Custom hook for sortable tables
 * 
 * @param data - Array of data to sort
 * @param initialSortKey - Initial sort key (optional)
 * @param initialSortOrder - Initial sort order (optional)
 * @returns Sorted data and sort controls
 * 
 * @example
 * const { sortedData, handleSort, getSortIcon } = useSortableTable(students, 'name');
 * 
 * <th onClick={() => handleSort('name')}>
 *   الاسم {getSortIcon('name')}
 * </th>
 */
export function useSortableTable<T>(
    data: T[],
    initialSortKey?: keyof T,
    initialSortOrder: SortOrder = 'asc'
): UseSortableTableResult<T> {
    const [sortKey, setSortKey] = useState<keyof T | null>(initialSortKey || null);
    const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);

    const handleSort = (key: keyof T) => {
        if (sortKey === key) {
            // Toggle order if same key
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // New key, default to ascending
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    const requestSort = (key: keyof T) => {
        handleSort(key);
    };

    const getSortIcon = (key: keyof T): string => {
        if (sortKey !== key) return '⇅'; // Both arrows (not sorted)
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    const sortedData = useMemo(() => {
        if (!sortKey) return data;

        return [...data].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];

            // Handle null/undefined
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            // Handle numbers
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // Handle strings (case-insensitive)
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();

            if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
            if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortKey, sortOrder]);

    const sortConfig: SortConfig<T> = sortKey ? { key: sortKey, direction: sortOrder } : null;

    return {
        sortedData,
        sortKey,
        sortOrder,
        sortConfig,
        handleSort,
        requestSort,
        getSortIcon
    };
}

export default useSortableTable;
