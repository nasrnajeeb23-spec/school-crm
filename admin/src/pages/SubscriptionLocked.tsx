import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { Module, ModuleId, PricingConfig, PaymentProofSubmission } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAppContext } from '../contexts/AppContext';
import PaymentProofModal from '../components/PaymentProofModal';
import { CheckIcon } from '../components/icons';

const SubscriptionLocked: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { currentUser } = useAppContext();
    
    const [modules, setModules] = useState<Module[]>([]);
    const [activeModuleIds, setActiveModuleIds] = useState<Set<ModuleId>>(new Set());
    const [pricing, setPricing] = useState<PricingConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [schoolStudents, setSchoolStudents] = useState(0);

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const [availModules, schoolModules, priceConf, schoolInfo] = await Promise.all([
                    api.getAvailableModules(),
                    api.getSchoolModules(String(currentUser?.schoolId)),
                    api.getPricingConfig(),
                    api.getSchool(String(currentUser?.schoolId))
                ]);
                
                setModules(availModules);
                setActiveModuleIds(new Set(schoolModules.map(m => m.moduleId)));
                setPricing(priceConf);
                setSchoolStudents(schoolInfo.students || 0);
            } catch (e) {
                console.error(e);
                addToast('فشل تحميل بيانات الاشتراك', 'error');
            } finally {
                setLoading(false);
            }
        };
        if (currentUser?.schoolId) fetch();
    }, [currentUser]);

    const toggleModule = (moduleId: ModuleId) => {
        const next = new Set(activeModuleIds);
        if (next.has(moduleId)) next.delete(moduleId);
        else next.add(moduleId);
        setActiveModuleIds(next);
    };

    const { baseCost, modulesCost, totalCost } = useMemo(() => {
        const pricePerStudent = pricing?.pricePerStudent ?? 1.5;
        const baseCost = schoolStudents * pricePerStudent;
        const modulesCost = modules
            .filter(m => !m.isCore && activeModuleIds.has(m.id))
            .reduce((sum, m) => sum + m.monthlyPrice, 0);
        return { baseCost, modulesCost, totalCost: baseCost + modulesCost };
    }, [schoolStudents, modules, activeModuleIds, pricing]);

    const handleProceed = async () => {
        // Update selected modules first
        try {
            // Ensure core modules are included
            const coreIds = modules.filter(m => m.isCore).map(m => m.id);
            const selection = Array.from(activeModuleIds).filter(id => !modules.find(m => m.id === id)?.isCore);
            const finalSelection = [...new Set([...coreIds, ...selection])];
            
            await api.updateSchoolModules(String(currentUser?.schoolId), finalSelection);
            setShowPaymentModal(true);
        } catch (e) {
            addToast('فشل تحديث الخطة المختارة', 'error');
        }
    };

    const handlePaymentSubmit = async (data: Omit<PaymentProofSubmission, 'proofImage'>) => {
        try {
            await api.submitPaymentProof(data);
            addToast('تم إرسال إثبات الدفع بنجاح. سيتم تفعيل حسابك بعد المراجعة.', 'success');
            setShowPaymentModal(false);
            // Optionally redirect to a "Pending Activation" page or stay here with a status message
        } catch (e) {
            addToast('فشل إرسال الدفع', 'error');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-red-600 p-6 text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">انتهت الفترة التجريبية</h1>
                    <p className="text-red-100">يرجى اختيار خطتك وتجديد الاشتراك للاستمرار في استخدام المنصة.</p>
                </div>

                <div className="p-8">
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 border-b pb-2">1. الخطة الأساسية (إلزامية)</h2>
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">حزمة إدارة المدرسة المتكاملة</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                                    تشمل: {modules.filter(m => m.isCore).map(m => m.name).join('، ')}
                                </p>
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">${baseCost.toFixed(2)}/شهرياً</p>
                                <p className="text-xs text-gray-500">({schoolStudents} طالب × ${pricing?.pricePerStudent})</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 border-b pb-2">2. الوحدات الإضافية (اختيارية)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {modules.filter(m => !m.isCore).map(module => (
                                <div 
                                    key={module.id}
                                    onClick={() => toggleModule(module.id)}
                                    className={`cursor-pointer border-2 rounded-lg p-4 transition-all flex justify-between items-center ${
                                        activeModuleIds.has(module.id) 
                                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-teal-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                            activeModuleIds.has(module.id) ? 'bg-teal-500 border-teal-500' : 'border-gray-400'
                                        }`}>
                                            {activeModuleIds.has(module.id) && <CheckIcon className="w-3 h-3 text-white" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">{module.name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{module.description.substring(0, 40)}...</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-teal-600 dark:text-teal-400">${module.monthlyPrice}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-900 p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-center md:text-right">
                            <p className="text-gray-600 dark:text-gray-400">الإجمالي الشهري المطلوب</p>
                            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">${totalCost.toFixed(2)}</p>
                        </div>
                        <button 
                            onClick={handleProceed}
                            className="w-full md:w-auto px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white text-lg font-bold rounded-xl shadow-lg transition-transform transform hover:scale-105"
                        >
                            تأكيد الخطة والدفع
                        </button>
                    </div>
                </div>
            </div>

            {showPaymentModal && (
                <PaymentProofModal
                    onClose={() => setShowPaymentModal(false)}
                    onSubmit={handlePaymentSubmit}
                    amount={totalCost}
                    serviceName="تجديد اشتراك المدرسة"
                    schoolName={currentUser?.name || ''} // Assuming admin name roughly matches or fetches school name
                />
            )}
        </div>
    );
};

export default SubscriptionLocked;