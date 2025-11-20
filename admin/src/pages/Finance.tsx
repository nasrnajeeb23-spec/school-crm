

import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Invoice, InvoiceStatus, PaymentData, NewInvoiceData, Expense, NewExpenseData, ExpenseCategory, SchoolSettings } from '../types';
import * as api from '../api';
import StatsCard from '../components/StatsCard';
import { RevenueIcon, TotalDebtIcon, PastDueIcon, FileIcon, PlusIcon, ExpenseIcon, NetProfitIcon } from '../components/icons';
import RecordPaymentModal from '../components/RecordPaymentModal';
import AddInvoiceModal from '../components/AddInvoiceModal';
import AddExpenseModal from '../components/AddExpenseModal';
import { useToast } from '../contexts/ToastContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import BrandableCard from '../components/BrandableCard';

const invoiceStatusColorMap: { [key in InvoiceStatus]: string } = {
  [InvoiceStatus.Paid]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [InvoiceStatus.Unpaid]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [InvoiceStatus.Overdue]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

interface FinanceProps {
    schoolId: number;
    schoolSettings: SchoolSettings | null;
}

const Finance: React.FC<FinanceProps> = ({ schoolId, schoolSettings }) => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('overview');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
    const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
    const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
    
    const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState(location.state?.initialStatusFilter || 'all');
    
    const { addToast } = useToast();

    useEffect(() => {
        fetchData();
    }, [schoolId]);

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.getSchoolInvoices(schoolId),
            api.getSchoolExpenses(schoolId)
        ]).then(([invoicesData, expensesData]) => {
            setInvoices(invoicesData);
            setExpenses(expensesData);
        }).catch(err => {
            console.error("Failed to fetch financial data:", err);
            addToast("فشل تحميل البيانات المالية.", 'error');
        }).finally(() => setLoading(false));
    };
    
    const handleRecordPayment = async (invoiceId: string, paymentData: PaymentData) => {
        try {
            const updatedInvoice = await api.recordPayment(invoiceId, paymentData);
            setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
            setInvoiceToPay(null);
            addToast('تم تسجيل الدفعة بنجاح.', 'success');
        } catch (error) { addToast("فشل تسجيل الدفعة.", 'error'); }
    };

    const handleAddInvoice = async (invoiceData: NewInvoiceData) => {
        try {
            const newInvoice = await api.addInvoice(schoolId, invoiceData);
            setInvoices(prev => [newInvoice, ...prev]);
            setIsAddInvoiceModalOpen(false);
            addToast(`تم إنشاء فاتورة جديدة للطالب ${newInvoice.studentName}.`, 'success');
        } catch (error) { addToast("فشل إنشاء الفاتورة.", 'error'); }
    };

    const handleAddExpense = async (expenseData: NewExpenseData) => {
        try {
            const newExpense = await api.addSchoolExpense(schoolId, expenseData);
            setExpenses(prev => [newExpense, ...prev]);
            setIsAddExpenseModalOpen(false);
            addToast('تم تسجيل المصروف بنجاح.', 'success');
        } catch (error) { addToast("فشل تسجيل المصروف.", 'error'); }
    };

    const summary = useMemo(() => {
        const totalRevenue = invoices.filter(inv => inv.status === InvoiceStatus.Paid).reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netProfit = totalRevenue - totalExpenses;
        return { totalRevenue, totalExpenses, netProfit };
    }, [invoices, expenses]);

    const filteredInvoices = useMemo(() => {
        return invoices
            .filter(invoice => invoiceStatusFilter === 'all' || invoice.status === invoiceStatusFilter)
            .filter(invoice => invoice.studentName.toLowerCase().includes(invoiceSearchTerm.toLowerCase()));
    }, [invoiceSearchTerm, invoiceStatusFilter, invoices]);

    const renderInvoicesTab = () => (
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
                <button onClick={() => setIsAddInvoiceModalOpen(true)} className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"><PlusIcon className="h-5 w-5 ml-2" />إنشاء فاتورة</button>
            </div>
             <div className="overflow-x-auto">
                {filteredInvoices.length > 0 ? (
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th scope="col" className="px-6 py-3">اسم الطالب</th><th scope="col" className="px-6 py-3">تاريخ الاستحقاق</th><th scope="col" className="px-6 py-3">المبلغ</th><th scope="col" className="px-6 py-3">الحالة</th><th scope="col" className="px-6 py-3">إجراءات</th></tr></thead>
                        <tbody>
                            {filteredInvoices.map((invoice) => (<tr key={invoice.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"><td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{invoice.studentName}</td><td className="px-6 py-4">{invoice.dueDate}</td><td className="px-6 py-4 font-semibold">${invoice.totalAmount.toFixed(2)}</td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${invoiceStatusColorMap[invoice.status]}`}>{invoice.status}</span></td><td className="px-6 py-4 space-x-2 rtl:space-x-reverse whitespace-nowrap">{invoice.status !== InvoiceStatus.Paid && <button onClick={() => setInvoiceToPay(invoice)} className="font-medium text-green-600 dark:text-green-500 hover:underline">تسجيل دفعة</button>}<button className="font-medium text-teal-600 dark:text-teal-500 hover:underline">عرض</button></td></tr>))}
                        </tbody>
                    </table>
                ) : (
                    <EmptyState icon={FileIcon} title="لا توجد فواتير" message="لم يتم العثور على فواتير تطابق الفلاتر الحالية." />
                )}
            </div>
        </BrandableCard>
    );
    
    const renderExpensesTab = () => (
        <BrandableCard schoolSettings={schoolSettings}>
            <div className="flex justify-end items-center mb-4"><button onClick={() => setIsAddExpenseModalOpen(true)} className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"><PlusIcon className="h-5 w-5 ml-2" />إضافة مصروف</button></div>
             <div className="overflow-x-auto">
                {expenses.length > 0 ? (
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th scope="col" className="px-6 py-3">التاريخ</th><th scope="col" className="px-6 py-3">الوصف</th><th scope="col" className="px-6 py-3">الفئة</th><th scope="col" className="px-6 py-3">المبلغ</th></tr></thead>
                        <tbody>
                            {expenses.map((expense) => (<tr key={expense.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"><td className="px-6 py-4">{expense.date}</td><td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{expense.description}</td><td className="px-6 py-4">{expense.category}</td><td className="px-6 py-4 font-semibold text-red-500">-${expense.amount.toFixed(2)}</td></tr>))}
                        </tbody>
                    </table>
                ) : (
                    <EmptyState icon={ExpenseIcon} title="لا توجد مصروفات" message="لم يتم تسجيل أي مصروفات بعد." actionText="إضافة مصروف" onAction={() => setIsAddExpenseModalOpen(true)} />
                )}
            </div>
        </BrandableCard>
    );

    const tabs = [ { id: 'overview', label: 'نظرة عامة', icon: RevenueIcon }, { id: 'invoices', label: 'الفواتير (الإيرادات)', icon: FileIcon }, { id: 'expenses', label: 'المصروفات', icon: ExpenseIcon } ];

    return (
        <>
            <div className="mt-6 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-md"><nav className="flex space-x-2 rtl:space-x-reverse" aria-label="Tabs">{tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><tab.icon className="h-5 w-5 ml-2" /><span>{tab.label}</span></button>))}</nav></div>
                {loading ? <TableSkeleton /> : (<>
                        {activeTab === 'overview' && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><StatsCard icon={RevenueIcon} title="إجمالي الإيرادات" value={`$${summary.totalRevenue.toLocaleString()}`} description="مجموع الفواتير المدفوعة" /><StatsCard icon={ExpenseIcon} title="إجمالي المصروفات" value={`$${summary.totalExpenses.toLocaleString()}`} description="مجموع النفقات المسجلة" /><StatsCard icon={NetProfitIcon} title="صافي الربح" value={`$${summary.netProfit.toLocaleString()}`} description="الإيرادات - المصروفات" /></div>)}
                        {activeTab === 'invoices' && renderInvoicesTab()}
                        {activeTab === 'expenses' && renderExpensesTab()}
                </>)}
            </div>
            {invoiceToPay && <RecordPaymentModal invoice={invoiceToPay} onClose={() => setInvoiceToPay(null)} onSave={handleRecordPayment} />}
            {isAddInvoiceModalOpen && <AddInvoiceModal schoolId={schoolId} onClose={() => setIsAddInvoiceModalOpen(false)} onSave={handleAddInvoice} />}
            {isAddExpenseModalOpen && <AddExpenseModal onClose={() => setIsAddExpenseModalOpen(false)} onSave={handleAddExpense} />}
        </>
    );
};

export default Finance;