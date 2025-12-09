import React, { useState, useEffect } from 'react';
import { Plan, PricingConfig } from '../types';
import * as api from '../api';
import { CheckIcon, PlusIcon } from '../components/icons';

interface PlansListProps {
  mode?: 'admin' | 'public';
  onSelectPlan?: (plan: Plan) => void;
}

const PlansList: React.FC<PlansListProps> = ({ mode = 'admin', onSelectPlan }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    (async () => {
      try {
        const [data, conf] = await Promise.all([
          api.getPlans(),
          mode === 'public' ? api.apiCall('/pricing/public/config', { method: 'GET' }) : api.getPricingConfig()
        ]);
        setPlans(data);
        setPricing(conf as PricingConfig);
      } catch {
        try { const data = await api.getPlans(); setPlans(data); } catch {}
        setPricing({ pricePerStudent: 0, pricePerTeacher: 0, pricePerGBStorage: 0, pricePerInvoice: 0, currency: '$', yearlyDiscountPercent: 0 });
      } finally { setLoading(false); }
    })();
  }, [mode]);

  if (loading) {
    return <div className="text-center p-8">جاري تحميل الخطط...</div>;
  }

  const discount = Number(pricing?.yearlyDiscountPercent || 0);
  const currency = String(pricing?.currency || '$');
  const computePrice = (plan: Plan) => {
    const base = Number(plan.price || 0);
    if (!base || String(plan.pricePeriod).includes('تواصل')) return { amount: 0, period: String(plan.pricePeriod || '') };
    if (billing === 'yearly') {
      const yearly = base * 12 * (1 - (discount / 100));
      return { amount: yearly, period: 'سنوياً' };
    }
    return { amount: base, period: 'شهرياً' };
  };

  return (
    <div className="space-y-8">
      {mode === 'admin' && (
        <div className="flex justify-end items-center">
            <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <PlusIcon className="h-5 w-5 ml-2" />
                إضافة خطة جديدة
            </button>
        </div>
      )}
      {mode === 'public' && (
        <div className="flex items-center justify-center mb-4">
          <div className="inline-flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <button onClick={() => setBilling('monthly')} className={`px-4 py-2 text-sm ${billing === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>شهري</button>
            <button onClick={() => setBilling('yearly')} className={`px-4 py-2 text-sm ${billing === 'yearly' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>سنوي</button>
          </div>
          {billing === 'yearly' && discount > 0 && (
            <span className="ml-3 rtl:mr-3 rtl:ml-0 px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 rounded-full">وفر {discount}%</span>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 flex flex-col relative ${plan.recommended ? 'border-2 border-indigo-500' : 'border border-gray-200 dark:border-gray-700'}`}
          >
            {plan.recommended && (
              <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                الخطة المقترحة
              </div>
            )}
            <div className="absolute -top-3 -left-3 rtl:-right-3 rtl:-left-0 bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">تجربة مجانية 30 يوم</div>
            <h3 className="text-2xl font-bold text-center text-gray-800 dark:text-white">{plan.name}</h3>
            <div className="mt-4 text-center">
              {(() => {
                const p = computePrice(plan);
                return (
                  <>
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                      {p.amount > 0 ? `${Math.round(p.amount).toLocaleString()} ${currency}` : ''}
                    </span>
                    <span className="text-base font-medium text-gray-500 dark:text-gray-400">
                      {p.amount > 0 ? ` / ${p.period}` : plan.pricePeriod}
                    </span>
                    {billing === 'yearly' && p.amount > 0 && (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        ما يعادل {(Math.round(p.amount / 12)).toLocaleString()} {currency} شهرياً
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <ul className="mt-8 space-y-4 flex-grow">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckIcon className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="mr-3 text-base text-gray-600 dark:text-gray-300">{feature}</p>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <button
                className={`w-full py-3 px-6 text-base font-medium rounded-lg transition-colors ${
                  plan.recommended
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
                onClick={() => { if (mode === 'public') { onSelectPlan && onSelectPlan(plan); } }}
              >
                {mode === 'admin' ? 'تعديل الخطة' : 'اختر الخطة'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {mode === 'public' && (
        <div className="mt-8 overflow-x-auto">
          <div className="min-w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">مقارنة الباقات</h4>
            <table className="w-full text-sm text-right text-gray-600 dark:text-gray-300">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-gray-700 dark:text-gray-200">العنصر</th>
                  {plans.map(p => (
                    <th key={`h-${p.id}`} className="px-4 py-2 text-gray-700 dark:text-gray-200">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">الطلاب المسموح</td>
                  {plans.map(p => (<td key={`s-${p.id}`} className="px-4 py-2">{String(p.limits.students)}</td>))}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">المعلمين المسموح</td>
                  {plans.map(p => (<td key={`t-${p.id}`} className="px-4 py-2">{String(p.limits.teachers)}</td>))}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">التخزين (GB)</td>
                  {plans.map(p => (<td key={`st-${p.id}`} className="px-4 py-2">{String((p.limits as any).storageGB ?? 'غير محدد')}</td>))}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">الفواتير الشهرية</td>
                  {plans.map(p => (<td key={`inv-${p.id}`} className="px-4 py-2">{String((p.limits as any).invoices ?? 'غير محدد')}</td>))}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">أبرز الميزات</td>
                  {plans.map(p => (
                    <td key={`f-${p.id}`} className="px-4 py-2">{Array.isArray(p.features) && p.features.length > 0 ? p.features.slice(0,3).join('، ') : '—'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansList;
