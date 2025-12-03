import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { getSchools, triggerJobForSchools } from '../api';

const ReportsCenter: React.FC = () => {
  const { addToast } = useToast();
  const [schools, setSchools] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => { (async () => {
    try { const list = await getSchools(); setSchools(Array.isArray(list) ? list : []); } catch { addToast('فشل تحميل المدارس.', 'error'); }
    setLoading(false);
  })(); }, [addToast]);

  const toggle = (id: number) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const runReport = async (type: 'payments_report' | 'invoices_report') => {
    if (selected.length === 0) { addToast('اختر مدرسة واحدة على الأقل.', 'warning'); return; }
    setRunning(true);
    try {
      const payload = { schoolIds: selected, jobType: type, params: { from: from || undefined, to: to || undefined } };
      const res = await triggerJobForSchools(payload);
      addToast(`تم بدء ${res.started} مهمة تقارير. انتقل إلى مركز المهام للتنزيل.`, 'success');
    } catch { addToast('فشل بدء التقارير.', 'error'); }
    setRunning(false);
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700";

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white">مركز التقارير</h2>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3">اختيار المدارس والمدى الزمني</h3>
        {loading ? (<div>جاري التحميل...</div>) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {schools.map(s => (
              <label key={s.id} className="flex items-center gap-2 p-2 border rounded-lg dark:border-gray-700">
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
                <span>{s.name}</span>
              </label>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm">من تاريخ</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputStyle} />
          </div>
          <div>
            <label className="block text-sm">إلى تاريخ</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputStyle} />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => runReport('payments_report')} disabled={running || selected.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">تقارير المدفوعات</button>
            <button onClick={() => runReport('invoices_report')} disabled={running || selected.length === 0} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">تقارير الفواتير</button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">بعد بدء المهمة، انتقل إلى مركز المهام لتنزيل CSV.</p>
      </div>
    </div>
  );
};

export default ReportsCenter;
