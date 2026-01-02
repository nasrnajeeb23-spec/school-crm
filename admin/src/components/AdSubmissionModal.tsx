import React, { useState } from 'react';
import { NewAdRequestData } from '../types';

interface AdSubmissionModalProps {
  onClose: () => void;
  onSave: (data: NewAdRequestData) => Promise<void>;
}

const AdSubmissionModal: React.FC<AdSubmissionModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState<NewAdRequestData>({
    advertiserName: '',
    advertiserEmail: '',
    title: '',
    description: '',
    imageUrl: '',
    link: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof NewAdRequestData, string>>>({});


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof NewAdRequestData, string>> = {};
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

    if (!formData.advertiserName.trim()) newErrors.advertiserName = "الاسم مطلوب.";
    if (!formData.title.trim()) newErrors.title = "عنوان الإعلان مطلوب.";
    if (!formData.description.trim()) newErrors.description = "وصف الإعلان مطلوب.";
    
    if (!formData.advertiserEmail || !/\S+@\S+\.\S+/.test(formData.advertiserEmail)) {
        newErrors.advertiserEmail = "الرجاء إدخال بريد إلكتروني صحيح.";
    }
    if (!formData.imageUrl || !urlRegex.test(formData.imageUrl)) {
        newErrors.imageUrl = "الرجاء إدخال رابط صورة صحيح.";
    }
    if (!formData.link || !urlRegex.test(formData.link)) {
        newErrors.link = "الرجاء إدخال رابط صحيح.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSaving(true);
    await onSave(formData);
    // On success, parent component will close the modal.
    // We can also reset saving state in case of error.
    setIsSaving(false);
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700";
  const textareaStyle = `${inputStyle} resize-y min-h-[80px]`;


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] flex flex-col modal-content-scale-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex-shrink-0">تقديم طلب إعلاني</h2>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4" id="ad-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="advertiserName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسمك/اسم الشركة</label>
              <input type="text" name="advertiserName" id="advertiserName" value={formData.advertiserName} onChange={handleChange} required className={inputStyle} />
              {errors.advertiserName && <p className="text-red-500 text-xs mt-1">{errors.advertiserName}</p>}
            </div>
            <div>
              <label htmlFor="advertiserEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني للتواصل</label>
              <input type="email" name="advertiserEmail" id="advertiserEmail" value={formData.advertiserEmail} onChange={handleChange} required className={inputStyle} />
              {errors.advertiserEmail && <p className="text-red-500 text-xs mt-1">{errors.advertiserEmail}</p>}
            </div>
          </div>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">عنوان الإعلان</label>
            <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className={inputStyle} />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">وصف موجز للإعلان</label>
            <textarea name="description" id="description" value={formData.description} onChange={handleChange} required className={textareaStyle}></textarea>
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>
          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رابط الصورة (URL)</label>
            <input type="url" name="imageUrl" id="imageUrl" value={formData.imageUrl} onChange={handleChange} required className={inputStyle} placeholder="https://example.com/ad-image.png" />
            {errors.imageUrl && <p className="text-red-500 text-xs mt-1">{errors.imageUrl}</p>}
          </div>
          <div>
            <label htmlFor="link" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الرابط عند النقر على الإعلان</label>
            <input type="url" name="link" id="link" value={formData.link} onChange={handleChange} required className={inputStyle} placeholder="https://your-product.com" />
            {errors.link && <p className="text-red-500 text-xs mt-1">{errors.link}</p>}
          </div>
          <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">إلغاء</button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400">
                  {isSaving ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdSubmissionModal;
