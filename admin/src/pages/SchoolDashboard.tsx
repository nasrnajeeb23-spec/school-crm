

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../components/StatsCard';
import { StudentsIcon, UsersIcon, AttendanceIcon, PastDueIcon, RefreshIcon } from '../components/icons';
import { School, InvoiceStatus, SchoolEvent } from '../types';
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
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    attendanceRate: '—%',
    overdueInvoices: 0
  });
  const [distributionData, setDistributionData] = useState<DistributionData[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<SchoolEvent[]>([]);
  const [commUsage, setCommUsage] = useState<{ email: { count: number; amount: number }; sms: { count: number; amount: number }; total: number; currency: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSchoolDashboardComplete(school.id);
      setStats({
        students: data.stats.students || 0,
        teachers: data.stats.teachers || 0,
        attendanceRate: typeof data.stats.attendanceRate === 'string' ? data.stats.attendanceRate : `${data.stats.attendanceRate}%`,
        overdueInvoices: data.stats.overdueInvoices || 0
      });
      setDistributionData(data.distribution || []);
      setUpcomingEvents(data.upcomingEvents || []);
      setCommUsage(data.communicationUsage || null);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setError("فشل تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى.");
      addToast("فشل تحميل بيانات لوحة التحكم.", 'error');
    } finally {
      setLoading(false);
    }
  }, [school.id, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-8 mt-6">
        <ResourceUsageWidget schoolId={school.id} />
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md mt-6">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">حدث خطأ</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
        <button
          onClick={fetchData}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <RefreshIcon className="h-5 w-5 ml-2" />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-6">
      <div className="flex justify-end mb-2">
        <button
          onClick={fetchData}
          className="flex items-center text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
          title="تحديث البيانات"
        >
          <RefreshIcon className="h-4 w-4 ml-1" />
          تحديث
        </button>
      </div>

      <ResourceUsageWidget schoolId={school.id} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon={StudentsIcon}
          title="إجمالي الطلاب"
          value={stats.students.toLocaleString()}
          description="عدد الطلاب المسجلين حالياً"
          onClick={() => navigate('students')}
        />
        <StatsCard
          icon={UsersIcon}
          title="إجمالي المعلمين"
          value={stats.teachers.toLocaleString()}
          description="عدد المعلمين في المدرسة"
          onClick={() => navigate('teachers')}
        />
        <StatsCard
          icon={AttendanceIcon}
          title="الحضور اليومي"
          value={stats.attendanceRate}
          description={`آخر تحديث: ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`}
          onClick={() => navigate('attendance')}
        />
        <StatsCard
          icon={PastDueIcon}
          title="الفواتير المتأخرة"
          value={stats.overdueInvoices.toString()}
          description="الفواتير التي تحتاج لمتابعة"
          onClick={() => navigate('finance', { state: { initialStatusFilter: InvoiceStatus.Overdue } })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <UpcomingEvents navigateTo={(view) => navigate(view)} schoolId={school.id} initialEvents={upcomingEvents} />
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
