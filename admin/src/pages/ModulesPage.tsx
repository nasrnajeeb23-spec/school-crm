import React, { useState, useEffect, useMemo } from 'react';
import * as api from '../api';
import { School, PricingConfig, SubscriptionState, Module, ModuleId, PaymentMethod } from '../types';
import { useToast } from '../contexts/ToastContext';
import { EditIcon, PlusIcon, TrashIcon } from '../components/icons';
import { useAppContext } from '../contexts/AppContext';
import { getCurrencySymbol, formatCurrency } from '../currency-config';

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
    const [charging, setCharging] = useState<boolean>(false);
    const [isProofOpen, setIsProofOpen] = useState<boolean>(false);
    const [proofMethod, setProofMethod] = useState<PaymentMethod>(PaymentMethod.BankDeposit);
    const [proofAmount, setProofAmount] = useState<number>(0);
    const [proofReference, setProofReference] = useState<string>('');
    const [reportGroup, setReportGroup] = useState<'day' | 'month'>('day');
    const [reportFrom, setReportFrom] = useState<string>('');
    const [reportTo, setReportTo] = useState<string>('');
    const [txKind, setTxKind] = useState<'all' | 'overage'>('overage');
    const [usageReport, setUsageReport] = useState<any | null>(null);
    const [billingTx, setBillingTx] = useState<any[]>([]);
    const [breakdown, setBreakdown] = useState<any | null>(null);
    const [reportsLoading, setReportsLoading] = useState<boolean>(false);
    const { addToast } = useToast();
    const { currentUser } = useAppContext();
    const canManageModules = ['SUPER_ADMIN','SUPER_ADMIN_FINANCIAL','SUPER_ADMIN_TECHNICAL','SUPER_ADMIN_SUPERVISOR'].includes(String(currentUser?.role || '').toUpperCase());
    const symbolForCurrency = (cur: string) => getCurrencySymbol(cur);

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.getPricingConfig(),
            api.getSubscriptionState(school.id)
        ]).then(async ([pricing, state]) => {
            setPricingConfig(pricing);
            setSubscriptionState(state);
            const sgb = typeof state?.usage?.storageGB === 'number' ? state!.usage!.storageGB! : await api.getStorageUsage(school.id);
            setStorageGB(sgb);
            try { const q = await api.getUsageQuote(school.id, sgb); setQuote(q); } catch {}
        }).catch(err => {
            console.error("Failed to fetch subscription data:", err);
            addToast("فشل تحميل بيانات الاشتراك.", 'error');
        }).finally(() => setLoading(false));
    };

    const ensureDefaultReportRange = () => {
        const now = new Date();
        const to = now.toISOString().slice(0, 10);
        const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        if (!reportTo) setReportTo(to);
        if (!reportFrom) setReportFrom(from);
    };

    const fetchReports = async () => {
        ensureDefaultReportRange();
        const from = reportFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const to = reportTo || new Date().toISOString().slice(0, 10);
        try {
            setReportsLoading(true);
            const [r, tx] = await Promise.all([
                api.getUsageReport({ group: reportGroup, from, to }),
                api.getBillingTransactions({ from, to, kind: txKind === 'overage' ? 'overage' : undefined })
            ]);
            setUsageReport(r);
            setBillingTx(Array.isArray(tx) ? tx : []);
            try {
                const b = await api.getUsageBreakdown({ from, to });
                setBreakdown(b);
            } catch {
                setBreakdown(null);
            }
        } catch (e: any) {
            addToast(e?.message || 'فشل تحميل التقارير', 'error');
        } finally {
            setReportsLoading(false);
        }
    };

    const formatShort = (n: number) => {
        if (!Number.isFinite(n)) return '0';
        if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return String(Math.round(n));
    };

    const renderLineChart = (points: Array<{ x: string; y1: number; y2: number }>, currency: string) => {
        const w = 760;
        const h = 180;
        const pad = 24;
        const xs = points.map((_, i) => i);
        const maxY = Math.max(1, ...points.flatMap(p => [Number(p.y1 || 0), Number(p.y2 || 0)]));
        const scaleX = (i: number) => pad + (xs.length <= 1 ? 0 : (i / (xs.length - 1)) * (w - pad * 2));
        const scaleY = (y: number) => h - pad - ((y || 0) / maxY) * (h - pad * 2);
        const pathFor = (pick: (p: any) => number) => {
            return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(pick(p))}`).join(' ');
        };
        const last = points[points.length - 1];
        return (
            <div className="w-full overflow-x-auto">
                <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full">
                    <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(148,163,184,0.6)" strokeWidth="1" />
                    <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="rgba(148,163,184,0.6)" strokeWidth="1" />
                    <path d={pathFor((p) => Number(p.y1 || 0))} fill="none" stroke="#0ea5e9" strokeWidth="2" />
                    <path d={pathFor((p) => Number(p.y2 || 0))} fill="none" stroke="#22c55e" strokeWidth="2" />
                    {points.map((p, i) => (
                        <g key={p.x + i}>
                            <circle cx={scaleX(i)} cy={scaleY(Number(p.y1 || 0))} r="2.5" fill="#0ea5e9" />
                            <circle cx={scaleX(i)} cy={scaleY(Number(p.y2 || 0))} r="2.5" fill="#22c55e" />
                        </g>
                    ))}
                </svg>
                {last && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        آخر نقطة ({last.x}): مُقدّر {formatCurrency(Number(last.y1 || 0), currency)} — مُحصّل {formatCurrency(Number(last.y2 || 0), currency)}
                    </div>
                )}
            </div>
        );
    };

    const overageLabel = (key: string) => {
        const k = String(key || '');
        if (k === 'overage_students') return 'تجاوز الطلاب';
        if (k === 'overage_teachers') return 'تجاوز المعلمين';
        if (k === 'overage_invoices') return 'تجاوز الفواتير';
        if (k === 'overage_storageGB') return 'تجاوز التخزين';
        return k;
    };

    const downloadCsv = (fileName: string, headers: string[], rows: Array<Record<string, any>>) => {
        const esc = (v: any) => {
            const s = v === null || v === undefined ? '' : String(v);
            if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };
        const csv = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n') + '\n';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        fetchData();
    }, [school.id]);

    useEffect(() => {
        ensureDefaultReportRange();
    }, [school.id]);

    useEffect(() => {
        if (!reportFrom && !reportTo) return;
        fetchReports();
    }, [reportGroup, reportFrom, reportTo, txKind, school.id]);
    
    

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
            const m = String((e as any)?.message || '');
            addToast(m ? `فشل حذف الوحدة: ${m}` : 'فشل حذف الوحدة', 'error');
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
        return <p className="text-center p-8">جاري تحميل البيانات...</p>;
    }

    // For Super Admin, we show ALL modules fetched from API (which should return everything)
    // For School Admin, we might still want to categorize them
    // Filter out finance_fees/salaries/expenses etc. from UI if parent 'finance' exists to avoid duplicates
    // Also handle 'finance' vs 'finance_fees' duplication issue explicitly
    const uniqueModules = availableModules.filter(m => {
        // 1. Hide sub-finance modules if parent 'finance' exists
        if (m.id === ModuleId.FinanceFees || m.id === ModuleId.FinanceSalaries || m.id === ModuleId.FinanceExpenses) {
             return !availableModules.some(p => p.id === ModuleId.Finance);
        }
        
        // 2. Hide 'finance' module if it's acting as a duplicate of 'finance_fees' (same name/desc)
        // OR if we want to enforce the new split structure
        // Actually, based on migration 010, 'finance' was renamed to 'الرسوم الدراسية' (Fees)
        // So 'finance' IS 'finance_fees' logically now.
        // If we have BOTH 'finance' and 'finance_fees', we should probably hide one.
        // Let's hide 'finance_fees' if 'finance' exists, as 'finance' is the legacy ID used by schools.
        
        // 3. De-duplicate by name if prices are weird (Emergency fix for user report)
        // If we have two modules named "الرسوم الدراسية", show the one with ID 'finance' and hide others
        // UNLESS the other one is totally different.
        if (m.name === 'الرسوم الدراسية' && m.id !== ModuleId.Finance && availableModules.some(p => p.id === ModuleId.Finance)) {
            // This hides the $29 duplicate if the 'finance' one is present
            return false;
        }

        return true;
    });

    const planName = subscriptionState?.plan?.name || school.plan;
    const planPrice = Number(subscriptionState?.plan?.price || 0);
    const limits = subscriptionState?.limits || ({} as any);
    const usage = subscriptionState?.usage || ({} as any);
    const packs = (subscriptionState as any)?.packs || [];
    const billing = (subscriptionState as any)?.billing || { mode: 'hard_cap' };

    return (
        <>
            <div className="mt-6 space-y-6">
                

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">الباقات والاشتراكات</h3>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">الخطة الحالية: {planName} — السعر: {formatCurrency(planPrice, String(planPacksOverage.currency || pricingConfig?.currency || 'USD'))}</div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">وضع الفوترة: {billing.mode === 'overage' ? 'السماح بالزيادة' : 'حماية صارمة'}</div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">الباقة الأساسية</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(planPacksOverage.planAmount, planPacksOverage.currency)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">توسعات السعة</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(planPacksOverage.packsAmount, planPacksOverage.currency)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">رسوم زيادة</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(planPacksOverage.overageTotal, planPacksOverage.currency)}</p>
                        </div>
                        <div className="border-r pr-4 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">الإجمالي الشهري</p>
                            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{formatCurrency(planPacksOverage.total, planPacksOverage.currency)}</p>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={charging}
                          onClick={async () => {
                              try {
                                  setCharging(true);
                                  const res = await api.runOverageCharge('monthly');
                                  if (res.ok) {
                                      addToast(res.charged ? `تم التحصيل: ${formatCurrency(res.total, res.currency)}` : 'لا توجد رسوم زيادة حالياً', res.charged ? 'success' : 'info');
                                  } else {
                                      addToast((res as any)?.msg || 'فشل التحصيل', 'error');
                                  }
                                  fetchData();
                              } catch (e: any) {
                                  addToast(e?.message || 'فشل التحصيل', 'error');
                              } finally {
                                  setCharging(false);
                              }
                          }}
                          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {charging ? 'جاري التحصيل...' : 'تحصيل الآن'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setProofAmount(Math.max(planPacksOverage.total, 0)); setIsProofOpen(true); }}
                          className="inline-flex items-center rounded-md bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
                        >
                          شحن الرصيد
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">الاستخدام والحدود</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">الطلاب</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{Number(usage.students || 0)} / {String(limits.students ?? 'غير محدد')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">المعلمون</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{Number(usage.teachers || 0)} / {String(limits.teachers ?? 'غير محدد')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">الفواتير</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{Number(usage.invoices || 0)} / {String((limits as any).invoices ?? 'غير محدد')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">التخزين (GB)</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{Number(storageGB || usage.storageGB || 0)} / {String(limits.storageGB ?? 'غير محدد')}</p>
                        </div>
                    </div>
                </div>

                {Array.isArray(packs) && packs.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">توسعات السعة المفعلة</h3>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {packs.map((p: any, idx: number) => (
                                <div key={idx} className="border dark:border-gray-700 rounded-lg p-4 text-sm flex justify-between">
                                    <span className="text-gray-700 dark:text-gray-300">{p.type}</span>
                                    <span className="font-bold text-gray-900 dark:text-white">+{p.qty} {p.price ? `(${formatCurrency(Number(p.price) || 0, String(planPacksOverage.currency || pricingConfig?.currency || 'USD'))})` : ''}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">تقارير الاستخدام والتحصيل</h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                disabled={reportsLoading}
                                onClick={() => fetchReports()}
                                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {reportsLoading ? 'جاري التحديث...' : 'تحديث'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const rows = Array.isArray(usageReport?.rows) ? usageReport.rows : [];
                                    downloadCsv(
                                        `usage_report_${school.id}_${reportFrom || ''}_${reportTo || ''}.csv`,
                                        ['date', 'students', 'teachers', 'invoices', 'storageGB', 'estimatedOverageTotal', 'chargedOverageTotal', 'currency'],
                                        rows
                                    );
                                }}
                                className="inline-flex items-center rounded-md border px-4 py-2 text-gray-700 dark:text-gray-300 dark:border-gray-600"
                            >
                                تصدير CSV (الاستخدام)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const rows = Array.isArray(billingTx) ? billingTx : [];
                                    downloadCsv(
                                        `billing_transactions_${school.id}_${reportFrom || ''}_${reportTo || ''}.csv`,
                                        ['createdAt', 'type', 'amount', 'balanceAfter', 'description'],
                                        rows.map(r => ({ ...r, createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '' }))
                                    );
                                }}
                                className="inline-flex items-center rounded-md border px-4 py-2 text-gray-700 dark:text-gray-300 dark:border-gray-600"
                            >
                                تصدير CSV (التحصيل)
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">التجميع</label>
                            <select
                                value={reportGroup}
                                onChange={(e) => setReportGroup(e.target.value as 'day' | 'month')}
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="day">يومي</option>
                                <option value="month">شهري</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">من</label>
                            <input
                                type="date"
                                value={reportFrom}
                                onChange={(e) => setReportFrom(e.target.value)}
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">إلى</label>
                            <input
                                type="date"
                                value={reportTo}
                                onChange={(e) => setReportTo(e.target.value)}
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">السجل</label>
                            <select
                                value={txKind}
                                onChange={(e) => setTxKind(e.target.value as 'all' | 'overage')}
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="overage">تحصيل التجاوز فقط</option>
                                <option value="all">كل العمليات</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {usageReport?.rows?.length ? `عدد السجلات: ${usageReport.rows.length}` : 'لا توجد بيانات بعد'}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-2">التاريخ</th>
                                    <th className="px-4 py-2">الطلاب</th>
                                    <th className="px-4 py-2">المعلمون</th>
                                    <th className="px-4 py-2">الفواتير</th>
                                    <th className="px-4 py-2">التخزين GB</th>
                                    <th className="px-4 py-2">تجاوز مُقدّر</th>
                                    <th className="px-4 py-2">تجاوز مُحصّل</th>
                                    <th className="px-4 py-2">العملة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(Array.isArray(usageReport?.rows) ? usageReport.rows : []).map((r: any) => (
                                    <tr key={String(r.key || r.date)} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{String(r.date || '')}</td>
                                        <td className="px-4 py-2">{Number(r.students || 0)}</td>
                                        <td className="px-4 py-2">{Number(r.teachers || 0)}</td>
                                        <td className="px-4 py-2">{Number(r.invoices || 0)}</td>
                                        <td className="px-4 py-2">{Number(r.storageGB || 0).toFixed(2)}</td>
                                        <td className="px-4 py-2">{formatCurrency(Number(r.estimatedOverageTotal || 0), String(r.currency || 'USD'))}</td>
                                        <td className="px-4 py-2">{formatCurrency(Number(r.chargedOverageTotal || 0), String(r.currency || 'USD'))}</td>
                                        <td className="px-4 py-2">{String(r.currency || 'USD')}</td>
                                    </tr>
                                ))}
                                {(Array.isArray(usageReport?.rows) ? usageReport.rows.length : 0) === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">لا توجد بيانات ضمن الفترة المحددة.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="border dark:border-gray-700 rounded-lg p-4">
                            <div className="text-sm font-semibold text-gray-800 dark:text-white">منحنى التجاوز (مقدّر vs محصّل)</div>
                            <div className="mt-3">
                                {(() => {
                                    const rows = Array.isArray(usageReport?.rows) ? usageReport.rows : [];
                                    const pts = rows.map((r: any) => ({
                                        x: String(r.date || ''),
                                        y1: Number(r.estimatedOverageTotal || 0),
                                        y2: Number(r.chargedOverageTotal || 0),
                                    }));
                                    const cur = String(rows[0]?.currency || breakdown?.currency || 'USD');
                                    if (!pts.length) return <div className="text-sm text-gray-500 dark:text-gray-400">لا توجد بيانات لعرض الرسم.</div>;
                                    return renderLineChart(pts, cur);
                                })()}
                            </div>
                        </div>
                        <div className="border dark:border-gray-700 rounded-lg p-4">
                            <div className="text-sm font-semibold text-gray-800 dark:text-white">تفصيل التجاوز حسب البند</div>
                            <div className="mt-3">
                                {(() => {
                                    const cur = String(breakdown?.currency || usageReport?.rows?.[0]?.currency || 'USD');
                                    const estTotals = breakdown?.estimated?.totals && typeof breakdown.estimated.totals === 'object' ? breakdown.estimated.totals : {};
                                    const chTotals = breakdown?.charged?.totals && typeof breakdown.charged.totals === 'object' ? breakdown.charged.totals : {};
                                    const keys = Array.from(new Set([...Object.keys(estTotals), ...Object.keys(chTotals)])).filter(Boolean);
                                    const rows = keys.map(k => ({
                                        key: k,
                                        label: overageLabel(k),
                                        estimated: Number(estTotals[k] || 0),
                                        charged: Number(chTotals[k] || 0),
                                    })).sort((a, b) => (b.estimated + b.charged) - (a.estimated + a.charged));
                                    if (!rows.length) return <div className="text-sm text-gray-500 dark:text-gray-400">لا توجد بيانات تفصيلية ضمن الفترة.</div>;
                                    const estTotal = Number(breakdown?.estimated?.total || rows.reduce((s, r) => s + r.estimated, 0));
                                    const chTotal = Number(breakdown?.charged?.total || rows.reduce((s, r) => s + r.charged, 0));
                                    return (
                                        <div>
                                            <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-300">
                                                <div>المجموع المُقدّر: <span className="font-semibold">{formatCurrency(estTotal, cur)}</span></div>
                                                <div>المجموع المُحصّل: <span className="font-semibold">{formatCurrency(chTotal, cur)}</span></div>
                                            </div>
                                            <div className="mt-3 overflow-x-auto">
                                                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                                        <tr>
                                                            <th className="px-3 py-2">البند</th>
                                                            <th className="px-3 py-2">مقدّر</th>
                                                            <th className="px-3 py-2">محصّل</th>
                                                            <th className="px-3 py-2">نسبة</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rows.map(r => {
                                                            const base = Math.max(1, estTotal);
                                                            const pct = Math.round((r.estimated / base) * 100);
                                                            return (
                                                                <tr key={r.key} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                                                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{r.label}</td>
                                                                    <td className="px-3 py-2">{formatCurrency(r.estimated, cur)}</td>
                                                                    <td className="px-3 py-2">{formatCurrency(r.charged, cur)}</td>
                                                                    <td className="px-3 py-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="h-2 w-24 bg-gray-200 dark:bg-gray-700 rounded">
                                                                                <div className="h-2 bg-sky-500 rounded" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                                                                            </div>
                                                                            <div className="text-xs">{pct}%</div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        downloadCsv(
                                                            `overage_breakdown_${school.id}_${reportFrom || ''}_${reportTo || ''}.csv`,
                                                            ['item', 'estimated', 'charged', 'currency'],
                                                            rows.map(r => ({ item: r.label, estimated: r.estimated, charged: r.charged, currency: cur }))
                                                        );
                                                    }}
                                                    className="inline-flex items-center rounded-md border px-4 py-2 text-gray-700 dark:text-gray-300 dark:border-gray-600"
                                                >
                                                    تصدير CSV (التفصيل)
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-2">التاريخ</th>
                                    <th className="px-4 py-2">النوع</th>
                                    <th className="px-4 py-2">المبلغ</th>
                                    <th className="px-4 py-2">الرصيد بعد</th>
                                    <th className="px-4 py-2">الوصف</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(Array.isArray(billingTx) ? billingTx : []).map((t: any) => (
                                    <tr key={String(t.id)} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 19).replace('T', ' ') : ''}</td>
                                        <td className="px-4 py-2">{String(t.type || '')}</td>
                                        <td className="px-4 py-2">{Number(t.amount || 0).toFixed(2)}</td>
                                        <td className="px-4 py-2">{Number(t.balanceAfter || 0).toFixed(2)}</td>
                                        <td className="px-4 py-2">{String(t.description || '')}</td>
                                    </tr>
                                ))}
                                {(Array.isArray(billingTx) ? billingTx.length : 0) === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">لا توجد عمليات ضمن الفترة المحددة.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isProofOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">شحن رصيد المدرسة</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">طريقة الدفع</label>
                                    <select
                                        value={proofMethod}
                                        onChange={(e) => setProofMethod(e.target.value as PaymentMethod)}
                                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value={PaymentMethod.BankDeposit}>إيداع بنكي</option>
                                        <option value={PaymentMethod.WireTransfer}>حوالة شبكية</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ</label>
                                    <input
                                        type="number"
                                        value={proofAmount}
                                        onChange={(e) => setProofAmount(Number(e.target.value))}
                                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المرجع/رقم العملية</label>
                                    <input
                                        type="text"
                                        value={proofReference}
                                        onChange={(e) => setProofReference(e.target.value)}
                                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                      try {
                                          await api.submitPaymentProof({
                                              method: proofMethod,
                                              amount: proofAmount,
                                              reference: proofReference,
                                              relatedService: 'School Balance Top-up',
                                              schoolName: school.name,
                                          });
                                          addToast('تم إرسال إشعار شحن الرصيد للمراجعة', 'success');
                                          setIsProofOpen(false);
                                          setProofReference('');
                                      } catch (e: any) {
                                          addToast(e?.message || 'فشل إرسال الإشعار', 'error');
                                      }
                                  }}
                                  className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                                >
                                  إرسال
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsProofOpen(false)}
                                  className="inline-flex items-center rounded-md border px-4 py-2 text-gray-700 dark:text-gray-300 dark:border-gray-600"
                                >
                                  إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            
            
        </>
    );
};

export default ModulesPage;
