import React, { useState, useEffect, useMemo } from 'react';
import * as api from '../api';
import { logSuperAdminAction } from '../api/superAdminAuth';
import { PricingConfig, Plan, PlanName } from '../types';
import { useToast } from '../contexts/ToastContext';
import ResponsiveTable from '../components/ResponsiveTable';
import Modal from '../components/Modal';
import { EditIcon, PlusIcon, CheckIcon, XIcon } from '../components/icons';

const FeatureManagement: React.FC = () => {
    const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<Partial<Plan>>({});
    const [isEditing, setIsEditing] = useState(false);

    const { addToast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.getPricingConfig(),
            api.getPlans(),
        ]).then(([configData, plansData]) => {
            setPricingConfig(configData);
            setPlans(plansData);
        }).catch(err => {
            console.error("Failed to fetch feature management data:", err);
            addToast("فشل تحميل بيانات الخطط والأسعار.", 'error');
        }).finally(() => setLoading(false));
    };

    // Pricing Config Handlers
    const handlePriceConfigChange = (field: keyof PricingConfig, value: any) => {
        if (pricingConfig) {
            setPricingConfig({ ...pricingConfig, [field]: value });
        }
    };

    const handleSavePricingConfig = async () => {
        if (!pricingConfig) return;
        setIsSaving(true);
        try {
            if (!pricingConfig.currency || !String(pricingConfig.currency).trim()) {
                addToast('أدخل رمز العملة.', 'error');
                setIsSaving(false);
                return;
            }
            await api.updatePricingConfig(pricingConfig);
            await logSuperAdminAction('platform.pricing.update', pricingConfig);
            addToast('تم حفظ إعدادات التسعير بنجاح.', 'success');
        } catch (error) {
            addToast('فشل حفظ إعدادات التسعير.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Plan Handlers
    const openCreateModal = () => {
        setCurrentPlan({
            name: PlanName.Basic,
            price: 0,
            pricePeriod: 'شهرياً',
            features: [],
            limits: { students: 0, teachers: 0 } as any,
            recommended: false
        });
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const openEditModal = (plan: Plan) => {
        setCurrentPlan({ ...plan });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleSavePlan = async () => {
        setIsSaving(true);
        try {
            if (isEditing && currentPlan.id) {
                const updated = await api.updatePlan(String(currentPlan.id), currentPlan);
                setPlans(prev => prev.map(p => String(p.id) === String(currentPlan.id) ? { ...p, ...updated } : p));
                await logSuperAdminAction('platform.plan.update', { planId: currentPlan.id, changes: currentPlan });
                addToast('تم تحديث الخطة بنجاح.', 'success');
            } else {
                const created = await api.createPlan(currentPlan);
                setPlans(prev => [...prev, created]);
                await logSuperAdminAction('platform.plan.create', { planId: created?.id, name: created?.name });
                addToast('تم إنشاء الخطة بنجاح.', 'success');
            }
            setIsModalOpen(false);
        } catch (error) {
            addToast(isEditing ? 'فشل تحديث الخطة.' : 'فشل إنشاء الخطة.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 dark:text-white sm:text-sm";

    // Table Config
    const columns = [
        {
            header: 'الاسم',
            accessor: 'name' as keyof Plan,
            render: (plan: Plan) => <span className="font-medium text-gray-900 dark:text-white">{plan.name}</span>
        },
        {
            header: 'السعر',
            accessor: 'price' as keyof Plan,
            render: (plan: Plan) => <span className="text-gray-900 dark:text-white">{plan.price} {pricingConfig?.currency} / {plan.pricePeriod}</span>
        },
        {
            header: 'حد الطلاب',
            accessor: 'limits' as keyof Plan,
            render: (plan: Plan) => <span className="text-gray-500 dark:text-gray-400">{plan.limits?.students === 'غير محدود' || plan.limits?.students === 0 ? 'غير محدود' : plan.limits?.students}</span>
        },
        {
            header: 'حد المعلمين',
            accessor: 'limits' as keyof Plan,
            render: (plan: Plan) => <span className="text-gray-500 dark:text-gray-400">{plan.limits?.teachers === 'غير محدود' || plan.limits?.teachers === 0 ? 'غير محدود' : plan.limits?.teachers}</span>
        },
        {
            header: 'موصى بها',
            accessor: 'recommended' as keyof Plan,
            render: (plan: Plan) => (
                plan.recommended ? <CheckIcon className="w-5 h-5 text-green-500" /> : <XIcon className="w-5 h-5 text-gray-400" />
            )
        },
        {
            header: 'الإجراءات',
            accessor: 'id' as keyof Plan,
            render: (plan: Plan) => (
                <button
                    onClick={() => openEditModal(plan)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                    <EditIcon className="w-5 h-5" />
                </button>
            )
        }
    ];

    if (loading) return <div className="flex justify-center items-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
    if (!pricingConfig) return <div className="text-center p-8 text-red-500">لا يمكن تحميل البيانات.</div>;

    return (
        <div className="space-y-8">
            {/* Pricing Config Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">إعدادات التسعير الأساسية</h3>
                    <button onClick={handleSavePricingConfig} disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm">
                        {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Simplified inputs for brevity, mapping could be used */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-400">العملة (رمز)</label>
                        <input type="text" value={pricingConfig.currency || ''} onChange={e => handlePriceConfigChange('currency', e.target.value.toUpperCase())} className={inputStyle} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-400">خصم سنوي (%)</label>
                        <input type="number" value={pricingConfig.yearlyDiscountPercent || 0} onChange={e => handlePriceConfigChange('yearlyDiscountPercent', parseFloat(e.target.value))} className={inputStyle} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-400">سعر الطالب</label>
                        <input type="number" value={pricingConfig.pricePerStudent || 0} onChange={e => handlePriceConfigChange('pricePerStudent', parseFloat(e.target.value))} className={inputStyle} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-400">سعر المعلم</label>
                        <input type="number" value={pricingConfig.pricePerTeacher || 0} onChange={e => handlePriceConfigChange('pricePerTeacher', parseFloat(e.target.value))} className={inputStyle} />
                    </div>
                    {/* Add other fields as needed */}
                </div>
            </div>

            {/* Plans Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">باقات الاشتراك</h3>
                    <button onClick={openCreateModal} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                        <PlusIcon className="w-4 h-4 ml-2" />
                        إضافة باقة
                    </button>
                </div>
                <ResponsiveTable
                    columns={columns}
                    data={plans}
                    emptyMessage="لا توجد باقات متاحة."
                />
            </div>

            {/* Edit/Create Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? "تعديل الباقة" : "إنشاء باقة جديدة"}
            >
                <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم</label>
                            <select
                                value={currentPlan.name || ''}
                                onChange={e => setCurrentPlan({ ...currentPlan, name: e.target.value as PlanName })}
                                className={inputStyle}
                            >
                                {Object.values(PlanName).map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعر</label>
                            <input
                                type="number"
                                value={currentPlan.price || 0}
                                onChange={e => setCurrentPlan({ ...currentPlan, price: parseFloat(e.target.value) || 0 })}
                                className={inputStyle}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الفترة</label>
                            <input
                                value={currentPlan.pricePeriod || ''}
                                onChange={e => setCurrentPlan({ ...currentPlan, pricePeriod: e.target.value })}
                                className={inputStyle}
                            />
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!currentPlan.recommended}
                                    onChange={e => setCurrentPlan({ ...currentPlan, recommended: e.target.checked })}
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                />
                                باقة موصى بها
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الميزات (مفصولة بفاصلة)</label>
                        <textarea
                            rows={3}
                            value={Array.isArray(currentPlan.features) ? currentPlan.features.join(', ') : ''}
                            onChange={e => setCurrentPlan({ ...currentPlan, features: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                            className={inputStyle}
                        />
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">الحدود والقيود</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-400">الطلاب</label>
                                <input
                                    type="text"
                                    placeholder="0 أو غير محدود"
                                    value={currentPlan.limits?.students === 'غير محدود' ? 'غير محدود' : (currentPlan.limits?.students || 0)}
                                    onChange={e => {
                                        const val = e.target.value === 'غير محدود' ? 'غير محدود' : parseInt(e.target.value) || 0;
                                        setCurrentPlan({
                                            ...currentPlan,
                                            limits: { ...currentPlan.limits!, students: val as any }
                                        });
                                    }}
                                    className={inputStyle}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-400">المعلمين</label>
                                <input
                                    type="text"
                                    placeholder="0 أو غير محدود"
                                    value={currentPlan.limits?.teachers === 'غير محدود' ? 'غير محدود' : (currentPlan.limits?.teachers || 0)}
                                    onChange={e => {
                                        const val = e.target.value === 'غير محدود' ? 'غير محدود' : parseInt(e.target.value) || 0;
                                        setCurrentPlan({
                                            ...currentPlan,
                                            limits: { ...currentPlan.limits!, teachers: val as any }
                                        });
                                    }}
                                    className={inputStyle}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleSavePlan}
                            disabled={isSaving}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default FeatureManagement;
