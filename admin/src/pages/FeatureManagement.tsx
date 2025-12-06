import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { logSuperAdminAction } from '../api/superAdminAuth';
import { Module, PricingConfig, ModuleId } from '../types';
import { useToast } from '../contexts/ToastContext';
import EditModuleModal from '../components/EditModuleModal';
import { EditIcon } from '../components/icons';

const FeatureManagement: React.FC = () => {
    const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'pricing' | 'modules' | 'requests'>('modules');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newModule, setNewModule] = useState<{ id: ModuleId | ''; name: string; description: string; monthlyPrice: number; currency: string; isEnabled: boolean; isCore: boolean; oneTimePrice?: number }>({ id: '', name: '', description: '', monthlyPrice: 0, currency: 'USD', isEnabled: true, isCore: false, oneTimePrice: undefined });
    const { addToast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.getPricingConfig(),
            api.getAvailableModules(),
            api.getPendingRequests(),
        ]).then(([configData, modulesData, requestsData]) => {
            setPricingConfig(configData);
            setModules(modulesData);
            setRequests(requestsData);
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

    const handleApproveRequest = async (id: number) => {
        if (!window.confirm('هل أنت متأكد من الموافقة على هذا الطلب؟')) return;
        try {
            await api.approveRequest(id);
            setRequests(prev => prev.filter(r => r.id !== id));
            addToast('تمت الموافقة على الطلب.', 'success');
        } catch {
            addToast('فشل الموافقة على الطلب.', 'error');
        }
    };
    
    const handleRejectRequest = async (id: number) => {
        if (!window.confirm('هل أنت متأكد من رفض هذا الطلب؟')) return;
        try {
            await api.rejectRequest(id);
            setRequests(prev => prev.filter(r => r.id !== id));
            addToast('تم رفض الطلب.', 'success');
        } catch {
            addToast('فشل رفض الطلب.', 'error');
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

    const handleCreateModule = async () => {
        if (!newModule.id || !newModule.name) { addToast('يرجى إدخال المعرف والاسم.', 'error'); return; }
        setIsSaving(true);
        try {
            await api.createModule({ id: newModule.id as ModuleId, name: newModule.name, description: newModule.description, monthlyPrice: newModule.monthlyPrice, currency: newModule.currency, isEnabled: newModule.isEnabled, isCore: newModule.isCore, oneTimePrice: newModule.oneTimePrice } as unknown as Module);
            await logSuperAdminAction('platform.module.create', { moduleId: newModule.id, enabled: newModule.isEnabled, monthlyPrice: newModule.monthlyPrice });
            setShowCreate(false);
            setNewModule({ id: '', name: '', description: '', monthlyPrice: 0, currency: 'USD', isEnabled: true, isCore: false, oneTimePrice: undefined });
            fetchData();
            addToast('تم إنشاء الوحدة بنجاح.', 'success');
        } catch (error) {
            addToast('فشل إنشاء الوحدة.', 'error');
        } finally {
            setIsSaving(false);
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
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                    <li className="mr-2">
                        <button onClick={() => setActiveTab('modules')} className={`inline-block p-4 rounded-t-lg border-b-2 ${activeTab === 'modules' ? 'text-indigo-600 border-indigo-600 dark:text-indigo-500 dark:border-indigo-500' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'}`}>
                            إدارة الوحدات
                        </button>
                    </li>
                    <li className="mr-2">
                        <button onClick={() => setActiveTab('pricing')} className={`inline-block p-4 rounded-t-lg border-b-2 ${activeTab === 'pricing' ? 'text-indigo-600 border-indigo-600 dark:text-indigo-500 dark:border-indigo-500' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'}`}>
                            إعدادات التسعير
                        </button>
                    </li>
                    <li className="mr-2">
                        <button onClick={() => setActiveTab('requests')} className={`inline-block p-4 rounded-t-lg border-b-2 ${activeTab === 'requests' ? 'text-indigo-600 border-indigo-600 dark:text-indigo-500 dark:border-indigo-500' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'}`}>
                            طلبات التفعيل ({requests.length})
                        </button>
                    </li>
                </ul>
            </div>

            <div className="space-y-8">
                {activeTab === 'pricing' && (
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
                )}

                {activeTab === 'modules' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">إدارة الوحدات الإضافية</h3>
                        <button onClick={() => setShowCreate(v => !v)} className="px-4 py-2 bg-teal-600 text-white rounded-lg">{showCreate ? 'إلغاء' : 'إنشاء وحدة جديدة'}</button>
                    </div>
                    {showCreate && (
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المعرف</label>
                                <select className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" value={newModule.id} onChange={e => setNewModule(prev => ({ ...prev, id: e.target.value as ModuleId }))}>
                                    <option value="">اختر معرف الوحدة</option>
                                    {Object.values(ModuleId).filter(id => !modules.some(m => m.id === id)).map(id => (
                                        <option key={id} value={id}>{id}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم</label>
                                <input className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" value={newModule.name} onChange={e => setNewModule(prev => ({ ...prev, name: e.target.value }))} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الوصف</label>
                                <textarea className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" rows={3} value={newModule.description} onChange={e => setNewModule(prev => ({ ...prev, description: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعر الشهري</label>
                                <input type="number" className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" value={newModule.monthlyPrice} onChange={e => setNewModule(prev => ({ ...prev, monthlyPrice: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">سعر شراء لمرة واحدة</label>
                                <input type="number" className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" value={newModule.oneTimePrice || 0} onChange={e => setNewModule(prev => ({ ...prev, oneTimePrice: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">العملة</label>
                                <select className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" value={newModule.currency} onChange={e => setNewModule(prev => ({ ...prev, currency: e.target.value }))}>
                                    <option value="USD">USD</option>
                                    <option value="SAR">SAR</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">مفعل</label>
                                <input type="checkbox" checked={newModule.isEnabled} onChange={e => setNewModule(prev => ({ ...prev, isEnabled: e.target.checked }))} />
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">أساسي</label>
                                <input type="checkbox" checked={newModule.isCore} onChange={e => setNewModule(prev => ({ ...prev, isCore: e.target.checked }))} />
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <button onClick={handleCreateModule} disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-indigo-400">{isSaving ? 'جاري الإنشاء...' : 'إنشاء'}</button>
                            </div>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">الوحدة</th>
                                    <th scope="col" className="px-6 py-3">الوصف</th>
                                    <th scope="col" className="px-6 py-3">السعر الشهري</th>
                                    <th scope="col" className="px-6 py-3">العملة</th>
                                    <th scope="col" className="px-6 py-3">سعر لمرة واحدة</th>
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
                                        <td className="px-6 py-4">{module.currency || 'USD'}</td>
                                        <td className="px-6 py-4">{typeof module.oneTimePrice === 'number' ? `$${module.oneTimePrice.toFixed(2)}` : '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${module.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {module.isEnabled ? 'مفعل' : 'معطل'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 flex items-center gap-4">
                                            <button onClick={() => setEditingModule(module)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline flex items-center">
                                                <EditIcon className="w-4 h-4 ml-1" />
                                                تعديل
                                            </button>
                                            <button onClick={async () => {
                                                if (!window.confirm('هل أنت متأكد من حذف هذه الوحدة؟')) return;
                                                try {
                                                    await api.deleteModule(module.id as ModuleId);
                                                    await logSuperAdminAction('platform.module.delete', { moduleId: module.id });
                                                    addToast('تم حذف الوحدة.', 'success');
                                                    fetchData();
                                                } catch {
                                                    addToast('فشل حذف الوحدة.', 'error');
                                                }
                                            }} className="font-medium text-red-600 dark:text-red-500 hover:underline">
                                                حذف
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}

                {activeTab === 'requests' && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">طلبات التفعيل المعلقة</h3>
                        {requests.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">لا توجد طلبات معلقة.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">المدرسة</th>
                                            <th scope="col" className="px-6 py-3">الوحدة</th>
                                            <th scope="col" className="px-6 py-3">السعر</th>
                                            <th scope="col" className="px-6 py-3">طريقة الدفع</th>
                                            <th scope="col" className="px-6 py-3">المرجع</th>
                                            <th scope="col" className="px-6 py-3">الإثبات</th>
                                            <th scope="col" className="px-6 py-3">إجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.map(req => (
                                            <tr key={req.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{req.School?.name}</td>
                                                <td className="px-6 py-4">{req.ModuleCatalog?.name}</td>
                                                <td className="px-6 py-4 font-semibold">${req.ModuleCatalog?.monthlyPrice}</td>
                                                <td className="px-6 py-4">{req.paymentMethod || '-'}</td>
                                                <td className="px-6 py-4">{req.transactionReference || '-'}</td>
                                                <td className="px-6 py-4">
                                                    {req.paymentProofUrl ? (
                                                        <a href={`${api.getApiBase().replace('/api', '')}${req.paymentProofUrl}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">عرض الصورة</a>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 flex items-center gap-2">
                                                    <button onClick={() => handleApproveRequest(req.id)} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">قبول</button>
                                                    <button onClick={() => handleRejectRequest(req.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">رفض</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
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
