

import React, { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';
import RevenueChart from '../components/RevenueChart';
import { TotalSchoolsIcon, RevenueIcon, ActiveSubscriptionsIcon, LogoutIcon, MRRIcon } from '../components/icons';
import * as api from '../api';
import { RevenueData } from '../types';
import { useToast } from '../contexts/ToastContext';

interface DashboardStats {
  totalSchools: number;
  activeSubscriptions: number;
  totalRevenue: number;
  revenueData: RevenueData[];
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const [kpis, setKpis] = useState<{ mrr: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, kpiData] = await Promise.all([
          api.getDashboardStats(),
          api.getKpis().catch(() => null)
        ]);
        setStats(statsData);
        setKpis(kpiData ? { mrr: Number((kpiData as any).mrr || 0) } : null);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        addToast("فشل تحميل إحصائيات لوحة التحكم.", 'error');
      }
      setLoading(false);
    };
    fetchData();
  }, [addToast]);

  if (loading) {
    return <div className="text-center p-8">جاري تحميل البيانات...</div>;
  }
  
  if (!stats) {
     return <div className="text-center p-8">لم يتم العثور على بيانات.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard 
          icon={TotalSchoolsIcon} 
          title="إجمالي المدارس" 
          value={stats.totalSchools.toString()}
          description="جميع المدارس المسجلة" 
        />
        <StatsCard 
          icon={ActiveSubscriptionsIcon} 
          title="الاشتراكات النشطة" 
          value={stats.activeSubscriptions.toString()}
          description="المدارس ذات الخطط المدفوعة"
        />
        <StatsCard 
          icon={RevenueIcon} 
          title="إجمالي الإيرادات" 
          value={`$${Number(stats.totalRevenue).toLocaleString()}`}
          description="إجمالي المدفوعات المسجلة"
        />
        {kpis && (
          <StatsCard 
            icon={MRRIcon} 
            title="الإيرادات الشهرية المتكررة" 
            value={`$${kpis.mrr.toLocaleString()}`}
            description="من الاشتراكات النشطة حالياً"
          />
        )}
      </div>
      <div>
        <RevenueChart data={stats.revenueData} />
      </div>
    </div>
  );
};

export default Dashboard;
