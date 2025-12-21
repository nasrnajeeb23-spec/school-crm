import React, { useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getDriverMe, getDriverRoutes, getDriverSalarySlips } from '../api';

const DriverDashboard: React.FC = () => {
  const { currentUser } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [salarySlips, setSalarySlips] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [mePayload, routesPayload, slipsPayload] = await Promise.all([getDriverMe(), getDriverRoutes(), getDriverSalarySlips()]);
        if (!mounted) return;
        setMe(mePayload);
        setRoutes(routesPayload);
        setSalarySlips(slipsPayload);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'حدث خطأ أثناء تحميل بيانات السائق.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="mt-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">لوحة السائق</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {currentUser ? `مرحباً ${currentUser.name}.` : 'مرحباً بك.'}
        </p>
        {loading && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">جاري تحميل بياناتك...</div>
        )}
        {!loading && error && (
          <div className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
        {!loading && !error && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-white">معلومات السائق</h3>
              <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500 dark:text-gray-400">عدد الخطوط</span>
                  <span>{Number(me?.routesCount || 0)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500 dark:text-gray-400">عدد ملفات السائق</span>
                  <span>{Array.isArray(me?.operators) ? me.operators.length : 0}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500 dark:text-gray-400">عدد كشوف الراتب</span>
                  <span>{Array.isArray(salarySlips) ? salarySlips.length : 0}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-white">خطوطك</h3>
              {routes.length === 0 ? (
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">لا توجد خطوط مخصصة لك حالياً.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {routes.map((r: any) => (
                    <div key={String(r.id)} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-white">{r.name || 'خط'}</div>
                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {r.departureTime ? `وقت الانطلاق: ${r.departureTime}` : 'وقت الانطلاق غير محدد'}
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {Number(r.studentsCount || 0)} طلاب
                        </div>
                      </div>
                      {Array.isArray(r.stops) && r.stops.length > 0 && (
                        <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                          {`عدد المحطات: ${r.stops.length}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-white">الرواتب</h3>
              {salarySlips.length === 0 ? (
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">لا توجد كشوف رواتب لعرضها حالياً.</div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        <th className="px-6 py-3">الشهر</th>
                        <th className="px-6 py-3">الصافي</th>
                        <th className="px-6 py-3">الحالة</th>
                        <th className="px-6 py-3">العملة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salarySlips.slice(0, 6).map((s: any) => (
                        <tr key={String(s.id)} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                          <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{s.month}</td>
                          <td className="px-6 py-4 font-semibold">{Number(s.netAmount || 0).toFixed(2)}</td>
                          <td className="px-6 py-4">{String(s.status || '')}</td>
                          <td className="px-6 py-4">{String(s.currencyCode || 'SAR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
