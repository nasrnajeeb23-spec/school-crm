import React from 'react';

interface HeaderProps {
  title: string;
  schoolName?: string;
}

const Header: React.FC<HeaderProps> = ({ title, schoolName }) => {
  return (
    <header className="py-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{title}</h1>
        {schoolName && (
            <span className="text-lg text-gray-500 dark:text-gray-400 font-medium hidden sm:block border-r-2 border-gray-300 dark:border-gray-600 pr-4">
                {schoolName}
            </span>
        )}
      </div>
    </header>
  );
};

export default Header;