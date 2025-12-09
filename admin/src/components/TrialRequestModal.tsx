import React, { useState } from 'react';
import { NewTrialRequestData } from '../types';
import { SchoolIcon, UsersIcon, EmailIcon, LockIcon } from './icons';

interface TrialRequestModalProps {
  onClose: () => void;
  onSave: (data: NewTrialRequestData) => Promise<boolean>;
  selectedPlanId?: string;
  selectedPlanName?: string;
}

const TrialRequestModal: React.FC<TrialRequestModalProps> = ({ onClose, onSave, selectedPlanId, selectedPlanName }) => {
  const [formData, setFormData] = useState<NewTrialRequestData>({
    schoolName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof NewTrialRequestData, string>>>({});
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof NewTrialRequestData, string>> = {};
    if (!formData.schoolName.trim()) newErrors.schoolName = "اسم المدرسة مطلوب.";
    if (!formData.adminName.trim()) newErrors.adminName = "اسم المدير مطلوب.";
    if (!formData.adminEmail || !/\S+@\S+\.\S+/.test(formData.adminEmail)) {
      newErrors.adminEmail = "الرجاء إدخال بريد إلكتروني صحيح.";
    }
    
    // Strong password validation regex
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;
    
    if (!strongPasswordRegex.test(formData.adminPassword)) {
      newErrors.adminPassword = "كلمة المرور يجب أن تكون 10 خانات على الأقل وتحتوي على حرف كبير، حرف صغير، رقم، ورمز خاص.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    const success = await onSave({ ...formData, planId: selectedPlanId });
    if (!success) {
      setIsSaving(false); // Only stop saving if there was an error, otherwise parent will unmount
    }
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4 modal-content-scale-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ابدأ تجربتك المجانية لمدة 30 يوماً</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">لا حاجة لبطاقة ائتمان. احصل على وصول فوري لجميع الميزات.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedPlanName && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الخطة المختارة</label>
              <div className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                {selectedPlanName}
              </div>
            </div>
          )}
          <div>
            <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المدرسة</label>
            <input type="text" name="schoolName" id="schoolName" value={formData.schoolName} onChange={handleChange} required className={inputStyle} />
             {errors.schoolName && <p className="text-red-500 text-xs mt-1">{errors.schoolName}</p>}
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسمك الكامل (كمدير)</label>
              <input type="text" name="adminName" id="adminName" value={formData.adminName} onChange={handleChange} required className={inputStyle} />
               {errors.adminName && <p className="text-red-500 text-xs mt-1">{errors.adminName}</p>}
            </div>
            <div>
              <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">بريدك الإلكتروني</label>
              <input type="email" name="adminEmail" id="adminEmail" value={formData.adminEmail} onChange={handleChange} required className={inputStyle} />
               {errors.adminEmail && <p className="text-red-500 text-xs mt-1">{errors.adminEmail}</p>}
            </div>
          </div>
          <div>
            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر كلمة مرور</label>
            <input type="password" name="adminPassword" id="adminPassword" value={formData.adminPassword} onChange={handleChange} required minLength={6} className={inputStyle} />
             {errors.adminPassword && <p className="text-red-500 text-xs mt-1">{errors.adminPassword}</p>}
          </div>
          
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">
              إلغاء
            </button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400">
              {isSaving ? 'جاري الإنشاء...' : 'إنشاء حسابي التجريبي'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrialRequestModal;
