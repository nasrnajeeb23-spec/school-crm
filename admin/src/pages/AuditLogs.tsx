import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { getSuperAdminAuditLogs } from '../api/superAdminAuth';

const AuditLogs: React.FC = () => {
  const { addToast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ startDate?: string; endDate?: string; action?: string; userId?: number }>({});

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getSuperAdminAuditLogs(filters);
      setLogs(data || []);
    } catch (err) {
      addToast('فشل تحميل سجلات التدقيق.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700";

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">سجلات التدقيق</h2>
        <button onClick={fetchLogs} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">تحديث</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">من تاريخ</label>
          <input type="date" value={filters.startDate || ''} onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))} className={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إلى تاريخ</label>
          <input type="date" value={filters.endDate || ''} onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))} className={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">نوع الفعل</label>
          <input type="text" placeholder="مثال: platform.login" value={filters.action || ''} onChange={e => setFilters(p => ({ ...p, action: e.target.value }))} className={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">معرّف المستخدم</label>
          <input type="number" value={filters.userId || ''} onChange={e => setFilters(p => ({ ...p, userId: Number(e.target.value) }))} className={inputStyle} />
        </div>
      </div>
      <div className="flex justify-end mb-4">
        <button onClick={fetchLogs} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">تطبيق الفلاتر</button>
      </div>

      {loading ? (
        <div className="text-center p-8">جاري تحميل السجلات...</div>
      ) : logs.length === 0 ? (
        <div className="text-center p-8 text-gray-500">لا توجد سجلات مطابقة للفلاتر الحالية.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right text-gray-600 dark:text-gray-300">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-6 py-3">الوقت</th>
                <th className="px-6 py-3">الفعل</th>
                <th className="px-6 py-3">المستخدم</th>
                <th className="px-6 py-3">IP</th>
                <th className="px-6 py-3">الجهاز</th>
                <th className="px-6 py-3">مستوى المخاطر</th>
                <th className="px-6 py-3">تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                  <td className="px-6 py-4" dir="ltr">{log.timestamp}</td>
                  <td className="px-6 py-4">{log.action}</td>
                  <td className="px-6 py-4">{log.userEmail} (#{log.userId})</td>
                  <td className="px-6 py-4" dir="ltr">{log.ipAddress}</td>
                  <td className="px-6 py-4">{log.userAgent?.slice(0, 40)}...</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${log.riskLevel === 'high' ? 'bg-red-100 text-red-800' : log.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{log.riskLevel}</span></td>
                  <td className="px-6 py-4"><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
