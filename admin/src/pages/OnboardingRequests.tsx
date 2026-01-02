import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { apiCall } from '../api';

const OnboardingRequests: React.FC = () => {
  const { addToast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { const list = await apiCall('/superadmin/onboarding/requests', { method: 'GET' }); setRows(Array.isArray(list) ? list : []); } catch { addToast('فشل تحميل الطلبات.', 'error'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const approve = async (id: number) => {
    try { const res = await apiCall(`/superadmin/onboarding/requests/${id}/approve`, { method: 'POST' }); addToast('تمت الموافقة وإنشاء المدرسة.', 'success'); await load(); } catch { addToast('فشل الموافقة.', 'error'); }
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">طلبات النسخة التجريبية</h2>
        <button onClick={load} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">تحديث</button>
      </div>
      {loading ? (<div>جاري التحميل...</div>) : rows.length === 0 ? (<div className="text-gray-500">لا توجد طلبات.</div>) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="text-xs bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3">المدرسة</th>
                <th className="px-6 py-3">المدير</th>
                <th className="px-6 py-3">البريد</th>
                <th className="px-6 py-3">الهاتف</th>
                <th className="px-6 py-3">الحالة</th>
                <th className="px-6 py-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                  <td className="px-6 py-4">{r.schoolName}</td>
                  <td className="px-6 py-4">{r.adminName}</td>
                  <td className="px-6 py-4" dir="ltr">{r.adminEmail}</td>
                  <td className="px-6 py-4">{r.phone || '-'}</td>
                  <td className="px-6 py-4">{r.status}</td>
                  <td className="px-6 py-4">
                    {r.status === 'NEW' ? (
                      <button onClick={() => approve(r.id)} className="px-3 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700">موافقة وإنشاء</button>
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
  );
};

export default OnboardingRequests;
