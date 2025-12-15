import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Invoice, InvoiceStatus, PaymentData, NewInvoiceData, Expense, NewExpenseData, SchoolSettings } from '../types';
import * as api from '../api';
import { RevenueIcon, FileIcon, ExpenseIcon, NetProfitIcon } from '../components/icons';
import RecordPaymentModal from '../components/RecordPaymentModal';
import StudentStatementModal from '../components/StudentStatementModal';
import AddInvoiceModal from '../components/AddInvoiceModal';
import AddExpenseModal from '../components/AddExpenseModal';
import { useToast } from '../contexts/ToastContext';
import TableSkeleton from '../components/TableSkeleton';

// Import sub-components
import FinanceOverview from './finance/FinanceOverview';
import FinanceInvoices from './finance/FinanceInvoices';
import FinanceExpenses from './finance/FinanceExpenses';
import FinanceFees from './finance/FinanceFees';
import FinancePayroll from './finance/FinancePayroll';
import FinancialReports from '../components/FinancialReports';

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
    const [statementStudent, setStatementStudent] = useState<{ id: string, name: string } | null>(null);
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
            api.getSchoolExpenses(schoolId),
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
            addToast('تم تسجيل الدفعة بنجاح وإرسال إشعار لولي الأمر.', 'success');
        } catch (error) {
            addToast("فشل تسجيل الدفعة.", 'error');
        }
    };

    const handleSendReminder = async (invoiceId: string) => {
        try {
            await api.sendInvoiceReminder(schoolId, invoiceId);
            addToast('تم إرسال تذكير لولي الأمر بنجاح.', 'success');
        } catch (error) {
            addToast("فشل إرسال التذكير.", 'error');
        }
    };

    const handleAddInvoice = async (invoiceData: NewInvoiceData) => {
        try {
            const newInvoice = await api.addInvoice(schoolId, invoiceData);
            setInvoices(prev => [newInvoice, ...prev]);
            setIsAddInvoiceModalOpen(false);
            addToast(`تم إنشاء فاتورة جديدة للطالب ${newInvoice.studentName}.`, 'success');
        } catch (error) {
            addToast("فشل إنشاء الفاتورة.", 'error');
        }
    };

    const handleAddExpense = async (expenseData: NewExpenseData) => {
        try {
            const newExpense = await api.addSchoolExpense(schoolId, expenseData);
            setExpenses(prev => [newExpense, ...prev]);
            setIsAddExpenseModalOpen(false);
            addToast('تم تسجيل المصروف بنجاح.', 'success');
        } catch (error) {
            addToast("فشل تسجيل المصروف.", 'error');
        }
    };

    const summary = useMemo(() => {
        const totalRevenue = invoices.filter(inv => inv.status === InvoiceStatus.Paid).reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netProfit = totalRevenue - totalExpenses;
        return { totalRevenue, totalExpenses, netProfit };
    }, [invoices, expenses]);

    const tabs = [
        { id: 'overview', label: 'نظرة عامة', icon: RevenueIcon },
        { id: 'invoices', label: 'الفواتير (الإيرادات)', icon: FileIcon },
        { id: 'expenses', label: 'المصروفات', icon: ExpenseIcon },
        { id: 'reports', label: 'التقارير', icon: FileIcon },
        { id: 'fees', label: 'إعداد الرسوم', icon: FileIcon },
        { id: 'payroll', label: 'الرواتب', icon: NetProfitIcon }
    ];

    return (
        <>
            <div className="mt-6 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-md">
                    <nav className="flex gap-2" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <tab.icon className="h-5 w-5 ml-2 rtl:mr-2 rtl:ml-0" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {loading ? (
                    <TableSkeleton />
                ) : (
                    <>
                        {activeTab === 'overview' && (
                            <FinanceOverview
                                totalRevenue={summary.totalRevenue}
                                totalExpenses={summary.totalExpenses}
                                netProfit={summary.netProfit}
                                currency={schoolSettings?.defaultCurrency || schoolSettings?.currency || 'USD'}
                            />
                        )}

                        {activeTab === 'invoices' && (
                            <FinanceInvoices
                                invoices={invoices}
                                schoolSettings={schoolSettings}
                                searchTerm={invoiceSearchTerm}
                                statusFilter={invoiceStatusFilter}
                                onSearchChange={setInvoiceSearchTerm}
                                onStatusFilterChange={setInvoiceStatusFilter}
                                onAddInvoice={() => setIsAddInvoiceModalOpen(true)}
                                onPayInvoice={setInvoiceToPay}
                                onViewStatement={(id, name) => setStatementStudent({ id, name })}
                                onPrintInvoice={() => { }}
                                onSendReminder={handleSendReminder}
                            />
                        )}

                        {activeTab === 'expenses' && (
                            <FinanceExpenses
                                expenses={expenses}
                                schoolSettings={schoolSettings}
                                onAddExpense={() => setIsAddExpenseModalOpen(true)}
                            />
                        )}

                        {activeTab === 'reports' && (
                            <FinancialReports invoices={invoices} expenses={expenses} />
                        )}

                        {activeTab === 'fees' && (
                            <FinanceFees
                                schoolId={schoolId}
                                schoolSettings={schoolSettings}
                                onInvoicesGenerated={(newInvoices) => {
                                    setInvoices(prev => [...newInvoices, ...prev]);
                                }}
                            />
                        )}

                        {activeTab === 'payroll' && (
                            <FinancePayroll
                                schoolId={schoolId}
                                schoolSettings={schoolSettings}
                            />
                        )}
                    </>
                )}
            </div>

            {invoiceToPay && (
                <RecordPaymentModal
                    invoice={invoiceToPay}
                    onClose={() => setInvoiceToPay(null)}
                    onSave={handleRecordPayment}
                />
            )}

            {statementStudent && (
                <StudentStatementModal
                    schoolId={schoolId}
                    studentId={statementStudent.id}
                    studentName={statementStudent.name}
                    onClose={() => setStatementStudent(null)}
                />
            )}

            {isAddInvoiceModalOpen && (
                <AddInvoiceModal
                    schoolId={schoolId}
                    onClose={() => setIsAddInvoiceModalOpen(false)}
                    onSave={handleAddInvoice}
                />
            )}

            {isAddExpenseModalOpen && (
                <AddExpenseModal
                    onClose={() => setIsAddExpenseModalOpen(false)}
                    onSave={handleAddExpense}
                />
            )}
        </>
    );
};

export default Finance;
