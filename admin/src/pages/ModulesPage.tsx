import React, { useState, useEffect, useMemo } from 'react';
import * as api from '../api';
import { School, Module, ModuleId, PricingConfig, SubscriptionState } from '../types';
import { useToast } from '../contexts/ToastContext';
import { EditIcon, PlusIcon, TrashIcon } from '../components/icons';
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation: Ensure price is number
        const dataToSave = {
            ...formData,
            monthlyPrice: Number(formData.monthlyPrice),
            oneTimePrice: Number(formData.oneTimePrice || 0),
            annualPrice: Number(formData.annualPrice || 0)
        };

        onSave(dataToSave);
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
    const [loading, setLoading] = useState(true);
    const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
    const [subscriptionState, setSubscriptionState] = useState<SubscriptionState | null>(null);
    const [storageGB, setStorageGB] = useState<number>(0);
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [quote, setQuote] = useState<any | null>(null);
    const { addToast } = useToast();
    const { currentUser } = useAppContext();
    const canManageModules = ['SUPER_ADMIN','SUPER_ADMIN_FINANCIAL','SUPER_ADMIN_TECHNICAL','SUPER_ADMIN_SUPERVISOR'].includes(String(currentUser?.role || '').toUpperCase());

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.getAvailableModules(),
            api.getPricingConfig(),
            api.getSubscriptionState(school.id)
        ]).then(async ([available, pricing, state]) => {
            setAvailableModules(available);
            setPricingConfig(pricing);
            setSubscriptionState(state);
            const sgb = typeof state?.usage?.storageGB === 'number' ? state!.usage!.storageGB! : await api.getStorageUsage(school.id);
            setStorageGB(sgb);
            try { const q = await api.getUsageQuote(school.id, sgb); setQuote(q); } catch {}
        }).catch(err => {
            console.error("Failed to fetch modules data:", err);
            addToast("فشل تحميل بيانات الوحدات.", 'error');
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, [school.id]);
    
    

    const handleSaveModule = async (data: any) => {
        try {
            if (editingModule) {
                await api.updateModule(editingModule.id, data);
                addToast('تم تحديث الوحدة بنجاح', 'success');
            } else {
                await api.createModule(data);
                addToast('تم إنشاء الوحدة بنجاح', 'success');
            }
            setIsCreateModalOpen(false);
            setEditingModule(null);
            fetchData();
        } catch (e: any) {
            console.error(e);
            addToast(e.message || 'فشل حفظ الوحدة', 'error');
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

    const planPacksOverage = useMemo(() => {
        const items = Array.isArray(quote?.items) ? quote!.items : [];
        const planItem = items.find((i: any) => i.key === 'plan');
        const packsItem = items.find((i: any) => i.key === 'packs');
        const overageItems = items.filter((i: any) => String(i.key || '').startsWith('overage_'));
        const overageTotal = overageItems.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
        const currency = quote?.currency || 'USD';
        return {
            planAmount: Number(planItem?.amount || 0),
            packsAmount: Number(packsItem?.amount || 0),
            overageTotal,
            total: Number(quote?.total || 0),
            currency
        };
    }, [quote]);
    
    if (loading) {
        return <p className="text-center p-8">جاري تحميل الوحدات...</p>;
    }

    // For Super Admin, we show ALL modules fetched from API (which should return everything)
    // For School Admin, we might still want to categorize them
    // Filter out finance_fees/salaries/expenses etc. from UI if parent 'finance' exists to avoid duplicates
    // Also handle 'finance' vs 'finance_fees' duplication issue explicitly
    const uniqueModules = availableModules.filter(m => {
        // 1. Hide sub-finance modules if parent 'finance' exists
        if (m.id === 'finance_fees' || m.id === 'finance_salaries' || m.id === 'finance_expenses') {
             return !availableModules.some(p => p.id === 'finance');
        }
        
        // 2. Hide 'finance' module if it's acting as a duplicate of 'finance_fees' (same name/desc)
        // OR if we want to enforce the new split structure
        // Actually, based on migration 010, 'finance' was renamed to 'الرسوم الدراسية' (Fees)
        // So 'finance' IS 'finance_fees' logically now.
        // If we have BOTH 'finance' and 'finance_fees', we should probably hide one.
        // Let's hide 'finance_fees' if 'finance' exists, as 'finance' is the legacy ID used by schools.
        
        if (m.id === 'finance_fees' && availableModules.some(p => p.id === 'finance')) {
            return false;
        }

        // 3. De-duplicate by name if prices are weird (Emergency fix for user report)
        // If we have two modules named "الرسوم الدراسية", show the one with ID 'finance' and hide others
        // UNLESS the other one is totally different.
        if (m.name === 'الرسوم الدراسية' && m.id !== 'finance' && availableModules.some(p => p.id === 'finance')) {
            // This hides the $29 duplicate if the 'finance' one is present
            return false;
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
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">ملخص التسعير</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">الباقة الأساسية</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{planPacksOverage.currency === 'USD' ? '$' : ''}{planPacksOverage.planAmount.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">توسعات السعة</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{planPacksOverage.currency === 'USD' ? '$' : ''}{planPacksOverage.packsAmount.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">رسوم زيادة</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{planPacksOverage.currency === 'USD' ? '$' : ''}{planPacksOverage.overageTotal.toFixed(2)}</p>
                        </div>
                        <div className="border-r pr-4 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">الإجمالي الشهري</p>
                            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{planPacksOverage.currency === 'USD' ? '$' : ''}{planPacksOverage.total.toFixed(2)}</p>
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
                                        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{module.id}</span>
                                        {!module.isEnabled && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">معطلة بالنظام</span>}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 min-h-[40px]">{module.description}</p>
                                    <p className="font-semibold text-teal-600 mt-1">${module.monthlyPrice}/شهرياً</p>
                                </div>
                                <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                    متاح لجميع الخطط
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
                                        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{module.id}</span>
                                        {!module.isEnabled && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">معطلة بالنظام</span>}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 min-h-[40px]">{module.description}</p>
                                    <p className="font-semibold text-teal-600 mt-1">${module.monthlyPrice}/شهرياً</p>
                                </div>
                                <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                    متاح لجميع الخطط
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            

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
