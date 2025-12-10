import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { logSuperAdminAction } from '../api/superAdminAuth';
import { PricingConfig, Plan, PlanName } from '../types';
import { useToast } from '../contexts/ToastContext';


const FeatureManagement: React.FC = () => {
    const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editedPlans, setEditedPlans] = useState<Record<string, Partial<Plan>>>({});
    const [showCreatePlan, setShowCreatePlan] = useState(false);
    const [newPlan, setNewPlan] = useState<Partial<Plan>>({ name: PlanName.Basic, price: 0, pricePeriod: 'شهرياً', features: [], limits: { students: 0, teachers: 0 } as any, recommended: false });
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
    
    const handlePricePerStudentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (pricingConfig) {
            setPricingConfig({ ...pricingConfig, pricePerStudent: parseFloat(e.target.value) || 0 });
        }
    };

    const handlePricePerTeacherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (pricingConfig) {
            setPricingConfig({ ...pricingConfig, pricePerTeacher: parseFloat(e.target.value) || 0 });
        }
    };

    const handlePricePerGBStorageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (pricingConfig) {
            setPricingConfig({ ...pricingConfig, pricePerGBStorage: parseFloat(e.target.value) || 0 });
        }
    };

  const handlePricePerInvoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (pricingConfig) {
          setPricingConfig({ ...pricingConfig, pricePerInvoice: parseFloat(e.target.value) || 0 });
      }
  };

  const handlePricePerEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (pricingConfig) {
          setPricingConfig({ ...pricingConfig, pricePerEmail: parseFloat(e.target.value) || 0 });
      }
  };

  const handlePricePerSMSChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (pricingConfig) {
          setPricingConfig({ ...pricingConfig, pricePerSMS: parseFloat(e.target.value) || 0 });
      }
  };

    const handleYearlyDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (pricingConfig) {
            setPricingConfig({ ...pricingConfig, yearlyDiscountPercent: parseFloat(e.target.value) || 0 });
        }
    };

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (pricingConfig) {
            setPricingConfig({ ...pricingConfig, currency: e.target.value.toUpperCase().trim() });
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
          await logSuperAdminAction('platform.pricing.update', { 
              pricePerStudent: pricingConfig.pricePerStudent,
              pricePerTeacher: pricingConfig.pricePerTeacher,
              pricePerGBStorage: pricingConfig.pricePerGBStorage,
              pricePerInvoice: pricingConfig.pricePerInvoice,
              pricePerEmail: pricingConfig.pricePerEmail,
              pricePerSMS: pricingConfig.pricePerSMS,
              yearlyDiscountPercent: pricingConfig.yearlyDiscountPercent,
              currency: pricingConfig.currency,
          });
          addToast('تم حفظ إعدادات التسعير بنجاح.', 'success');
      } catch (error) {
            const m = String((error as any)?.message || '')
            addToast(m ? `فشل حفظ إعدادات التسعير: ${m}` : 'فشل حفظ إعدادات التسعير.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const updatePlanField = (id: string | number, field: keyof Plan, value: any) => {
        setEditedPlans(prev => ({ ...prev, [String(id)]: { ...(prev[String(id)] || {}), [field]: value } }));
    };

    const handleSavePlan = async (id: string | number) => {
        const changes = editedPlans[String(id)] || {};
        setIsSaving(true);
        try {
            const updated = await api.updatePlan(String(id), changes);
            setPlans(prev => prev.map(p => String(p.id) === String(id) ? { ...p, ...updated } : p));
            setEditedPlans(prev => { const n = { ...prev }; delete n[String(id)]; return n; });
            await logSuperAdminAction('platform.plan.update', { planId: id, changes });
            addToast('تم تحديث الخطة بنجاح.', 'success');
        } catch (error) {
            addToast('فشل تحديث الخطة.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreatePlan = async () => {
        setIsSaving(true);
        try {
            const created = await api.createPlan(newPlan);
            setPlans(prev => [...prev, created]);
            setShowCreatePlan(false);
            setNewPlan({ name: PlanName.Basic, price: 0, pricePeriod: 'شهرياً', features: [], limits: { students: 0, teachers: 0 } as any, recommended: false });
            await logSuperAdminAction('platform.plan.create', { planId: created?.id, name: created?.name, price: created?.price });
            addToast('تم إنشاء الخطة بنجاح.', 'success');
        } catch (error) {
            addToast('فشل إنشاء الخطة.', 'error');
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
            <div className="space-y-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">إعدادات التسعير الأساسية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div>
                            <label htmlFor="pricePerStudent" className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعر لكل طالب (شهرياً)</label>
                            <input
                                type="number"
                                id="pricePerStudent"
                                value={pricingConfig.pricePerStudent}
                                onChange={handlePricePerStudentChange}
                                className={inputStyle}
                                step="0.1"
                                min={0}
                            />
                        </div>
                        <div>
                            <label htmlFor="pricePerTeacher" className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعر لكل معلم</label>
                            <input
                                type="number"
                                id="pricePerTeacher"
                                value={pricingConfig.pricePerTeacher}
                                onChange={handlePricePerTeacherChange}
                                className={inputStyle}
                                step="0.1"
                                min={0}
                            />
                        </div>
                        <div>
                            <label htmlFor="pricePerGBStorage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعر لكل 1GB تخزين</label>
                            <input
                                type="number"
                                id="pricePerGBStorage"
                                value={pricingConfig.pricePerGBStorage}
                                onChange={handlePricePerGBStorageChange}
                                className={inputStyle}
                                step="0.1"
                                min={0}
                            />
                        </div>
                    <div>
                        <label htmlFor="pricePerInvoice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعر لكل فاتورة</label>
                        <input
                            type="number"
                            id="pricePerInvoice"
                            value={pricingConfig.pricePerInvoice}
                            onChange={handlePricePerInvoiceChange}
                            className={inputStyle}
                            step="0.01"
                            min={0}
                        />
                    </div>
                    <div>
                        <label htmlFor="pricePerEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعر لكل رسالة بريد</label>
                        <input
                            type="number"
                            id="pricePerEmail"
                            value={Number(pricingConfig.pricePerEmail || 0)}
                            onChange={handlePricePerEmailChange}
                            className={inputStyle}
                            step="0.001"
                            min={0}
                        />
                    </div>
                    <div>
                        <label htmlFor="pricePerSMS" className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعر لكل رسالة نصية</label>
                        <input
                            type="number"
                            id="pricePerSMS"
                            value={Number(pricingConfig.pricePerSMS || 0)}
                            onChange={handlePricePerSMSChange}
                            className={inputStyle}
                            step="0.001"
                            min={0}
                        />
                    </div>
                    <div>
                        <label htmlFor="yearlyDiscountPercent" className="block text-sm font-medium text-gray-700 dark:text-gray-300">نسبة خصم الاشتراك السنوي (%)</label>
                        <input
                            type="number"
                            id="yearlyDiscountPercent"
                                value={Number(pricingConfig.yearlyDiscountPercent || 0)}
                                onChange={handleYearlyDiscountChange}
                                className={inputStyle}
                                step="0.1"
                                min={0}
                                max={100}
                            />
                        </div>
                        <div>
                            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">العملة (رمز)</label>
                            <input
                                type="text"
                                id="currency"
                                value={String(pricingConfig.currency || '')}
                                onChange={handleCurrencyChange}
                                className={inputStyle}
                                maxLength={3}
                            />
                        </div>
                        <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                            <button onClick={handleSavePricingConfig} disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400">
                                {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">إدارة الخطط</h3>
                        <button onClick={() => setShowCreatePlan(v => !v)} className="px-4 py-2 bg-teal-600 text-white rounded-lg">{showCreatePlan ? 'إلغاء' : 'إنشاء خطة جديدة'}</button>
                    </div>
                    {showCreatePlan && (
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم</label>
                                <select className={inputStyle} value={String(newPlan.name || '')} onChange={e => setNewPlan(prev => ({ ...prev, name: e.target.value as PlanName }))}>
                                    {Object.values(PlanName).map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعر</label>
                                <input type="number" className={inputStyle} value={Number(newPlan.price || 0)} onChange={e => setNewPlan(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الفترة</label>
                                <input className={inputStyle} value={String(newPlan.pricePeriod || '')} onChange={e => setNewPlan(prev => ({ ...prev, pricePeriod: e.target.value }))} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الميزات</label>
                                <input className={inputStyle} value={Array.isArray(newPlan.features) ? (newPlan.features as string[]).join(', ') : ''} onChange={e => setNewPlan(prev => ({ ...prev, features: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-300">الطلاب</label>
                                <input className={inputStyle} value={String((newPlan.limits as any)?.students ?? 0)} onChange={e => setNewPlan(prev => ({ ...prev, limits: { ...((prev.limits as any) || {}), students: e.target.value.trim() === 'غير محدود' ? 'غير محدود' : (parseInt(e.target.value) || 0) } as any }))} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-300">المعلمين</label>
                                <input className={inputStyle} value={String((newPlan.limits as any)?.teachers ?? 0)} onChange={e => setNewPlan(prev => ({ ...prev, limits: { ...((prev.limits as any) || {}), teachers: e.target.value.trim() === 'غير محدود' ? 'غير محدود' : (parseInt(e.target.value) || 0) } as any }))} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-300">الفواتير</label>
                                <input className={inputStyle} value={String((newPlan.limits as any)?.invoices ?? '')} onChange={e => setNewPlan(prev => ({ ...prev, limits: { ...((prev.limits as any) || {}), invoices: e.target.value.trim() === '' ? undefined : (e.target.value.trim() === 'غير محدود' ? 'غير محدود' : (parseInt(e.target.value) || 0)) } as any }))} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-300">التخزين GB</label>
                                <input className={inputStyle} value={String((newPlan.limits as any)?.storageGB ?? '')} onChange={e => setNewPlan(prev => ({ ...prev, limits: { ...((prev.limits as any) || {}), storageGB: e.target.value.trim() === '' ? undefined : (e.target.value.trim() === 'غير محدود' ? 'غير محدود' : (parseInt(e.target.value) || 0)) } as any }))} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-300">الفروع</label>
                                <input className={inputStyle} value={String((newPlan.limits as any)?.branches ?? '')} onChange={e => setNewPlan(prev => ({ ...prev, limits: { ...((prev.limits as any) || {}), branches: e.target.value.trim() === '' ? undefined : (e.target.value.trim() === 'غير محدود' ? 'غير محدود' : (parseInt(e.target.value) || 0)) } as any }))} />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-600 dark:text-gray-300">حد صارم</label>
                                <input type="checkbox" checked={Boolean((newPlan.limits as any)?.hardCap)} onChange={e => setNewPlan(prev => ({ ...prev, limits: { ...((prev.limits as any) || {}), hardCap: e.target.checked } as any }))} />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-600 dark:text-gray-300">السماح بتجاوز</label>
                                <input type="checkbox" checked={Boolean((newPlan.limits as any)?.allowOverage)} onChange={e => setNewPlan(prev => ({ ...prev, limits: { ...((prev.limits as any) || {}), allowOverage: e.target.checked } as any }))} />
                            </div>
                            <div className="md:col-span-3 flex justify-end">
                                <button onClick={handleCreatePlan} disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-indigo-400">{isSaving ? 'جاري الإنشاء...' : 'إنشاء'}</button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-6">
                        {plans.map(p => {
                            const edited = editedPlans[String(p.id)] || {};
                            const currFeatures = (edited.features ?? p.features) as string[];
                            const currLimits = (edited.limits ?? p.limits) as any;
                            return (
                                <div key={String(p.id)} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم</label>
                                            <select className={inputStyle} value={String(edited.name ?? p.name)} onChange={e => updatePlanField(p.id, 'name', e.target.value as PlanName)}>
                                                {Object.values(PlanName).map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعر</label>
                                            <input type="number" className={inputStyle} value={Number(edited.price ?? p.price)} onChange={e => updatePlanField(p.id, 'price', parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الفترة</label>
                                            <input className={inputStyle} value={String(edited.pricePeriod ?? p.pricePeriod)} onChange={e => updatePlanField(p.id, 'pricePeriod', e.target.value)} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">موصى بها</label>
                                            <input type="checkbox" checked={Boolean(edited.recommended ?? p.recommended)} onChange={e => updatePlanField(p.id, 'recommended', e.target.checked)} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الميزات</label>
                                            <input className={inputStyle} value={currFeatures.join(', ')} onChange={e => {
                                                const list = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                updatePlanField(p.id, 'features', list);
                                            }} />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">الحدود</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-600 dark:text-gray-300">الطلاب</label>
                                                <input className={inputStyle} value={String(currLimits.students)} onChange={e => {
                                                    const v = e.target.value.trim();
                                                    const nv: any = v === 'غير محدود' ? 'غير محدود' : (parseInt(v) || 0);
                                                    const next = { ...currLimits, students: nv };
                                                    updatePlanField(p.id, 'limits', next);
                                                }} />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 dark:text-gray-300">المعلمين</label>
                                                <input className={inputStyle} value={String(currLimits.teachers)} onChange={e => {
                                                    const v = e.target.value.trim();
                                                    const nv: any = v === 'غير محدود' ? 'غير محدود' : (parseInt(v) || 0);
                                                    const next = { ...currLimits, teachers: nv };
                                                    updatePlanField(p.id, 'limits', next);
                                                }} />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 dark:text-gray-300">الفواتير</label>
                                                <input className={inputStyle} value={String(currLimits.invoices ?? '')} onChange={e => {
                                                    const v = e.target.value.trim();
                                                    const nv: any = v === '' ? undefined : (v === 'غير محدود' ? 'غير محدود' : (parseInt(v) || 0));
                                                    const next = { ...currLimits, invoices: nv };
                                                    updatePlanField(p.id, 'limits', next);
                                                }} />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 dark:text-gray-300">التخزين GB</label>
                                                <input className={inputStyle} value={String(currLimits.storageGB ?? '')} onChange={e => {
                                                    const v = e.target.value.trim();
                                                    const nv: any = v === '' ? undefined : (v === 'غير محدود' ? 'غير محدود' : (parseInt(v) || 0));
                                                    const next = { ...currLimits, storageGB: nv };
                                                    updatePlanField(p.id, 'limits', next);
                                                }} />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 dark:text-gray-300">الفروع</label>
                                                <input className={inputStyle} value={String(currLimits.branches ?? '')} onChange={e => {
                                                    const v = e.target.value.trim();
                                                    const nv: any = v === '' ? undefined : (v === 'غير محدود' ? 'غير محدود' : (parseInt(v) || 0));
                                                    const next = { ...currLimits, branches: nv };
                                                    updatePlanField(p.id, 'limits', next);
                                                }} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-gray-600 dark:text-gray-300">حد صارم</label>
                                                <input type="checkbox" checked={Boolean(currLimits.hardCap)} onChange={e => {
                                                    const next = { ...currLimits, hardCap: e.target.checked };
                                                    updatePlanField(p.id, 'limits', next);
                                                }} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-gray-600 dark:text-gray-300">السماح بتجاوز</label>
                                                <input type="checkbox" checked={Boolean(currLimits.allowOverage)} onChange={e => {
                                                    const next = { ...currLimits, allowOverage: e.target.checked };
                                                    updatePlanField(p.id, 'limits', next);
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button onClick={() => handleSavePlan(p.id)} disabled={isSaving || !editedPlans[String(p.id)]} className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-indigo-400">{isSaving ? 'جاري الحفظ...' : 'حفظ الخطة'}</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
        </>
    );
};

export default FeatureManagement;
