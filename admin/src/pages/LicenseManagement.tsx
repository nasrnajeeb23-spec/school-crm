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
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [generatingPackage, setGeneratingPackage] = useState<boolean>(false);

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

  const generatePackage = async () => {
      setGeneratingPackage(true);
      try {
        // Assume all modules for now or add UI for selection
        const url = await api.generateSelfHostedPackage({ planId: selectedPlanId });
        if (url) {
            // api.getAssetUrl helps construct the full URL if needed, 
            // but the download endpoint is an API endpoint, so we prepend API base.
            // However, the api function returns what the backend sent.
            // If backend sent relative path /superadmin/download/..., we need to append it to API base.
            const fullUrl = api.getApiBase() + url;
            setDownloadUrl(fullUrl);
        }
      } catch (e) {
          alert('فشل إنشاء الحزمة');
      }
      setGeneratingPackage(false);
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
          <div className="mt-6 flex flex-col gap-3">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition" disabled={loading} onClick={generate}>
                {loading ? 'جاري إنشاء المفتاح...' : '1. إنشاء مفتاح الترخيص'}
            </button>
            <button className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition" disabled={generatingPackage} onClick={generatePackage}>
                {generatingPackage ? 'جاري تحضير الحزمة...' : '2. توليد نسخة النظام (Zip)'}
            </button>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow space-y-4">
          <div>
            <label className="block text-sm mb-2 font-semibold">مفتاح الترخيص الناتج</label>
            <textarea className="w-full p-2 border rounded min-h-[100px] font-mono text-sm bg-gray-50 dark:bg-gray-900" readOnly value={licenseKey} placeholder="سيظهر مفتاح الترخيص هنا..." />
            <button className="mt-2 text-sm text-indigo-600 hover:text-indigo-800" onClick={() => navigator.clipboard && licenseKey && navigator.clipboard.writeText(licenseKey)}>نسخ المفتاح</button>
          </div>
          
          {downloadUrl && (
            <div className="p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h3 className="font-bold text-green-800 dark:text-green-300 mb-2">تم تجهيز الحزمة بنجاح!</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">تحتوي الحزمة على الكود المصدري وسكربتات التثبيت.</p>
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
                    تحميل الحزمة (.zip)
                </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LicenseManagement;
