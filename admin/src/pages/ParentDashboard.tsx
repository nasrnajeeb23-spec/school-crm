import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as api from '../api';
import { Student, Invoice, Conversation, InvoiceStatus, AttendanceStatus, StudentGrades, RequestType } from '../types';
import { BellIcon, ChildIcon, FinanceIcon, GradesIcon, AnnouncementIcon, ActionItemIcon, RequestIcon } from '../components/icons';
import { useAppContext } from '../contexts/AppContext';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import InvoicePrintModal from '../components/InvoicePrintModal';
import { formatCurrency } from '../currency-config';
import { useReactToPrint } from 'react-to-print';

const ParentDashboard: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const { addToast } = useToast();
    const [newRequest, setNewRequest] = useState<{ type: RequestType; details: string }>({ type: RequestType.Leave, details: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
    const [schoolSettings, setSchoolSettings] = useState<any | null>(null);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>(''); // '' => all
    const [sortBy, setSortBy] = useState<'id'|'issueDate'|'dueDate'|'total'|'remaining'>('dueDate');
    const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc');
    const bulkPrintRef = useRef<HTMLDivElement>(null);
    const handleBulkPrint = useReactToPrint({ contentRef: bulkPrintRef });

    const children = useMemo(() => {
        if (!data) return [] as { student: Student; grades?: any[]; attendance?: any[]; invoices?: any[] }[];
        if (Array.isArray(data.children)) return data.children as { student: Student; grades?: any[]; attendance?: any[]; invoices?: any[] }[];
        if (data.student) return [{ student: data.student, grades: data.grades || [], attendance: data.attendance || [], invoices: data.invoices || [] }];
        return [] as { student: Student; grades?: any[]; attendance?: any[]; invoices?: any[] }[];
    }, [data]);

    const current = useMemo(() => {
        if (!children.length) return { student: undefined, grades: [], attendance: [], invoices: [] } as any;
        if (selectedStudentId) {
            const found = children.find(c => String((c.student as any).id) === String(selectedStudentId));
            if (found) return { student: found.student, grades: found.grades || [], attendance: found.attendance || [], invoices: found.invoices || [] };
        }
        const first = children[0];
        return { student: first.student, grades: first.grades || (data?.grades || []), attendance: first.attendance || (data?.attendance || []), invoices: first.invoices || (data?.invoices || []) };
    }, [children, selectedStudentId, data]);

    useEffect(() => {
        if (!user?.parentId) { setLoading(false); return; }
        api.getParentDashboardData(user.parentId, selectedStudentId || undefined).then(setData).finally(() => setLoading(false));
    }, [user?.parentId, selectedStudentId]);

    useEffect(() => {
        if (!user?.schoolId) return;
        api.getSchoolSettings(user.schoolId).then(setSchoolSettings).catch(() => {});
    }, [user?.schoolId]);

    if (loading) return <div className="text-center p-8">جاري تحميل البيانات...</div>;
    if (!data) return <div className="text-center p-8">لا توجد بيانات لعرضها.</div>;

    const latestGrade = current.grades.length > 0 ? current.grades[0] : null;
    const unpaidInvoices = current.invoices.filter((inv: Invoice) => inv.status !== InvoiceStatus.Paid);
    const attendanceSummary = current.attendance.reduce((acc: any, record: any) => {
        acc[record.status] = (acc[record.status] || 0) + 1;
        return acc;
    }, {});
    
    const getGradeInfo = (grade: StudentGrades | null) => {
        if (!grade) return { total: 0, finalGrade: 'N/A' };
        const total = grade.grades.homework + grade.grades.quiz + grade.grades.midterm + grade.grades.final;
        if (total >= 90) return { total, finalGrade: 'A' }; if (total >= 80) return { total, finalGrade: 'B' };
        if (total >= 70) return { total, finalGrade: 'C' }; if (total >= 60) return { total, finalGrade: 'D' };
        return { total, finalGrade: 'F' };
    };

    const filteredInvoices: Invoice[] = useMemo(() => {
        const getRemaining = (inv: Invoice) => (inv.remainingAmount !== undefined && inv.remainingAmount !== null)
            ? Number(inv.remainingAmount)
            : Number(inv.totalAmount) - Number(inv.paidAmount || 0);
        let res = Array.isArray(current.invoices) ? [...current.invoices] : [];
        if (selectedStatus) {
            res = res.filter(i => String(i.status) === String(selectedStatus));
        }
        if (startDate) {
            const s = new Date(startDate);
            res = res.filter(i => new Date(i.issueDate) >= s);
        }
        if (endDate) {
            const e = new Date(endDate);
            res = res.filter(i => new Date(i.issueDate) <= e);
        }
        res.sort((a, b) => {
            const toNumId = (x: Invoice) => {
                const cleaned = String(x.id).replace('inv_', '');
                const n = Number(cleaned);
                return isNaN(n) ? 0 : n;
            };
            const aRem = getRemaining(a);
            const bRem = getRemaining(b);
            let av: number | string = 0;
            let bv: number | string = 0;
            switch (sortBy) {
                case 'id':
                    av = toNumId(a);
                    bv = toNumId(b);
                    break;
                case 'issueDate':
                    av = new Date(a.issueDate).getTime();
                    bv = new Date(b.issueDate).getTime();
                    break;
                case 'dueDate':
                    av = new Date(a.dueDate).getTime();
                    bv = new Date(b.dueDate).getTime();
                    break;
                case 'total':
                    av = Number(a.totalAmount || 0);
                    bv = Number(b.totalAmount || 0);
                    break;
                case 'remaining':
                    av = aRem;
                    bv = bRem;
                    break;
                default:
                    av = 0;
                    bv = 0;
            }
            const cmp = (typeof av === 'number' && typeof bv === 'number')
                ? (av - bv)
                : String(av).localeCompare(String(bv));
            return sortOrder === 'asc' ? cmp : -cmp;
        });
        return res;
    }, [current.invoices, selectedStatus, startDate, endDate, sortBy, sortOrder]);

    return (
        <div className="mt-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-6">
                    {current.student?.profileImageUrl && (
                        <img src={current.student.profileImageUrl} alt={current.student.name} className="w-20 h-20 rounded-full" />
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{current.student?.name || 'الطالب'}</h2>
                        <p className="text-gray-500 dark:text-gray-400">{current.student?.grade || ''}</p>
                    </div>
                </div>
                {children.length > 1 && (
                  <div className="mt-4">
                    <label className="block mb-1">اختر ابنًا</label>
                    <select className="border rounded p-2" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                      <option value="">الكل</option>
                      {children.map(c => (
                        <option key={String((c.student as any).id)} value={String((c.student as any).id)}>{(c.student as any).name}</option>
                      ))}
                    </select>
                  </div>
                )}
            </div>
            <div className="grid grid-cols-1 gap-6">
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                     <h3 className="flex items-center text-xl font-semibold text-gray-800 dark:text-white mb-4"><AnnouncementIcon className="h-6 w-6 ml-2 text-rose-500" />إعلانات المدرسة</h3>
                    <div className="space-y-3">
                        {(data.announcements || []).map((ann: any) => (<div key={ann.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><p className="text-sm text-gray-800 dark:text-white">{ann.lastMessage}</p><p className="text-xs text-gray-400 dark:text-gray-500 text-left">{ann.timestamp}</p></div>))}
                    </div>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                     <div className="flex items-center justify-between mb-4">
                       <h3 className="flex items-center text-xl font-semibold text-gray-800 dark:text-white"><RequestIcon className="h-6 w-6 ml-2 text-rose-500" />طلب جديد</h3>
                       <Link to="/parent/requests" className="px-3 py-2 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-800">فتح طلباتي</Link>
                     </div>
                     <form onSubmit={async (e) => {
                         e.preventDefault();
                         if (!user?.parentId) return;
                         setIsSubmitting(true);
                         try {
                           await api.submitParentRequest(user.parentId, newRequest);
                           setNewRequest(prev => ({ ...prev, details: '' }));
                           addToast('تم إرسال طلبك بنجاح.', 'success');
                         } catch (err) {
                           addToast('فشل تقديم الطلب. الرجاء المحاولة مرة أخرى.', 'error');
                         } finally {
                           setIsSubmitting(false);
                         }
                     }} className="space-y-4">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">نوع الطلب</label>
                         <select className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 focus:outline-none" value={newRequest.type} onChange={e => setNewRequest(prev => ({ ...prev, type: e.target.value as RequestType }))}>
                           {Object.values(RequestType).map((t) => (
                             <option key={t} value={t}>{t}</option>
                           ))}
                         </select>
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">التفاصيل</label>
                         <textarea className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 focus:outline-none" rows={3} value={newRequest.details} onChange={e => setNewRequest(prev => ({ ...prev, details: e.target.value }))} placeholder="اكتب تفاصيل الطلب هنا" />
                       </div>
                       <div className="flex justify-end">
                         <button type="submit" disabled={isSubmitting || !newRequest.details.trim()} className={`px-4 py-2 rounded-lg text-white ${isSubmitting || !newRequest.details.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'}`}>
                           {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                         </button>
                       </div>
                     </form>
                 </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center"><GradesIcon className="h-10 w-10 mx-auto text-rose-500" /><h4 className="font-semibold mt-2">آخر درجة</h4><p className="text-3xl font-bold text-gray-800 dark:text-white">{getGradeInfo(latestGrade).finalGrade}</p><p className="text-sm text-gray-500 dark:text-gray-400">{latestGrade?.subject || 'لا توجد'}</p></div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center"><ChildIcon className="h-10 w-10 mx-auto text-rose-500" /><h4 className="font-semibold mt-2">الحضور</h4><p className="text-3xl font-bold text-gray-800 dark:text-white">{(attendanceSummary[AttendanceStatus.Present] || 0)} <span className="text-lg">/ {data.attendance.length} يوم</span></p><p className="text-sm text-gray-500 dark:text-gray-400">{(attendanceSummary[AttendanceStatus.Absent] || 0)} أيام غياب</p></div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center">
                   <FinanceIcon className="h-10 w-10 mx-auto text-rose-500" />
                   <h4 className="font-semibold mt-2">المالية</h4>
                   <p className="text-3xl font-bold text-gray-800 dark:text-white">{unpaidInvoices.length}</p>
                   <p className="text-sm text-gray-500 dark:text-gray-400">فاتورة غير مدفوعة</p>
                   {unpaidInvoices.length > 0 && (
                     <button
                       onClick={() => setInvoiceToPrint(unpaidInvoices[0])}
                       className="mt-3 px-3 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-sm"
                     >
                       طباعة آخر فاتورة
                     </button>
                   )}
                 </div>
            </div>
            {filteredInvoices.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md" ref={bulkPrintRef}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">قائمة الفواتير</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{filteredInvoices.length} عنصر</span>
                </div>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">من تاريخ</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إلى تاريخ</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الحالة</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 focus:outline-none"
                    >
                      <option value="">الكل</option>
                      <option value={InvoiceStatus.Unpaid}>غير مدفوعة</option>
                      <option value={InvoiceStatus.Overdue}>متأخرة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الفرز حسب</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 focus:outline-none"
                    >
                      <option value="id">رقم الفاتورة</option>
                      <option value="issueDate">تاريخ الإصدار</option>
                      <option value="dueDate">تاريخ الاستحقاق</option>
                      <option value="total">الإجمالي</option>
                      <option value="remaining">المتبقي</option>
                    </select>
                  </div>
                  <div className="self-end flex items-center gap-2">
                    <button
                      onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
                    >
                      {sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
                    </button>
                    <button onClick={handleBulkPrint} className="px-4 py-2 bg-teal-600 text-white rounded">طباعة الكل</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-700 dark:text-gray-200">
                        <th className="px-4 py-2">رقم</th>
                        <th className="px-4 py-2">الإصدار</th>
                        <th className="px-4 py-2">الاستحقاق</th>
                        <th className="px-4 py-2">الإجمالي</th>
                        <th className="px-4 py-2">المتبقي</th>
                        <th className="px-4 py-2">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map(inv => {
                        const cur = String(schoolSettings?.defaultCurrency || 'SAR');
                        const remaining = (inv.remainingAmount !== undefined && inv.remainingAmount !== null) ? inv.remainingAmount : (inv.totalAmount - (inv.paidAmount || 0));
                        return (
                          <tr key={inv.id} className="border-b dark:border-gray-700">
                            <td className="px-4 py-2 font-mono">{String(inv.id).replace('inv_','')}</td>
                            <td className="px-4 py-2">{inv.issueDate}</td>
                            <td className="px-4 py-2">{inv.dueDate}</td>
                            <td className="px-4 py-2 font-semibold">{formatCurrency(Number(inv.totalAmount || 0), cur)}</td>
                            <td className="px-4 py-2 font-semibold text-red-600 dark:text-red-400">{formatCurrency(Number(remaining || 0), cur)}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  onClick={() => setInvoiceToPrint(inv)}
                                  className="px-3 py-1 rounded bg-teal-600 text-white hover:bg-teal-700 text-sm"
                                >
                                  طباعة
                                </button>
                                <button
                                  onClick={() => {
                                    const lines = [
                                      `المدرسة: ${schoolSettings?.schoolName || 'المدرسة'}`,
                                      `رقم الفاتورة: ${String(inv.id).replace('inv_','')}`,
                                      `الطالب: ${current.student?.name || ''}`,
                                      `الإصدار: ${inv.issueDate}`,
                                      `الاستحقاق: ${inv.dueDate}`,
                                      `الإجمالي: ${formatCurrency(Number(inv.totalAmount || 0), cur)}`,
                                      `المتبقي: ${formatCurrency(Number(remaining || 0), cur)}`,
                                    ];
                                    try { navigator.clipboard.writeText(lines.join('\n')); addToast('تم نسخ تفاصيل الفاتورة.', 'success'); } catch { addToast('تعذر النسخ.', 'error'); }
                                  }}
                                  className="px-3 py-1 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-800 text-sm"
                                >
                                  نسخ التفاصيل
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {invoiceToPrint && (
              <InvoicePrintModal
                invoice={invoiceToPrint}
                schoolSettings={schoolSettings}
                onClose={() => setInvoiceToPrint(null)}
              />
            )}
        </div>
    );
}

export default ParentDashboard;
