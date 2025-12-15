import React from 'react';

interface ResponsiveTableProps {
    headers: string[];
    data: any[];
    renderRow: (item: any, index: number) => React.ReactNode;
    renderCard?: (item: any, index: number) => React.ReactNode;
    keyExtractor: (item: any, index: number) => string;
    emptyMessage?: string;
    className?: string;
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
    headers,
    data,
    renderRow,
    renderCard,
    keyExtractor,
    emptyMessage = 'لا توجد بيانات',
    className = ''
}) => {
    if (data.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {emptyMessage}
            </div>
        );
    }

    return (
        <>
            {/* Desktop Table View */}
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

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {data.map((item, index) => (
                    <div
                        key={keyExtractor(item, index)}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700"
                    >
                        {renderCard ? renderCard(item, index) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Card view not implemented
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
};

export default ResponsiveTable;
