import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as api from '../api';
import { School, Invoice, SchoolSettings, Subscription } from '../types';
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
  const [distribution, setDistribution] = useState<Array<{ name: string; value: number }>>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [schedule, setSchedule] = useState<{ daily?: boolean; monthly?: boolean; time?: string }>({ daily: true, time: '02:00' });
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingSummary, setBillingSummary] = useState<{ totalInvoices: number; paidCount: number; unpaidCount: number; overdueCount: number; totalAmount: number; outstandingAmount: number } | null>(null);
  const [backups, setBackups] = useState<Array<{ file: string; size: number; createdAt: string }>>([]);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);
  const [storageUsageBytes, setStorageUsageBytes] = useState<number>(0);
  const [classesCount, setClassesCount] = useState<number>(0);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, dist, invs, sts, sub, bill, bks, lastLogin, storage, classes] = await Promise.all([
        api.getSchoolById(id),
        api.getStudentDistribution(id),
        api.getSchoolInvoices(id),
        api.getSchoolSettings(id),
        api.getSchoolSubscriptionDetails(id),
        api.getSchoolBillingSummary(id),
        api.getSchoolBackups(id),
        api.getSchoolLastLogin(id),
        api.getSchoolStorageUsage(id),
        api.getSchoolClasses(id)
      ]);
      setSchool(s);
      setDistribution(Array.isArray(dist) ? dist : []);
      setInvoices(Array.isArray(invs) ? invs : []);
      setSettings(sts || null);
      setSubscription(sub || null);
      setBillingSummary(bill || null);
      setBackups(Array.isArray(bks) ? bks : []);
      setLastLoginAt(lastLogin?.lastLoginAt || null);
      setStorageUsageBytes(Number(storage?.bytes || 0));
      setClassesCount(Array.isArray(classes) ? classes.length : 0);
    } catch (e: any) {
      addToast('فشل تحميل بيانات المدرسة.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchAll(); }, [id]);

  const baseCost = useMemo(() => {
    const price = subscription?.amount || 0;
    return price;
  }, [subscription]);

  const activateSubscription = async () => {
    setSaving(true);
    try {
      const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      if (!subscription?.id) throw new Error('NO_SUBSCRIPTION_ID');
      await api.updateSubscription(String(subscription.id), { status: 'ACTIVE', renewalDate });
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
        <StatsCard icon={UsersIcon} title="المعلمين" value={String(school.teachers)} description="عدد المعلمين" />
        <StatsCard icon={ModuleIcon} title="الفصول" value={String(classesCount)} description="عدد الفصول" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard icon={SubscriptionIcon} title="الخطة" value={subscription?.plan || school.plan} description={subscription?.status || school.status} />
        <StatsCard icon={BillingIcon} title="القيمة الشهرية" value={`$${baseCost.toFixed(2)}`} description="سعر الخطة" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">تفاصيل الاشتراك</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><div className="text-gray-500">تاريخ البدء</div><div className="text-gray-900 dark:text-white">{subscription?.startDate || '-'}</div></div>
            <div><div className="text-gray-500">تاريخ التجديد</div><div className="text-gray-900 dark:text-white">{subscription?.renewalDate || '-'}</div></div>
            <div><div className="text-gray-500">حالة الاشتراك</div><div className="text-gray-900 dark:text-white">{subscription?.status || school.status}</div></div>
            <div><div className="text-gray-500">الخطة الحالية</div><div className="text-gray-900 dark:text-white">{subscription?.plan || school.plan}</div></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">ملخص الفوترة</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div className="text-gray-500">إجمالي الفواتير</div><div className="text-gray-900 dark:text-white">{billingSummary?.totalInvoices ?? 0}</div></div>
            <div><div className="text-gray-500">مدفوعة</div><div className="text-green-600">{billingSummary?.paidCount ?? 0}</div></div>
            <div><div className="text-gray-500">غير مدفوعة</div><div className="text-yellow-600">{billingSummary?.unpaidCount ?? 0}</div></div>
            <div><div className="text-gray-500">متأخرة</div><div className="text-red-600">{billingSummary?.overdueCount ?? 0}</div></div>
            <div className="col-span-2"><div className="text-gray-500">رصيد مستحق</div><div className="text-gray-900 dark:text-white">${(billingSummary?.outstandingAmount ?? 0).toFixed(2)}</div></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">الاستخدام والنشاط</h3>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div><div className="text-gray-500">آخر تسجيل دخول</div><div className="text-gray-900 dark:text-white">{lastLoginAt ? String(lastLoginAt).toString() : '-'}</div></div>
            <div><div className="text-gray-500">آخر نسخة احتياطية</div><div className="text-gray-900 dark:text-white">{backups.length ? String(backups[0].createdAt).toString() : '-'}</div></div>
            <div><div className="text-gray-500">استخدام التخزين</div><div className="text-gray-900 dark:text-white">{(storageUsageBytes/1024/1024).toFixed(2)} MB</div></div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">هوية المدرسة</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div><div className="text-gray-500">الاسم</div><div className="text-gray-900 dark:text-white">{settings?.schoolName || school.name}</div></div>
          <div><div className="text-gray-500">المدينة/العنوان</div><div className="text-gray-900 dark:text-white">{settings?.schoolAddress || '-'}</div></div>
          <div><div className="text-gray-500">البريد</div><div className="text-gray-900 dark:text-white">{settings?.contactEmail || '-'}</div></div>
          <div><div className="text-gray-500">الهاتف</div><div className="text-gray-900 dark:text-white">{settings?.contactPhone || '-'}</div></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">إدارة الاشتراك</h3>
          <div className="flex items-end gap-3">
            <button onClick={activateSubscription} disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded-lg disabled:bg-teal-400">تفعيل الاشتراك</button>
            <button onClick={async () => { try { await api.updateSchoolOperationalStatus(id, 'SUSPENDED'); addToast('تم إيقاف المدرسة مؤقتًا.', 'success'); } catch { addToast('فشل الإيقاف المؤقت.', 'error'); } }} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:bg-red-400">إيقاف مؤقت</button>
            <button onClick={async () => { const msg = window.prompt('اكتب رسالة تنبيه للمدرسة'); if (!msg) return; try { await api.notifySchool(id, msg); addToast('تم إرسال التنبيه.', 'success'); } catch { addToast('فشل إرسال التنبيه.', 'error'); } }} disabled={saving} className="px-4 py-2 bg-amber-600 text-white rounded-lg disabled:bg-amber-400">إرسال تنبيه</button>
            <button onClick={async () => { const ok = window.confirm('سيتم حذف المدرسة بشكل غير قابل للاسترجاع مع تعطيل المستخدمين المرتبطين. هل توافق؟'); if (!ok) return; try { await api.deleteSchool(id); addToast('تم حذف المدرسة.', 'success'); navigate('/superadmin/schools'); } catch { addToast('فشل حذف المدرسة.', 'error'); } }} disabled={saving} className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:bg-gray-600">حذف المدرسة</button>
          </div>
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
