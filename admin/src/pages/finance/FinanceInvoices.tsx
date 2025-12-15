import React, { useState } from 'react';
import { Invoice, InvoiceStatus, SchoolSettings } from '../../types';
import { FileIcon, PlusIcon } from '../../components/icons';
import BrandableCard from '../../components/BrandableCard';
import EmptyState from '../../components/EmptyState';
import InvoicePrintModal from '../../components/InvoicePrintModal';

const invoiceStatusColorMap: { [key in InvoiceStatus]: string } = {
    [InvoiceStatus.Paid]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    [InvoiceStatus.Unpaid]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [InvoiceStatus.Overdue]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

interface FinanceInvoicesProps {
    invoices: Invoice[];
    schoolSettings: SchoolSettings | null;
    searchTerm: string;
    statusFilter: string;
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (value: string) => void;
    onAddInvoice: () => void;
    onPayInvoice: (invoice: Invoice) => void;
    onViewStatement: (studentId: string, studentName: string) => void;
    onPrintInvoice: (invoice: Invoice) => void;
    onSendReminder: (invoiceId: string) => void;
}

const FinanceInvoices: React.FC<FinanceInvoicesProps> = ({
    invoices,
    schoolSettings,
    searchTerm,
    statusFilter,
    onSearchChange,
    onStatusFilterChange,
    onAddInvoice,
    onPayInvoice,
    onViewStatement,
    onPrintInvoice,
    onSendReminder
}) => {
    const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);

    const filteredInvoices = invoices
        .filter(invoice => statusFilter === 'all' || invoice.status === statusFilter)
        .filter(invoice => invoice.studentName.toLowerCase().includes(searchTerm.toLowerCase()));

    const handlePrintInvoice = (invoice: Invoice) => {
        setInvoiceToPrint(invoice);
        onPrintInvoice(invoice);
    };

    return (
        <>
            <BrandableCard schoolSettings={schoolSettings}>
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <input
                            type="text"
                            placeholder="ابحث باسم الطالب..."
                            value={searchTerm}
                            onChange={e => onSearchChange(e.target.value)}
                            className="w-full md:w-72 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <select
                            value={statusFilter}
                            onChange={e => onStatusFilterChange(e.target.value)}
                            className="w-full md:w-48 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="all">كل الحالات</option>
                            <option value={InvoiceStatus.Paid}>مدفوعة</option>
                            <option value={InvoiceStatus.Unpaid}>غير مدفوعة</option>
                            <option value={InvoiceStatus.Overdue}>متأخرة</option>
                        </select>
                    </div>
                    <button
                        onClick={onAddInvoice}
                        className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        <PlusIcon className="h-5 w-5 ml-2" />
                        إنشاء فاتورة
                    </button>
                </div>
                <div className="overflow-x-auto">
                    {filteredInvoices.length > 0 ? (
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">اسم الطالب</th>
                                    <th scope="col" className="px-6 py-3">تاريخ الاستحقاق</th>
                                    <th scope="col" className="px-6 py-3">المبلغ</th>
                                    <th scope="col" className="px-6 py-3">المدفوع</th>
                                    <th scope="col" className="px-6 py-3">المتبقي</th>
                                    <th scope="col" className="px-6 py-3">الحالة</th>
                                    <th scope="col" className="px-6 py-3">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{invoice.studentName}</td>
                                        <td className="px-6 py-4">{invoice.dueDate}</td>
                                        <td className="px-6 py-4 font-semibold">${invoice.totalAmount.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-green-600">${(invoice.paidAmount || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-red-600">${((invoice.remainingAmount !== undefined && invoice.remainingAmount !== null) ? invoice.remainingAmount : (invoice.totalAmount - (invoice.paidAmount || 0))).toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${invoiceStatusColorMap[invoice.status]}`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex gap-2">
                                                {invoice.status !== InvoiceStatus.Paid && (
                                                    <button onClick={() => onPayInvoice(invoice)} className="font-medium text-green-600 dark:text-green-500 hover:underline">
                                                        تسجيل دفعة
                                                    </button>
                                                )}
                                                <button onClick={() => onViewStatement(invoice.studentId, invoice.studentName)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">
                                                    كشف حساب
                                                </button>
                                                <button onClick={() => handlePrintInvoice(invoice)} className="font-medium text-teal-600 dark:text-teal-500 hover:underline">
                                                    طباعة فاتورة
                                                </button>
                                                {invoice.status === InvoiceStatus.Overdue && (
                                                    <button onClick={() => onSendReminder(invoice.id)} className="font-medium text-orange-600 dark:text-orange-500 hover:underline">
                                                        تذكير
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState icon={FileIcon} title="لا توجد فواتير" message="لم يتم العثور على فواتير تطابق الفلاتر الحالية." />
                    )}
                </div>
            </BrandableCard>
            {invoiceToPrint && <InvoicePrintModal invoice={invoiceToPrint} schoolSettings={schoolSettings} onClose={() => setInvoiceToPrint(null)} />}
        </>
    );
};

export default FinanceInvoices;
