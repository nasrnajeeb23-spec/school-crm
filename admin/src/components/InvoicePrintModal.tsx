import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import * as api from '../api';
import { Invoice, SchoolSettings } from '../types';
import { formatCurrency } from '../currency-config';

interface Props {
  invoice: Invoice;
  schoolSettings: SchoolSettings | null;
  onClose: () => void;
}

const InvoicePrintModal: React.FC<Props> = ({ invoice, schoolSettings, onClose }) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: componentRef });
  const cur = String(schoolSettings?.defaultCurrency || 'SAR');
  const logoUrl = schoolSettings?.schoolLogoUrl ? api.getAssetUrl(String(schoolSettings.schoolLogoUrl)) : '';
  const schoolName = schoolSettings?.schoolName || 'المدرسة';
  const address = schoolSettings?.schoolAddress || '';
  const contact = [schoolSettings?.contactPhone, schoolSettings?.contactEmail].filter(Boolean).join(' • ');
  const remaining = (invoice.remainingAmount !== undefined && invoice.remainingAmount !== null)
    ? invoice.remainingAmount
    : (invoice.totalAmount - (invoice.paidAmount || 0));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl m-4 modal-content-scale-up flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">فاتورة رسوم دراسية</h2>
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
              <p className="text-sm text-gray-600 mt-2">فاتورة رسوم دراسية</p>
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
                <span className="font-bold text-gray-700 block text-xs uppercase">Invoice No</span>
                <span className="text-lg font-mono">{String(invoice.id).replace('inv_', '')}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold text-gray-700 block text-xs uppercase">Issue Date</span>
                  <span>{invoice.issueDate}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-700 block text-xs uppercase">Due Date</span>
                  <span>{invoice.dueDate}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6" dir="rtl">
            <div className="border-b border-gray-200 pb-2">
              <span className="block text-xs text-gray-500 mb-1">الطالب</span>
              <span className="text-lg font-medium text-gray-800">{invoice.studentName}</span>
            </div>
            <div className="border-b border-gray-200 pb-2" dir="ltr">
              <span className="block text-xs text-gray-500 mb-1">Student ID</span>
              <span className="text-lg text-gray-800">{invoice.studentId}</span>
            </div>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm text-right text-gray-700">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3">البند</th>
                  <th className="px-4 py-3">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-4 py-3">{item.description || '—'}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(Number(item.amount || 0), cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-2 border-gray-800 rounded-lg p-4 bg-gray-50">
              <div className="text-xs font-bold text-gray-600 uppercase">Total</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.totalAmount, cur)}</div>
            </div>
            <div className="border-2 border-green-700 rounded-lg p-4 bg-green-50">
              <div className="text-xs font-bold text-green-700 uppercase">Paid</div>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(Number(invoice.paidAmount || 0), cur)}</div>
            </div>
            <div className="border-2 border-red-700 rounded-lg p-4 bg-red-50">
              <div className="text-xs font-bold text-red-700 uppercase">Remaining</div>
              <div className="text-2xl font-bold text-red-700">{formatCurrency(remaining, cur)}</div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t text-xs text-gray-500 text-center">
            تم إصدار هذه الفاتورة إلكترونياً عبر نظام SchoolSaaS CRM
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrintModal;
