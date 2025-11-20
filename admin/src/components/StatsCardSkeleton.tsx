import React from 'react';
import SkeletonLoader from './SkeletonLoader';

const StatsCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center space-x-4 rtl:space-x-reverse animate-pulse">
      <div className="flex-shrink-0">
        <SkeletonLoader className="h-16 w-16 rounded-lg" />
      </div>
      <div className="flex-grow space-y-2">
        <SkeletonLoader className="h-4 w-1/3" />
        <SkeletonLoader className="h-8 w-1/2" />
        <SkeletonLoader className="h-3 w-2/3" />
      </div>
    </div>
  );
};

export default StatsCardSkeleton;
