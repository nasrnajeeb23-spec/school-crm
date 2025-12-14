import React, { useState, useEffect } from 'react';
import { Expense, NewExpenseData, SchoolSettings } from '../../types';
import * as api from '../../api';
import { PlusIcon, ExpenseIcon } from '../../components/icons';
import AddExpenseModal from '../../components/AddExpenseModal';
import { useToast } from '../../contexts/ToastContext';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import BrandableCard from '../../components/BrandableCard';
import { formatCurrency } from '../../currency-config';
import ExpenseVoucherModal from '../../components/ExpenseVoucherModal';

interface FinanceExpensesProps {
    schoolId: number;
    schoolSettings: SchoolSettings | null;
}

const FinanceExpenses: React.FC<FinanceExpensesProps> = ({ schoolId, schoolSettings }) => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
    const [voucherToPrint, setVoucherToPrint] = useState<Expense | null>(null);
    const { addToast } = useToast();
    const symbolForCurrency = (cur: string) => getCurrencySymbol(cur);

    useEffect(() => {
        fetchData();
    }, [schoolId]);

    const fetchData = () => {
        setLoading(true);
        api.getSchoolExpenses(schoolId)
            .then(data => setExpenses(data))
            .catch(err => {
                console.error("Failed to fetch expenses:", err);
                addToast("فشل تحميل المصروفات.", 'error');
            })
            .finally(() => setLoading(false));
    };

    const handleAddExpense = async (expenseData: NewExpenseData) => {
        try {
            const newExpense = await api.addSchoolExpense(schoolId, expenseData);
            setExpenses(prev => [newExpense, ...prev]);
            setIsAddExpenseModalOpen(false);
            addToast('تم تسجيل المصروف بنجاح.', 'success');
        } catch (error) { addToast("فشل تسجيل المصروف.", 'error'); }
    };

    if (loading) return <TableSkeleton />;

    return (
        <div className="mt-6 space-y-6">
            <BrandableCard schoolSettings={schoolSettings}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold dark:text-white">المصروفات</h3>
                    <button onClick={() => setIsAddExpenseModalOpen(true)} className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                        <PlusIcon className="h-5 w-5 ml-2" />إضافة مصروف
                    </button>
                </div>
                <div className="overflow-x-auto">
                    {expenses.length > 0 ? (
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">التاريخ</th>
                                    <th scope="col" className="px-6 py-3">الوصف</th>
                                    <th scope="col" className="px-6 py-3">الفئة</th>
                                    <th scope="col" className="px-6 py-3">المبلغ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((expense) => (
                                    <tr key={expense.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4">{expense.date}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{expense.description}</td>
                                        <td className="px-6 py-4">{expense.category}</td>
                                        <td className="px-6 py-4 font-semibold text-red-500 flex items-center gap-3">
                                            -{formatCurrency(expense.amount, (schoolSettings?.defaultCurrency || 'SAR') as string)}
                                            <button onClick={() => setVoucherToPrint(expense)} className="text-teal-600 hover:text-teal-800 text-xs" title="طباعة سند صرف">سند صرف</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState icon={ExpenseIcon} title="لا توجد مصروفات" message="لم يتم تسجيل أي مصروفات بعد." actionText="إضافة مصروف" onAction={() => setIsAddExpenseModalOpen(true)} />
                    )}
                </div>
            </BrandableCard>
            {isAddExpenseModalOpen && <AddExpenseModal onClose={() => setIsAddExpenseModalOpen(false)} onSave={handleAddExpense} />}
            {voucherToPrint && <ExpenseVoucherModal expense={voucherToPrint} schoolSettings={schoolSettings} onClose={() => setVoucherToPrint(null)} />}
        </div>
    );
};

export default FinanceExpenses;
