import React, { useState } from 'react';
import { Route, BusOperator } from '../types';

interface AddRouteModalProps {
  busOperators: BusOperator[];
  onClose: () => void;
  onSave: (data: Omit<Route, 'id' | 'studentIds'>) => Promise<void>;
}

const AddRouteModal: React.FC<AddRouteModalProps> = ({ busOperators, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        busOperatorId: busOperators.length > 0 ? busOperators[0].id : null,
        departureTime: '',
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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">إنشاء مسار جديد</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المسار (مثال: حي الياسمين)</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="busOperatorId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر السائق والحافلة</label>
                        <select name="busOperatorId" id="busOperatorId" value={formData.busOperatorId || ''} onChange={handleChange} className={inputStyle}>
                            <option value="">اختر...</option>
                            {busOperators.map(op => (
                                <option key={op.id} value={op.id}>{op.name} ({op.busPlateNumber})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="departureTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">وقت الانطلاق (اختياري)</label>
                        <input type="time" name="departureTime" id="departureTime" value={formData.departureTime} onChange={handleChange} className={inputStyle} />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">{isSaving ? 'جاري الحفظ...' : 'حفظ المسار'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddRouteModal;
