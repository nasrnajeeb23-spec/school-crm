

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../components/StatsCard';
import { StudentsIcon, UsersIcon, AttendanceIcon, PastDueIcon } from '../components/icons';
import { School, InvoiceStatus } from '../types';
import * as api from '../api';
import UpcomingEvents from '../components/UpcomingEvents';
import StatsCardSkeleton from '../components/StatsCardSkeleton';
import SkeletonLoader from '../components/SkeletonLoader';
import StudentDistributionChart from '../components/StudentDistributionChart';
import { useToast } from '../contexts/ToastContext';

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
    const navigate = useNavigate();
    const { addToast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                 const [invoicesData, studentDistributionData] = await Promise.all([
                    api.getSchoolInvoices(school.id),
                    api.getStudentDistribution(school.id),
                ]);
                setOverdueInvoices(invoicesData.filter(inv => inv.status === InvoiceStatus.Overdue).length);
                setDistributionData(studentDistributionData);
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
                    value="94%"
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