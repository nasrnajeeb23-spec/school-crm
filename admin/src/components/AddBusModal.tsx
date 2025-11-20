import React, { useState } from 'react';
import { Bus } from '../types';

interface AddBusModalProps {
  onClose: () => void;
  onSave: (data: Omit<Bus, 'id'>) => Promise<void>;
}

const AddBusModal: React.FC<AddBusModalProps> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        plateNumber: '',
        capacity: 20,
        model: '',
        owner: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'capacity' ? parseInt(value) : value }));
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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">إضافة حافلة جديدة</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="plateNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم اللوحة</label>
                            <input type="text" name="plateNumber" id="plateNumber" value={formData.plateNumber} onChange={handleChange} required className={inputStyle} />
                        </div>
                        <div>
                            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعة</label>
                            <input type="number" name="capacity" id="capacity" value={formData.capacity} onChange={handleChange} required className={inputStyle} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الموديل</label>
                        <input type="text" name="model" id="model" value={formData.model} onChange={handleChange} required className={inputStyle} />
                    </div>
                     <div>
                        <label htmlFor="owner" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المالك / الشركة</label>
                        <input type="text" name="owner" id="owner" value={formData.owner} onChange={handleChange} required className={inputStyle} />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">{isSaving ? 'جاري الحفظ...' : 'حفظ الحافلة'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddBusModal;
