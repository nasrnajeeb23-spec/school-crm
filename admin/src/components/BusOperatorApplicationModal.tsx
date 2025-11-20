import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { NewBusOperatorApplication, School } from '../types';

interface BusOperatorApplicationModalProps {
  onClose: () => void;
  onSave: (data: NewBusOperatorApplication) => Promise<void>;
}

const BusOperatorApplicationModal: React.FC<BusOperatorApplicationModalProps> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState<Omit<NewBusOperatorApplication, 'schoolId'> & { schoolId: string }>({
        name: '',
        phone: '',
        licenseNumber: '',
        busPlateNumber: '',
        busCapacity: 20,
        busModel: '',
        schoolId: '',
    });
    const [schools, setSchools] = useState<School[]>([]);
    const [loadingSchools, setLoadingSchools] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<any>({});

    useEffect(() => {
        api.getSchools().then(data => {
            setSchools(data);
            if (data.length > 0) {
                setFormData(prev => ({ ...prev, schoolId: data[0].id.toString() }));
            }
        }).finally(() => setLoadingSchools(false));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'busCapacity' ? parseInt(value) : value }));
    };

    const validate = (): boolean => {
        const newErrors: any = {};
        if (!formData.name.trim()) newErrors.name = "الاسم مطلوب.";
        if (!formData.phone.trim()) newErrors.phone = "رقم الهاتف مطلوب.";
        if (!formData.busPlateNumber.trim()) newErrors.busPlateNumber = "رقم اللوحة مطلوب.";
        if (!formData.schoolId) newErrors.schoolId = "يجب اختيار المدرسة.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSaving(true);
        await onSave({ ...formData, schoolId: parseInt(formData.schoolId) });
        setIsSaving(false);
    };

    const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] flex flex-col modal-content-scale-up" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex-shrink-0">طلب الانضمام كمقدم خدمة نقل</h2>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2 dark:border-gray-600">بيانات السائق</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم الكامل</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={inputStyle} />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                            <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className={inputStyle} />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم رخصة القيادة</label>
                        <input type="text" name="licenseNumber" id="licenseNumber" value={formData.licenseNumber} onChange={handleChange} required className={inputStyle} />
                    </div>

                    <h3 className="text-lg font-semibold border-b pb-2 pt-4 dark:border-gray-600">بيانات الحافلة</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="busPlateNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم اللوحة</label>
                            <input type="text" name="busPlateNumber" id="busPlateNumber" value={formData.busPlateNumber} onChange={handleChange} required className={inputStyle} />
                            {errors.busPlateNumber && <p className="text-red-500 text-xs mt-1">{errors.busPlateNumber}</p>}
                        </div>
                        <div>
                            <label htmlFor="busModel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الموديل</label>
                            <input type="text" name="busModel" id="busModel" value={formData.busModel} onChange={handleChange} required className={inputStyle} />
                        </div>
                         <div>
                            <label htmlFor="busCapacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعة</label>
                            <input type="number" name="busCapacity" id="busCapacity" value={formData.busCapacity} onChange={handleChange} required className={inputStyle} />
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold border-b pb-2 pt-4 dark:border-gray-600">المدرسة المستهدفة</h3>
                     <div>
                        <label htmlFor="schoolId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر المدرسة التي تود تقديم الخدمة لها</label>
                        <select name="schoolId" id="schoolId" value={formData.schoolId} onChange={handleChange} disabled={loadingSchools} required className={inputStyle}>
                            {loadingSchools ? <option>جاري التحميل...</option> : schools.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        {errors.schoolId && <p className="text-red-500 text-xs mt-1">{errors.schoolId}</p>}
                    </div>
                </form>
                <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
                    <button type="button" onClick={handleSubmit} disabled={isSaving || loadingSchools} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                        {isSaving ? 'جاري الإرسال...' : 'إرسال الطلب'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BusOperatorApplicationModal;