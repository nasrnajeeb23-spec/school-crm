import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { NewSchoolData, Plan } from '../types';
import { SchoolIcon, UsersIcon, PlanIcon, CheckIcon } from './icons';

interface AddSchoolModalProps {
  onClose: () => void;
  onSave: (data: NewSchoolData) => Promise<void>;
}

const AddSchoolModal: React.FC<AddSchoolModalProps> = ({ onClose, onSave }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<NewSchoolData>({
    school: { name: '', contactEmail: '' },
    admin: { name: '', email: '', password: '' },
    subscription: { planId: '' }
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [errors, setErrors] = useState<any>({});


  useEffect(() => {
    api.getPlans().then(data => {
      setPlans(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, subscription: { planId: data[0].id } }));
      }
      setLoadingPlans(false);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, category: 'school' | 'admin') => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [category]: { ...prev[category], [name]: value } }));
  };

  const handlePlanChange = (planId: string) => {
    setFormData(prev => ({ ...prev, subscription: { planId } }));
  };

  const validateStep = (currentStep: number) => {
    const newErrors: any = {};
    let isValid = true;
    if (currentStep === 1) {
        if (!formData.school.name.trim()) {
            newErrors.schoolName = "اسم المدرسة مطلوب.";
            isValid = false;
        }
        if (!formData.school.contactEmail || !/\S+@\S+\.\S+/.test(formData.school.contactEmail)) {
            newErrors.contactEmail = "بريد إلكتروني صحيح مطلوب.";
            isValid = false;
        }
    }
    if (currentStep === 2) {
        if (!formData.admin.name.trim()) {
            newErrors.adminName = "اسم المدير مطلوب.";
            isValid = false;
        }
        if (!formData.admin.email || !/\S+@\S+\.\S+/.test(formData.admin.email)) {
            newErrors.adminEmail = "بريد إلكتروني صحيح مطلوب.";
            isValid = false;
        }
        if (formData.admin.password.length < 6) {
            newErrors.adminPassword = "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
            isValid = false;
        }
    }
    setErrors(newErrors);
    return isValid;
  };

  const nextStep = () => {
    if (validateStep(step)) {
        setStep(s => Math.min(s + 1, 3));
    }
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) {
        // This is a failsafe, but validation is done on step progression
        return;
    }
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false); // This might not be reached if onClose unmounts component
  };

  const steps = [
    { num: 1, title: 'بيانات المدرسة', icon: SchoolIcon },
    { num: 2, title: 'حساب المدير', icon: UsersIcon },
    { num: 3, title: 'خطة الاشتراك', icon: PlanIcon },
  ];
  
  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 sm:p-8 m-4 modal-content-scale-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">إضافة مدرسة جديدة</h2>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, index) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${step >= s.num ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                  {step > s.num ? <CheckIcon className="w-6 h-6" /> : <s.icon className="w-6 h-6" />}
                </div>
                <p className={`mt-2 text-xs font-semibold ${step >= s.num ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}>{s.title}</p>
              </div>
              {index < steps.length - 1 && <div className={`flex-grow h-1 mx-2 transition-colors ${step > s.num ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المدرسة</label>
                <input type="text" name="name" id="name" value={formData.school.name} onChange={(e) => handleChange(e, 'school')} required className={inputStyle} />
                {errors.schoolName && <p className="text-red-500 text-xs mt-1">{errors.schoolName}</p>}
              </div>
              <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني للتواصل</label>
                <input type="email" name="contactEmail" id="contactEmail" value={formData.school.contactEmail} onChange={(e) => handleChange(e, 'school')} required className={inputStyle} />
                 {errors.contactEmail && <p className="text-red-500 text-xs mt-1">{errors.contactEmail}</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم مدير المدرسة</label>
                <input type="text" name="name" id="adminName" value={formData.admin.name} onChange={(e) => handleChange(e, 'admin')} required className={inputStyle} />
                {errors.adminName && <p className="text-red-500 text-xs mt-1">{errors.adminName}</p>}
              </div>
              <div>
                <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني للمدير (للدخول)</label>
                <input type="email" name="email" id="adminEmail" value={formData.admin.email} onChange={(e) => handleChange(e, 'admin')} required className={inputStyle} />
                {errors.adminEmail && <p className="text-red-500 text-xs mt-1">{errors.adminEmail}</p>}
              </div>
              <div>
                <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور</label>
                <input type="password" name="password" id="adminPassword" value={formData.admin.password} onChange={(e) => handleChange(e, 'admin')} required className={inputStyle} />
                {errors.adminPassword && <p className="text-red-500 text-xs mt-1">{errors.adminPassword}</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">اختر خطة الاشتراك</h3>
              {loadingPlans ? <p>جاري تحميل الخطط...</p> : (
                <div className="space-y-3">
                  {plans.map(plan => (
                    <div 
                      key={plan.id}
                      onClick={() => handlePlanChange(plan.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${formData.subscription.planId === plan.id ? 'border-indigo-500 ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'}`}
                    >
                      <h4 className="font-bold text-gray-800 dark:text-white">{plan.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{plan.features[0]}</p>
                      <p className="text-lg font-semibold mt-1 text-gray-900 dark:text-gray-200">
                        {plan.price > 0 ? `$${plan.price} / ${plan.pricePeriod}` : plan.pricePeriod}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-between gap-4 pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">إلغاء</button>
            <div className="flex gap-4">
              {step > 1 && <button type="button" onClick={prevStep} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">السابق</button>}
              {step < 3 ? (
                <button type="button" onClick={nextStep} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">التالي</button>
              ) : (
                <button type="submit" disabled={isSaving || loadingPlans} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                  {isSaving ? 'جاري الحفظ...' : 'إنشاء المدرسة'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSchoolModal;