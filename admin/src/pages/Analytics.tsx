import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { getDashboardStats, getRevenueData, getApiBase } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const Analytics: React.FC = () => {
  const { addToast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([
          getDashboardStats(),
          getRevenueData?.() ?? Promise.resolve([])
        ]);
        setStats(s);
        setRevenue(Array.isArray(r) ? r : []);
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg.includes('HTTP 404')) {
          addToast('بعض مؤشرات التحليلات غير مدعومة على الخادم الحالي.', 'warning');
        } else {
          addToast('فشل تحميل التحليلات.', 'error');
        }
      } finally { setLoading(false); }
    })();
  }, [addToast]);

  if (loading) return <div className="text-center p-8">جاري تحميل التحليلات...</div>;

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white">لوحة التحليلات والمؤشرات</h2>
      <div className="text-xs text-gray-600 dark:text-gray-300">يتصل حالياً بـ API: <span className="font-mono" dir="ltr">{getApiBase()}</span></div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">إجمالي المدارس</p>
            <p className="text-2xl font-bold">{stats.totalSchools ?? '-'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">عدد المستخدمين</p>
            <p className="text-2xl font-bold">{stats.totalUsers ?? '-'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">MRR</p>
            <p className="text-2xl font-bold">${stats.mrr ?? '-'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500">المهام النشطة</p>
            <p className="text-2xl font-bold">{stats.activeJobs ?? '-'}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3">إيرادات شهرية</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {stats?.usageBySchool && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h3 className="font-semibold mb-3">استخدام المنصة حسب المدرسة</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.usageBySchool}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="school" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activeUsers" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
