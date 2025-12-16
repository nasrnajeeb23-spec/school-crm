import React from 'react';

type ColumnAccessor<T> = keyof T;

export type ResponsiveTableColumn<T> = {
    header: string;
    accessor: ColumnAccessor<T>;
    render?: (item: T, index: number) => React.ReactNode;
    sortable?: boolean;
};

type ColumnsTableProps<T> = {
    columns: Array<ResponsiveTableColumn<T>>;
    data: T[];
    sortConfig?: any;
    onSort?: (key: ColumnAccessor<T>) => void;
    renderCard?: (item: T, index: number) => React.ReactNode;
    keyExtractor?: (item: T, index: number) => string;
    emptyMessage?: string;
    className?: string;
};

type LegacyTableProps = {
    headers: string[];
    data: any[];
    renderRow: (item: any, index: number) => React.ReactNode;
    renderCard?: (item: any, index: number) => React.ReactNode;
    keyExtractor: (item: any, index: number) => string;
    emptyMessage?: string;
    className?: string;
};

type ResponsiveTableProps<T> = ColumnsTableProps<T> | LegacyTableProps;

function getSortDirection(sortConfig: any, key: any): 'asc' | 'desc' | null {
    if (!sortConfig) return null;
    const activeKey = sortConfig?.key ?? sortConfig?.sortKey ?? sortConfig?.column;
    if (activeKey !== key) return null;
    const dir = sortConfig?.direction ?? sortConfig?.sortOrder ?? sortConfig?.order;
    if (dir === 'asc' || dir === 'ascending') return 'asc';
    if (dir === 'desc' || dir === 'descending') return 'desc';
    return null;
}

function ResponsiveTable<T>(props: ResponsiveTableProps<T>) {
    const emptyMessage = (props as any).emptyMessage ?? 'لا توجد بيانات';
    const className = (props as any).className ?? '';
    const data = (props as any).data as any[];

    if (!Array.isArray(data) || data.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {emptyMessage}
            </div>
        );
    }

    const isColumnsMode = Array.isArray((props as any).columns);

    const keyExtractor = isColumnsMode
        ? ((props as ColumnsTableProps<T>).keyExtractor ?? ((item: any, index: number) => String(item?.id ?? index)))
        : (props as LegacyTableProps).keyExtractor;

    const renderCard = (props as any).renderCard as ((item: any, index: number) => React.ReactNode) | undefined;

    if (!isColumnsMode) {
        const { headers, renderRow } = props as LegacyTableProps;

        return (
            <>
                <div className="hidden md:block overflow-x-auto">
                    <table className={`w-full text-sm text-right text-gray-500 dark:text-gray-400 ${className}`}>
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                {headers.map((header, index) => (
                                    <th key={index} scope="col" className="px-6 py-3">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => (
                                <tr
                                    key={keyExtractor(item, index)}
                                    className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    {renderRow(item, index)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="md:hidden space-y-4">
                    {data.map((item, index) => (
                        <div
                            key={keyExtractor(item, index)}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700"
                        >
                            {renderCard ? renderCard(item, index) : (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {emptyMessage}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </>
        );
    }

    const { columns, sortConfig, onSort } = props as ColumnsTableProps<T>;

    return (
        <>
            <div className="hidden md:block overflow-x-auto">
                <table className={`w-full text-sm text-right text-gray-500 dark:text-gray-400 ${className}`}>
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            {columns.map((column, index) => {
                                const dir = getSortDirection(sortConfig, column.accessor);
                                const canSort = !!column.sortable && typeof onSort === 'function';
                                const icon = column.sortable ? (dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '⇅') : null;
                                return (
                                    <th
                                        key={index}
                                        scope="col"
                                        className={`px-6 py-3 ${canSort ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600' : ''}`}
                                        onClick={() => {
                                            if (canSort) onSort(column.accessor);
                                        }}
                                    >
                                        <div className="flex items-center justify-end gap-2">
                                            <span>{column.header}</span>
                                            {icon ? <span className="text-xs">{icon}</span> : null}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, rowIndex) => (
                            <tr
                                key={keyExtractor(item, rowIndex)}
                                className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                {columns.map((column, colIndex) => (
                                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                                        {column.render ? column.render(item as any, rowIndex) : String((item as any)?.[column.accessor] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="md:hidden space-y-4">
                {data.map((item, index) => (
                    <div
                        key={keyExtractor(item, index)}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700"
                    >
                        {renderCard ? renderCard(item, index) : (
                            <div className="space-y-3">
                                {columns.map((column, colIndex) => (
                                    <div key={colIndex} className="flex items-start justify-between gap-4">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{column.header}</div>
                                        <div className="text-sm text-gray-900 dark:text-white text-left">
                                            {column.render ? column.render(item as any, index) : String((item as any)?.[column.accessor] ?? '')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}

export default ResponsiveTable;
