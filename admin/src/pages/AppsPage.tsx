import React, { useEffect, useState } from 'react';
import { LogoIcon, DownloadIcon, ServerIcon, AlertTriangleIcon } from '../components/icons';

interface AppsMeta { parent?: { apkUrl?: string; sha256?: string; label?: string }; teacher?: { apkUrl?: string; sha256?: string; label?: string } }

const AppsPage: React.FC = () => {
  const [meta, setMeta] = useState<AppsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [dismissedIosHelp, setDismissedIosHelp] = useState<boolean>(() => {
    try { return localStorage.getItem('apps_ios_help_dismissed') === '1'; } catch { return false; }
  });

  useEffect(() => {
    fetch('/assets/apps.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => setMeta(data))
      .catch(() => setMeta(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
    const inStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone === true;
    setIsIos(ios);
    setShowIosHelp(ios && !inStandalone && !dismissedIosHelp);
  }, []);
  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-200">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <LogoIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              <span className="ml-3 rtl:mr-3 rtl:ml-0 text-2xl font-bold">SchoolSaaS</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="/" className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">الصفحة الرئيسية</a>
              <a href="/login" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">تسجيل الدخول</a>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold">تطبيقات المنصة</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">حمّل تطبيق ولي الأمر والمعلم أو استخدم النسخة الويب (PWA).</p>
        </div>

        {showIosHelp && (
          <div className="mb-8 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">تعليمات iOS لإضافة التطبيق إلى الشاشة الرئيسية</p>
                <ol className="mt-2 text-sm text-amber-700 dark:text-amber-300 list-decimal list-inside space-y-1">
                  <li>افتح النسخة الويب (PWA) للتطبيق المطلوب.</li>
                  <li>اضغط زر المشاركة في Safari.</li>
                  <li>اختر "إضافة إلى الشاشة الرئيسية".</li>
                  <li>اضغط إضافة، ستظهر أيقونة التطبيق على الشاشة الرئيسية.</li>
                </ol>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      try { localStorage.setItem('apps_ios_help_dismissed', '1'); } catch {}
                      setDismissedIosHelp(true);
                      setShowIosHelp(false);
                    }}
                    className="px-3 py-1.5 text-xs rounded-md bg-amber-600 text-white hover:bg-amber-700"
                  >إخفاء</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">تطبيق ولي الأمر</h2>
            </div>
            <div className="space-y-4">
              {meta?.parent?.apkUrl ? (
                <a href={meta.parent.apkUrl} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-rose-600 text-white hover:bg-rose-700">
                  <DownloadIcon className="w-5 h-5" />
                  تحميل Android APK{meta?.parent?.label === 'debug' ? ' (اختباري)' : ''}
                </a>
              ) : (
                <button type="button" disabled className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gray-300 text-gray-700 cursor-not-allowed">
                  <DownloadIcon className="w-5 h-5" />
                  تحميل Android APK (قريبًا)
                </button>
              )}
              <a href="/apps/parent/index.html" className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-teal-600 text-white hover:bg-teal-700">
                <ServerIcon className="w-5 h-5" />
                فتح النسخة الويب (PWA)
              </a>
              {meta?.parent?.sha256 && (
                <div className="text-xs text-gray-600 dark:text-gray-400 break-all">
                  بصمة الملف (SHA-256): {meta.parent.sha256}
                </div>
              )}
              <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                <AlertTriangleIcon className="w-4 h-4 text-amber-500" />
                <span>تنبيه: قد تحتاج لتفعيل التثبيت من "مصادر غير معروفة" في إعدادات أندرويد. تأكد من تنزيل الملف من هذا الرابط الرسمي فقط.</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">لأجهزة iOS: افتح النسخة الويب واضغط إضافة إلى الشاشة الرئيسية.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">تطبيق المعلم</h2>
            </div>
            <div className="space-y-4">
              {meta?.teacher?.apkUrl ? (
                <a href={meta.teacher.apkUrl} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-rose-600 text-white hover:bg-rose-700">
                  <DownloadIcon className="w-5 h-5" />
                  تحميل Android APK{meta?.teacher?.label === 'debug' ? ' (اختباري)' : ''}
                </a>
              ) : (
                <button type="button" disabled className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gray-300 text-gray-700 cursor-not-allowed">
                  <DownloadIcon className="w-5 h-5" />
                  تحميل Android APK (قريبًا)
                </button>
              )}
              <a href="/apps/teacher/index.html" className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-teal-600 text-white hover:bg-teal-700">
                <ServerIcon className="w-5 h-5" />
                فتح النسخة الويب (PWA)
              </a>
              {meta?.teacher?.sha256 && (
                <div className="text-xs text-gray-600 dark:text-gray-400 break-all">
                  بصمة الملف (SHA-256): {meta.teacher.sha256}
                </div>
              )}
              <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                <AlertTriangleIcon className="w-4 h-4 text-amber-500" />
                <span>تنبيه: قد تحتاج لتفعيل التثبيت من "مصادر غير معروفة" في إعدادات أندرويد. تأكد من تنزيل الملف من هذا الرابط الرسمي فقط.</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">لأجهزة iOS: افتح النسخة الويب واضغط إضافة إلى الشاشة الرئيسية.</p>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-indigo-50 dark:bg-indigo-900/40 p-6 rounded-xl text-center">
          <p className="text-sm text-indigo-800 dark:text-indigo-200">سنضيف روابط التحميل والنسخة الويب بعد تجهيز الحزم وبناء PWA. هذه الصفحة ستبقى هي المكان الرسمي للحصول عليها.</p>
        </div>
      </main>
    </div>
  );
};

export default AppsPage;
