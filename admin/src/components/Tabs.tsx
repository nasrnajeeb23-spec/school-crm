import React from 'react';

interface TabItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number;
}

interface TabsProps {
    tabs: TabItem[];
    activeTab: string;
    onChange: (tabId: string) => void;
    className?: string;
}

const Tabs: React.FC<TabsProps> = ({
    tabs,
    activeTab,
    onChange,
    className = ''
}) => {
    return (
        <div className={className}>
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8 space-x-reverse overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                ${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }
              `}
                            aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                            {tab.icon && (
                                <span className={`ml-3 ${activeTab === tab.id ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                    {tab.icon}
                                </span>
                            )}
                            {tab.label}
                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span className={`mr-3 py-0.5 px-2.5 rounded-full text-xs font-medium ${activeTab === tab.id
                                        ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20'
                                        : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-300'
                                    }`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>
        </div>
    );
};

export default Tabs;
