import React from 'react';

interface StatsCardProps {
  icon: React.ElementType;
  title: string;
  value: string;
  description: string;
  onClick?: () => void;
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon: Icon, title, value, description, onClick }) => {
  const baseClasses = "bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center space-x-4 rtl:space-x-reverse transition-all duration-300 w-full text-right";
  const clickableClasses = onClick ? "cursor-pointer transform hover:-translate-y-1 hover:shadow-lg" : "";

  const Component = onClick ? 'button' : 'div';

  return (
    <Component onClick={onClick} className={`${baseClasses} ${clickableClasses}`}>
      <div className="flex-shrink-0">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
          <Icon className="h-7 w-7 text-indigo-600 dark:text-indigo-300" />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </Component>
  );
};

export default StatsCard;
