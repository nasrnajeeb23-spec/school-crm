import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { PricingConfig, PaymentProofSubmission, Plan } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAppContext } from '../contexts/AppContext';
import PaymentProofModal from '../components/PaymentProofModal';
import { CheckIcon } from '../components/icons';

const SubscriptionLocked: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { currentUser } = useAppContext();
    
    const [pricing, setPricing] = useState<PricingConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [schoolStudents, setSchoolStudents] = useState(0);
    const [schoolTeachers, setSchoolTeachers] = useState(0);
    const [schoolInvoices, setSchoolInvoices] = useState(0);
    const [storageGB, setStorageGB] = useState(0);

    const [plans, setPlans] = useState<Plan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [billingMode, setBillingMode] = useState<'hard_cap' | 'overage'>('hard_cap');
    const [packs, setPacks] = useState<Array<{ type: 'students' | 'teachers' | 'invoices' | 'storageGB'; qty: number; price?: number }>>([]);
    const [newPackType, setNewPackType] = useState<'students' | 'teachers' | 'invoices' | 'storageGB'>('students');
    const [newPackQty, setNewPackQty] = useState<number>(50);
    const [newPackPrice, setNewPackPrice] = useState<number>(0);

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const [priceConf, schoolInfo, plansData, usageState, storageUsage] = await Promise.all([
                    api.getPricingConfig(),
                    api.getSchool(String(currentUser?.schoolId)),
                    api.getPlans(),
                    api.getSubscriptionState(Number(currentUser?.schoolId)).catch(() => null),
                    api.getStorageUsage(Number(currentUser?.schoolId)).catch(() => 0)
                ]);
                setPricing(priceConf);
                setSchoolStudents(schoolInfo.students || 0);
                setSchoolTeachers(schoolInfo.teachers || 0);
                setSchoolInvoices(0);
                setStorageGB(Number(storageUsage || 0));

                setPlans(plansData);
                const currentPlan = plansData.find(p => p.name === schoolInfo.plan) || plansData[0];
                if (currentPlan) setSelectedPlanId(String(currentPlan.id));

                if (usageState && usageState.usage) {
                    setSchoolStudents(Number(usageState.usage.students || schoolInfo.students || 0));
                    setSchoolTeachers(Number(usageState.usage.teachers || schoolInfo.teachers || 0));
                    setSchoolInvoices(Number(usageState.usage.invoices || 0));
                    setStorageGB(Number(usageState.usage.storageGB || storageUsage || 0));
                }
            } catch (e) {
                console.error(e);
                addToast('فشل تحميل بيانات الاشتراك', 'error');
            } finally {
                setLoading(false);
            }
        };
        if (currentUser?.schoolId) fetch();
    }, [currentUser]);

    const baseCost = useMemo(() => {
        return Number(schoolStudents) * Number(pricing?.pricePerStudent || 0);
    }, [schoolStudents, pricing]);

    const quote = useMemo(() => {
        const plan = plans.find(p => String(p.id) === selectedPlanId) || null;
        const currency = pricing?.currency || 'USD';
        const pp = {
            student: Number(pricing?.pricePerStudent || 1.5),
            teacher: Number(pricing?.pricePerTeacher || 2.0),
            invoice: Number(pricing?.pricePerInvoice || 0.05),
            storage: Number(pricing?.pricePerGBStorage || 0.2)
        };
        let limits = { students: 0, teachers: 0, invoices: 0, storageGB: 0 } as any;
        if (plan && plan.limits) {
            limits.students = plan.limits.students === 'غير محدود' ? 999999 : Number(plan.limits.students || 0);
            limits.teachers = plan.limits.teachers === 'غير محدود' ? 999999 : Number(plan.limits.teachers || 0);
            limits.invoices = (plan.limits as any).invoices === 'غير محدود' ? 999999 : Number((plan.limits as any).invoices || 0);
            limits.storageGB = plan.limits.storageGB === 'غير محدود' ? 999999 : Number(plan.limits.storageGB || 0);
        }
        const appliedPacks = Array.isArray(packs) ? packs : [];
        for (const p of appliedPacks) {
            const key = String(p.type).toLowerCase();
            const qty = Number(p.qty || 0);
            if (key === 'students') limits.students += qty;
            else if (key === 'teachers') limits.teachers += qty;
            else if (key === 'invoices') limits.invoices += qty;
            else if (key === 'storagegb') limits.storageGB += qty;
        }
        const os = Math.max(0, schoolStudents - Number(limits.students || 0)) * pp.student;
        const ot = Math.max(0, schoolTeachers - Number(limits.teachers || 0)) * pp.teacher;
        const oi = Math.max(0, schoolInvoices - Number(limits.invoices || 0)) * pp.invoice;
        const og = Math.max(0, storageGB - Number(limits.storageGB || 0)) * pp.storage;
        const overageTotal = billingMode === 'overage' ? (os + ot + oi + og) : 0;
        const planAmount = Number(plan?.price || 0);
        const packsAmount = appliedPacks.reduce((s, p) => s + Number(p.price || 0), 0);
        const total = planAmount + packsAmount + overageTotal;
        return { currency, planAmount, packsAmount, overageTotal, total };
    }, [plans, selectedPlanId, packs, billingMode, pricing, schoolStudents, schoolTeachers, schoolInvoices, storageGB]);

    

    const handlePaymentSubmit = async (data: Omit<PaymentProofSubmission, 'proofImage'>) => {
        try {
            const planName = plans.find(p => String(p.id) === selectedPlanId)?.name || '';
            const ref = `plan=${planName};mode=${billingMode};packs=${encodeURIComponent(JSON.stringify(packs || []))}`;
            const payload = { ...data, reference: ref } as any;
            await api.submitPaymentProof(payload);
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
                                    تشمل: {(plans.find(p => String(p.id) === selectedPlanId)?.features || []).join('، ')}
                                </p>
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">${baseCost.toFixed(2)}/شهرياً</p>
                                <p className="text-xs text-gray-500">({schoolStudents} طالب × ${pricing?.pricePerStudent})</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 border-b pb-2">2. اختيار الخطة</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الخطة</label>
                                <select
                                    value={selectedPlanId}
                                    onChange={(e) => setSelectedPlanId(e.target.value)}
                                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    {plans.map(plan => (
                                        <option key={plan.id} value={plan.id}>{plan.name} - ${plan.price}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="text-center md:text-right">
                                <p className="text-sm text-gray-500 dark:text-gray-400">سعر الخطة</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">${(plans.find(p => String(p.id) === selectedPlanId)?.price || 0).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 border-b pb-2">3. وضع الفوترة</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الوضع</label>
                                <select
                                    value={billingMode}
                                    onChange={(e) => setBillingMode(e.target.value as 'hard_cap' | 'overage')}
                                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="hard_cap">حماية صارمة (بدون زيادة)</option>
                                    <option value="overage">السماح بالزيادة (محاسبة إضافية)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 border-b pb-2">4. توسعات السعة</h2>
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => setPacks([...(packs || []), { type: 'students', qty: 50 }])} className="px-3 py-1 text-sm rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">+50 طالب</button>
                                <button type="button" onClick={() => setPacks([...(packs || []), { type: 'teachers', qty: 5 }])} className="px-3 py-1 text-sm rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">+5 معلم</button>
                                <button type="button" onClick={() => setPacks([...(packs || []), { type: 'invoices', qty: 200 }])} className="px-3 py-1 text-sm rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">+200 فاتورة</button>
                                <button type="button" onClick={() => setPacks([...(packs || []), { type: 'storageGB', qty: 10 }])} className="px-3 py-1 text-sm rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">+10GB تخزين</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">النوع</label>
                                    <select
                                        value={newPackType}
                                        onChange={(e) => setNewPackType(e.target.value as 'students' | 'teachers' | 'invoices' | 'storageGB')}
                                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                    >
                                        <option value="students">طلاب</option>
                                        <option value="teachers">معلمون</option>
                                        <option value="invoices">فواتير</option>
                                        <option value="storageGB">تخزين (GB)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الكمية</label>
                                    <input
                                        type="number"
                                        value={newPackQty}
                                        onChange={(e) => setNewPackQty(Number(e.target.value))}
                                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">السعر الإضافي ($)</label>
                                    <input
                                        type="number"
                                        value={newPackPrice}
                                        onChange={(e) => setNewPackPrice(Number(e.target.value))}
                                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setPacks([...(packs || []), { type: newPackType, qty: newPackQty, price: newPackPrice }])}
                                    className="inline-flex justify-center rounded-md border border-transparent bg-teal-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                                >
                                    إضافة توسعة
                                </button>
                            </div>
                            {Array.isArray(packs) && packs.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    {packs.map((p, idx) => (
                                        <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">النوع</label>
                                                <select
                                                    value={p.type}
                                                    onChange={(e) => {
                                                        const v = e.target.value as 'students' | 'teachers' | 'invoices' | 'storageGB';
                                                        const next = [...packs];
                                                        next[idx] = { ...next[idx], type: v };
                                                        setPacks(next);
                                                    }}
                                                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                                >
                                                    <option value="students">طلاب</option>
                                                    <option value="teachers">معلمون</option>
                                                    <option value="invoices">فواتير</option>
                                                    <option value="storageGB">تخزين (GB)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الكمية</label>
                                                <input
                                                    type="number"
                                                    value={p.qty}
                                                    onChange={(e) => {
                                                        const next = [...packs];
                                                        next[idx] = { ...next[idx], qty: Number(e.target.value) };
                                                        setPacks(next);
                                                    }}
                                                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">السعر الإضافي ($)</label>
                                                <input
                                                    type="number"
                                                    value={p.price || 0}
                                                    onChange={(e) => {
                                                        const next = [...packs];
                                                        next[idx] = { ...next[idx], price: Number(e.target.value) };
                                                        setPacks(next);
                                                    }}
                                                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                                />
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = [...packs];
                                                        next.splice(idx, 1);
                                                        setPacks(next);
                                                    }}
                                                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                                >
                                                    حذف
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-900 p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-center md:text-right">
                            <p className="text-gray-600 dark:text-gray-400">الإجمالي الشهري المطلوب</p>
                            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">${quote.total.toFixed(2)}</p>
                        </div>
                        <button 
                            onClick={() => setShowPaymentModal(true)}
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
                    amount={quote.total}
                    serviceName="تجديد اشتراك المدرسة"
                    schoolName={currentUser?.name || ''} // Assuming admin name roughly matches or fetches school name
                />
            )}
        </div>
    );
};

export default SubscriptionLocked;
