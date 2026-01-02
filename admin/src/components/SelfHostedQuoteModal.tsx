import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { Module, ModuleId, SelfHostedLicense, PaymentProofSubmission } from '../types';
import { CheckIcon, ServerIcon, DownloadIcon, KeyIcon } from './icons';
import { useToast } from '../contexts/ToastContext';
import PaymentProofModal from './PaymentProofModal';

interface SelfHostedQuoteModalProps {
  onClose: () => void;
}

const SelfHostedQuoteModal: React.FC<SelfHostedQuoteModalProps> = ({ onClose }) => {
    const [step, setStep] = useState(1);
    const [availableModules, setAvailableModules] = useState<Module[]>([]);
    const [selectedModuleIds, setSelectedModuleIds] = useState<Set<ModuleId>>(new Set());
    const [contactInfo, setContactInfo] = useState({ schoolName: '', contactName: '', contactEmail: '' });
    const [submissionComplete, setSubmissionComplete] = useState(false);
    const [downloadLink, setDownloadLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        api.getAvailableModules()
            .then(modules => {
                const enabledModules = modules.filter(m => m.isEnabled);
                setAvailableModules(enabledModules);
                const coreModuleIds = enabledModules.filter(m => m.isCore).map(m => m.id);
                setSelectedModuleIds(new Set(coreModuleIds));
            })
            .finally(() => setLoading(false));
    }, []);

    const handleModuleToggle = (moduleId: ModuleId) => {
        const module = availableModules.find(m => m.id === moduleId);
        if (module?.isCore) return;

        setSelectedModuleIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(moduleId)) {
                newSet.delete(moduleId);
            } else {
                newSet.add(moduleId);
            }
            return newSet;
        });
    };
    
    const totalPrice = availableModules
        .filter(m => selectedModuleIds.has(m.id))
        .reduce((sum, m) => sum + (m.oneTimePrice || 0), 0);

    const coreModules = availableModules.filter(m => m.isCore);
    const addOnModules = availableModules.filter(m => !m.isCore);

    const handleNext = () => {
        if (step === 2 && (!contactInfo.schoolName || !contactInfo.contactName || !contactInfo.contactEmail)) {
            addToast('الرجاء ملء جميع معلومات التواصل.', 'warning');
            return;
        }
        setStep(s => s + 1);
    };

    const handleProceedToPayment = () => {
         if (!contactInfo.schoolName || !contactInfo.contactName || !contactInfo.contactEmail) {
            addToast('الرجاء ملء جميع معلومات التواصل.', 'warning');
            return;
        }
        setShowPaymentModal(true);
    };

    const handlePaymentSubmit = async (submission: Omit<PaymentProofSubmission, 'proofImage'>) => {
        setIsProcessing(true);
        try {
            await api.submitPaymentProof(submission);
            const moduleIds = Array.from(selectedModuleIds);
            const downloadUrl = await api.generateSelfHostedPackage({ moduleIds });
            setShowPaymentModal(false);
            setSubmissionComplete(true);
            setStep(3);
            if (downloadUrl) {
                addToast('تم تجهيز الحزمة الخاصة بنجاح!', 'success');
                // Replace confirmation text with real link
                setDownloadLink(downloadUrl);
            } else {
                addToast('تم إرسال إثبات الدفع، لكن فشل تجهيز الحزمة تلقائياً. سيتم التواصل عبر البريد.', 'warning');
            }
        } catch (error) {
            addToast('حدث خطأ أثناء إرسال إثبات الدفع.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const steps = [
        { num: 1, title: 'اختر الوحدات', icon: ServerIcon },
        { num: 2, title: 'عرض السعر والدفع', icon: CheckIcon },
        { num: 3, title: 'تأكيد الطلب', icon: DownloadIcon },
    ];

    const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700";

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={onClose}>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl p-6 m-4 max-h-[90vh] flex flex-col modal-content-scale-up" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">شراء النسخة الخاصة (Self-Hosted)</h2>

                    <div className="flex items-center justify-between mb-8">
                        {steps.map((s, index) => (
                            <React.Fragment key={s.num}>
                            <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${step >= s.num ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                {step > s.num ? <CheckIcon className="w-6 h-6" /> : <s.icon className="w-6 h-6" />}
                                </div>
                                <p className={`mt-2 text-xs font-semibold ${step >= s.num ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}>{s.title}</p>
                            </div>
                            {index < steps.length - 1 && <div className={`flex-grow h-1 mx-2 transition-colors ${step > s.num ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>}
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="flex-grow overflow-y-auto pr-2">
                        {step === 1 && (
                            <div>
                                <h3 className="font-semibold mb-4 text-lg">النظام الأساسي (مضمن تلقائيًا)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    {coreModules.map(module => (
                                        <label key={module.id} className="p-4 border rounded-lg cursor-not-allowed bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-gray-800 dark:text-white">{module.name}</h4>
                                                <input type="checkbox" checked={true} disabled className="h-5 w-5 rounded text-indigo-400 focus:ring-0 cursor-not-allowed" />
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{module.description}</p>
                                            <p className="text-lg font-semibold mt-2 text-gray-900 dark:text-gray-200">${module.oneTimePrice?.toLocaleString() || 'N/A'}</p>
                                        </label>
                                    ))}
                                </div>

                                <h3 className="font-semibold mb-4 text-lg">الوحدات الإضافية (اختياري)</h3>
                                {loading ? <p>جاري التحميل...</p> : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {addOnModules.map(module => (
                                        <label key={module.id} className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedModuleIds.has(module.id) ? 'border-indigo-500 ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'}`}>
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-gray-800 dark:text-white">{module.name}</h4>
                                                <input type="checkbox" checked={selectedModuleIds.has(module.id)} onChange={() => handleModuleToggle(module.id)} className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"/>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{module.description}</p>
                                            <p className="text-lg font-semibold mt-2 text-gray-900 dark:text-gray-200">${module.oneTimePrice?.toLocaleString() || 'N/A'}</p>
                                        </label>
                                    ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 2 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-semibold mb-4">معلومات التواصل</h3>
                                    <div className="space-y-4">
                                        <input type="text" placeholder="اسم المدرسة" value={contactInfo.schoolName} onChange={e => setContactInfo(p=>({...p, schoolName: e.target.value}))} required className={inputStyle} />
                                        <input type="text" placeholder="اسم جهة الاتصال" value={contactInfo.contactName} onChange={e => setContactInfo(p=>({...p, contactName: e.target.value}))} required className={inputStyle} />
                                        <input type="email" placeholder="البريد الإلكتروني" value={contactInfo.contactEmail} onChange={e => setContactInfo(p=>({...p, contactEmail: e.target.value}))} required className={inputStyle} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-4">ملخص الطلب</h3>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
                                        {availableModules.filter(m => selectedModuleIds.has(m.id)).map(m => (
                                            <div key={m.id} className="flex justify-between text-sm">
                                                <span>{m.name} {m.isCore && <span className="text-xs text-gray-400">(أساسي)</span>}</span>
                                                <span className="font-mono">${m.oneTimePrice?.toLocaleString()}</span>
                                            </div>
                                        ))}
                                        <div className="border-t dark:border-gray-600 pt-2 mt-2 flex justify-between font-bold text-lg">
                                            <span>الإجمالي</span>
                                            <span className="font-mono text-indigo-600 dark:text-indigo-400">${totalPrice.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {step === 3 && submissionComplete && (
                            <div className="text-center p-4">
                                <h3 className="text-2xl font-bold text-green-500">طلبك جاهز!</h3>
                                {downloadLink ? (
                                    <div className="mt-4">
                                        <a href={downloadLink} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" target="_blank" rel="noreferrer">تنزيل الحزمة الآن</a>
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">الرابط صالح لمدة 24 ساعة.</p>
                                    </div>
                                ) : (
                                    <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">تم استلام إثبات الدفع. في حال عدم ظهور رابط التنزيل، سيتم التواصل عبر البريد خلال 24 ساعة.</p>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-between gap-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                        {step === 3 ? (
                            <button type="button" onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">إغلاق</button>
                        ) : (
                            <>
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
                            <div className="flex gap-4">
                                {step > 1 && <button type="button" onClick={() => setStep(s => s - 1)} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">السابق</button>}
                                {step < 2 ? (
                                    <button type="button" onClick={handleNext} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">التالي</button>
                                ) : (
                                    <button type="button" onClick={handleProceedToPayment} disabled={isProcessing} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                                        {isProcessing ? 'جاري المعالجة...' : 'الانتقال للدفع'}
                                    </button>
                                )}
                            </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {showPaymentModal && (
                <PaymentProofModal
                    onClose={() => setShowPaymentModal(false)}
                    onSubmit={handlePaymentSubmit}
                    amount={totalPrice}
                    serviceName={`شراء نسخة خاصة - ${contactInfo.schoolName}`}
                    schoolName={contactInfo.schoolName}
                />
            )}
        </>
    );
};

export default SelfHostedQuoteModal;
