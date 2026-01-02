import React, { useEffect, useState } from 'react';
import * as api from '../api';
import PaymentReceiptModal from './PaymentReceiptModal';
import { formatCurrency } from '../currency-config';

interface Props {
  schoolId: number;
  studentId: string;
  studentName: string;
  onClose: () => void;
}

const StudentStatementModal: React.FC<Props> = ({ schoolId, studentId, studentName, onClose }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptToPrint, setReceiptToPrint] = useState<any | null>(null);
  const [currencyCode, setCurrencyCode] = useState<string>('SAR');
  const [schoolName, setSchoolName] = useState<string>('المدرسة');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchStatement = async () => {
      try {
        const data = await api.getStudentStatement(schoolId, studentId);
        setTransactions(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatement();
  }, [schoolId, studentId]);

  useEffect(() => {
    api.getSchoolSettings(schoolId).then(s => {
      setCurrencyCode(String(s.defaultCurrency || 'SAR').toUpperCase());
      setSchoolName(s.schoolName || 'المدرسة');
      setLogoUrl(s.schoolLogoUrl as string);
    }).catch(() => {});
  }, [schoolId]);

  const openReceipt = (t: any) => {
      setReceiptToPrint({
          id: t.id,
          amount: t.credit,
          date: t.date,
          method: t.method || 'Cash',
          studentName: studentName,
          schoolName,
          logoUrl,
          currencyCode,
          notes: t.notes,
          reference: t.reference
      });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl p-6 m-4 modal-content-scale-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">كشف حساب الطالب: {studentName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-grow overflow-auto">
          {loading ? (
            <div className="text-center py-10">جاري التحميل...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">لا توجد حركات مالية مسجلة.</div>
          ) : (
            <table className="w-full text-sm text-right text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold sticky top-0">
                <tr>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3">البيان</th>
                  <th className="px-4 py-3">مدين (عليك)</th>
                  <th className="px-4 py-3">دائن (لك)</th>
                  <th className="px-4 py-3">الرصيد</th>
                  <th className="px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 whitespace-nowrap" dir="ltr">{t.date}</td>
                    <td className="px-4 py-3">{t.description}</td>
                    <td className="px-4 py-3 font-medium text-red-600">{t.debit > 0 ? formatCurrency(t.debit, currencyCode) : '-'}</td>
                    <td className="px-4 py-3 font-medium text-green-600">{t.credit > 0 ? formatCurrency(t.credit, currencyCode) : '-'}</td>
                    <td className="px-4 py-3 font-bold text-gray-800 dark:text-white" dir="ltr">{formatCurrency(t.balance, currencyCode)}</td>
                    <td className="px-4 py-3">
                        {t.type === 'PAYMENT' && (
                            <button onClick={() => openReceipt(t)} className="text-teal-600 hover:text-teal-800 text-xs flex items-center gap-1" title="طباعة سند قبض">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                سند
                            </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-4 text-center text-xs text-gray-400">
          تم إصدار هذا الكشف إلكترونياً عبر نظام SchoolSaaS CRM
        </div>

        <div className="mt-6 pt-4 border-t dark:border-gray-700 flex justify-end">
          <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            طباعة الكشف
          </button>
        </div>
      </div>
      
      {receiptToPrint && <PaymentReceiptModal payment={receiptToPrint} onClose={() => setReceiptToPrint(null)} />}
    </div>
  );
};

export default StudentStatementModal;
