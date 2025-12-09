

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
    const navigate = useNavigate();
    const { addToast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [studentDistributionData, classes] = await Promise.all([
                    api.getStudentDistribution(school.id),
                    api.getSchoolClasses(school.id),
                ]);
                try {
                  const invoicesData = await api.getSchoolInvoices(school.id);
                  setOverdueInvoices(invoicesData.filter(inv => inv.status === InvoiceStatus.Overdue).length);
                } catch (e) {
                  setOverdueInvoices(0);
                }
                setDistributionData(studentDistributionData);
                const today = new Date().toISOString().split('T')[0];
                let total = 0;
                let present = 0;
                for (const cls of classes as Class[]) {
                    const records = await api.getAttendance(cls.id, today);
                    total += records.length;
                    present += records.filter(r => r.status === AttendanceStatus.Present || r.status === 'Present').length;
                }
                const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                setAttendancePercent(`${pct}%`);
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
                    value={school.students.toLocaleString()}
                    description="عدد الطلاب المسجلين حالياً" 
                    onClick={() => navigate('students')}
                />
                <StatsCard 
                    icon={UsersIcon} 
                    title="إجمالي المعلمين" 
                    value={school.teachers.toLocaleString()}
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
        </div>
    );
};

export default SchoolDashboard;
