import React, { useState } from 'react';
import { School } from '../types';

interface AddSchoolAdminModalProps {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  schools: any[]; // Using any[] because School type might be complex, but ideally School[]
}

const AddSchoolAdminModal: React.FC<AddSchoolAdminModalProps> = ({ onClose, onSave, schools }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    schoolId: schools.length > 0 ? schools[0].id : '',
    role: 'SchoolAdmin',
    phone: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schoolId) {
        alert('الرجاء اختيار مدرسة');
        return;
    }
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 dark:text-white";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4 modal-content-scale-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">إضافة مدير مدرسة جديد</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم الكامل</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={inputStyle} />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className={inputStyle} />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور</label>
            <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required minLength={10} className={inputStyle} placeholder="على الأقل 10 خانات وحرف كبير وصغير ورقم ورمز" />
            <p className="text-xs text-gray-500 mt-1">يجب أن تحتوي على حرف كبير، صغير، رقم، ورمز خاص.</p>
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
            <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className={inputStyle} />
          </div>
          <div>
            <label htmlFor="schoolId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المدرسة</label>
            <select name="schoolId" id="schoolId" value={formData.schoolId} onChange={handleChange} required className={inputStyle}>
              <option value="">اختر مدرسة...</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
              {isSaving ? 'جاري الحفظ...' : 'حفظ المدير'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSchoolAdminModal;
