import React, { useState } from 'react';
import { NewStudentData } from '../types';

interface StudentFormModalProps {
  onClose: () => void;
  onSave: (studentData: NewStudentData) => Promise<void>;
}

const StudentFormModal: React.FC<StudentFormModalProps> = ({ onClose, onSave }) => {
  const [studentData, setStudentData] = useState<NewStudentData>({
    name: '',
    grade: '',
    parentName: '',
    dateOfBirth: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof NewStudentData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStudentData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({
      ...prev,
      [name]: (name === 'name' && !value.trim()) ? 'اسم الطالب مطلوب.' :
              (name === 'grade' && !value.trim()) ? 'الصف الدراسي مطلوب.' :
              (name === 'parentName' && !value.trim()) ? 'اسم ولي الأمر مطلوب.' :
              (name === 'dateOfBirth' && !value) ? 'تاريخ الميلاد مطلوب.' : undefined
    }));
  };
  
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof NewStudentData, string>> = {};
    if (!studentData.name.trim()) newErrors.name = "اسم الطالب مطلوب.";
    if (!studentData.grade.trim()) newErrors.grade = "الصف الدراسي مطلوب.";
    if (!studentData.parentName.trim()) newErrors.parentName = "اسم ولي الأمر مطلوب.";
    if (!studentData.dateOfBirth) newErrors.dateOfBirth = "تاريخ الميلاد مطلوب.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSaving(true);
    await onSave(studentData);
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
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">إضافة طالب جديد</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم الكامل</label>
            <input type="text" name="name" id="name" value={studentData.name} onChange={handleChange} required className={inputStyle} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الصف الدراسي</label>
              <input type="text" name="grade" id="grade" value={studentData.grade} onChange={handleChange} required className={inputStyle} />
              {errors.grade && <p className="text-red-500 text-xs mt-1">{errors.grade}</p>}
            </div>
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الميلاد</label>
              <input type="date" name="dateOfBirth" id="dateOfBirth" value={studentData.dateOfBirth} onChange={handleChange} required className={inputStyle} />
              {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>}
            </div>
          </div>
          <div>
            <label htmlFor="parentName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم ولي الأمر</label>
            <input type="text" name="parentName" id="parentName" value={studentData.parentName} onChange={handleChange} required className={inputStyle} />
            {errors.parentName && <p className="text-red-500 text-xs mt-1">{errors.parentName}</p>}
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
              {isSaving ? 'جاري الحفظ...' : 'حفظ الطالب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentFormModal;