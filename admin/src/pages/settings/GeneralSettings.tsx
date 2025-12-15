import React from 'react';
import { SchoolSettings } from '../../types';

interface GeneralSettingsProps {
    settings: SchoolSettings;
    onSettingsChange: (updates: Partial<SchoolSettings>) => void;
    onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    logoUploading: boolean;
    inputStyle: string;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
    settings,
    onSettingsChange,
    onLogoChange,
    logoUploading,
    inputStyle
}) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        onSettingsChange({ [name]: value });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">معلومات المدرسة الأساسية</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المدرسة</label>
                        <input
                            type="text"
                            name="schoolName"
                            value={settings.schoolName || ''}
                            onChange={handleInputChange}
                            className={inputStyle}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                        <input
                            type="text"
                            name="phone"
                            value={settings.phone || ''}
                            onChange={handleInputChange}
                            className={inputStyle}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
                        <input
                            type="email"
                            name="email"
                            value={settings.email || ''}
                            onChange={handleInputChange}
                            className={inputStyle}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">العنوان</label>
                        <input
                            type="text"
                            name="address"
                            value={settings.address || ''}
                            onChange={handleInputChange}
                            className={inputStyle}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المدينة</label>
                        <input
                            type="text"
                            name="city"
                            value={settings.city || ''}
                            onChange={handleInputChange}
                            className={inputStyle}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الرمز البريدي</label>
                        <input
                            type="text"
                            name="postalCode"
                            value={settings.postalCode || ''}
                            onChange={handleInputChange}
                            className={inputStyle}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">شعار المدرسة</h3>

                {settings.schoolLogoUrl && (
                    <div className="mb-4">
                        <img
                            src={typeof settings.schoolLogoUrl === 'string' ? settings.schoolLogoUrl : ''}
                            alt="School Logo"
                            className="h-24 w-auto object-contain"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {logoUploading ? 'جاري الرفع...' : 'رفع شعار جديد'}
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={onLogoChange}
                        disabled={logoUploading}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                    />
                    <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF حتى 5MB</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">العملة</h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رمز العملة</label>
                    <input
                        type="text"
                        name="currency"
                        value={settings.currency || 'USD'}
                        onChange={handleInputChange}
                        className={inputStyle}
                        placeholder="USD, SAR, EGP, etc."
                    />
                </div>
            </div>
        </div>
    );
};

export default GeneralSettings;
