import React, { useState, useEffect } from 'react';
import { apiCall } from '../api';
import { useToast } from '../contexts/ToastContext';
import { TrashIcon, EditIcon, PlusIcon, CheckIcon, XIcon } from '../components/icons';

interface PaymentMethod {
    id: number;
    type: string;
    provider: string;
    accountName: string;
    accountNumber: string;
    iban: string;
    swift: string;
    description: string;
    logoUrl: string;
    isActive: boolean;
}

const PaymentSettings: React.FC = () => {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

    const [formData, setFormData] = useState({
        type: 'BANK_TRANSFER',
        provider: '',
        accountName: '',
        accountNumber: '',
        iban: '',
        swift: '',
        description: '',
        isActive: true
    });

    const fetchMethods = async () => {
        try {
            setLoading(true);
            const data = await apiCall('/payment-settings/methods/all', { method: 'GET' });
            setMethods(data);
        } catch (err) {
            console.error(err);
            showToast('فشل تحميل طرق الدفع', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMethods();
    }, []);

    const handleDelete = async (id: number) => {
        if (!window.confirm('هل أنت متأكد من حذف طريقة الدفع هذه؟')) return;
        try {
            await apiCall(`/payment-settings/methods/${id}`, { method: 'DELETE' });
            showToast('تم الحذف بنجاح', 'success');
            fetchMethods();
        } catch (err) {
            showToast('فشل الحذف', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingMethod) {
                await apiCall(`/payment-settings/methods/${editingMethod.id}`, { method: 'PUT', body: JSON.stringify(formData) });
                showToast('تم التحديث بنجاح', 'success');
            } else {
                await apiCall('/payment-settings/methods', { method: 'POST', body: JSON.stringify(formData) });
                showToast('تمت الإضافة بنجاح', 'success');
            }
            setIsModalOpen(false);
            setEditingMethod(null);
            setFormData({ type: 'BANK_TRANSFER', provider: '', accountName: '', accountNumber: '', iban: '', swift: '', description: '', isActive: true });
            fetchMethods();
        } catch (err) {
            showToast('فشل الحفظ', 'error');
        }
    };

    const openEdit = (m: PaymentMethod) => {
        setEditingMethod(m);
        setFormData({
            type: m.type,
            provider: m.provider,
            accountName: m.accountName,
            accountNumber: m.accountNumber,
            iban: m.iban,
            swift: m.swift,
            description: m.description,
            isActive: m.isActive
        });
        setIsModalOpen(true);
    };

    const inputStyle = "mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm p-2 border";

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">إعدادات طرق الدفع (البنوك)</h1>
                <button
                    onClick={() => { setEditingMethod(null); setIsModalOpen(true); }}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                    <PlusIcon className="w-5 h-5 ml-2" />
                    إضافة طريقة دفع
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10">جاري التحميل...</div>
            ) : (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">المزود/البنك</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">تفاصيل الحساب</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الحالة</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {methods.map((m) => (
                                <tr key={m.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{m.provider}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{m.type}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 dark:text-white">{m.accountName}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400" dir="ltr">{m.accountNumber}</div>
                                        {m.iban && <div className="text-xs text-gray-400" dir="ltr">{m.iban}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${m.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {m.isActive ? 'نشط' : 'معطل'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => openEdit(m)} className="text-indigo-600 hover:text-indigo-900 ml-4"><EditIcon className="w-5 h-5" /></button>
                                        <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))}
                            {methods.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">لا توجد طرق دفع مضافة.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsModalOpen(false)}></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleSubmit}>
                                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                                        {editingMethod ? 'تعديل طريقة الدفع' : 'إضافة طريقة دفع'}
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المزود / البنك</label>
                                            <input type="text" required value={formData.provider} onChange={e => setFormData({ ...formData, provider: e.target.value })} className={inputStyle} placeholder="مثال: مصرف الراجحي" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم صاحب الحساب</label>
                                            <input type="text" value={formData.accountName} onChange={e => setFormData({ ...formData, accountName: e.target.value })} className={inputStyle} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الحساب</label>
                                            <input type="text" value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} className={inputStyle} dir="ltr" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">IBAN</label>
                                            <input type="text" value={formData.iban} onChange={e => setFormData({ ...formData, iban: e.target.value })} className={inputStyle} dir="ltr" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تعليمات إضافية</label>
                                            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className={inputStyle} rows={3} />
                                        </div>
                                        <div className="flex items-center">
                                            <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                            <label className="mr-2 block text-sm text-gray-900 dark:text-gray-300">تفعيل هذه الطريقة</label>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                                        حفظ
                                    </button>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                                        إلغاء
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentSettings;
