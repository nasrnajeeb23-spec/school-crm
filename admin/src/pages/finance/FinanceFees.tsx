import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Invoice, InvoiceStatus, PaymentData, NewInvoiceData, FeeSetup, DiscountRule, PaymentPlanType, SchoolSettings, SubscriptionState } from '../../types';
import * as api from '../../api';
import { FileIcon, PlusIcon } from '../../components/icons';
import AddInvoiceModal from '../../components/AddInvoiceModal';
import RecordPaymentModal from '../../components/RecordPaymentModal';
import StudentStatementModal from '../../components/StudentStatementModal';
import InvoicePrintModal from '../../components/InvoicePrintModal';
import { useToast } from '../../contexts/ToastContext';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import BrandableCard from '../../components/BrandableCard';
import ResourceUsageWidget from '../../components/ResourceUsageWidget';
import { getCurrencySymbol, formatCurrency } from '../../currency-config';

const invoiceStatusColorMap: { [key in InvoiceStatus]: string } = {
  [InvoiceStatus.Paid]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [InvoiceStatus.Unpaid]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [InvoiceStatus.Overdue]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};
const symbolForCurrency = (cur: string) => getCurrencySymbol(cur);

interface FinanceFeesProps {
    schoolId: number;
    schoolSettings: SchoolSettings | null;
}

const FinanceFees: React.FC<FinanceFeesProps> = ({ schoolId, schoolSettings }) => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'invoices' | 'fees'>('invoices');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [feeSetups, setFeeSetups] = useState<FeeSetup[]>([]);
    const [loading, setLoading] = useState(true);
    const [commUsage, setCommUsage] = useState<{ email: { count: number; amount: number }; sms: { count: number; amount: number }; total: number; currency: string; breakdown?: Array<{ period: string; email: { count: number; amount: number }; sms: { count: number; amount: number }; total: number }> } | null>(null);
    const [commStartDate, setCommStartDate] = useState<string>('');
    const [commEndDate, setCommEndDate] = useState<string>('');
    const [commGroupBy, setCommGroupBy] = useState<'none'|'day'|'month'>('month');
    const [commChannel, setCommChannel] = useState<'all'|'email'|'sms'>('all');
    const [subscriptionState, setSubscriptionState] = useState<SubscriptionState | null>(null);
    
    // Invoice State
    const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
    const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
    const [statementStudent, setStatementStudent] = useState<{id: string, name: string} | null>(null);
    const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
    const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState(location.state?.initialStatusFilter || 'all');

    // Fee Setup State
    const [editingFeeId, setEditingFeeId] = useState<string>('');
    const [newFee, setNewFee] = useState<Partial<FeeSetup>>({ stage: '', tuitionFee: 0, bookFees: 0, uniformFees: 0, activityFees: 0, paymentPlanType: 'Monthly', discounts: [] });
    
    // Generation State
    const [genStage, setGenStage] = useState<string>('');
    const [genDueDate, setGenDueDate] = useState<string>('');
    const [genIncludeBooks, setGenIncludeBooks] = useState<boolean>(true);
    const [genIncludeUniform, setGenIncludeUniform] = useState<boolean>(true);
    const [genIncludeActivities, setGenIncludeActivities] = useState<boolean>(true);
    const [genDiscounts, setGenDiscounts] = useState<string[]>([]);

    const { addToast } = useToast();

    useEffect(() => {
        fetchData();
    }, [schoolId]);

    const fetchData = () => {
        setLoading(true);
        const usageParams: any = {};
        if (commStartDate && commEndDate) { usageParams.startDate = commStartDate; usageParams.endDate = commEndDate; }
        if (commGroupBy && commGroupBy !== 'none') { usageParams.groupBy = commGroupBy; }
        if (commChannel && commChannel !== 'all') { usageParams.channel = commChannel; }
        Promise.all([
            api.getSchoolInvoices(schoolId),
            api.getFeeSetups(schoolId),
            api.getSchoolCommunicationsUsage(schoolId, usageParams),
            api.getSubscriptionState(schoolId)
        ]).then(([invoicesData, feesData, usageData, subState]) => {
            setInvoices(invoicesData);
            setFeeSetups(feesData);
            setCommUsage(usageData);
            setSubscriptionState(subState);
        }).catch(err => {
            console.error("Failed to fetch fee data:", err);
            setCommUsage(null);
            addToast("فشل تحميل بيانات الرسوم.", 'error');
        }).finally(() => setLoading(false));
    };

    // Invoice Actions
    const handleRecordPayment = async (invoiceId: string, paymentData: PaymentData) => {
        try {
            const updatedInvoice = await api.recordPayment(invoiceId, paymentData);
            setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
            setInvoiceToPay(null);
            addToast('تم تسجيل الدفعة بنجاح.', 'success');
        } catch (error) { addToast("فشل تسجيل الدفعة.", 'error'); }
    };

    const handleSendReminder = async (invoiceId: string) => {
        try {
            await api.sendInvoiceReminder(schoolId, invoiceId);
            addToast('تم إرسال تذكير لولي الأمر بنجاح.', 'success');
        } catch (error) { addToast("فشل إرسال التذكير.", 'error'); }
    };

    const handleAddInvoice = async (invoiceData: NewInvoiceData) => {
        try {
            const newInvoice = await api.addInvoice(schoolId, invoiceData);
            setInvoices(prev => [newInvoice, ...prev]);
            setIsAddInvoiceModalOpen(false);
            addToast(`تم إنشاء فاتورة جديدة للطالب ${newInvoice.studentName}.`, 'success');
        } catch (error: any) {
            const msg = String(error?.message || '');
            if (msg.includes('LIMIT_EXCEEDED') || msg.includes('تم بلوغ حد الموارد')) {
                addToast('تم بلوغ حد الفواتير. يرجى الترقية أو زيادة الحد.', 'warning');
                try { window.location.assign('/superadmin/subscriptions'); } catch {}
                return;
            }
            addToast("فشل إنشاء الفاتورة.", 'error');
        }
    };

    const filteredInvoices = useMemo(() => {
        return invoices
            .filter(invoice => invoiceStatusFilter === 'all' || invoice.status === invoiceStatusFilter)
            .filter(invoice => invoice.studentName.toLowerCase().includes(invoiceSearchTerm.toLowerCase()));
    }, [invoiceSearchTerm, invoiceStatusFilter, invoices]);

    // Fee Setup Actions
    const stages = Array.isArray(schoolSettings?.availableStages) ? schoolSettings!.availableStages : ['مرحلة'];
    
    const addDiscount = () => {
        const d: DiscountRule = { type: 'Sibling', percentage: 0 };
        setNewFee(prev => ({ ...prev, discounts: [ ...(prev.discounts || []), d ] }));
    };

    const updateDiscount = (idx: number, field: keyof DiscountRule, value: any) => {
        const arr = [...(newFee.discounts || [])];
        (arr[idx] as any)[field] = field === 'percentage' ? Number(value || 0) : value;
        setNewFee(prev => ({ ...prev, discounts: arr }));
    };

    const removeDiscount = (idx: number) => {
        const arr = [...(newFee.discounts || [])];
        arr.splice(idx,1);
        setNewFee(prev => ({ ...prev, discounts: arr }));
    };

    const saveFee = async () => {
        try {
            if (!newFee.stage) { addToast('اختر المرحلة.', 'error'); return; }
            const plan = String(newFee.paymentPlanType || 'Monthly');
            if (!['Monthly','Termly','Installments'].includes(plan)) { addToast('خطة الدفع غير صحيحة.', 'error'); return; }
            const tf = Number(newFee.tuitionFee || 0);
            const bf = Number(newFee.bookFees || 0);
            const uf = Number(newFee.uniformFees || 0);
            const af = Number(newFee.activityFees || 0);
            if (tf < 0 || bf < 0 || uf < 0 || af < 0) { addToast('القيم يجب أن تكون غير سالبة.', 'error'); return; }
            const ds = Array.isArray(newFee.discounts) ? newFee.discounts : [];
            for (const d of ds) {
                const pct = Number(d.percentage || 0);
                if (pct < 0 || pct > 100) { addToast('نسبة الخصم بين 0 و 100%.', 'error'); return; }
            }
            if (!editingFeeId) {
                const dup = feeSetups.some(f => f.stage === newFee.stage);
                if (dup) { addToast('هذه المرحلة مضافة مسبقًا.', 'error'); return; }
                const created = await api.createFeeSetup(schoolId, newFee as any);
                setFeeSetups(prev => [created, ...prev]);
            } else {
                const dupEdit = feeSetups.some(f => f.stage === newFee.stage && f.id !== editingFeeId);
                if (dupEdit) { addToast('مرحلة مكررة. عدّل إلى مرحلة فريدة.', 'error'); return; }
                const updated = await api.updateFeeSetup(schoolId, editingFeeId, newFee as any);
                setFeeSetups(prev => prev.map(f => f.id === editingFeeId ? updated : f));
                setEditingFeeId('');
            }
            setNewFee({ stage: '', tuitionFee: 0, bookFees: 0, uniformFees: 0, activityFees: 0, paymentPlanType: 'Monthly', discounts: [] });
            addToast('تم حفظ إعداد الرسوم.', 'success');
        } catch (e: any) {
            const msg = String(e?.message || '');
            if (msg.includes('DUPLICATE') || msg.includes('Stage already configured')) { addToast('هذه المرحلة مضافة مسبقًا.', 'error'); return; }
            addToast('فشل حفظ إعداد الرسوم.', 'error');
        }
    };

    const deleteFee = async (id: string) => {
        try { await api.deleteFeeSetup(schoolId, id); setFeeSetups(prev => prev.filter(f => f.id !== id)); addToast('تم حذف الإعداد.', 'success'); } catch { addToast('فشل حذف الإعداد.', 'error'); }
    };

    const generateInvoices = async () => {
        if (!genStage || !genDueDate) { addToast('اختر المرحلة وحدد تاريخ الاستحقاق.', 'error'); return; }
        try {
            const limits = (subscriptionState?.limits || subscriptionState?.plan?.limits || { invoices: 100 }) as any;
            const currentInv = (subscriptionState?.usage?.invoices ?? invoices.length) as number;
            const maxInv = limits?.invoices === 'غير محدود' ? Infinity : Number(limits?.invoices || 100);
            if (currentInv >= maxInv) { addToast('تم بلوغ حد الفواتير. يرجى الترقية أو زيادة الحد.', 'warning'); return; }
            const res = await api.generateInvoicesFromFees(schoolId, { stage: genStage, dueDate: genDueDate, include: { books: genIncludeBooks, uniform: genIncludeUniform, activities: genIncludeActivities }, defaultDiscounts: genDiscounts });
            addToast(`تم إنشاء ${res.createdCount} فاتورة.`, 'success');
            const invs = await api.getSchoolInvoices(schoolId);
            setInvoices(invs);
            setGenStage('');
            try { const s = await api.getSubscriptionState(schoolId); setSubscriptionState(s); } catch {}
        } catch { addToast('فشل إنشاء الفواتير.', 'error'); }
    };

    const toggleGenDiscount = (v: string) => {
        setGenDiscounts(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
    };

    const canCreateInvoice = useMemo(() => {
        const limits = (subscriptionState?.limits || subscriptionState?.plan?.limits || { invoices: 100 }) as any;
        const currentInv = (subscriptionState?.usage?.invoices ?? invoices.length) as number;
        const maxInv = limits?.invoices === 'غير محدود' ? Infinity : Number(limits?.invoices || 100);
        return currentInv < maxInv;
    }, [subscriptionState, invoices]);

    if (loading) return <TableSkeleton />;

    return (
        <div className="mt-6 space-y-6">
            <div className="flex gap-4 mb-4">
                <button onClick={() => setActiveTab('invoices')} className={`px-4 py-2 rounded-lg ${activeTab === 'invoices' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>الفواتير</button>
                <button onClick={() => setActiveTab('fees')} className={`px-4 py-2 rounded-lg ${activeTab === 'fees' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>إعداد الرسوم</button>
            </div>

            {activeTab === 'invoices' ? (<>
                <ResourceUsageWidget schoolId={schoolId} />
                <BrandableCard schoolSettings={schoolSettings}>
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                        <div className="flex items-center gap-4">
                            <input type="text" placeholder="ابحث باسم الطالب..." value={invoiceSearchTerm} onChange={e => setInvoiceSearchTerm(e.target.value)} className="w-full md:w-72 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                            <select value={invoiceStatusFilter} onChange={e => setInvoiceStatusFilter(e.target.value)} className="w-full md:w-48 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
                                <option value="all">كل الحالات</option>
                                <option value={InvoiceStatus.Paid}>مدفوعة</option>
                                <option value={InvoiceStatus.Unpaid}>غير مدفوعة</option>
                                <option value={InvoiceStatus.Overdue}>متأخرة</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setIsAddInvoiceModalOpen(true)} disabled={!canCreateInvoice} className={`flex items-center px-4 py-2 rounded-lg transition-colors ${canCreateInvoice ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'}`}><PlusIcon className="h-5 w-5 ml-2" />إنشاء فاتورة</button>
                          {!canCreateInvoice && <span className="text-xs text-red-600 dark:text-red-400">تم بلوغ حد الفواتير</span>}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        {filteredInvoices.length > 0 ? (
                            <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th className="px-6 py-3">اسم الطالب</th><th className="px-6 py-3">تاريخ الاستحقاق</th><th className="px-6 py-3">المبلغ</th><th className="px-6 py-3">المدفوع</th><th className="px-6 py-3">المتبقي</th><th className="px-6 py-3">الحالة</th><th className="px-6 py-3">إجراءات</th></tr></thead>
                                <tbody>
                                    {filteredInvoices.map((invoice) => {
                                      const cur = (schoolSettings?.defaultCurrency || 'SAR') as string;
                                      const sym = symbolForCurrency(cur);
                                      const remaining = (invoice.remainingAmount !== undefined && invoice.remainingAmount !== null)
                                        ? invoice.remainingAmount
                                        : (invoice.totalAmount - (invoice.paidAmount || 0));
                                      return (
                                        <tr key={invoice.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                          <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{invoice.studentName}</td>
                                          <td className="px-6 py-4">{invoice.dueDate}</td>
                                          <td className="px-6 py-4 font-semibold">{formatCurrency(invoice.totalAmount, cur)}</td>
                                          <td className="px-6 py-4 text-green-600">{formatCurrency((invoice.paidAmount || 0), cur)}</td>
                                          <td className="px-6 py-4 text-red-600">{formatCurrency(remaining, cur)}</td>
                                          <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${invoiceStatusColorMap[invoice.status]}`}>{invoice.status}</span></td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex gap-2">
                                              {invoice.status !== InvoiceStatus.Paid && <button onClick={() => setInvoiceToPay(invoice)} className="font-medium text-green-600 dark:text-green-500 hover:underline">تسجيل دفعة</button>}
                                              <button onClick={() => setStatementStudent({ id: invoice.studentId, name: invoice.studentName })} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">كشف حساب</button>
                                              <button onClick={() => setInvoiceToPrint(invoice)} className="font-medium text-teal-600 dark:text-teal-500 hover:underline">طباعة فاتورة</button>
                                              {invoice.status === InvoiceStatus.Overdue && <button onClick={() => handleSendReminder(invoice.id)} className="font-medium text-orange-600 dark:text-orange-500 hover:underline">تذكير</button>}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <EmptyState icon={FileIcon} title="لا توجد فواتير" message="لم يتم العثور على فواتير." />
                        )}
                    </div>
                </BrandableCard>
                {invoiceToPrint && <InvoicePrintModal invoice={invoiceToPrint} schoolSettings={schoolSettings} onClose={() => setInvoiceToPrint(null)} />}
                <BrandableCard schoolSettings={schoolSettings}>
                    <div className="p-1">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">استخدام الاتصالات</h3>
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <input type="date" value={commStartDate} onChange={e => setCommStartDate(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                            <input type="date" value={commEndDate} onChange={e => setCommEndDate(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                            <select value={commGroupBy} onChange={e => setCommGroupBy(e.target.value as any)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                                <option value="none">بدون تجميع</option>
                                <option value="month">شهري</option>
                                <option value="day">يومي</option>
                            </select>
                            <select value={commChannel} onChange={e => setCommChannel(e.target.value as any)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                                <option value="all">كل القنوات</option>
                                <option value="email">البريد الإلكتروني</option>
                                <option value="sms">SMS</option>
                            </select>
                            <button onClick={fetchData} className="px-3 py-2 bg-teal-600 text-white rounded-lg">تطبيق</button>
                        </div>
                        {commUsage ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <div className="flex justify-between items-center mb-1"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</span><span className="text-xs font-bold text-gray-900 dark:text-white">{commUsage.email.count} رسالة</span></div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300">التكلفة: {formatCurrency(commUsage.email.amount, commUsage.currency)}</div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">الرسائل النصية</span><span className="text-xs font-bold text-gray-900 dark:text-white">{commUsage.sms.count} رسالة</span></div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300">التكلفة: {formatCurrency(commUsage.sms.amount, commUsage.currency)}</div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">المجموع</span><span className="text-xs font-bold text-gray-900 dark:text-white">{formatCurrency(commUsage.total, commUsage.currency)}</span></div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300">الفوترة حسب مزود المنصة فقط</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-300">لا توجد بيانات استخدام الاتصالات حالياً.</div>
                        )}
                        {commUsage && Array.isArray(commUsage.breakdown) && commUsage.breakdown.length > 0 ? (
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr><th className="px-6 py-3">الفترة</th><th className="px-6 py-3">البريد (عدد/تكلفة)</th><th className="px-6 py-3">SMS (عدد/تكلفة)</th><th className="px-6 py-3">الإجمالي</th></tr>
                                    </thead>
                                    <tbody>
                                        {commUsage.breakdown.map((b) => (
                                            <tr key={b.period} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{b.period}</td>
                                                <td className="px-6 py-4">{b.email.count} / {formatCurrency(b.email.amount, commUsage.currency)}</td>
                                                <td className="px-6 py-4">{b.sms.count} / {formatCurrency(b.sms.amount, commUsage.currency)}</td>
                                                <td className="px-6 py-4 font-semibold">{formatCurrency(b.total, commUsage.currency)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </div>
                </BrandableCard>
            </>) : (
                <BrandableCard schoolSettings={schoolSettings}>
                    <div className="flex items-center justify-between mb-4"><h4 className="font-semibold">إعداد الرسوم الدراسية</h4></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <select value={newFee.stage as string} onChange={e => setNewFee(prev => ({ ...prev, stage: e.target.value }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="">اختر المرحلة...</option>
                            {stages.map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                        <input type="number" step="0.01" placeholder="رسوم الدراسة" value={Number(newFee.tuitionFee || 0)} onChange={e => setNewFee(prev => ({ ...prev, tuitionFee: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" step="0.01" placeholder="رسوم الكتب" value={Number(newFee.bookFees || 0)} onChange={e => setNewFee(prev => ({ ...prev, bookFees: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" step="0.01" placeholder="رسوم الزي" value={Number(newFee.uniformFees || 0)} onChange={e => setNewFee(prev => ({ ...prev, uniformFees: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" step="0.01" placeholder="رسوم الأنشطة" value={Number(newFee.activityFees || 0)} onChange={e => setNewFee(prev => ({ ...prev, activityFees: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <select value={newFee.paymentPlanType as PaymentPlanType} onChange={e => setNewFee(prev => ({ ...prev, paymentPlanType: e.target.value as PaymentPlanType }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="Monthly">شهري</option>
                            <option value="Termly">فصلي</option>
                            <option value="Installments">أقساط</option>
                        </select>
                        <button onClick={saveFee} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">{editingFeeId ? 'تحديث' : 'حفظ'}</button>
                    </div>
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2"><h5 className="font-medium">الخصومات</h5><button onClick={addDiscount} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">إضافة خصم</button></div>
                        {(newFee.discounts || []).map((d, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-2">
                                <select value={d.type} onChange={e => updateDiscount(idx, 'type', e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                                    <option value="Sibling">أخوة</option>
                                    <option value="TopAchiever">متفوق</option>
                                    <option value="Orphan">يتيم</option>
                                </select>
                                <input type="number" step="0.01" placeholder="نسبة الخصم %" value={Number(d.percentage || 0)} onChange={e => updateDiscount(idx, 'percentage', e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                                <div className="md:col-span-3 flex items-center"><button onClick={() => removeDiscount(idx)} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">حذف</button></div>
                            </div>
                        ))}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th className="px-6 py-3">المرحلة</th><th className="px-6 py-3">الدراسة</th><th className="px-6 py-3">الكتب</th><th className="px-6 py-3">الزي</th><th className="px-6 py-3">الأنشطة</th><th className="px-6 py-3">الخطة</th><th className="px-6 py-3">خصومات</th><th className="px-6 py-3">إجراءات</th></tr></thead>
                            <tbody>
                                {feeSetups.map(f => (
                                    <tr key={f.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{f.stage}</td>
                                        <td className="px-6 py-4">{Number(f.tuitionFee || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4">{Number(f.bookFees || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4">{Number(f.uniformFees || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4">{Number(f.activityFees || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4">{f.paymentPlanType === 'Monthly' ? 'شهري' : f.paymentPlanType === 'Termly' ? 'فصلي' : 'أقساط'}</td>
                                        <td className="px-6 py-4">{(f.discounts || []).map(d => `${d.type}:${d.percentage}%`).join(', ')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex gap-2"><button onClick={() => { setEditingFeeId(f.id); setNewFee(f); }} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">تعديل</button><button onClick={() => deleteFee(f.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">حذف</button><button onClick={() => { setGenStage(f.stage); setGenDueDate(''); setGenIncludeBooks(true); setGenIncludeUniform(true); setGenIncludeActivities(true); setGenDiscounts([]); }} className="font-medium text-teal-600 dark:text-teal-500 hover:underline">توليد فواتير</button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {genStage && (
                        <div className="mt-4 p-4 border rounded-lg dark:border-gray-700">
                            <div className="mb-2 font-medium">توليد فواتير للمرحلة: {genStage}</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <input type="date" value={genDueDate} onChange={e => setGenDueDate(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                                <label className="flex items-center gap-2"><input type="checkbox" checked={genIncludeBooks} onChange={e => setGenIncludeBooks(e.target.checked)} /><span>تشمل الكتب</span></label>
                                <label className="flex items-center gap-2"><input type="checkbox" checked={genIncludeUniform} onChange={e => setGenIncludeUniform(e.target.checked)} /><span>يشمل الزي</span></label>
                                <label className="flex items-center gap-2"><input type="checkbox" checked={genIncludeActivities} onChange={e => setGenIncludeActivities(e.target.checked)} /><span>تشمل الأنشطة</span></label>
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <label className="flex items-center gap-2"><input type="checkbox" checked={genDiscounts.includes('Sibling')} onChange={() => toggleGenDiscount('Sibling')} /><span>خصم أخوة</span></label>
                                <label className="flex items-center gap-2"><input type="checkbox" checked={genDiscounts.includes('TopAchiever')} onChange={() => toggleGenDiscount('TopAchiever')} /><span>خصم متفوق</span></label>
                                <label className="flex items-center gap-2"><input type="checkbox" checked={genDiscounts.includes('Orphan')} onChange={() => toggleGenDiscount('Orphan')} /><span>خصم يتيم</span></label>
                            </div>
                            <div className="flex items-center gap-2"><button onClick={generateInvoices} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">توليد</button><button onClick={() => setGenStage('')} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white">إلغاء</button></div>
                        </div>
                    )}
                </BrandableCard>
            )}

            {invoiceToPay && <RecordPaymentModal invoice={invoiceToPay} onClose={() => setInvoiceToPay(null)} onSave={handleRecordPayment} currencyCode={(schoolSettings?.defaultCurrency || 'SAR') as string} />}
            {statementStudent && <StudentStatementModal schoolId={schoolId} studentId={statementStudent.id} studentName={statementStudent.name} onClose={() => setStatementStudent(null)} />}
            {isAddInvoiceModalOpen && <AddInvoiceModal schoolId={schoolId} onClose={() => setIsAddInvoiceModalOpen(false)} onSave={handleAddInvoice} currencyCode={(schoolSettings?.defaultCurrency || 'SAR') as string} />}
        </div>
    );
};

export default FinanceFees;
