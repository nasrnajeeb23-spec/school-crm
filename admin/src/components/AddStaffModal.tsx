import React, { useState } from 'react';
import { NewStaffData, SchoolRole } from '../types';

interface AddStaffModalProps {
  onClose: () => void;
  onSave: (data: NewStaffData) => Promise<void>;
  initialData?: Partial<NewStaffData>;
  title?: string;
}

const AddStaffModal: React.FC<AddStaffModalProps> = ({ onClose, onSave, initialData, title }) => {
  const [formData, setFormData] = useState<NewStaffData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    role: (initialData?.role as SchoolRole) || SchoolRole.Registrar,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4 modal-content-scale-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{title || 'إضافة موظف جديد'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الموظف</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={inputStyle} />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className={inputStyle} />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الدور</label>
            <select name="role" id="role" value={formData.role} onChange={handleChange} className={inputStyle}>
              {Object.values(SchoolRole)
                .filter(role => role !== SchoolRole.Admin) // Admin role is assigned on school creation
                .map(role => (
                  <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">سيتم إنشاء حساب للموظف بكلمة مرور مؤقتة "password"، ويجب عليه تغييرها عند أول تسجيل دخول.</p>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">
              {isSaving ? 'جاري الحفظ...' : 'حفظ الموظف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaffModal;