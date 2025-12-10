import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { getSchools, bulkUpdateModules, bulkUpdateUsageLimits, bulkBackupSchedule } from '../api';

const BulkOps: React.FC = () => {
  const { addToast } = useToast();
  const [schools, setSchools] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [moduleId, setModuleId] = useState('transportation');
  const [enableModule, setEnableModule] = useState(true);

  const [planId, setPlanId] = useState('default');
  const [limits, setLimits] = useState<Record<string, number>>({ students: 1000, teachers: 200, storageGb: 10 });

  const [schedule, setSchedule] = useState<{ daily?: boolean; monthly?: boolean; time?: string; monthlyDay?: number }>({ daily: true, time: '02:00', monthlyDay: 1 });

  const [unsupported, setUnsupported] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const data = await getSchools();
        setSchools(Array.isArray(data) ? data : []);
      } catch (err: any) { addToast('فشل تحميل قائمة المدارس.', 'error'); }
      finally { setLoading(false); }
    })();
  }, [addToast]);

  const toggleSchool = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const runBulkModules = async () => {
    setSaving(true);
    try {
      const res = await bulkUpdateModules({ schoolIds: selected, moduleId, enable: enableModule });
      const msg = (res as any)?.message || `تم تحديث الوحدات لعدد ${res.updated} مدرسة.`;
      addToast(msg, 'success');
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('HTTP 404')) setUnsupported(true);
      addToast('فشل عملية الوحدات الجماعية.', 'error');
    }
    finally { setSaving(false); }
  };

  const runBulkLimits = async () => {
    setSaving(true);
    try {
      const res = await bulkUpdateUsageLimits({ schoolIds: selected, planId, limits });
      addToast(`تم تحديث حدود الاستخدام لعدد ${res.updated} مدرسة.`, 'success');
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('HTTP 404')) setUnsupported(true);
      addToast('فشل عملية الحدود الجماعية.', 'error');
    }
    finally { setSaving(false); }
  };

  const runBulkBackup = async () => {
    setSaving(true);
    try {
      const res = await bulkBackupSchedule({ schoolIds: selected, schedule });
      addToast(`تم جدولة النسخ الاحتياطي لعدد ${res.scheduled} مدرسة.`, 'success');
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('HTTP 404')) setUnsupported(true);
      addToast('فشل جدولة النسخ الاحتياطي الجماعية.', 'error');
    }
    finally { setSaving(false); }
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700";

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white">عمليات جماعية عبر المدارس</h2>
      {unsupported && (
        <div className="p-4 rounded-lg bg-yellow-100 text-yellow-800">بعض عمليات الـ Bulk غير مدعومة على الخادم الحالي (404). يرجى تمكين مسارات /superadmin/bulk/*.</div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3">اختيار المدارس المستهدفة</h3>
        {loading ? (
          <div>جاري تحميل المدارس...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {schools.map((s) => (
              <label key={s.id} className="flex items-center gap-2 p-2 border rounded-lg dark:border-gray-700">
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSchool(s.id)} />
                <span>{s.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3">تفعيل/تعطيل وحدة</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">معرف الوحدة</label>
            <input type="text" value={moduleId} onChange={e => setModuleId(e.target.value)} className={inputStyle} disabled={unsupported} />
          </div>
          <div>
            <label className="block text-sm font-medium">الحالة</label>
            <select value={String(enableModule)} onChange={e => setEnableModule(e.target.value === 'true')} className={inputStyle} disabled={unsupported}>
              <option value="true">تفعيل</option>
              <option value="false">تعطيل</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={runBulkModules} disabled={unsupported || saving || selected.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">تنفيذ</button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3">تحديث حدود الاستخدام</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">الخطة</label>
            <input type="text" value={planId} onChange={e => setPlanId(e.target.value)} className={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium">الحدود (JSON)</label>
            <textarea value={JSON.stringify(limits)} onChange={e => { try { setLimits(JSON.parse(e.target.value || '{}')); } catch {} }} className={`${inputStyle} min-h-[100px]`}></textarea>
          </div>
          <div className="flex items-end">
            <button onClick={runBulkLimits} disabled={saving || selected.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">تنفيذ</button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3">جدولة النسخ الاحتياطي</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          <div>
            <label className="block text-sm font-medium">اليوم الشهري</label>
            <input type="number" min={1} max={31} value={Number(schedule.monthlyDay || 1)} onChange={e => setSchedule(p => ({ ...p, monthlyDay: Number(e.target.value || 1) }))} className={inputStyle} />
          </div>
          <div className="flex items-end">
            <button onClick={runBulkBackup} disabled={saving || selected.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">تنفيذ</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkOps;
