import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import * as api from '../api';
import { Expense, SchoolSettings } from '../types';
import { formatCurrency } from '../currency-config';

interface Props {
  expense: Expense;
  schoolSettings: SchoolSettings | null;
  onClose: () => void;
}

const ExpenseVoucherModal: React.FC<Props> = ({ expense, schoolSettings, onClose }) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: componentRef });
  const cur = String(schoolSettings?.defaultCurrency || 'SAR');
  const logoUrl = schoolSettings?.schoolLogoUrl ? api.getAssetUrl(String(schoolSettings.schoolLogoUrl)) : '';
  const schoolName = schoolSettings?.schoolName || 'المدرسة';
  const address = schoolSettings?.schoolAddress || '';
  const contact = [schoolSettings?.contactPhone, schoolSettings?.contactEmail].filter(Boolean).join(' • ');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl m-4 modal-content-scale-up flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">سند صرف</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              طباعة
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="p-8 overflow-auto bg-white text-black" ref={componentRef}>
          <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-6">
            <div className="text-right">
              <h1 className="text-2xl font-bold mb-1">{schoolName}</h1>
              {address && <p className="text-sm text-gray-600">{address}</p>}
              {contact && <p className="text-xs text-gray-500">{contact}</p>}
              <p className="text-sm text-gray-600 mt-2">سند صرف مالي</p>
            </div>
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-20 w-20 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="text-left">
              <div className="mb-1">
                <span className="font-bold text-gray-700 block text-xs uppercase">Voucher No</span>
                <span className="text-lg font-mono">{String(expense.id).replace('exp_', '')}</span>
              </div>
              <div>
                <span className="font-bold text-gray-700 block text-xs uppercase">Date</span>
                <span>{expense.date}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6" dir="rtl">
            <div className="border-b border-gray-200 pb-2">
              <span className="block text-xs text-gray-500 mb-1">البيان</span>
              <span className="text-lg font-medium text-gray-800">{expense.description}</span>
            </div>
            <div className="border-b border-gray-200 pb-2">
              <span className="block text-xs text-gray-500 mb-1">الفئة</span>
              <span className="text-lg text-gray-800">{expense.category}</span>
            </div>
          </div>

          <div className="flex justify-center mb-8">
            <div className="border-2 border-red-700 px-8 py-4 rounded-lg bg-red-50 flex items-center gap-4">
              <span className="text-sm font-bold text-red-700 uppercase tracking-wider">Amount Paid</span>
              <span className="text-3xl font-bold text-red-700">{formatCurrency(expense.amount, cur)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6" dir="rtl">
            {expense.recipient && (
              <div className="border-b border-gray-200 pb-2">
                <span className="block text-xs text-gray-500 mb-1">المستفيد</span>
                <span className="text-lg text-gray-800">{expense.recipient}</span>
              </div>
            )}
            <div className="border-b border-gray-200 pb-2" dir="ltr">
              <span className="block text-xs text-gray-500 mb-1">Reference</span>
              <span className="text-lg text-gray-800">{String(expense.id)}</span>
            </div>
          </div>

          <div className="flex justify-between mt-16 pt-8 border-t border-gray-200">
            <div className="text-center w-1/3">
              <div className="mb-12 border-b border-gray-400"></div>
              <p className="text-sm font-bold text-gray-600">توقيع المحاسب</p>
              <p className="text-xs text-gray-400">Accountant Signature</p>
            </div>
            <div className="text-center w-1/3">
              <div className="mb-12 border-b border-gray-400"></div>
              <p className="text-sm font-bold text-gray-600">الختم الرسمي</p>
              <p className="text-xs text-gray-400">Official Stamp</p>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-gray-400">
            تم إصدار هذا السند إلكترونياً عبر نظام SchoolSaaS CRM
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseVoucherModal;
