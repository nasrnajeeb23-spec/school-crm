import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { getSsoConfig, updateSsoConfig } from '../api';

const SsoSettings: React.FC = () => {
  const { addToast } = useToast();
  const [config, setConfig] = useState<{ enabled: boolean; providers: Array<{ id: string; name: string; clientId?: string; clientSecretSet?: boolean }>; callbackUrl?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [unsupported, setUnsupported] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const data = await getSsoConfig();
        setConfig(data);
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg.includes('HTTP 404')) setUnsupported(true);
        addToast('فشل تحميل إعدادات SSO.', 'error');
      }
      finally { setLoading(false); }
    })();
  }, [addToast]);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await updateSsoConfig(config);
      addToast('تم حفظ إعدادات SSO بنجاح.', 'success');
    } catch { addToast('فشل حفظ إعدادات SSO.', 'error'); }
    finally { setSaving(false); }
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700";

  if (loading) return <div className="text-center p-8">جاري التحميل...</div>;
  if (unsupported) return <div className="text-center p-8 text-yellow-700">إعدادات SSO غير مدعومة على الخادم الحالي (404). يرجى تمكين مسار /superadmin/security/sso.</div>;
  if (!config) return <div className="text-center p-8">لا توجد إعدادات متاحة.</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">إعدادات تسجيل الدخول الأحادي (SSO)</h2>
        <button onClick={save} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium">تفعيل SSO</label>
          <select value={String(config.enabled)} onChange={e => setConfig(p => p ? ({ ...p, enabled: e.target.value === 'true' }) : p)} className={inputStyle}>
            <option value="true">مفعل</option>
            <option value="false">معطل</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">رابط الاستدعاء (Callback URL)</label>
          <input type="text" value={config.callbackUrl || ''} onChange={e => setConfig(p => p ? ({ ...p, callbackUrl: e.target.value }) : p)} className={inputStyle} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3">المزوّدون</h3>
        <div className="space-y-4">
          {config.providers.map((prov, idx) => (
            <div key={prov.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium">الاسم</label>
                <input type="text" value={prov.name} onChange={e => setConfig(p => p ? ({ ...p, providers: p.providers.map((x, i) => i === idx ? { ...x, name: e.target.value } : x) }) : p)} className={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium">Client ID</label>
                <input type="text" value={prov.clientId || ''} onChange={e => setConfig(p => p ? ({ ...p, providers: p.providers.map((x, i) => i === idx ? { ...x, clientId: e.target.value } : x) }) : p)} className={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium">Client Secret</label>
                <input type="password" placeholder={prov.clientSecretSet ? 'محفوظ' : 'أدخل القيمة'} onChange={e => setConfig(p => p ? ({ ...p, providers: p.providers.map((x, i) => i === idx ? { ...x, clientSecret: e.target.value } : x) }) : p)} className={inputStyle} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SsoSettings;
