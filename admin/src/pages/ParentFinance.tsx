import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceStatus, SchoolSettings } from '../types';
import * as api from '../api';
import StatsCard from '../components/StatsCard';
import { RevenueIcon, TotalDebtIcon, CheckIcon, PrintIcon } from '../components/icons';
import { useAppContext } from '../contexts/AppContext';
import InvoicePrintModal from '../components/InvoicePrintModal';
<<<<<<< HEAD
=======
import { SchoolSettings } from '../types';
import { useToast } from '../contexts/ToastContext';
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae

const statusColorMap: { [key in InvoiceStatus]: string } = {
    [InvoiceStatus.Paid]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    [InvoiceStatus.Unpaid]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [InvoiceStatus.Overdue]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const ParentFinance: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
    const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
    const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        if (!user?.parentId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        api.getParentDashboardData(user.parentId)
            .then(data => {
                setInvoices(data.invoices);
            })
            .catch(err => console.error("Failed to fetch finance data:", err))
            .finally(() => setLoading(false));
    }, [user?.parentId]);

    useEffect(() => {
        const sid = user?.schoolId;
        if (!sid) return;
        api.getSchoolSettings(sid).then(setSchoolSettings).catch(() => { });
    }, [user?.schoolId]);

    const financeSummary = useMemo(() => {
        const totalAmount = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
        const paidAmount = invoices
            .filter(inv => inv.status === InvoiceStatus.Paid)
            .reduce((acc, inv) => acc + inv.totalAmount, 0);
        const outstandingAmount = totalAmount - paidAmount;

        return { totalAmount, paidAmount, outstandingAmount };
    }, [invoices]);

    const handlePayNow = async (invoice: Invoice) => {
        if (!user?.parentId) return;
        try {
            setPayingInvoiceId(invoice.id);
            const session = await api.createParentPaymentSession(invoice.id);
            const url = session?.paymentUrl;
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
                addToast('تم فتح صفحة الدفع. يرجى إتمام العملية.', 'info');
            } else {
                addToast('الدفع الإلكتروني غير مفعّل حالياً.', 'warning');
            }
        } catch (e: any) {
            const msg = String(e?.message || '');
            if (/disabled|503/i.test(msg)) addToast('الدفع الإلكتروني غير مفعّل حالياً.', 'warning');
            else addToast('فشل بدء عملية الدفع.', 'error');
        } finally {
            setPayingInvoiceId(null);
        }
    };

    if (loading) {
        return <div className="text-center p-8">جاري تحميل البيانات المالية...</div>;
    }

    if (!user?.parentId) {
        return <div className="text-center p-8">المستخدم غير صالح لعرض هذه الصفحة.</div>;
    }

    if (invoices.length === 0) {
        return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md">لا توجد فواتير لعرضها.</div>;
    }

    return (
        <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard
                    icon={RevenueIcon}
                    title="إجمالي الرسوم"
                    value={`${schoolSettings?.defaultCurrency || 'USD'} ${financeSummary.totalAmount.toLocaleString()}`}
                    description="مجموع كل الفواتير"
                />
                <StatsCard
                    icon={CheckIcon}
                    title="المبلغ المدفوع"
                    value={`${schoolSettings?.defaultCurrency || 'USD'} ${financeSummary.paidAmount.toLocaleString()}`}
                    description="مجموع المبالغ المدفوعة"
                />
                <StatsCard
                    icon={TotalDebtIcon}
                    title="المبلغ المتبقي"
                    value={`${schoolSettings?.defaultCurrency || 'USD'} ${financeSummary.outstandingAmount.toLocaleString()}`}
                    description="الرسوم المستحقة وغير المدفوعة"
                />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">كشف حساب الفواتير</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">رقم الفاتورة</th>
                                <th scope="col" className="px-6 py-3">تاريخ الإصدار</th>
                                <th scope="col" className="px-6 py-3">تاريخ الاستحقاق</th>
                                <th scope="col" className="px-6 py-3">المبلغ</th>
                                <th scope="col" className="px-6 py-3">الحالة</th>
                                <th scope="col" className="px-6 py-3">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{invoice.id}</td>
                                    <td className="px-6 py-4">{invoice.issueDate}</td>
                                    <td className="px-6 py-4">{invoice.dueDate}</td>
                                    <td className="px-6 py-4 font-semibold">{schoolSettings?.defaultCurrency || 'USD'} {invoice.totalAmount.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[invoice.status]}`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {invoice.status !== InvoiceStatus.Paid && (
                                            <button 
                                                onClick={() => handlePayNow(invoice)} 
                                                className="font-medium text-teal-600 dark:text-teal-500 hover:underline"
                                                disabled={payingInvoiceId === invoice.id}
                                            >
                                                دفع الآن
                                            </button>
                                        )}
                                        <button onClick={() => setInvoiceToPrint(invoice)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline mr-4">
                                            <PrintIcon className="inline h-4 w-4 ml-1" />
                                            طباعة
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {invoiceToPrint && <InvoicePrintModal invoice={invoiceToPrint} schoolSettings={schoolSettings} onClose={() => setInvoiceToPrint(null)} />}
        </div>
    );
};

export default ParentFinance;
