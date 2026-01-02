import React, { useState } from 'react';
import { Invoice, PaymentData } from '../types';
import { formatCurrency } from '../currency-config';

interface RecordPaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSave: (invoiceId: string, paymentData: PaymentData) => Promise<void>;
  currencyCode?: string;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ invoice, onClose, onSave, currencyCode = 'SAR' }) => {
  const [paymentData, setPaymentData] = useState<PaymentData>({
    amount: invoice.remainingAmount ?? invoice.totalAmount,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'تحويل بنكي',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(invoice.id, paymentData);
    setIsSaving(false);
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4 modal-content-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">تسجيل دفعة جديدة</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            فاتورة الطالب: <span className="font-semibold">{invoice.studentName}</span>
            {' | '}
            المبلغ المتبقي: <span className="font-bold text-red-600">{formatCurrency((invoice.remainingAmount ?? invoice.totalAmount), currencyCode)}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ</label>
                    <input type="number" name="amount" id="amount" value={paymentData.amount} onChange={handleChange} required className={inputStyle} />
                </div>
                <div>
                    <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الدفع</label>
                    <input type="date" name="paymentDate" id="paymentDate" value={paymentData.paymentDate} onChange={handleChange} required className={inputStyle} />
                </div>
            </div>
            <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300">طريقة الدفع</label>
                <select name="paymentMethod" id="paymentMethod" value={paymentData.paymentMethod} onChange={handleChange} className={inputStyle}>
                    <option>تحويل بنكي</option>
                    <option>نقداً</option>
                    <option>بطاقة ائتمان</option>
                    <option>أخرى</option>
                </select>
            </div>
             <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات (اختياري)</label>
                <textarea name="notes" id="notes" value={paymentData.notes} onChange={handleChange} rows={3} className={inputStyle}></textarea>
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
                {isSaving ? 'جاري الحفظ...' : 'حفظ الدفعة'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
