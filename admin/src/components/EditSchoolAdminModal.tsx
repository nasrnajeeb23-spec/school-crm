import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface EditSchoolAdminModalProps {
  admin: User;
  onClose: () => void;
  onSave: (id: number | string, data: any) => Promise<void>;
  schools: any[];
}

const EditSchoolAdminModal: React.FC<EditSchoolAdminModalProps> = ({ admin, onClose, onSave, schools }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    schoolId: '',
    role: 'SchoolAdmin',
    phone: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (admin) {
      setFormData({
        name: admin.name || '',
        email: admin.email || '',
        password: '', // Don't show current password
        schoolId: admin.schoolId ? String(admin.schoolId) : '',
        role: admin.role || 'SchoolAdmin',
        phone: admin.phone || ''
      });
    }
  }, [admin]);

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
    
    // Only send password if it's not empty
    const dataToSend: any = { ...formData };
    if (!dataToSend.password) {
        delete dataToSend.password;
    }

    await onSave(Number(admin.id), dataToSend);
    setIsSaving(false);
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 dark:text-white";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4 modal-content-scale-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">تعديل بيانات مدير المدرسة</h2>
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور الجديدة (اختياري)</label>
            <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} minLength={10} className={inputStyle} placeholder="اتركه فارغاً إذا لم ترد التغيير" />
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
              {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSchoolAdminModal;
