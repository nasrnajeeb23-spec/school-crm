import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { getAllJobs, triggerJobForSchools, getSchools } from '../api';

const TaskCenter: React.FC = () => {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [jobType, setJobType] = useState('report_generate');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [unsupported, setUnsupported] = useState(false);
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [js, sc] = await Promise.all([getAllJobs(), getSchools()]);
      setJobs(Array.isArray(js) ? js : []);
      setSchools(Array.isArray(sc) ? sc : []);
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('HTTP 404')) setUnsupported(true);
      addToast('فشل تحميل المهام والمدارس.', 'error');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    const t = setInterval(() => { fetchAll(); }, 10000);
    return () => clearInterval(t);
  }, []);

  const toggleSchool = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const trigger = async () => {
    setSaving(true);
    try {
      const res = await triggerJobForSchools({ schoolIds: selected, jobType });
      addToast(`تم بدء ${res.started} مهمة.`, 'success');
      await fetchAll();
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('HTTP 404')) setUnsupported(true);
      addToast('فشل بدء المهام.', 'error');
    }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">مركز المهام الخلفية</h2>
        <button onClick={fetchAll} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">تحديث</button>
      </div>
      {unsupported && (
        <div className="p-4 rounded-lg bg-yellow-100 text-yellow-800">مركز المهام غير مدعوم على الخادم الحالي (404). يرجى تمكين مسارات /superadmin/jobs.</div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3">بدء مهمة جماعية</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">نوع المهمة</label>
            <select value={jobType} onChange={e => setJobType(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
              <option value="report_generate">توليد تقرير</option>
              <option value="students_import">استيراد الطلاب</option>
              <option value="backup_store">تخزين النسخ الاحتياطي</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">اختر المدارس</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {schools.map(s => (
                <label key={s.id} className="flex items-center gap-2 p-2 border rounded-lg dark:border-gray-700">
                  <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSchool(s.id)} />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={trigger} disabled={saving || selected.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">بدء</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3">المهام الحالية</h3>
        {loading ? (
          <div>جاري التحميل...</div>
        ) : jobs.length === 0 ? (
          <div className="text-gray-500">لا توجد مهام.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3">المهمة</th>
                  <th className="px-6 py-3">الحالة</th>
                  <th className="px-6 py-3">المدرسة</th>
                  <th className="px-6 py-3">الإنشاء</th>
                  <th className="px-6 py-3">آخر تحديث</th>
                  <th className="px-6 py-3">تنزيل</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                    <td className="px-6 py-4">{j.name}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${j.status === 'completed' ? 'bg-green-100 text-green-800' : j.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{j.status}</span></td>
                    <td className="px-6 py-4">#{j.schoolId}</td>
                    <td className="px-6 py-4" dir="ltr">{j.createdAt}</td>
                    <td className="px-6 py-4" dir="ltr">{j.updatedAt || '-'}</td>
                    <td className="px-6 py-4">
                      {j.status === 'completed' ? (
                        <button onClick={async () => {
                          try {
                            const blob = await import('../api').then(m => m.downloadJobCsv(j.id));
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `job_${j.id}.csv`; a.click();
                            setTimeout(() => URL.revokeObjectURL(url), 2000);
                          } catch {}
                        }} className="px-3 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700">CSV</button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCenter;
