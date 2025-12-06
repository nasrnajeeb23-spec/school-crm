import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { BankDetails, PaymentMethod, PaymentProofSubmission } from '../types';
import { UploadIcon } from './icons';

interface PaymentProofModalProps {
  onClose: () => void;
  onSubmit: (submission: Omit<PaymentProofSubmission, 'proofImage'>) => Promise<void>;
  amount: number;
  serviceName: string;
  schoolName: string;
}

const PaymentProofModal: React.FC<PaymentProofModalProps> = ({ onClose, onSubmit, amount, serviceName, schoolName }) => {
    const [activeTab, setActiveTab] = useState<PaymentMethod>(PaymentMethod.BankDeposit);
    const [bankAccounts, setBankAccounts] = useState<BankDetails[]>([]);
    const [selectedBank, setSelectedBank] = useState('');
    const [reference, setReference] = useState('');
    const [proofImage, setProofImage] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        api.getBankAccounts().then(data => {
            setBankAccounts(data);
            if(data.length > 0) setSelectedBank(data[0].bankName);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSubmit({
            method: activeTab,
            amount,
            reference,
            relatedService: serviceName,
            schoolName,
        });
        setIsSubmitting(false);
    };

    const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700";

    const selectedAccount = bankAccounts.find(b => b.bankName === selectedBank);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">إثبات عملية الدفع</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    المبلغ المطلوب: <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">${amount.toLocaleString()}</span>
                </p>

                <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                    <nav className="-mb-px flex gap-4" aria-label="Tabs">
                        <button onClick={() => setActiveTab(PaymentMethod.BankDeposit)} className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${activeTab === PaymentMethod.BankDeposit ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            {PaymentMethod.BankDeposit}
                        </button>
                        <button onClick={() => setActiveTab(PaymentMethod.WireTransfer)} className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${activeTab === PaymentMethod.WireTransfer ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            {PaymentMethod.WireTransfer}
                        </button>
                    </nav>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {activeTab === PaymentMethod.BankDeposit && (
                        <div>
                            <label htmlFor="bank" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر البنك</label>
                            <select id="bank" value={selectedBank} onChange={e => setSelectedBank(e.target.value)} className={inputStyle}>
                                {bankAccounts.map(b => <option key={b.bankName} value={b.bankName}>{b.bankName}</option>)}
                            </select>
                            {selectedAccount && (
                                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm space-y-1">
                                    <p><strong>اسم الحساب:</strong> {selectedAccount.accountName}</p>
                                    <p><strong>رقم الحساب:</strong> {selectedAccount.accountNumber}</p>
                                    <p><strong>الآيبان:</strong> {selectedAccount.iban}</p>
                                </div>
                            )}
                             <div className="mt-4">
                                <label htmlFor="reference_bank" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم العملية المرجعي</label>
                                <input type="text" id="reference_bank" value={reference} onChange={e => setReference(e.target.value)} required className={inputStyle} />
                            </div>
                        </div>
                    )}
                     {activeTab === PaymentMethod.WireTransfer && (
                        <div>
                             <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm space-y-1">
                                <p><strong>اسم المستلم:</strong> مؤسسة SchoolSaaS للتقنية</p>
                                <p><strong>المدينة:</strong> الرياض</p>
                            </div>
                             <div className="mt-4">
                                <label htmlFor="reference_wire" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الحوالة</label>
                                <input type="text" id="reference_wire" value={reference} onChange={e => setReference(e.target.value)} required className={inputStyle} />
                            </div>
                        </div>
                    )}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إرفاق صورة الإثبات</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                        <span>اختر ملفًا</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={e => setProofImage(e.target.files ? e.target.files[0] : null)} />
                                    </label>
                                    <p className="pr-1">أو اسحبه وأفلته هنا</p>
                                </div>
                                {proofImage ? <p className="text-xs text-green-500">{proofImage.name}</p> : <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>}
                            </div>
                        </div>
                    </div>
                </form>

                 <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
                    <button type="button" onClick={handleSubmit} disabled={isSubmitting || !reference} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                        {isSubmitting ? 'جاري الإرسال...' : 'إرسال إثبات الدفع'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentProofModal;
