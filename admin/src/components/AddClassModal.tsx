import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { NewClassData, Teacher } from '../types';

interface AddClassModalProps {
  schoolId: number;
  onClose: () => void;
  onSave: (data: NewClassData) => Promise<void>;
}

const AddClassModal: React.FC<AddClassModalProps> = ({ schoolId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    gradeLevel: '',
    homeroomTeacherId: '',
    subjects: ''
  });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.getSchoolTeachers(schoolId).then(data => {
      setTeachers(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, homeroomTeacherId: data[0].id }));
      }
      setLoadingTeachers(false);
    });
  }, [schoolId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const subjectsArray = formData.subjects.split(',').map(s => s.trim()).filter(s => s);
    await onSave({
      name: formData.name,
      gradeLevel: formData.gradeLevel,
      homeroomTeacherId: formData.homeroomTeacherId,
      subjects: subjectsArray
    });
    // The parent component will close the modal on success, so we don't necessarily need to set isSaving to false.
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4 modal-content-scale-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">إضافة فصل جديد</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الفصل</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={inputStyle} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المستوى الدراسي</label>
              <input type="text" name="gradeLevel" id="gradeLevel" value={formData.gradeLevel} onChange={handleChange} required className={inputStyle} />
            </div>
            <div>
              <label htmlFor="homeroomTeacherId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المعلم المسؤول</label>
              <select name="homeroomTeacherId" id="homeroomTeacherId" value={formData.homeroomTeacherId} onChange={handleChange} disabled={loadingTeachers} className={inputStyle}>
                {loadingTeachers ? <option>جاري تحميل المعلمين...</option> : teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="subjects" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المواد الدراسية (افصل بينها بفاصلة)</label>
            <input type="text" name="subjects" id="subjects" value={formData.subjects} onChange={handleChange} required className={inputStyle} placeholder="الرياضيات, العلوم, اللغة العربية" />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">إلغاء</button>
            <button type="submit" disabled={isSaving || loadingTeachers} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400">
              {isSaving ? 'جاري الحفظ...' : 'حفظ الفصل'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddClassModal;