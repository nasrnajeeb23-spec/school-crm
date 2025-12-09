import React, { useEffect, useState } from 'react';
import * as api from '../api';
import { School, Plan } from '../types';

const LicenseManagement: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    api.getSchools().then(setSchools).catch(() => setSchools([]));
    api.getPlans().then(setPlans).catch(() => setPlans([]));
  }, []);

  const generate = async () => {
    if (!selectedSchoolId || !selectedPlanId) return;
    setLoading(true);
    const school = schools.find(s => s.id === selectedSchoolId);
    const payload = { schoolName: school?.name || '', planId: selectedPlanId, expiresAt: expiresAt || null } as any;
    const res = await api.generateLicenseKey(payload);
    setLoading(false);
    if (res?.licenseKey) {
      setLicenseKey(res.licenseKey);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">إدارة تراخيص النسخة الذاتية</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
          <label className="block text-sm mb-2">اختيار المدرسة</label>
          <select className="w-full p-2 border rounded" value={selectedSchoolId ?? ''} onChange={e => setSelectedSchoolId(Number(e.target.value))}>
            <option value="" disabled>اختر مدرسة</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <label className="block text-sm mt-4 mb-2">الخطة</label>
          <select className="w-full p-2 border rounded" value={selectedPlanId} onChange={e => setSelectedPlanId(String(e.target.value))}>
            <option value="">اختر خطة</option>
            {plans.map(p => (
              <option key={p.id} value={String(p.id)}>{p.name} - ${p.price}</option>
            ))}
          </select>
          <label className="block text-sm mt-4 mb-2">تاريخ انتهاء (اختياري)</label>
          <input type="date" className="w-full p-2 border rounded" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded" disabled={loading} onClick={generate}>{loading ? 'جاري الإنشاء...' : 'إنشاء مفتاح'}</button>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
          <label className="block text-sm mb-2">المفتاح الناتج</label>
          <textarea className="w-full p-2 border rounded min-h-[160px]" readOnly value={licenseKey} />
          <button className="mt-2 px-4 py-2 bg-gray-700 text-white rounded" onClick={() => navigator.clipboard && licenseKey && navigator.clipboard.writeText(licenseKey)}>نسخ المفتاح</button>
        </div>
      </div>
    </div>
  );
};

export default LicenseManagement;
