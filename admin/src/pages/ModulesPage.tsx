import React, { useState, useEffect, useMemo } from 'react';
import * as api from '../api';
import { School, Module, ModuleId, PaymentProofSubmission, PaymentMethod, PricingConfig } from '../types';
import { useToast } from '../contexts/ToastContext';
import { CheckIcon, EditIcon, PlusIcon, TrashIcon } from '../components/icons';
import PaymentProofModal from '../components/PaymentProofModal';
import { useAppContext } from '../contexts/AppContext';

interface ModulesPageProps {
    school: School;
}

interface EditModuleModalProps {
    module?: Module;
    onClose: () => void;
    onSave: (data: any) => void;
}

const EditModuleModal: React.FC<EditModuleModalProps> = ({ module, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Module>>(module || {
        id: '' as ModuleId,
        name: '',
        description: '',
        monthlyPrice: 0,
        isCore: false,
        isEnabled: true
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                     type === 'number' ? Number(value) : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    {module ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!module && (
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المعرف (ID)</label>
                            <input 
                                type="text" 
                                name="id" 
                                value={formData.id} 
                                onChange={handleChange} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required 
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الوحدة</label>
                        <input 
                            type="text" 
                            name="name" 
                            value={formData.name} 
                            onChange={handleChange} 
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الوصف</label>
                        <textarea 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعر الشهري ($)</label>
                        <input 
                            type="number" 
                            name="monthlyPrice" 
                            value={formData.monthlyPrice} 
                            onChange={handleChange} 
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center">
                            <input 
                                type="checkbox" 
                                name="isCore" 
                                checked={formData.isCore} 
                                onChange={handleChange} 
                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="mr-2 text-gray-700 dark:text-gray-300">وحدة أساسية</span>
                        </label>
                        <label className="flex items-center">
                            <input 
                                type="checkbox" 
                                name="isEnabled" 
                                checked={formData.isEnabled} 
                                onChange={handleChange} 
                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="mr-2 text-gray-700 dark:text-gray-300">مفعلة للنظام</span>
                        </label>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700">إلغاء</button>
                        <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ModulesPage: React.FC<ModulesPageProps> = ({ school }) => {
    const [availableModules, setAvailableModules] = useState<Module[]>([]);
    const [activeModuleIds, setActiveModuleIds] = useState<Set<ModuleId>>(new Set());
    const [loading, setLoading] = useState(true);
    const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
    const [moduleToActivate, setModuleToActivate] = useState<Module | null>(null);
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { addToast } = useToast();
    const { currentUser } = useAppContext();
    const canManageModules = ['SUPER_ADMIN','SUPER_ADMIN_FINANCIAL','SUPER_ADMIN_TECHNICAL','SUPER_ADMIN_SUPERVISOR'].includes(String(currentUser?.role || '').toUpperCase());

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.getAvailableModules(),
            api.getSchoolModules(school.id),
            api.getPricingConfig()
        ]).then(([available, active, pricing]) => {
            setAvailableModules(available);
            setActiveModuleIds(new Set(active.map(m => m.moduleId)));
            setPricingConfig(pricing);
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
        if (!canManageModules && !module.isCore) {
            addToast('هذه العملية تتطلب موافقة المدير العام للمنصة.', 'error');
            return;
        }

        // Dependency Logic:
        // 1. If enabling a dependent module (e.g., teacher_app), ensure parent (teacher_portal) is enabled
        if (enable) {
            if (module.id === ModuleId.TeacherApp) {
                const hasPortal = activeModuleIds.has(ModuleId.TeacherPortal);
                if (!hasPortal) {
                    if (confirm('تطبيق المعلم يتطلب تفعيل "بوابة المعلم" أولاً. هل تريد تفعيلها تلقائياً؟')) {
                        // Activate both
                        try {
                            const next = new Set(activeModuleIds);
                            next.add(ModuleId.TeacherApp);
                            next.add(ModuleId.TeacherPortal);
                            const updated = await api.updateSchoolModules(school.id, Array.from(next));
                            setActiveModuleIds(new Set(updated.map(m => m.moduleId)));
                            addToast('تم تفعيل تطبيق وبوابة المعلم بنجاح.', 'success');
                            return;
                        } catch (e) { addToast('فشل التفعيل.', 'error'); return; }
                    } else {
                        return; // Cancelled
                    }
                }
            }
        }
        // 2. If disabling a parent module, warn about dependents
        else {
            if (module.id === ModuleId.TeacherPortal) {
                const hasApp = activeModuleIds.has(ModuleId.TeacherApp);
                if (hasApp) {
                    if (!confirm('تعطيل "بوابة المعلم" سيؤدي لتعطيل "تطبيق المعلم" أيضاً. هل أنت متأكد؟')) return;
                    // Disable both
                     try {
                        const next = new Set(activeModuleIds);
                        next.delete(ModuleId.TeacherPortal);
                        next.delete(ModuleId.TeacherApp);
                        const updated = await api.updateSchoolModules(school.id, Array.from(next));
                        setActiveModuleIds(new Set(updated.map(m => m.moduleId)));
                        addToast('تم تعطيل البوابة والتطبيق.', 'success');
                        return;
                    } catch (e) { addToast('فشل التعطيل.', 'error'); return; }
                }
            }
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

    const handleSaveModule = async (data: any) => {
        try {
            // Fix NaN warning by ensuring monthlyPrice is a valid number
            if (data.monthlyPrice) data.monthlyPrice = Number(data.monthlyPrice) || 0;
            
            if (editingModule) {
                // Pass ID explicitly as first argument
                await api.updateModule(editingModule.id, data);
                addToast('تم تعديل الوحدة بنجاح', 'success');
            } else {
                await api.createModule(data);
                addToast('تم إضافة الوحدة بنجاح', 'success');
            }
            setEditingModule(null);
            setIsCreateModalOpen(false);
            fetchData();
        } catch (e) {
            console.error(e);
            addToast('فشل حفظ الوحدة', 'error');
        }
    };

    const handleDeleteModule = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه الوحدة نهائياً من النظام؟')) return;
        try {
            await api.deleteModule(id);
            addToast('تم حذف الوحدة بنجاح', 'success');
            fetchData();
        } catch (e) {
            addToast('فشل حذف الوحدة', 'error');
        }
    };

    const { baseCost, modulesCost, totalCost } = useMemo(() => {
        const pricePerStudent = pricingConfig?.pricePerStudent ?? 1.5;
        const baseCost = school.students * pricePerStudent;
        const modulesCost = availableModules
            .filter(m => activeModuleIds.has(m.id))
            .reduce((total, m) => total + m.monthlyPrice, 0);
        const totalCost = baseCost + modulesCost;
        return { baseCost, modulesCost, totalCost };
    }, [school.students, availableModules, activeModuleIds, pricingConfig]);
    
    if (loading) {
        return <p className="text-center p-8">جاري تحميل الوحدات...</p>;
    }

    // For Super Admin, we show ALL modules fetched from API (which should return everything)
    // For School Admin, we might still want to categorize them
    // Filter out finance_fees/salaries/expenses etc. from UI if parent 'finance' exists to avoid duplicates
    const uniqueModules = availableModules.filter(m => {
        if (m.id === 'finance_fees' || m.id === 'finance_salaries' || m.id === 'finance_expenses') {
             // If parent finance exists, hide these children
             return !availableModules.some(p => p.id === 'finance');
        }
        return true;
    });

    const coreModules = uniqueModules.filter(m => m.isCore);
    const addonModules = uniqueModules.filter(m => !m.isCore);

    return (
        <>
            <div className="mt-6 space-y-6">
                {/* Admin Controls */}
                {canManageModules && (
                    <div className="flex justify-end">
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            <PlusIcon className="w-5 h-5 ml-2" />
                            إضافة وحدة جديدة للنظام
                        </button>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">ملخص الاشتراك الحالي</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">التكلفة الأساسية ({school.students} طالب × ${pricingConfig?.pricePerStudent ?? 1.5})</p>
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

                {/* Core Modules */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">الوحدات الأساسية (Core)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {coreModules.map(module => (
                            <div key={module.id} className="border dark:border-gray-700 rounded-lg p-6 flex flex-col justify-between relative">
                                {canManageModules && (
                                    <div className="absolute top-2 left-2 flex gap-2">
                                        <button onClick={() => setEditingModule(module)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteModule(module.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                        {module.name}
                                        {!module.isEnabled && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">معطلة بالنظام</span>}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 min-h-[40px]">{module.description}</p>
                                </div>
                                <div className="mt-4 text-center">
                                    {activeModuleIds.has(module.id) ? (
                                        <button
                                            onClick={() => handleToggleModule(module, false)}
                                            className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                                        >
                                            تعطيل للمدرسة
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleToggleModule(module, true)}
                                            className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                                        >
                                            تفعيل للمدرسة
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add-on Modules */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">الوحدات الإضافية (Add-ons)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {addonModules.map(module => (
                            <div key={module.id} className="border dark:border-gray-700 rounded-lg p-6 flex flex-col justify-between relative">
                                {canManageModules && (
                                    <div className="absolute top-2 left-2 flex gap-2">
                                        <button onClick={() => setEditingModule(module)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteModule(module.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                        {module.name}
                                        {!module.isEnabled && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">معطلة بالنظام</span>}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 min-h-[40px]">{module.description}</p>
                                    <p className="font-semibold text-teal-600 mt-1">${module.monthlyPrice}/شهرياً</p>
                                </div>
                                <div className="mt-4 text-center">
                                    {activeModuleIds.has(module.id) ? (
                                        canManageModules ? (
                                            <button
                                                onClick={() => {
                                                    if (confirm('هل أنت متأكد من تعطيل هذه الوحدة؟ سيتم إيقاف الخدمة فوراً.')) {
                                                        handleToggleModule(module, false);
                                                    }
                                                }}
                                                className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 transition-colors"
                                            >
                                                تعطيل الوحدة للمدرسة
                                            </button>
                                        ) : (
                                            <div className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 flex items-center justify-center">
                                                <CheckIcon className="w-5 h-5 ml-2" />
                                                مفعلة
                                            </div>
                                        )
                                    ) : (
                                        <button
                                            onClick={() => handleActivateRequest(module)}
                                            className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                                        >
                                            طلب تفعيل
                                        </button>
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

            {(isCreateModalOpen || editingModule) && (
                <EditModuleModal
                    module={editingModule || undefined}
                    onClose={() => { setIsCreateModalOpen(false); setEditingModule(null); }}
                    onSave={handleSaveModule}
                />
            )}
        </>
    );
};

export default ModulesPage;