import React, { useState, useEffect, useMemo } from 'react';
import * as api from '../api';
import { Student, Invoice, Conversation, InvoiceStatus, AttendanceStatus, StudentGrades, RequestType } from '../types';
import { BellIcon, ChildIcon, FinanceIcon, GradesIcon, AnnouncementIcon, ActionItemIcon, RequestIcon } from '../components/icons';
import { useAppContext } from '../contexts/AppContext';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

const ParentDashboard: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const { addToast } = useToast();
    const [newRequest, setNewRequest] = useState<{ type: RequestType; details: string }>({ type: RequestType.Leave, details: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!user?.parentId) { setLoading(false); return; }
        api.getParentDashboardData(user.parentId, selectedStudentId || undefined).then(setData).finally(() => setLoading(false));
    }, [user?.parentId, selectedStudentId]);

    if (loading) return <div className="text-center p-8">جاري تحميل البيانات...</div>;
    if (!data) return <div className="text-center p-8">لا توجد بيانات لعرضها.</div>;

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
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center"><FinanceIcon className="h-10 w-10 mx-auto text-rose-500" /><h4 className="font-semibold mt-2">المالية</h4><p className="text-3xl font-bold text-gray-800 dark:text-white">{unpaidInvoices.length}</p><p className="text-sm text-gray-500 dark:text-gray-400">فاتورة غير مدفوعة</p></div>
            </div>
        </div>
    );
}

export default ParentDashboard;
