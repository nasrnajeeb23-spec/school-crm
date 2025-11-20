import React, { useState, useEffect } from 'react';
import { Plan } from '../types';
import * as api from '../api';
import { CheckIcon } from './icons';

// This component is a display-only version of the plans for the public landing page.
const PublicPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPlans().then(data => {
      setPlans(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-center p-8">جاري تحميل الخطط...</div>;
  }

  return (
    <div className="space-y-8">
      {/* The "Add Plan" button is removed for the public view */}
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
            <h3 className="text-2xl font-bold text-center text-gray-800 dark:text-white">{plan.name}</h3>
            <div className="mt-4 text-center">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                {plan.price > 0 ? `$${plan.price}`: ''}
              </span>
              <span className="text-base font-medium text-gray-500 dark:text-gray-400">
                {plan.price > 0 ? ` / ${plan.pricePeriod}` : plan.pricePeriod}
              </span>
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
              >
                اختر الخطة
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PublicPlans;
