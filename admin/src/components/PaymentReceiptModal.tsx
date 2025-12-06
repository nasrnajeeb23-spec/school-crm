import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

interface ReceiptProps {
  payment: {
    id: string;
    amount: number;
    date: string;
    method: string;
    studentName: string;
    schoolName: string;
    logoUrl?: string;
    notes?: string;
    reference?: string;
  };
  onClose: () => void;
}

const PaymentReceiptModal: React.FC<ReceiptProps> = ({ payment, onClose }) => {
  const componentRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl m-4 modal-content-scale-up flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header with Actions */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">سند قبض</h2>
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

        {/* Receipt Content (Printable Area) */}
        <div className="p-8 overflow-auto bg-white text-black" ref={componentRef}>
          
          {/* Receipt Header */}
          <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-6">
            <div className="text-right">
              <h1 className="text-2xl font-bold mb-2">{payment.schoolName}</h1>
              <p className="text-sm text-gray-600">سند قبض مالي</p>
              <p className="text-sm text-gray-600">Financial Receipt</p>
            </div>
            {payment.logoUrl && (
              <img 
                src={payment.logoUrl} 
                alt="Logo" 
                className="h-20 w-20 object-contain" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div className="text-left">
              <div className="mb-1">
                <span className="font-bold text-gray-700 block text-xs uppercase">Receipt No</span>
                <span className="text-lg font-mono">{payment.id.replace('pay_', '')}</span>
              </div>
              <div>
                <span className="font-bold text-gray-700 block text-xs uppercase">Date</span>
                <span>{new Date(payment.date).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>

          {/* Amount Box */}
          <div className="flex justify-center mb-8">
            <div className="border-2 border-gray-800 px-8 py-4 rounded-lg bg-gray-50 flex items-center gap-4">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Amount Received</span>
              <span className="text-3xl font-bold text-gray-900">${payment.amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-6 mb-8 text-right" dir="rtl">
            
            <div className="border-b border-gray-200 pb-2">
              <span className="block text-xs text-gray-500 mb-1">استلمنا من السيد/ة (Received From)</span>
              <span className="text-xl font-medium text-gray-800">{payment.studentName}</span>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="border-b border-gray-200 pb-2">
                <span className="block text-xs text-gray-500 mb-1">وذلك عن (For)</span>
                <span className="text-lg text-gray-800">{payment.notes || 'رسوم دراسية'}</span>
              </div>
              <div className="border-b border-gray-200 pb-2">
                <span className="block text-xs text-gray-500 mb-1">طريقة الدفع (Payment Method)</span>
                <span className="text-lg text-gray-800">{payment.method}</span>
              </div>
            </div>

             {payment.reference && (
                <div className="border-b border-gray-200 pb-2">
                  <span className="block text-xs text-gray-500 mb-1">رقم المرجع (Reference No)</span>
                  <span className="text-lg text-gray-800 font-mono">{payment.reference}</span>
                </div>
             )}

          </div>

          {/* Footer Signatures */}
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

export default PaymentReceiptModal;