import React, { useMemo } from 'react';
import { Invoice, Expense } from '../types';

interface Props {
    invoices: Invoice[];
    expenses: Expense[];
}

const FinancialReports: React.FC<Props> = ({ invoices, expenses }) => {
    
    const reportData = useMemo(() => {
        // Today's Summary
        const today = new Date().toISOString().split('T')[0];
        const todayInvoices = invoices.filter(i => i.issueDate === today);
        const todayIncome = invoices.reduce((sum, inv) => {
            // This is rough estimation, ideally we sum Payments not Invoices for income
            // But since we track paidAmount in invoice, we can use that if we assume it happened on issueDate? 
            // No, paidAmount is cumulative. 
            // For accurate daily income report we need actual Payment records.
            // For now, let's show "Total Invoiced Today" vs "Total Expenses Today"
            return sum + inv.totalAmount; 
        }, 0);

        const todayExpenses = expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0);

        // Monthly Summary
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const monthInvoices = invoices.filter(i => i.issueDate.startsWith(currentMonth));
        const monthIncome = monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const monthExpenses = expenses.filter(e => e.date.startsWith(currentMonth)).reduce((sum, e) => sum + e.amount, 0);

        // Outstanding
        const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.remainingAmount ?? inv.totalAmount), 0);

        return {
            todayIncome,
            todayExpenses,
            todayNet: todayIncome - todayExpenses,
            monthIncome,
            monthExpenses,
            monthNet: monthIncome - monthExpenses,
            totalOutstanding
        };
    }, [invoices, expenses]);

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">التقارير المالية</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Daily */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">ملخص اليوم</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">الفواتير المصدرة:</span>
                            <span className="font-bold text-green-600">${reportData.todayIncome.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">المصروفات:</span>
                            <span className="font-bold text-red-600">${reportData.todayExpenses.toFixed(2)}</span>
                        </div>
                        <div className="pt-3 border-t dark:border-gray-700 flex justify-between">
                            <span className="font-bold text-gray-800 dark:text-white">الصافي:</span>
                            <span className={`font-bold ${reportData.todayNet >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                ${reportData.todayNet.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Monthly */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">ملخص الشهر الحالي</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">الفواتير المصدرة:</span>
                            <span className="font-bold text-green-600">${reportData.monthIncome.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">المصروفات:</span>
                            <span className="font-bold text-red-600">${reportData.monthExpenses.toFixed(2)}</span>
                        </div>
                        <div className="pt-3 border-t dark:border-gray-700 flex justify-between">
                            <span className="font-bold text-gray-800 dark:text-white">الصافي:</span>
                            <span className={`font-bold ${reportData.monthNet >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                ${reportData.monthNet.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Outstanding */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center items-center text-center">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">إجمالي الديون المستحقة</h3>
                    <p className="text-4xl font-bold text-red-600 my-2">${reportData.totalOutstanding.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">مبالغ لم يتم تحصيلها من الطلاب</p>
                </div>
            </div>

            {/* Charts Placeholder (Can be expanded later) */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-center text-blue-800 dark:text-blue-300 text-sm">
                💡 نصيحة: للحصول على تقارير أكثر تفصيلاً، يمكنك استخدام ميزة "تصدير البيانات" من صفحة الإعدادات.
            </div>
        </div>
    );
};

export default FinancialReports;