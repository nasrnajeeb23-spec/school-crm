import React from 'react';

interface HeaderProps {
  title: string;
  schoolName?: string;
  onMenuToggle?: () => void;
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, schoolName, onMenuToggle, children }) => {
  return (
    <header className="py-6">
      <div className="flex items-center gap-4 flex-wrap">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="فتح القائمة"
          >
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
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
