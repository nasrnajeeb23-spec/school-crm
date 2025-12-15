import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { SchoolSettings } from '../types';
import { useToast } from '../contexts/ToastContext';
import GeneralSettings from './settings/GeneralSettings';

interface SettingsProps {
  schoolId: number;
}

const Settings: React.FC<SettingsProps> = ({ schoolId }) => {
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const { addToast } = useToast();

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    try {
      const k = `school_settings_draft_${schoolId}`;
      return typeof window !== 'undefined' ? !!localStorage.getItem(k) : false;
    } catch { return false; }
  });

  const [draftEnabled, setDraftEnabled] = useState<boolean>(() => {
    try {
      const k = `school_settings_draft_enabled_${schoolId}`;
      const v = typeof window !== 'undefined' ? localStorage.getItem(k) : null;
      return v ? v === '1' : true;
    } catch { return true; }
  });

  useEffect(() => {
    setLoading(true);
    api.getSchoolSettings(schoolId).then(data => {
      if (draftEnabled) {
        let merged = data;
        try {
          const k = `school_settings_draft_${schoolId}`;
          const s = typeof window !== 'undefined' ? localStorage.getItem(k) : null;
          if (s) {
            const d = JSON.parse(s);
            merged = { ...data, ...d };
          }
        } catch { }
        setSettings(merged);
      } else {
        setSettings(data);
      }
    }).catch(err => {
      console.error("Failed to load settings:", err);
    }).finally(() => {
      setLoading(false);
    });
  }, [schoolId, draftEnabled]);

  useEffect(() => {
    try {
      if (settings && draftEnabled) {
        const k = `school_settings_draft_${schoolId}`;
        if (typeof window !== 'undefined') {
          localStorage.setItem(k, JSON.stringify(settings));
          setHasDraft(true);
        }
      }
    } catch { }
  }, [schoolId, settings, draftEnabled]);

  useEffect(() => {
    try {
      const k = `school_settings_draft_enabled_${schoolId}`;
      if (typeof window !== 'undefined') localStorage.setItem(k, draftEnabled ? '1' : '0');
    } catch { }
  }, [schoolId, draftEnabled]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setLogoUploading(true);
      const url = await api.uploadSchoolLogo(schoolId, file);
      const timestampedUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
      setSettings(prev => prev ? { ...prev, schoolLogoUrl: timestampedUrl } : prev);
      try { e.target.value = ''; } catch { }
      addToast('تم رفع شعار المدرسة بنجاح.', 'success');
    } catch (err) {
      console.error('Failed to upload logo:', err);
      const m = String((err as any)?.message || '');
      addToast(m ? `فشل رفع شعار المدرسة: ${m}` : 'فشل رفع شعار المدرسة.', 'error');
    } finally { setLogoUploading(false); }
  };

  const restoreDraft = () => {
    try {
      const k = `school_settings_draft_${schoolId}`;
      const s = typeof window !== 'undefined' ? localStorage.getItem(k) : null;
      if (!s) { addToast('لا توجد مسودة محفوظة.', 'warning'); return; }
      const d = JSON.parse(s);
      setSettings(prev => prev ? { ...prev, ...d } : d);
      addToast('تم استعادة المسودة.', 'success');
    } catch {
      addToast('تعذر استعادة المسودة.', 'error');
    }
  };

  const clearDraft = () => {
    try {
      const k = `school_settings_draft_${schoolId}`;
      if (typeof window !== 'undefined') localStorage.removeItem(k);
      setHasDraft(false);
      addToast('تم حذف المسودة.', 'success');
    } catch {
      addToast('تعذر حذف المسودة.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await api.updateSchoolSettings(schoolId, settings);
      try {
        const k = `school_settings_draft_${schoolId}`;
        if (typeof window !== 'undefined') localStorage.removeItem(k);
      } catch { }
      setHasDraft(false);
      addToast('تم حفظ الإعدادات بنجاح!', 'success');
    } catch (err) {
      console.error("Failed to save settings:", err);
      const m = String((err as any)?.message || '');
      addToast(m ? `فشل حفظ الإعدادات: ${m}` : 'فشل حفظ الإعدادات.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsChange = (updates: Partial<SchoolSettings>) => {
    setSettings(prev => prev ? { ...prev, ...updates } : null);
  };

  if (loading) {
    return <div className="text-center p-8">جاري تحميل الإعدادات...</div>;
  }

  if (!settings) {
    return <div className="text-center p-8">لا يمكن تحميل الإعدادات.</div>;
  }

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

  const tabs = [
    { id: 'general', label: 'الإعدادات العامة' },
    { id: 'school', label: 'إعدادات المدرسة' },
    { id: 'security', label: 'الأمان' },
    { id: 'notifications', label: 'الإشعارات' },
    { id: 'stages', label: 'المراحل والفصول' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Draft Controls */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draftEnabled}
              onChange={(e) => setDraftEnabled(e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">حفظ المسودة تلقائياً</span>
          </label>
          {hasDraft && (
            <>
              <button type="button" onClick={restoreDraft} className="text-sm text-teal-600 hover:text-teal-700">
                استعادة المسودة
              </button>
              <button type="button" onClick={clearDraft} className="text-sm text-red-600 hover:text-red-700">
                حذف المسودة
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-md">
        <nav className="flex gap-2 overflow-x-auto" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <GeneralSettings
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onLogoChange={handleLogoChange}
          logoUploading={logoUploading}
          inputStyle={inputStyle}
        />
      )}

      {activeTab === 'school' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">إعدادات المدرسة</h3>
          <p className="text-gray-600 dark:text-gray-400">سيتم إضافة المزيد من الإعدادات قريباً...</p>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">إعدادات الأمان</h3>
          <p className="text-gray-600 dark:text-gray-400">سيتم إضافة المزيد من الإعدادات قريباً...</p>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">إعدادات الإشعارات</h3>
          <p className="text-gray-600 dark:text-gray-400">سيتم إضافة المزيد من الإعدادات قريباً...</p>
        </div>
      )}

      {activeTab === 'stages' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">إدارة المراحل والفصول</h3>
          <p className="text-gray-600 dark:text-gray-400">سيتم إضافة المزيد من الإعدادات قريباً...</p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </form>
  );
};

export default Settings;
