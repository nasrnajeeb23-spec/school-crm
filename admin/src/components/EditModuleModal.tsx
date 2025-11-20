import React, { useState } from 'react';
import { Module } from '../types';

interface EditModuleModalProps {
  module: Module;
  onClose: () => void;
  onSave: (moduleData: Module) => Promise<void>;
}

const EditModuleModal: React.FC<EditModuleModalProps> = ({ module, onClose, onSave }) => {
  const [formData, setFormData] = useState<Module>(module);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'monthlyPrice' ? parseFloat(value) : value }));
  };

  const handleToggle = () => {
      setFormData(prev => ({ ...prev, isEnabled: !prev.isEnabled }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    // Parent closes modal
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">تعديل الوحدة: {module.name}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الوصف</label>
              <textarea name="description" id="description" value={formData.description} onChange={handleChange} required rows={3} className={inputStyle}></textarea>
            </div>
             <div>
              <label htmlFor="monthlyPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعر الشهري ($)</label>
              <input type="number" name="monthlyPrice" id="monthlyPrice" value={formData.monthlyPrice} onChange={handleChange} required className={inputStyle} step="1" />
            </div>
            <div className="flex items-center">
                <button type="button" onClick={handleToggle} className={`${formData.isEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
                    <span className={`${formData.isEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                </button>
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formData.isEnabled ? 'الوحدة مفعلة' : 'الوحدة معطلة'}
                </span>
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

export default EditModuleModal;
