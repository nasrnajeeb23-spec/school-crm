import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { getApiKeys, createOrUpdateApiKey, deleteApiKey } from '../api';

const mask = (s: string) => s.length <= 6 ? '******' : `${s.slice(0, 3)}****${s.slice(-3)}`;

const ApiKeys: React.FC = () => {
  const { addToast } = useToast();
  const [keys, setKeys] = useState<Array<{ id: string; provider: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [key, setKey] = useState('');

  const [unsupported, setUnsupported] = useState(false);
  const fetchKeys = async () => {
    setLoading(true);
    try {
      const data = await getApiKeys();
      setKeys(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('HTTP 404')) setUnsupported(true);
      addToast('فشل تحميل مفاتيح API.', 'error');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchKeys(); }, []);

  const saveKey = async () => {
    if (!key || !provider) return;
    setSaving(true);
    try {
      await createOrUpdateApiKey({ provider, key });
      addToast('تم حفظ المفتاح بنجاح.', 'success');
      setKey('');
      await fetchKeys();
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('HTTP 404')) setUnsupported(true);
      addToast('فشل حفظ المفتاح.', 'error');
    }
    finally { setSaving(false); }
  };

  const removeKey = async (id: string) => {
    try {
      await deleteApiKey(id);
      addToast('تم حذف المفتاح.', 'success');
      await fetchKeys();
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('HTTP 404')) setUnsupported(true);
      addToast('فشل حذف المفتاح.', 'error');
    }
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700";

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white">مفاتيح API</h2>
      {unsupported && (
        <div className="p-4 rounded-lg bg-yellow-100 text-yellow-800">إدارة مفاتيح API غير مدعومة على الخادم الحالي (404). يرجى تمكين مسارات /superadmin/api-keys.</div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3">إضافة/تحديث مفتاح</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">المزوّد</label>
            <select value={provider} onChange={e => setProvider(e.target.value)} className={inputStyle}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
              <option value="openrouter">OpenRouter</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">المفتاح</label>
            <input type="password" value={key} onChange={e => setKey(e.target.value)} className={inputStyle} placeholder="أدخل المفتاح بأمان" />
          </div>
          <div className="flex items-end">
            <button onClick={saveKey} disabled={saving || !key} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">حفظ</button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">يتم حفظ المفاتيح في الخادم الآمن. لا يتم عرض القيم كاملة لأسباب أمنية.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3">المفاتيح الحالية</h3>
        {loading ? (
          <div>جاري التحميل...</div>
        ) : keys.length === 0 ? (
          <div className="text-gray-500">لا توجد مفاتيح محفوظة.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3">المزوّد</th>
                  <th className="px-6 py-3">القيمة (مخفاة)</th>
                  <th className="px-6 py-3">تاريخ الإنشاء</th>
                  <th className="px-6 py-3">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                    <td className="px-6 py-4">{k.provider}</td>
                    <td className="px-6 py-4">{mask(k.id)}</td>
                    <td className="px-6 py-4" dir="ltr">{k.createdAt}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => removeKey(k.id)} className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700">حذف</button>
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

export default ApiKeys;
