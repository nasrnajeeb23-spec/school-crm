import React, { useEffect, useState } from 'react';
import * as api from '../api';
import { ParentsIcon } from '../components/icons';

interface Props { schoolId: number }

const SchoolParentRequests: React.FC<Props> = ({ schoolId }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const load = async () => {
    setLoading(true); setError('');
    try { const res = await api.getSchoolParentRequests(schoolId); setItems(res || []); } catch (e:any) { setError(e?.message || 'فشل تحميل الطلبات'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [schoolId]);

  const onApprove = async (id: string) => { await api.approveParentRequest(schoolId, id); await load(); };
  const onReject = async (id: string) => { await api.rejectParentRequest(schoolId, id); await load(); };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center"><ParentsIcon className="h-6 w-6 ml-2"/>طلبات أولياء الأمور</h2>
      {loading && <div>جاري التحميل...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <table className="w-full text-right">
          <thead>
            <tr className="border-b"><th className="p-2">ولي الأمر</th><th className="p-2">العنوان</th><th className="p-2">الوصف</th><th className="p-2">الحالة</th><th className="p-2">تاريخ</th><th className="p-2">إجراءات</th></tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{r.parentName} ({r.parentEmail})</td>
                <td className="p-2">{r.title}</td>
                <td className="p-2">{r.description}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.createdAt}</td>
                <td className="p-2 space-x-2 space-x-reverse">
                  <button onClick={() => onApprove(r.id)} className="px-3 py-1 bg-green-600 text-white rounded">موافقة</button>
                  <button onClick={() => onReject(r.id)} className="px-3 py-1 bg-red-600 text-white rounded">رفض</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SchoolParentRequests;
