import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as api from '../api';
import { School, Module, ModuleId, Invoice } from '../types';
import { useToast } from '../contexts/ToastContext';
import StatsCard from '../components/StatsCard';
import { BackIcon, SchoolIcon, SubscriptionIcon, BillingIcon, UsersIcon, ModuleIcon } from '../components/icons';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SuperAdminSchoolManage: React.FC = () => {
  const { schoolId } = useParams<{ schoolId: string }>();
  const id = Number(schoolId || 0);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [activeModuleIds, setActiveModuleIds] = useState<Set<ModuleId>>(new Set());
  const [distribution, setDistribution] = useState<Array<{ name: string; value: number }>>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [schedule, setSchedule] = useState<{ daily?: boolean; monthly?: boolean; time?: string }>({ daily: true, time: '02:00' });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, mods, active, dist, invs] = await Promise.all([
        api.getSchoolById(id),
        api.getAvailableModules(),
        api.getSchoolModules(id),
        api.getStudentDistribution(id),
        api.getSchoolInvoices(id)
      ]);
      setSchool(s);
      setAvailableModules(mods);
      try { setActiveModuleIds(new Set(active.map(m => m.moduleId))); } catch { setActiveModuleIds(new Set()); }
      setDistribution(Array.isArray(dist) ? dist : []);
      setInvoices(Array.isArray(invs) ? invs : []);
    } catch (e: any) {
      addToast('فشل تحميل بيانات المدرسة.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchAll(); }, [id]);

  const baseCost = useMemo(() => {
    const pricing = { pricePerStudent: 1.5 };
    return (school ? school.students : 0) * pricing.pricePerStudent;
  }, [school]);

  const modulesCost = useMemo(() => {
    return availableModules.filter(m => activeModuleIds.has(m.id)).reduce((sum, m) => sum + m.monthlyPrice, 0);
  }, [availableModules, activeModuleIds]);

  const totalCost = useMemo(() => baseCost + modulesCost, [baseCost, modulesCost]);

  const toggleModule = async (module: Module, enable: boolean) => {
    setSaving(true);
    try {
      const next = new Set(activeModuleIds);
      if (enable) next.add(module.id); else next.delete(module.id);
      const updated = await api.updateSchoolModules(id, Array.from(next));
      setActiveModuleIds(new Set(updated.map(m => m.moduleId)));
      addToast(enable ? 'تم تفعيل الوحدة.' : 'تم تعطيل الوحدة.', 'success');
    } catch {
      addToast('فشل تحديث حالة الوحدة.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activateSubscription = async () => {
    setSaving(true);
    try {
      const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await api.activateSchoolSubscription(id, Array.from(activeModuleIds), renewalDate);
      const refreshed = await api.getSchoolById(id);
      setSchool(refreshed);
      addToast('تم تفعيل الاشتراك.', 'success');
    } catch {
      addToast('فشل تفعيل الاشتراك.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const scheduleBackup = async () => {
    setSaving(true);
    try {
      await api.bulkBackupSchedule({ schoolIds: [id], schedule });
      addToast('تم جدولة النسخ الاحتياطي.', 'success');
    } catch {
      addToast('فشل جدولة النسخ الاحتياطي.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const reloadBackup = async () => {
    setSaving(true);
    try {
      await api.reloadBackupSchedules();
      addToast('تم إعادة تحميل جدول النسخ الاحتياطي.', 'success');
    } catch {
      addToast('فشل إعادة التحميل.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !school) {
    return <div className="text-center p-8">جاري تحميل بيانات المدرسة...</div>;
  }

  const inputStyle = 'mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700';
  const colors = ['#4f46e5','#10b981','#f59e0b','#ef4444','#6366f1','#14b8a6'];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">إدارة المدرسة</h2>
        <button onClick={() => navigate('/superadmin/schools')} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <BackIcon className="h-5 w-5 ml-2" />
          العودة لقائمة المدارس
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard icon={SchoolIcon} title={school.name} value={school.plan} description={school.status} />
        <StatsCard icon={UsersIcon} title="الطلاب" value={String(school.students)} description="عدد الطلاب" />
        <StatsCard icon={ModuleIcon} title="الوحدات الفعالة" value={String(activeModuleIds.size)} description="عدد الوحدات" />
        <StatsCard icon={BillingIcon} title="الإجمالي الشهري" value={`$${totalCost.toFixed(2)}`} description="التكلفة التقديرية" />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">إدارة الوحدات</h3>
          <div className="flex items-end gap-3">
            <button onClick={activateSubscription} disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded-lg disabled:bg-teal-400">
              تفعيل الاشتراك
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableModules.map(module => (
            <div key={module.id} className="border dark:border-gray-700 rounded-lg p-6 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-lg text-gray-900 dark:text-white">{module.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 min-h-[40px]">{module.description}</p>
              </div>
              <div className="mt-4 text-center">
                {activeModuleIds.has(module.id) ? (
                  <button onClick={() => toggleModule(module, false)} disabled={saving} className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-red-600 text-white">
                    تعطيل
                  </button>
                ) : (
                  <button onClick={() => toggleModule(module, true)} disabled={saving} className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-teal-600 text-white">
                    تفعيل
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">إحصائية توزيع الطلاب بحسب الصف</h3>
        {distribution.length > 0 ? (
          <div className="w-full h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">لا توجد بيانات متاحة.</p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">جدولة النسخ الاحتياطي</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium">يومي</label>
            <select value={String(schedule.daily)} onChange={e => setSchedule(p => ({ ...p, daily: e.target.value === 'true' }))} className={inputStyle}>
              <option value="true">نعم</option>
              <option value="false">لا</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">شهري</label>
            <select value={String(schedule.monthly)} onChange={e => setSchedule(p => ({ ...p, monthly: e.target.value === 'true' }))} className={inputStyle}>
              <option value="true">نعم</option>
              <option value="false">لا</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">الوقت</label>
            <input type="time" value={schedule.time || ''} onChange={e => setSchedule(p => ({ ...p, time: e.target.value }))} className={inputStyle} />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={scheduleBackup} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-indigo-400">جدولة</button>
            <button onClick={reloadBackup} disabled={saving} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">إعادة تحميل</button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">الفواتير الأخيرة</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">المعرف</th>
                <th className="px-6 py-3">المبلغ</th>
                <th className="px-6 py-3">الحالة</th>
                <th className="px-6 py-3">تاريخ الاستحقاق</th>
              </tr>
            </thead>
            <tbody>
              {invoices.slice(0, 10).map(inv => (
                <tr key={inv.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{inv.id}</td>
                  <td className="px-6 py-4">${inv.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">{inv.status}</td>
                  <td className="px-6 py-4">{inv.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSchoolManage;
