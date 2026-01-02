import React, { useState } from 'react';
import { Driver, Bus } from '../types';

interface AddDriverModalProps {
  buses: Bus[];
  onClose: () => void;
  onSave: (data: Omit<Driver, 'id'>) => Promise<void>;
}

const AddDriverModal: React.FC<AddDriverModalProps> = ({ buses, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        licenseNumber: '',
        busId: buses.length > 0 ? buses[0].id : null,
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(formData);
        setIsSaving(false);
    };

    const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">إضافة سائق جديد</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم السائق</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={inputStyle} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                            <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className={inputStyle} />
                        </div>
                        <div>
                            <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الرخصة</label>
                            <input type="text" name="licenseNumber" id="licenseNumber" value={formData.licenseNumber} onChange={handleChange} required className={inputStyle} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="busId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">تعيين حافلة (اختياري)</label>
                        <select name="busId" id="busId" value={formData.busId || ''} onChange={handleChange} className={inputStyle}>
                            <option value="">بدون حافلة</option>
                            {buses.map(bus => (
                                <option key={bus.id} value={bus.id}>{bus.plateNumber} ({bus.model})</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">{isSaving ? 'جاري الحفظ...' : 'حفظ السائق'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDriverModal;
