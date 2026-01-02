import React from 'react';

interface DataTableColumn<T> {
    key: keyof T | string;
    header: string;
    render?: (item: T) => React.ReactNode;
    sortable?: boolean;
    width?: string;
}

interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    data: T[];
    keyExtractor: (item: T) => string;
    onSort?: (key: string, direction: 'asc' | 'desc') => void;
    loading?: boolean;
    emptyMessage?: string;
    className?: string;
}

function DataTable<T>({
    columns,
    data,
    keyExtractor,
    onSort,
    loading = false,
    emptyMessage = 'لا توجد بيانات',
    className = ''
}: DataTableProps<T>) {
    const [sortKey, setSortKey] = React.useState<string | null>(null);
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

    const handleSort = (key: string) => {
        if (!onSort) return;

        const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortKey(key);
        setSortDirection(newDirection);
        onSort(key, newDirection);
    };

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded mb-2"></div>
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        {columns.map((column, index) => (
                            <th
                                key={index}
                                scope="col"
                                className={`px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                                    } ${column.width || ''}`}
                                onClick={() => column.sortable && handleSort(String(column.key))}
                            >
                                <div className="flex items-center justify-end">
                                    {column.header}
                                    {column.sortable && sortKey === column.key && (
                                        <span className="mr-2">
                                            {sortDirection === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.map((item) => (
                        <tr key={keyExtractor(item)} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            {columns.map((column, index) => (
                                <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {column.render
                                        ? column.render(item)
                                        : String((item as any)[column.key] || '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default DataTable;
