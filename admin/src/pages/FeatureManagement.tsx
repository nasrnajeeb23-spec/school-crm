import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { logSuperAdminAction } from '../api/superAdminAuth';
import { Module, PricingConfig } from '../types';
import { useToast } from '../contexts/ToastContext';
import EditModuleModal from '../components/EditModuleModal';
import { EditIcon } from '../components/icons';

const FeatureManagement: React.FC = () => {
    const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.getPricingConfig(),
            api.getAvailableModules(),
        ]).then(([configData, modulesData]) => {
            setPricingConfig(configData);
            setModules(modulesData);
        }).catch(err => {
            console.error("Failed to fetch feature management data:", err);
            addToast("فشل تحميل بيانات الوحدات والأسعار.", 'error');
        }).finally(() => setLoading(false));
    };
    
    const handlePricePerStudentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (pricingConfig) {
            setPricingConfig({ ...pricingConfig, pricePerStudent: parseFloat(e.target.value) || 0 });
        }
    };

    const handleSavePricingConfig = async () => {
        if (!pricingConfig) return;
        setIsSaving(true);
        try {
            await api.updatePricingConfig(pricingConfig);
            await logSuperAdminAction('platform.pricing.update', { pricePerStudent: pricingConfig.pricePerStudent });
            addToast('تم حفظ إعدادات التسعير بنجاح.', 'success');
        } catch (error) {
            addToast('فشل حفظ إعدادات التسعير.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateModule = async (moduleData: Module) => {
        try {
            const updatedModule = await api.updateModule(moduleData);
            setModules(prev => prev.map(m => m.id === updatedModule.id ? updatedModule : m));
            setEditingModule(null);
            await logSuperAdminAction('platform.module.update', { moduleId: updatedModule.id, enabled: updatedModule.isEnabled, monthlyPrice: updatedModule.monthlyPrice });
            addToast('تم تحديث الوحدة بنجاح.', 'success');
        } catch (error) {
            addToast('فشل تحديث الوحدة.', 'error');
        }
    };

    if (loading) {
        return <div className="text-center p-8">جاري تحميل البيانات...</div>;
    }

    if (!pricingConfig) {
        return <div className="text-center p-8">لا يمكن تحميل إعدادات التسعير.</div>;
    }

    const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700";

    return (
        <>
            <div className="space-y-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">إعدادات التسعير الأساسية</h3>
                    <div className="flex items-end gap-4">
                        <div className="flex-grow">
                            <label htmlFor="pricePerStudent" className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعر لكل طالب (شهرياً)</label>
                            <input
                                type="number"
                                id="pricePerStudent"
                                value={pricingConfig.pricePerStudent}
                                onChange={handlePricePerStudentChange}
                                className={inputStyle}
                                step="0.1"
                            />
                        </div>
                        <button onClick={handleSavePricingConfig} disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400">
                            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">إدارة الوحدات الإضافية</h3>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">الوحدة</th>
                                    <th scope="col" className="px-6 py-3">الوصف</th>
                                    <th scope="col" className="px-6 py-3">السعر الشهري</th>
                                    <th scope="col" className="px-6 py-3">الحالة</th>
                                    <th scope="col" className="px-6 py-3">إجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modules.map(module => (
                                    <tr key={module.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{module.name}</td>
                                        <td className="px-6 py-4 max-w-sm">{module.description}</td>
                                        <td className="px-6 py-4 font-semibold">${module.monthlyPrice.toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${module.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {module.isEnabled ? 'مفعل' : 'معطل'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => setEditingModule(module)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline flex items-center">
                                                <EditIcon className="w-4 h-4 ml-1" />
                                                تعديل
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {editingModule && (
                <EditModuleModal
                    module={editingModule}
                    onClose={() => setEditingModule(null)}
                    onSave={handleUpdateModule}
                />
            )}
        </>
    );
};

export default FeatureManagement;
