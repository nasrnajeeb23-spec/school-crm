import React, { useState, useEffect, useMemo } from 'react';
import * as api from '../api';
import { School, Module, ModuleId, PaymentProofSubmission, PaymentMethod } from '../types';
import { useToast } from '../contexts/ToastContext';
import { CheckIcon } from '../components/icons';
import PaymentProofModal from '../components/PaymentProofModal';
import { useAppContext } from '../contexts/AppContext';

interface ModulesPageProps {
    school: School;
}

const ModulesPage: React.FC<ModulesPageProps> = ({ school }) => {
    const [availableModules, setAvailableModules] = useState<Module[]>([]);
    const [activeModuleIds, setActiveModuleIds] = useState<Set<ModuleId>>(new Set());
    const [loading, setLoading] = useState(true);
    const [moduleToActivate, setModuleToActivate] = useState<Module | null>(null);
    const { addToast } = useToast();
    const { currentUser } = useAppContext();
    const canManageModules = String(currentUser?.role || '') === 'SuperAdmin';

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.getAvailableModules(),
            api.getSchoolModules(school.id)
        ]).then(([available, active]) => {
            setAvailableModules(available);
            setActiveModuleIds(new Set(active.map(m => m.moduleId)));
        }).catch(err => {
            console.error("Failed to fetch modules data:", err);
            addToast("فشل تحميل بيانات الوحدات.", 'error');
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, [school.id]);
    
    const handleActivateRequest = (module: Module) => {
        setModuleToActivate(module);
    };

    const handlePaymentSubmit = async (submission: Omit<PaymentProofSubmission, 'proofImage'>) => {
        try {
            await api.submitPaymentProof(submission);
            addToast('تم إرسال إثبات الدفع بنجاح! سيتم تفعيل الوحدة بعد المراجعة.', 'success');
            setModuleToActivate(null);
        } catch (error) {
            addToast('فشل إرسال إثبات الدفع.', 'error');
        }
    };

    const handleToggleModule = async (module: Module, enable: boolean) => {
        if (!canManageModules) {
            addToast('هذه العملية تتطلب موافقة المدير العام للمنصة.', 'error');
            return;
        }
        try {
            const next = new Set(activeModuleIds);
            if (enable) next.add(module.id); else next.delete(module.id);
            const updated = await api.updateSchoolModules(school.id, Array.from(next));
            setActiveModuleIds(new Set(updated.map(m => m.moduleId)));
            addToast(enable ? 'تم تفعيل الوحدة.' : 'تم تعطيل الوحدة.', 'success');
        } catch (e) {
            addToast('فشل تحديث حالة الوحدة.', 'error');
        }
    };

    const { baseCost, modulesCost, totalCost } = useMemo(() => {
        const pricing = { pricePerStudent: 1.5 }; // This should come from API in a real app
        const baseCost = school.students * pricing.pricePerStudent;
        const modulesCost = availableModules
            .filter(m => activeModuleIds.has(m.id))
            .reduce((total, m) => total + m.monthlyPrice, 0);
        const totalCost = baseCost + modulesCost;
        return { baseCost, modulesCost, totalCost };
    }, [school.students, availableModules, activeModuleIds]);
    
    if (loading) {
        return <p className="text-center p-8">جاري تحميل الوحدات...</p>;
    }

    const coreFallback: Module[] = [
        { id: ModuleId.TeacherPortal, name: 'بوابة المعلم', description: 'واجهة ويب للمعلم لإدارة الجدول والحضور والدرجات.', monthlyPrice: 0, isEnabled: true, isCore: true },
        { id: ModuleId.TeacherApp, name: 'تطبيق المعلم', description: 'تطبيق الجوال للمعلم بنفس وظائف البوابة مع إشعارات.', monthlyPrice: 0, isEnabled: true, isCore: true },
    ];
    const hasTeacherPortal = availableModules.some(m => m.id === ModuleId.TeacherPortal);
    const hasTeacherApp = availableModules.some(m => m.id === ModuleId.TeacherApp);
    const coreModules = [
        ...availableModules.filter(m => m.isEnabled && m.isCore),
        ...(!hasTeacherPortal ? [coreFallback[0]] : []),
        ...(!hasTeacherApp ? [coreFallback[1]] : []),
    ];

    return (
        <>
            <div className="mt-6 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">ملخص الاشتراك الحالي</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">التكلفة الأساسية ({school.students} طالب × ${1.5})</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">${baseCost.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">تكلفة الوحدات الإضافية</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">${modulesCost.toFixed(2)}</p>
                        </div>
                        <div className="border-r pr-4 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">الإجمالي الشهري</p>
                            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">${totalCost.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">الوحدات المتاحة</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availableModules.filter(m => m.isEnabled && !m.isCore).map(module => (
                            <div key={module.id} className="border dark:border-gray-700 rounded-lg p-6 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">{module.name}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 min-h-[40px]">{module.description}</p>
                                </div>
                                <div className="mt-4 text-center">
                                    {activeModuleIds.has(module.id) ? (
                                        <div className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 flex items-center justify-center">
                                            <CheckIcon className="w-5 h-5 ml-2" />
                                            مفعلة
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleActivateRequest(module)}
                                            className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                                        >
                                            طلب تفعيل (+${module.monthlyPrice}/شهرياً)
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">الوحدات الأساسية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {coreModules.map(module => (
                            <div key={module.id} className="border dark:border-gray-700 rounded-lg p-6 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">{module.name}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 min-h-[40px]">{module.description}</p>
                                </div>
                                <div className="mt-4 text-center">
                                    {activeModuleIds.has(module.id) ? (
                                        canManageModules ? (
                                            <button
                                                onClick={() => handleToggleModule(module, false)}
                                                className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                                            >
                                                تعطيل
                                            </button>
                                        ) : (
                                            <div className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 flex items-center justify-center">
                                                <CheckIcon className="w-5 h-5 ml-2" />
                                                مفعلة
                                            </div>
                                        )
                                    ) : (
                                        canManageModules ? (
                                            <button
                                                onClick={() => handleToggleModule(module, true)}
                                                className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                                            >
                                                تفعيل
                                            </button>
                                        ) : (
                                            <div className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                يتطلب موافقة المدير العام
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {moduleToActivate && (
                <PaymentProofModal
                    onClose={() => setModuleToActivate(null)}
                    onSubmit={handlePaymentSubmit}
                    amount={moduleToActivate.monthlyPrice}
                    serviceName={`تفعيل وحدة: ${moduleToActivate.name}`}
                    schoolName={school.name}
                />
            )}
        </>
    );
};

export default ModulesPage;
