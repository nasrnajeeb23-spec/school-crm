import React from 'react';
import SkeletonLoader from './SkeletonLoader';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right">
        <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} scope="col" className="px-6 py-3">
                <SkeletonLoader className="h-4 w-3/4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b dark:border-gray-700">
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j} className="px-6 py-4">
                  <SkeletonLoader className="h-5 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableSkeleton;
