import React, { useState, useEffect } from 'react';
import { Student, NewInvoiceData, InvoiceItem } from '../types';
import * as api from '../api';
import { PlusIcon, TrashIcon } from './icons';
import { formatCurrency } from '../currency-config';

interface AddInvoiceModalProps {
  schoolId: number;
  onClose: () => void;
  onSave: (invoiceData: NewInvoiceData) => Promise<void>;
  currencyCode?: string;
}

const AddInvoiceModal: React.FC<AddInvoiceModalProps> = ({ schoolId, onClose, onSave, currencyCode = 'SAR' }) => {
  const [studentId, setStudentId] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', amount: 0 }]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.getSchoolStudents(schoolId).then(data => {
      setAllStudents(data);
      if (data.length > 0) {
        setStudentId(data[0].id);
      }
      setLoadingStudents(false);
    });
  }, [schoolId]);

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = field === 'amount' ? parseFloat(value.toString()) || 0 : value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave({
      studentId,
      dueDate,
      items,
    });
    // Parent will close modal
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] flex flex-col modal-content-scale-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex-shrink-0">إنشاء فاتورة جديدة</h2>
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
          <div className="flex-grow overflow-y-auto pr-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الطالب</label>
                <select name="studentId" id="studentId" value={studentId} onChange={e => setStudentId(e.target.value)} disabled={loadingStudents} required className={inputStyle}>
                  {loadingStudents ? <option>جاري التحميل...</option> : allStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الاستحقاق</label>
                <input type="date" name="dueDate" id="dueDate" value={dueDate} onChange={e => setDueDate(e.target.value)} required className={inputStyle} />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">بنود الفاتورة</h3>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="وصف البند"
                      value={item.description}
                      onChange={e => handleItemChange(index, 'description', e.target.value)}
                      required
                      className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    />
                    <input
                      type="number"
                      placeholder="المبلغ"
                      value={item.amount === 0 ? '' : item.amount}
                      onChange={e => handleItemChange(index, 'amount', e.target.value)}
                      required
                      className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    />
                    <button type="button" onClick={() => removeItem(index)} disabled={items.length <= 1} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addItem} className="mt-3 flex items-center text-sm font-medium text-teal-600 dark:text-teal-400 hover:underline">
                <PlusIcon className="w-4 h-4 ml-1" />
                إضافة بند
              </button>
            </div>
            
            <div className="text-left pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">المجموع الكلي: </span>
                <span className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalAmount, currencyCode)}</span>
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">إلغاء</button>
              <button type="submit" disabled={isSaving || loadingStudents} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400">
                  {isSaving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddInvoiceModal;
