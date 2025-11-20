import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { Student, Invoice, Conversation, InvoiceStatus, AttendanceStatus, StudentGrades } from '../types';
import { BellIcon, ChildIcon, FinanceIcon, GradesIcon, AnnouncementIcon, ActionItemIcon } from '../components/icons';
import { useAppContext } from '../contexts/AppContext';

const ParentDashboard: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.parentId) { setLoading(false); return; }
        api.getParentDashboardData(user.parentId).then(setData).finally(() => setLoading(false));
    }, [user?.parentId]);

    if (loading) return <div className="text-center p-8">جاري تحميل البيانات...</div>;
    if (!data) return <div className="text-center p-8">لا توجد بيانات لعرضها.</div>;

    const latestGrade = data.grades.length > 0 ? data.grades[0] : null;
    const unpaidInvoices = data.invoices.filter((inv: Invoice) => inv.status !== InvoiceStatus.Paid);
    const attendanceSummary = data.attendance.reduce((acc: any, record: any) => {
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
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center gap-6">
                <img src={data.student.profileImageUrl} alt={data.student.name} className="w-20 h-20 rounded-full" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{data.student.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{data.student.grade}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                     <h3 className="flex items-center text-xl font-semibold text-gray-800 dark:text-white mb-4"><AnnouncementIcon className="h-6 w-6 ml-2 text-rose-500" />إعلانات المدرسة</h3>
                    <div className="space-y-3">
                        {data.announcements.map((ann: any) => (<div key={ann.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><p className="text-sm text-gray-800 dark:text-white">{ann.lastMessage}</p><p className="text-xs text-gray-400 dark:text-gray-500 text-left">{ann.timestamp}</p></div>))}
                    </div>
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
