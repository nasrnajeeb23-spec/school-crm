import React, { useEffect, useState } from 'react';
import * as api from '../api';
import { ReportsIcon } from '../components/icons';

interface Props { schoolId: number }

const BackgroundJobs: React.FC<Props> = ({ schoolId }) => {
  const [lastJobId, setLastJobId] = useState<string>('');
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [sourceUrl, setSourceUrl] = useState<string>('');

  useEffect(() => {
    let t: any;
    if (lastJobId) {
      const poll = async () => {
        try { const s = await api.getJobStatus(schoolId, lastJobId); setJobStatus(s); } catch {}
        t = setTimeout(poll, 2000);
      };
      poll();
    }
    return () => { if (t) clearTimeout(t); };
  }, [schoolId, lastJobId]);

  const genReport = async () => { const res = await api.enqueueReportGenerate(schoolId); setLastJobId(res.jobId); setJobStatus(null); };
  const importStudents = async () => { const res = await api.enqueueStudentsImport(schoolId, sourceUrl); setLastJobId(res.jobId); setJobStatus(null); };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center"><ReportsIcon className="h-6 w-6 ml-2"/>مهام الخلفية</h2>
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-4">
        <h3 className="font-semibold mb-2">تقرير سريع</h3>
        <button onClick={genReport} className="px-4 py-2 bg-teal-600 text-white rounded">إنشاء تقرير</button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-4">
        <h3 className="font-semibold mb-2">استيراد طلاب</h3>
        <div className="flex gap-2">
          <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="رابط ملف CSV" className="border rounded p-2 flex-grow" />
          <button onClick={importStudents} className="px-4 py-2 bg-teal-600 text-white rounded">استيراد</button>
        </div>
      </div>

      {lastJobId && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 className="font-semibold mb-2">حالة المهمة</h3>
          <p>المعرف: {lastJobId}</p>
          <p>الحالة: {jobStatus?.status || 'قيد المعالجة'}</p>
          {jobStatus?.error && <p className="text-red-600">خطأ: {jobStatus.error}</p>}
          {jobStatus?.result && <pre className="mt-2 bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs">{JSON.stringify(jobStatus.result, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
};

export default BackgroundJobs;
