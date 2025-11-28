

import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Invoice, InvoiceStatus, PaymentData, NewInvoiceData, Expense, NewExpenseData, ExpenseCategory, SchoolSettings, Teacher, User, FeeSetup, DiscountRule, PaymentPlanType } from '../types';
import * as api from '../api';
import StatsCard from '../components/StatsCard';
import { RevenueIcon, TotalDebtIcon, PastDueIcon, FileIcon, PlusIcon, ExpenseIcon, NetProfitIcon } from '../components/icons';
import type { SalaryStructurePayload } from '../api';
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
    const [salaryStructures, setSalaryStructures] = useState<SalaryStructurePayload[]>([]);
    const [staff, setStaff] = useState<User[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [salarySlips, setSalarySlips] = useState<any[]>([]);
    const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7));
    const [newStructure, setNewStructure] = useState<SalaryStructurePayload>({ name: '', type: 'Fixed', baseAmount: 0, allowances: [], deductions: [], appliesTo: 'staff', isDefault: false, absencePenaltyPerDay: 0, latePenaltyPerMinute: 0, overtimeRatePerMinute: 0 });
    const [assignTargetType, setAssignTargetType] = useState<'staff' | 'teacher'>('staff');
    const [assignTargetId, setAssignTargetId] = useState<string>('');
    const [assignStructureId, setAssignStructureId] = useState<string>('');
    const [receiptSlipId, setReceiptSlipId] = useState<string>('');
    const [receiptNumber, setReceiptNumber] = useState<string>('');
    const [receiptDate, setReceiptDate] = useState<string>('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [attendanceUserId, setAttendanceUserId] = useState<string>('');
    const [attendanceDate, setAttendanceDate] = useState<string>('');
    const [attendanceCheckIn, setAttendanceCheckIn] = useState<string>('');
    const [attendanceCheckOut, setAttendanceCheckOut] = useState<string>('');
    const [attendanceHoursWorked, setAttendanceHoursWorked] = useState<string>('');
    const [attendanceStatus, setAttendanceStatus] = useState<'Present' | 'Absent' | 'Late'>('Present');
    const [attendanceLateMinutes, setAttendanceLateMinutes] = useState<string>('');
    const [attendanceOvertimeMinutes, setAttendanceOvertimeMinutes] = useState<string>('');
    const [feeSetups, setFeeSetups] = useState<FeeSetup[]>([]);
    const [editingFeeId, setEditingFeeId] = useState<string>('');
    const [newFee, setNewFee] = useState<Partial<FeeSetup>>({ stage: '', tuitionFee: 0, bookFees: 0, uniformFees: 0, activityFees: 0, paymentPlanType: 'Monthly', discounts: [] });
    const [genStage, setGenStage] = useState<string>('');
    const [genDueDate, setGenDueDate] = useState<string>('');
    const [genIncludeBooks, setGenIncludeBooks] = useState<boolean>(true);
    const [genIncludeUniform, setGenIncludeUniform] = useState<boolean>(true);
    const [genIncludeActivities, setGenIncludeActivities] = useState<boolean>(true);
    const [genDiscounts, setGenDiscounts] = useState<string[]>([]);
    
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
            api.getSalaryStructures(schoolId),
            api.getSchoolStaff(schoolId),
            api.getSchoolTeachers(schoolId),
            api.getSalarySlipsForSchool(schoolId, month),
            api.getFeeSetups(schoolId),
        ]).then(([invoicesData, expensesData, structuresData, staffData, teachersData, slipsData, feesData]) => {
            setInvoices(invoicesData);
            setExpenses(expensesData);
            setSalaryStructures(structuresData);
            setStaff(staffData);
            setTeachers(teachersData);
            setSalarySlips(slipsData);
            setFeeSetups(feesData);
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
                            {filteredInvoices.map((invoice) => (<tr key={invoice.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"><td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{invoice.studentName}</td><td className="px-6 py-4">{invoice.dueDate}</td><td className="px-6 py-4 font-semibold">${invoice.totalAmount.toFixed(2)}</td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${invoiceStatusColorMap[invoice.status]}`}>{invoice.status}</span></td><td className="px-6 py-4 whitespace-nowrap"><div className="flex gap-2">{invoice.status !== InvoiceStatus.Paid && <button onClick={() => setInvoiceToPay(invoice)} className="font-medium text-green-600 dark:text-green-500 hover:underline">تسجيل دفعة</button>}<button className="font-medium text-teal-600 dark:text-teal-500 hover:underline">عرض</button></div></td></tr>))}
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

    const renderPayrollTab = () => {
        const personName = (type: 'staff' | 'teacher', id: string) => {
            if (type === 'staff') {
                const u = staff.find(s => String(s.id) === String(id));
                return u ? u.name : id;
            } else {
                const t = teachers.find(s => String(s.id) === String(id));
                return t ? t.name : id;
            }
        };
        const handleCreateStructure = async () => {
            try {
                const created = await api.createSalaryStructure(schoolId, newStructure);
                setSalaryStructures(prev => [created, ...prev]);
                setNewStructure({ name: '', type: 'Fixed', baseAmount: 0, allowances: [], deductions: [], appliesTo: 'staff', isDefault: false });
                addToast('تم إنشاء هيكل راتب.', 'success');
            } catch (e) { addToast('فشل إنشاء هيكل الراتب.', 'error'); }
        };
        const handleDeleteStructure = async (id: string) => {
            try { await api.deleteSalaryStructure(schoolId, id); setSalaryStructures(prev => prev.filter(s => s.id !== id)); addToast('تم حذف الهيكل.', 'success'); } catch { addToast('فشل حذف الهيكل.', 'error'); }
        };
        const handleAssign = async () => {
            try {
                if (!assignTargetId || !assignStructureId) return;
                if (assignTargetType === 'staff') await api.assignSalaryStructureToStaff(schoolId, assignTargetId, assignStructureId);
                else await api.assignSalaryStructureToTeacher(schoolId, assignTargetId, assignStructureId);
                addToast('تم الربط بنجاح.', 'success');
            } catch (e) { addToast('فشل الربط.', 'error'); }
        };
        const handleProcess = async () => {
            try { const res = await api.processPayrollForMonth(schoolId, month); addToast(`تم توليد ${res.createdCount} كشف راتب.`, 'success'); const slips = await api.getSalarySlipsForSchool(schoolId, month); setSalarySlips(slips); } catch (e) { addToast('فشل إصدار الرواتب.', 'error'); }
        };
        const handleApprove = async (id: string) => {
            try { const updated = await api.approveSalarySlip(schoolId, id); setSalarySlips(prev => prev.map(s => s.id === id ? updated : s)); addToast('تمت الموافقة على الكشف.', 'success'); } catch { addToast('فشل الموافقة.', 'error'); }
        };
        const handleSubmitReceipt = async () => {
            if (!receiptSlipId) return;
            try {
                const updated = await api.submitPayrollReceipt(schoolId, receiptSlipId, { receiptNumber, receiptDate, attachment: receiptFile });
                setSalarySlips(prev => prev.map(s => s.id === receiptSlipId ? updated : s));
                setReceiptSlipId(''); setReceiptNumber(''); setReceiptDate(''); setReceiptFile(null);
                addToast('تم رفع سند الاستلام وتحديث الحالة إلى مدفوع.', 'success');
            } catch { addToast('فشل رفع السند.', 'error'); }
        };
        return (
            <div className="space-y-6">
                <BrandableCard schoolSettings={schoolSettings}>
                    <div className="flex items-center justify-between mb-4"><h4 className="font-semibold">هياكل الرواتب</h4></div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                        <input type="text" placeholder="اسم الهيكل" value={newStructure.name} onChange={e => setNewStructure(prev => ({ ...prev, name: e.target.value }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <select value={newStructure.type} onChange={e => setNewStructure(prev => ({ ...prev, type: e.target.value as any }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="Fixed">راتب شهري ثابت</option>
                            <option value="Hourly">بالساعات</option>
                            <option value="PartTime">دوام جزئي</option>
                            <option value="PerLesson">بالحصص</option>
                        </select>
                        <input type="number" placeholder="الراتب الأساسي" value={Number(newStructure.baseAmount || 0)} onChange={e => setNewStructure(prev => ({ ...prev, baseAmount: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <select value={newStructure.appliesTo || 'staff'} onChange={e => setNewStructure(prev => ({ ...prev, appliesTo: e.target.value as any }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="staff">الموظفون</option>
                            <option value="teacher">المعلمون</option>
                        </select>
                        <button onClick={handleCreateStructure} className="px-4 py-2 bg-teال-600 text-white rounded-lg hover:bg-teال-700">إضافة هيكل</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <input type="number" step="0.01" placeholder="غرامة غياب/اليوم" value={Number(newStructure.absencePenaltyPerDay || 0)} onChange={e => setNewStructure(prev => ({ ...prev, absencePenaltyPerDay: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" step="0.0001" placeholder="غرامة تأخير/دقيقة" value={Number(newStructure.latePenaltyPerMinute || 0)} onChange={e => setNewStructure(prev => ({ ...prev, latePenaltyPerMinute: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" step="0.0001" placeholder="أجر إضافي/دقيقة" value={Number(newStructure.overtimeRatePerMinute || 0)} onChange={e => setNewStructure(prev => ({ ...prev, overtimeRatePerMinute: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th className="px-6 py-3">الاسم</th><th className="px-6 py-3">النوع</th><th className="px-6 py-3">أساسي</th><th className="px-6 py-3">ينطبق على</th><th className="px-6 py-3">إجراءات</th></tr></thead>
                            <tbody>
                                {salaryStructures.map(s => (<tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"><td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{s.name}</td><td className="px-6 py-4">{s.type}</td><td className="px-6 py-4">{Number(s.baseAmount || 0).toFixed(2)}</td><td className="px-6 py-4">{s.appliesTo === 'staff' ? 'الموظفون' : 'المعلمون'}</td><td className="px-6 py-4"><button onClick={() => handleDeleteStructure(s.id!)} className="font-medium text-red-600 dark:text-red-500 hover:underline">حذف</button></td></tr>))}
                            </tbody>
                        </table>
                    </div>
                </BrandableCard>
                <BrandableCard schoolSettings={schoolSettings}>
                    <div className="flex items-center justify-between mb-4"><h4 className="font-semibold">الربط بين الموظفين/المعلمين وهيكل الراتب</h4></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <select value={assignTargetType} onChange={e => setAssignTargetType(e.target.value as any)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="staff">الموظفون</option>
                            <option value="teacher">المعلمون</option>
                        </select>
                        <select value={assignTargetId} onChange={e => setAssignTargetId(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="">اختر الشخص...</option>
                            {(assignTargetType === 'staff' ? staff : teachers).map(p => (<option key={p.id} value={String(p.id)}>{p.name}</option>))}
                        </select>
                        <select value={assignStructureId} onChange={e => setAssignStructureId(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="">اختر الهيكل...</option>
                            {salaryStructures.filter(s => (assignTargetType === 'staff' ? s.appliesTo === 'staff' : s.appliesTo === 'teacher')).map(s => (<option key={s.id} value={s.id!}>{s.name}</option>))}
                        </select>
                        <button onClick={handleAssign} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">ربط</button>
                    </div>
                </BrandableCard>
                <BrandableCard schoolSettings={schoolSettings}>
                    <div className="flex items-center justify-between mb-4"><h4 className="font-semibold">إصدار الرواتب الشهرية</h4></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <button onClick={handleProcess} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">توليد كشوف الرواتب</button>
                        <button onClick={async () => { const slips = await api.getSalarySlipsForSchool(schoolId, month); setSalarySlips(slips); }} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">تحديث القائمة</button>
                    </div>
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th className="px-6 py-3">الشخص</th><th className="px-6 py-3">النوع</th><th className="px-6 py-3">الشهر</th><th className="px-6 py-3">الصافي</th><th className="px-6 py-3">الحالة</th><th className="px-6 py-3">إجراءات</th></tr></thead>
                            <tbody>
                                {salarySlips.map(s => (
                                    <tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{personName(s.personType, String(s.personId))}</td>
                                        <td className="px-6 py-4">{s.personType === 'staff' ? 'الموظف' : 'المعلم'}</td>
                                        <td className="px-6 py-4">{s.month}</td>
                                        <td className="px-6 py-4 font-semibold">{Number(s.netAmount || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4">{s.status}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex gap-2">
                                                {s.status === 'Draft' && (<button onClick={() => handleApprove(s.id)} className="font-medium text-teال-600 dark:text-teal-500 hover:underline">موافقة</button>)}
                                                {s.status !== 'Paid' && (
                                                  <button onClick={() => setReceiptSlipId(s.id)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">سند استلام</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {receiptSlipId && (
                      <div className="mt-6 border-t pt-4">
                        <h5 className="font-semibold mb-2">رفع سند الاستلام</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <input type="text" placeholder="رقم السند" value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                          <input type="date" placeholder="تاريخ السند" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                          <input type="file" onChange={e => setReceiptFile(e.target.files?.[0] || null)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                          <div className="flex items-center gap-2">
                            <button onClick={handleSubmitReceipt} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">حفظ السند</button>
                            <button onClick={() => { setReceiptSlipId(''); setReceiptNumber(''); setReceiptDate(''); setReceiptFile(null); }} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">إلغاء</button>
                          </div>
                        </div>
                      </div>
                    )}
                </BrandableCard>
                <BrandableCard schoolSettings={schoolSettings}>
                    <div className="flex items-center justify-between mb-4"><h4 className="font-semibold">تسجيل حضور الموظفين</h4></div>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <select value={attendanceUserId} onChange={e => setAttendanceUserId(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="">اختر الموظف...</option>
                            {staff.map(u => (<option key={u.id} value={String(u.id)}>{u.name}</option>))}
                        </select>
                        <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="time" placeholder="دخول" value={attendanceCheckIn} onChange={e => setAttendanceCheckIn(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="time" placeholder="خروج" value={attendanceCheckOut} onChange={e => setAttendanceCheckOut(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" step="0.01" placeholder="ساعات العمل" value={attendanceHoursWorked} onChange={e => setAttendanceHoursWorked(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <select value={attendanceStatus} onChange={e => setAttendanceStatus(e.target.value as any)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"><option value="Present">حاضر</option><option value="Absent">غائب</option><option value="Late">متأخر</option></select>
                        <input type="number" placeholder="دقائق تأخير" value={attendanceLateMinutes} onChange={e => setAttendanceLateMinutes(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" placeholder="دقائق إضافية" value={attendanceOvertimeMinutes} onChange={e => setAttendanceOvertimeMinutes(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <button onClick={async () => {
                          if (!attendanceUserId || !attendanceDate) { addToast('اختر الموظف والتاريخ.', 'error'); return; }
                          try { await api.createStaffAttendance(schoolId, { userId: attendanceUserId, date: attendanceDate, checkIn: attendanceCheckIn || undefined, checkOut: attendanceCheckOut || undefined, hoursWorked: attendanceHoursWorked ? Number(attendanceHoursWorked) : undefined, status: attendanceStatus, lateMinutes: attendanceLateMinutes ? Number(attendanceLateMinutes) : undefined, overtimeMinutes: attendanceOvertimeMinutes ? Number(attendanceOvertimeMinutes) : undefined }); addToast('تم تسجيل الحضور.', 'success'); setAttendanceCheckIn(''); setAttendanceCheckOut(''); setAttendanceHoursWorked(''); setAttendanceLateMinutes(''); setAttendanceOvertimeMinutes(''); } catch { addToast('فشل تسجيل الحضور.', 'error'); }
                        }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">تسجيل</button>
                    </div>
                </BrandableCard>
                <BrandableCard schoolSettings={schoolSettings}>
                    <div className="flex items-center justify-between mb-4"><h4 className="font-semibold">تسجيل حضور المعلمين</h4></div>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <select value={assignTargetId} onChange={e => setAssignTargetId(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="">اختر المعلم...</option>
                            {teachers.map(t => (<option key={t.id} value={String(t.id)}>{t.name}</option>))}
                        </select>
                        <input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="time" placeholder="دخول" onChange={e => (e.target as any)._ci = e.target.value} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="time" placeholder="خروج" onChange={e => (e.target as any)._co = e.target.value} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" step="0.01" placeholder="ساعات العمل" onChange={e => (e.target as any)._hw = e.target.value} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <select onChange={e => (e.target as any)._st = e.target.value} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"><option value="Present">حاضر</option><option value="Absent">غائب</option><option value="Late">متأخر</option></select>
                        <input type="number" placeholder="دقائق تأخير" onChange={e => (e.target as any)._lm = e.target.value} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" placeholder="دقائق إضافية" onChange={e => (e.target as any)._om = e.target.value} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <button onClick={async (ev) => {
                          const container = (ev.currentTarget.parentElement as HTMLElement);
                          const inputs = Array.from(container.querySelectorAll('input, select')) as any[];
                          const map: any = {}; inputs.forEach(inp => { if (inp._ci) map.checkIn = inp._ci; if (inp._co) map.checkOut = inp._co; if (inp._hw) map.hoursWorked = Number(inp._hw); if (inp._st) map.status = inp._st; if (inp._lm) map.lateMinutes = Number(inp._lm); if (inp._om) map.overtimeMinutes = Number(inp._om); });
                          if (!assignTargetId || !receiptDate) { addToast('اختر المعلم والتاريخ.', 'error'); return; }
                          try { await api.createTeacherAttendance(schoolId, { teacherId: assignTargetId, date: receiptDate, checkIn: map.checkIn, checkOut: map.checkOut, hoursWorked: map.hoursWorked, status: (map.status as any) || 'Present', lateMinutes: map.lateMinutes, overtimeMinutes: map.overtimeMinutes }); addToast('تم تسجيل حضور المعلم.', 'success'); } catch { addToast('فشل تسجيل حضور المعلم.', 'error'); }
                        }} className="px-4 py-2 bg-teال-600 text-white rounded-lg hover:bg-teال-700">تسجيل</button>
                    </div>
                </BrandableCard>
            </div>
        );
    };

    const renderFeesTab = () => {
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
                if (editingFeeId) {
                    const updated = await api.updateFeeSetup(schoolId, editingFeeId, newFee as any);
                    setFeeSetups(prev => prev.map(f => f.id === editingFeeId ? updated : f));
                    setEditingFeeId('');
                } else {
                    const created = await api.createFeeSetup(schoolId, newFee as any);
                    setFeeSetups(prev => [created, ...prev]);
                }
                setNewFee({ stage: '', tuitionFee: 0, bookFees: 0, uniformFees: 0, activityFees: 0, paymentPlanType: 'Monthly', discounts: [] });
                addToast('تم حفظ إعداد الرسوم.', 'success');
            } catch { addToast('فشل حفظ إعداد الرسوم.', 'error'); }
        };
        const editFee = (row: FeeSetup) => {
            setEditingFeeId(row.id);
            setNewFee(row);
        };
        const deleteFee = async (id: string) => {
            try { await api.deleteFeeSetup(schoolId, id); setFeeSetups(prev => prev.filter(f => f.id !== id)); addToast('تم حذف الإعداد.', 'success'); } catch { addToast('فشل حذف الإعداد.', 'error'); }
        };
        const openGenerate = (stageName: string) => {
            setGenStage(stageName);
            setGenDueDate('');
            setGenIncludeBooks(true);
            setGenIncludeUniform(true);
            setGenIncludeActivities(true);
            setGenDiscounts([]);
        };
        const toggleGenDiscount = (v: string) => {
            setGenDiscounts(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
        };
        const generateInvoices = async () => {
            if (!genStage || !genDueDate) { addToast('اختر المرحلة وحدد تاريخ الاستحقاق.', 'error'); return; }
            try {
                const res = await api.generateInvoicesFromFees(schoolId, { stage: genStage, dueDate: genDueDate, include: { books: genIncludeBooks, uniform: genIncludeUniform, activities: genIncludeActivities }, defaultDiscounts: genDiscounts });
                addToast(`تم إنشاء ${res.createdCount} فاتورة.`, 'success');
                const invs = await api.getSchoolInvoices(schoolId);
                setInvoices(invs);
                setGenStage('');
            } catch { addToast('فشل إنشاء الفواتير.', 'error'); }
        };
        return (
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
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex gap-2"><button onClick={() => editFee(f)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">تعديل</button><button onClick={() => deleteFee(f.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">حذف</button><button onClick={() => openGenerate(f.stage)} className="font-medium text-teal-600 dark:text-teal-500 hover:underline">توليد فواتير</button></div></td>
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
        );
    };

    const tabs = [ { id: 'overview', label: 'نظرة عامة', icon: RevenueIcon }, { id: 'invoices', label: 'الفواتير (الإيرادات)', icon: FileIcon }, { id: 'expenses', label: 'المصروفات', icon: ExpenseIcon }, { id: 'fees', label: 'إعداد الرسوم', icon: FileIcon }, { id: 'payroll', label: 'الرواتب', icon: NetProfitIcon } ];

    return (
        <>
            <div className="mt-6 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-md"><nav className="flex gap-2" aria-label="Tabs">{tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><tab.icon className="h-5 w-5 ml-2 rtl:mr-2 rtl:ml-0" /><span>{tab.label}</span></button>))}</nav></div>
                {loading ? <TableSkeleton /> : (<>
                        {activeTab === 'overview' && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><StatsCard icon={RevenueIcon} title="إجمالي الإيرادات" value={`$${summary.totalRevenue.toLocaleString()}`} description="مجموع الفواتير المدفوعة" /><StatsCard icon={ExpenseIcon} title="إجمالي المصروفات" value={`$${summary.totalExpenses.toLocaleString()}`} description="مجموع النفقات المسجلة" /><StatsCard icon={NetProfitIcon} title="صافي الربح" value={`$${summary.netProfit.toLocaleString()}`} description="الإيرادات - المصروفات" /></div>)}
                        {activeTab === 'invoices' && renderInvoicesTab()}
                        {activeTab === 'expenses' && renderExpensesTab()}
                        {activeTab === 'fees' && renderFeesTab()}
                        {activeTab === 'payroll' && renderPayrollTab()}
                </>)}
            </div>
            {invoiceToPay && <RecordPaymentModal invoice={invoiceToPay} onClose={() => setInvoiceToPay(null)} onSave={handleRecordPayment} />}
            {isAddInvoiceModalOpen && <AddInvoiceModal schoolId={schoolId} onClose={() => setIsAddInvoiceModalOpen(false)} onSave={handleAddInvoice} />}
            {isAddExpenseModalOpen && <AddExpenseModal onClose={() => setIsAddExpenseModalOpen(false)} onSave={handleAddExpense} />}
        </>
    );
};

export default Finance;
