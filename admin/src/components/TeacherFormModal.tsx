import React, { useState } from 'react';
import { NewTeacherData } from '../types';

interface TeacherFormModalProps {
  onClose: () => void;
  onSave: (teacherData: NewTeacherData) => Promise<void>;
}

const TeacherFormModal: React.FC<TeacherFormModalProps> = ({ onClose, onSave }) => {
  const [teacherData, setTeacherData] = useState<NewTeacherData>({
    name: '',
    subject: '',
    phone: '',
    department: '',
    bankAccount: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof NewTeacherData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTeacherData(prev => ({ ...prev, [name]: value }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof NewTeacherData, string>> = {};
    if (!teacherData.name.trim()) newErrors.name = "اسم المعلم مطلوب.";
    if (!teacherData.subject.trim()) newErrors.subject = "المادة مطلوبة.";
    if (!teacherData.phone.trim()) {
        newErrors.phone = "رقم الهاتف مطلوب.";
    } else if (!/^\d+$/.test(teacherData.phone)) {
        newErrors.phone = "رقم الهاتف يجب أن يحتوي على أرقام فقط.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    await onSave(teacherData);
    setIsSaving(false);
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center modal-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4 modal-content-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">إضافة معلم جديد</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم الكامل</label>
            <input type="text" name="name" id="name" value={teacherData.name} onChange={handleChange} required className={inputStyle} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المادة الأساسية</label>
              <input type="text" name="subject" id="subject" value={teacherData.subject} onChange={handleChange} required className={inputStyle} />
              {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
              <input type="tel" name="phone" id="phone" value={teacherData.phone} onChange={handleChange} required className={inputStyle} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300">القسم</label>
              <input type="text" name="department" id="department" value={teacherData.department || ''} onChange={handleChange} className={inputStyle} />
            </div>
            <div>
              <label htmlFor="bankAccount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الحساب/البنك (اختياري)</label>
              <input type="text" name="bankAccount" id="bankAccount" value={teacherData.bankAccount || ''} onChange={handleChange} className={inputStyle} />
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400"
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ المعلم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherFormModal;
