

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../components/StatsCard';
import { StudentsIcon, UsersIcon, AttendanceIcon, PastDueIcon } from '../components/icons';
import { School, InvoiceStatus, AttendanceStatus, Class } from '../types';
import * as api from '../api';
import UpcomingEvents from '../components/UpcomingEvents';
import StatsCardSkeleton from '../components/StatsCardSkeleton';
import SkeletonLoader from '../components/SkeletonLoader';
import StudentDistributionChart from '../components/StudentDistributionChart';
import { useToast } from '../contexts/ToastContext';

import ResourceUsageWidget from '../components/ResourceUsageWidget';

interface SchoolDashboardProps {
    school: School;
}

interface DistributionData {
    name: string;
    value: number;
}

const SchoolDashboard: React.FC<SchoolDashboardProps> = ({ school }) => {
    const [overdueInvoices, setOverdueInvoices] = useState(0);
    const [distributionData, setDistributionData] = useState<DistributionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [attendancePercent, setAttendancePercent] = useState<string>('—%');
    const [commUsage, setCommUsage] = useState<{ email: { count: number; amount: number }; sms: { count: number; amount: number }; total: number; currency: string } | null>(null);
    const [studentsCount, setStudentsCount] = useState<number>(school.students || 0);
    const [teachersCount, setTeachersCount] = useState<number>(school.teachers || 0);
    const navigate = useNavigate();
    const { addToast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [studentDistributionData, classes, countsData] = await Promise.all([
                    api.getStudentDistribution(school.id),
                    api.getSchoolClasses(school.id),
                    api.apiCall(`/school/${school.id}/stats/counts`, { method: 'GET' })
                ]);
                try {
                  const invoicesData = await api.getSchoolInvoices(school.id);
                  setOverdueInvoices(invoicesData.filter(inv => inv.status === InvoiceStatus.Overdue).length);
                } catch (e) {
                  setOverdueInvoices(0);
                }
                setDistributionData(studentDistributionData);
                try {
                  const sd = countsData as any;
                  const sc = Number(sd?.students || 0);
                  const tc = Number(sd?.teachers || 0);
                  setStudentsCount(sc);
                  setTeachersCount(tc);
                } catch {}
                const today = new Date().toISOString().split('T')[0];
                let total = 0;
                let present = 0;
                for (const cls of classes as Class[]) {
                    const records = await api.getAttendance(cls.id, today);
                    total += records.length;
                    present += records.filter(r => r.status === AttendanceStatus.Present || String(r.status) === 'Present').length;
                }
                const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                setAttendancePercent(`${pct}%`);
                try {
                  const cu = await api.getSchoolCommunicationsUsage(school.id);
                  setCommUsage(cu);
                } catch (e) {
                  setCommUsage(null);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
                addToast("فشل تحميل بيانات لوحة التحكم.", 'error');
            }
            setLoading(false);
        };
        fetchData();
    }, [school.id, addToast]);

    if (loading) {
        return (
            <div className="space-y-8 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCardSkeleton />
                    <StatsCardSkeleton />
                    <StatsCardSkeleton />
                    <StatsCardSkeleton />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md min-h-[250px] space-y-4 animate-pulse">
                       <SkeletonLoader className="h-6 w-1/3" />
                       <SkeletonLoader className="h-10 w-full" />
                       <SkeletonLoader className="h-10 w-full" />
                       <SkeletonLoader className="h-10 w-full" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md min-h-[250px] space-y-4 animate-pulse">
                       <SkeletonLoader className="h-6 w-1/3" />
                       <SkeletonLoader className="h-10 w-full" />
                       <SkeletonLoader className="h-10 w-full" />
                       <SkeletonLoader className="h-10 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 mt-6">
            <ResourceUsageWidget schoolId={school.id} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard 
                    icon={StudentsIcon} 
                    title="إجمالي الطلاب" 
                    value={studentsCount.toLocaleString()}
                    description="عدد الطلاب المسجلين حالياً" 
                    onClick={() => navigate('students')}
                />
                <StatsCard 
                    icon={UsersIcon} 
                    title="إجمالي المعلمين" 
                    value={teachersCount.toLocaleString()}
                    description="عدد المعلمين في المدرسة"
                    onClick={() => navigate('teachers')}
                />
                <StatsCard 
                    icon={AttendanceIcon} 
                    title="الحضور اليومي" 
                    value={attendancePercent}
                    description={`آخر تحديث: ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`}
                    onClick={() => navigate('attendance')}
                />
                <StatsCard 
                    icon={PastDueIcon} 
                    title="الفواتير المتأخرة" 
                    value={overdueInvoices.toString()}
                    description="الفواتير التي تحتاج لمتابعة"
                    onClick={() => navigate('finance', { state: { initialStatusFilter: InvoiceStatus.Overdue } })}
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <UpcomingEvents navigateTo={(view) => navigate(view)} schoolId={school.id} />
                <StudentDistributionChart data={distributionData} />
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">استخدام الاتصالات</h3>
              {commUsage ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{commUsage.email.count} رسالة</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">التكلفة: {commUsage.email.amount.toFixed(2)} {commUsage.currency}</div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الرسائل النصية</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{commUsage.sms.count} رسالة</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">التكلفة: {commUsage.sms.amount.toFixed(2)} {commUsage.currency}</div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الإجمالي</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{commUsage.total.toFixed(2)} {commUsage.currency}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">يتم احتساب الرسائل عبر مزود المنصة فقط</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-300">لا توجد بيانات استخدام الاتصالات حالياً.</div>
              )}
            </div>
        </div>
    );
};

export default SchoolDashboard;
