
import React from 'react';
import { SchoolSettings } from '../types';
import * as api from '../api';

interface BrandableCardProps {
    children: React.ReactNode;
    className?: string;
    schoolSettings: SchoolSettings | null;
}

const BrandableCard: React.FC<BrandableCardProps> = ({ children, className, schoolSettings }) => (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md ${className}`}>
        {schoolSettings && (
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 mb-6">
                {schoolSettings.schoolLogoUrl && (
                    <img 
                        src={api.getAssetUrl(schoolSettings.schoolLogoUrl as string)} 
                        alt="School Logo" 
                        className="w-10 h-10 rounded-lg" 
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                )}
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">{schoolSettings.schoolName}</h2>
            </div>
        )}
        {children}
    </div>
);

export default BrandableCard;