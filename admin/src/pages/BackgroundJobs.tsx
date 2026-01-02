import React, { useEffect, useState } from 'react';
import * as api from '../api';
import { ReportsIcon } from '../components/icons';

interface Props { schoolId: number }

const BackgroundJobs: React.FC<Props> = ({ schoolId }) => {
  const [lastJobId, setLastJobId] = useState<string>('');
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [jobsHistory, setJobsHistory] = useState<any[]>([]);

  const loadJobsHistory = async () => {
    try {
      const jobs = await api.getJobs(schoolId);
      setJobsHistory(jobs);
    } catch (err) {
      console.error("Failed to load jobs history", err);
    }
  };

  useEffect(() => {
    loadJobsHistory();
    // Refresh history every 10 seconds
    const interval = setInterval(loadJobsHistory, 10000);
    return () => clearInterval(interval);
  }, [schoolId]);

  useEffect(() => {
    let t: any;
    if (lastJobId) {
      const poll = async () => {
        try { 
            const s = await api.getJobStatus(schoolId, lastJobId); 
            setJobStatus(s);
            // Refresh list when job updates
            loadJobsHistory(); 
        } catch {}
        t = setTimeout(poll, 2000);
      };
      poll();
    }
    return () => { if (t) clearTimeout(t); };
  }, [schoolId, lastJobId]);

  const genReport = async () => { const res = await api.enqueueReportGenerate(schoolId); setLastJobId(res.jobId); setJobStatus(null); loadJobsHistory(); };
  const importStudents = async () => { const res = await api.enqueueStudentsImport(schoolId, sourceUrl); setLastJobId(res.jobId); setJobStatus(null); loadJobsHistory(); };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center text-gray-800 dark:text-white">
        <ReportsIcon className="h-6 w-6 ml-2 text-teal-600"/>
        مهام الخلفية
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold mb-4 text-lg text-gray-700 dark:text-gray-200">تقرير سريع</h3>
            <p className="text-sm text-gray-500 mb-4">إنشاء تقرير فوري عن حالة المدرسة (الطلاب، المعلمين، الفواتير).</p>
            <button onClick={genReport} className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
            إنشاء تقرير
            </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold mb-4 text-lg text-gray-700 dark:text-gray-200">استيراد طلاب</h3>
            <p className="text-sm text-gray-500 mb-4">استيراد قائمة الطلاب من ملف CSV خارجي.</p>
            <div className="flex gap-2">
            <input 
                value={sourceUrl} 
                onChange={e => setSourceUrl(e.target.value)} 
                placeholder="رابط ملف CSV (https://...)" 
                className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-teal-500 outline-none" 
            />
            <button onClick={importStudents} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                استيراد
            </button>
            </div>
        </div>
      </div>

      {lastJobId && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800 mb-8">
          <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-300">حالة المهمة الحالية</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">المعرف:</span> {lastJobId}</div>
            <div>
                <span className="font-medium">الحالة:</span> 
                <span className={`mr-2 px-2 py-0.5 rounded text-xs font-bold ${
                    jobStatus?.status === 'completed' ? 'bg-green-100 text-green-800' :
                    jobStatus?.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                }`}>
                    {jobStatus?.status || 'قيد المعالجة'}
                </span>
            </div>
          </div>
          {jobStatus?.error && <div className="mt-2 text-red-600 bg-red-50 p-2 rounded border border-red-100">خطأ: {jobStatus.error}</div>}
          {jobStatus?.result && (
            <div className="mt-3">
                <span className="font-medium text-gray-700 dark:text-gray-300">النتيجة:</span>
                <pre className="mt-1 bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 text-xs overflow-auto max-h-40" dir="ltr">
                    {JSON.stringify(jobStatus.result, null, 2)}
                </pre>
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-gray-700 dark:text-gray-200">سجل المهام السابقة</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                    <tr>
                        <th className="px-6 py-3">المهمة</th>
                        <th className="px-6 py-3">الحالة</th>
                        <th className="px-6 py-3">التاريخ</th>
                        <th className="px-6 py-3">النتيجة</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {jobsHistory.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                لا توجد مهام سابقة
                            </td>
                        </tr>
                    ) : (
                        jobsHistory.map((job) => (
                            <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">
                                    {job.name === 'report_generate' ? 'إنشاء تقرير' : 
                                     job.name === 'import_students' ? 'استيراد طلاب' : 
                                     job.name}
                                    <div className="text-xs text-gray-400 mt-0.5 font-mono">{job.id}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                        job.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        job.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                        job.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                        {job.status === 'completed' ? 'مكتمل' :
                                         job.status === 'failed' ? 'فشل' :
                                         job.status === 'running' ? 'جاري التنفيذ' :
                                         'في الانتظار'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600 dark:text-gray-400" dir="ltr">
                                    {new Date(job.createdAt).toLocaleString('en-US')}
                                </td>
                                <td className="px-6 py-4">
                                    {job.result ? (
                                        <div className="text-xs text-gray-500 max-w-xs truncate" title={JSON.stringify(job.result)}>
                                            {JSON.stringify(job.result)}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default BackgroundJobs;
