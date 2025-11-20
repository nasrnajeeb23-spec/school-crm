import React, { useState } from 'react';
import { NewExpenseData, ExpenseCategory } from '../types';

interface AddExpenseModalProps {
  onClose: () => void;
  onSave: (expenseData: NewExpenseData) => Promise<void>;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState<NewExpenseData>({
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    category: ExpenseCategory.Other,
    recipient: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    // Parent component closes modal
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">تسجيل مصروف جديد</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الوصف</label>
            <input type="text" name="description" id="description" value={formData.description} onChange={handleChange} required className={inputStyle} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ</label>
              <input type="number" name="amount" id="amount" value={formData.amount === 0 ? '' : formData.amount} onChange={handleChange} required className={inputStyle} />
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ</label>
              <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} required className={inputStyle} />
            </div>
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الفئة</label>
            <select name="category" id="category" value={formData.category} onChange={handleChange} className={inputStyle}>
              {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المستلم (اختياري)</label>
            <input type="text" name="recipient" id="recipient" value={formData.recipient} onChange={handleChange} className={inputStyle} />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">
              {isSaving ? 'جاري الحفظ...' : 'حفظ المصروف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;