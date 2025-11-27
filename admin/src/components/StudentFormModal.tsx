import React, { useState, useEffect } from 'react';
import type { NewStudentData, Class } from '../types';
import * as api from '../api';

interface StudentFormModalProps {
  onClose: () => void;
  onSave: (studentData: NewStudentData, selectedClassId?: string) => Promise<void>;
  schoolId?: number;
}

const StudentFormModal: React.FC<StudentFormModalProps> = ({ onClose, onSave, schoolId }) => {
  const [studentData, setStudentData] = useState<NewStudentData({
    name: '',
    grade: '',
    parentName: '',
    dateOfBirth: '',
    gender: 'ذكر',
    nationalId: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
    city: '',
    lat: undefined,
    lng: undefined,
    admissionDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    medicalNotes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof NewStudentData, string>>>({});
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  useEffect(() => {
    if (!schoolId) return;
    api.getSchoolClasses(schoolId)
      .then(setAvailableClasses)
      .catch(() => setAvailableClasses([]));
  }, [schoolId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStudentData(prev => ({ ...prev, [name]: (name === 'lat' || name === 'lng') ? (value ? Number(value) : undefined) : value }));
    setErrors(prev => ({
      ...prev,
      [name]: (name === 'name' && !value.trim()) ? 'اسم الطالب مطلوب.' :
              (name === 'grade' && !value.trim()) ? 'الصف الدراسي مطلوب.' :
              (name === 'parentName' && !value.trim()) ? 'اسم ولي الأمر مطلوب.' :
              (name === 'dateOfBirth' && !value) ? 'تاريخ الميلاد مطلوب.' :
              (name === 'parentPhone' && !value.trim()) ? 'هاتف ولي الأمر مطلوب.' :
              (name === 'parentEmail' && (!value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) ? 'بريد ولي الأمر غير صالح.' :
              (name === 'address' && !value.trim()) ? 'العنوان مطلوب.' :
              (name === 'city' && !value.trim()) ? 'المدينة مطلوبة.' :
              (name === 'admissionDate' && !value) ? 'تاريخ القبول مطلوب.' :
              (name === 'emergencyContactName' && !value.trim()) ? 'اسم جهة الطوارئ مطلوب.' :
              (name === 'emergencyContactPhone' && !value.trim()) ? 'هاتف جهة الطوارئ مطلوب.' : undefined
    }));
  };
  
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof NewStudentData, string>> = {};
    if (!studentData.name.trim()) newErrors.name = "اسم الطالب مطلوب.";
    if (!studentData.grade.trim()) newErrors.grade = "الصف الدراسي مطلوب.";
    if (!studentData.parentName.trim()) newErrors.parentName = "اسم ولي الأمر مطلوب.";
    if (!studentData.dateOfBirth) newErrors.dateOfBirth = "تاريخ الميلاد مطلوب.";
    if (!studentData.parentPhone.trim()) newErrors.parentPhone = "هاتف ولي الأمر مطلوب.";
    if (!studentData.parentEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentData.parentEmail)) newErrors.parentEmail = "بريد ولي الأمر غير صالح.";
    if (!studentData.address.trim()) newErrors.address = "العنوان مطلوب.";
    if (!studentData.city.trim()) newErrors.city = "المدينة مطلوبة.";
    if (!studentData.admissionDate) newErrors.admissionDate = "تاريخ القبول مطلوب.";
    if (!studentData.emergencyContactName.trim()) newErrors.emergencyContactName = "اسم جهة الطوارئ مطلوب.";
    if (!studentData.emergencyContactPhone.trim()) newErrors.emergencyContactPhone = "هاتف جهة الطوارئ مطلوب.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSaving(true);
    await onSave(studentData, selectedClassId || undefined);
    setIsSaving(false);
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center modal-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] flex flex-col modal-content-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">إضافة طالب جديد</h2>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم الكامل</label>
            <input type="text" name="name" id="name" value={studentData.name} onChange={handleChange} required className={inputStyle} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختيار الفصل</label>
              {availableClasses.length > 0 ? (
                <select name="grade" id="grade" value={selectedClassId} onChange={(e) => {
                  const id = e.target.value;
                  setSelectedClassId(id);
                  const cls = availableClasses.find(c => c.id === id);
                  const name = cls ? cls.name : '';
                  setStudentData(prev => ({ ...prev, grade: name }));
                  setErrors(prev => ({ ...prev, grade: !name ? 'الصف الدراسي مطلوب.' : undefined }));
                }} required className={inputStyle}>
                  <option value="" disabled>اختر الفصل...</option>
                  {availableClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <input type="text" name="grade" id="grade" value={studentData.grade} onChange={handleChange} required className={inputStyle} />
              )}
              {errors.grade && <p className="text-red-500 text-xs mt-1">{errors.grade}</p>}
            </div>
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الميلاد</label>
              <input type="date" name="dateOfBirth" id="dateOfBirth" value={studentData.dateOfBirth} onChange={handleChange} required className={inputStyle} />
              {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الجنس</label>
              <select name="gender" id="gender" value={studentData.gender} onChange={handleChange} className={inputStyle}>
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </div>
            <div>
              <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الرقم الوطني (اختياري)</label>
              <input type="text" name="nationalId" id="nationalId" value={studentData.nationalId} onChange={handleChange} className={inputStyle} />
              {errors.nationalId && <p className="text-red-500 text-xs mt-1">{errors.nationalId}</p>}
            </div>
          </div>
          <div>
            <label htmlFor="parentName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم ولي الأمر</label>
            <input type="text" name="parentName" id="parentName" value={studentData.parentName} onChange={handleChange} required className={inputStyle} />
            {errors.parentName && <p className="text-red-500 text-xs mt-1">{errors.parentName}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="parentPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">هاتف ولي الأمر</label>
              <input type="tel" name="parentPhone" id="parentPhone" value={studentData.parentPhone} onChange={handleChange} required className={inputStyle} />
              {errors.parentPhone && <p className="text-red-500 text-xs mt-1">{errors.parentPhone}</p>}
            </div>
            <div>
              <label htmlFor="parentEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">بريد ولي الأمر</label>
              <input type="email" name="parentEmail" id="parentEmail" value={studentData.parentEmail} onChange={handleChange} required className={inputStyle} />
              {errors.parentEmail && <p className="text-red-500 text-xs mt-1">{errors.parentEmail}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">العنوان</label>
              <input type="text" name="address" id="address" value={studentData.address} onChange={handleChange} required className={inputStyle} />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المدينة</label>
              <input type="text" name="city" id="city" value={studentData.city} onChange={handleChange} required className={inputStyle} />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lat" className="block text-sm font-medium text-gray-700 dark:text-gray-300">خط العرض (اختياري)</label>
              <input type="number" step="any" name="lat" id="lat" value={studentData.lat ?? ''} onChange={handleChange} className={inputStyle} />
            </div>
            <div>
              <label htmlFor="lng" className="block text-sm font-medium text-gray-700 dark:text-gray-300">خط الطول (اختياري)</label>
              <input type="number" step="any" name="lng" id="lng" value={studentData.lng ?? ''} onChange={handleChange} className={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="admissionDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ القبول</label>
              <input type="date" name="admissionDate" id="admissionDate" value={studentData.admissionDate} onChange={handleChange} required className={inputStyle} />
              {errors.admissionDate && <p className="text-red-500 text-xs mt-1">{errors.admissionDate}</p>}
            </div>
            <div>
              <label htmlFor="medicalNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات طبية (اختياري)</label>
              <input type="text" name="medicalNotes" id="medicalNotes" value={studentData.medicalNotes || ''} onChange={handleChange} className={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم جهة الطوارئ</label>
              <input type="text" name="emergencyContactName" id="emergencyContactName" value={studentData.emergencyContactName} onChange={handleChange} required className={inputStyle} />
              {errors.emergencyContactName && <p className="text-red-500 text-xs mt-1">{errors.emergencyContactName}</p>}
            </div>
            <div>
              <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">هاتف جهة الطوارئ</label>
              <input type="tel" name="emergencyContactPhone" id="emergencyContactPhone" value={studentData.emergencyContactPhone} onChange={handleChange} required className={inputStyle} />
              {errors.emergencyContactPhone && <p className="text-red-500 text-xs mt-1">{errors.emergencyContactPhone}</p>}
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
              {isSaving ? 'جاري الحفظ...' : 'حفظ الطالب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentFormModal;
