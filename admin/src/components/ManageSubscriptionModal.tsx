import React, { useState, useEffect } from 'react';
import { Subscription, SubscriptionStatus, Plan, Module, UsageLimit, SchoolModuleSubscription, ModuleId } from '../types';
import * as api from '../api';

interface ManageSubscriptionModalProps {
  subscription: Subscription;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ManageSubscriptionModal: React.FC<ManageSubscriptionModalProps> = ({ subscription, isOpen, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [status, setStatus] = useState<SubscriptionStatus>(subscription.status);
  const [renewalDate, setRenewalDate] = useState<string>(subscription.renewalDate ? subscription.renewalDate.split('T')[0] : '');
  
  const [limitStudents, setLimitStudents] = useState<string | number>('');
  const [limitTeachers, setLimitTeachers] = useState<string | number>('');
  const [limitStorage, setLimitStorage] = useState<string | number>('');
  const [limitBranches, setLimitBranches] = useState<string | number>('');

  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [plansData, modulesData] = await Promise.all([
          api.getPlans(),
          api.getAvailableModules()
        ]);
        setPlans(plansData);
        setModules(modulesData);
        
        // Find plan ID based on name
        const currentPlan = plansData.find(p => p.name === subscription.plan);
        if (currentPlan) {
            setSelectedPlanId(String(currentPlan.id));
        }

        // Initialize limits
        const limits = subscription.customLimits || (currentPlan ? currentPlan.limits : null);
        if (limits) {
            setLimitStudents(limits.students);
            setLimitTeachers(limits.teachers);
            setLimitStorage(limits.storageGB);
            setLimitBranches(limits.branches);
        } else {
             // Fallback if no plan found and no custom limits
             setLimitStudents('غير محدود');
             setLimitTeachers('غير محدود');
             setLimitStorage('غير محدود');
             setLimitBranches('غير محدود');
        }
        
        // Initialize modules
        if (subscription.modules) {
          setSelectedModules(subscription.modules.map(m => m.moduleId));
        } else {
            // If no modules info in subscription, maybe fetch them or assume none?
            // Usually getSubscriptions should include them now.
             setSelectedModules([]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen, subscription]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const customLimits: UsageLimit = {
        students: limitStudents === 'غير محدود' ? 'غير محدود' : Number(limitStudents),
        teachers: limitTeachers === 'غير محدود' ? 'غير محدود' : Number(limitTeachers),
        storageGB: limitStorage === 'غير محدود' ? 'غير محدود' : Number(limitStorage),
        branches: limitBranches === 'غير محدود' ? 'غير محدود' : Number(limitBranches),
      };

      await api.updateSubscription(subscription.id, {
        planId: selectedPlanId ? Number(selectedPlanId) : undefined,
        status,
        renewalDate,
        customLimits,
        modules: selectedModules.map(mid => {
            const mod = modules.find(m => m.id === mid);
            return { 
                moduleId: mid, 
                active: true,
                price: mod ? mod.monthlyPrice : 0
            };
        })
      });
      onSave();
      onClose();
    } catch (err) {
      console.error('Error updating subscription:', err);
      alert('حدث خطأ أثناء تحديث الاشتراك');
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            إدارة اشتراك: {subscription.schoolName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : (
            <>
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الخطة</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">اختر الخطة</option>
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.id}>{plan.name} - ${plan.price}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الحالة</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {Object.values(SubscriptionStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تاريخ التجديد</label>
                  <input
                    type="date"
                    value={renewalDate}
                    onChange={(e) => setRenewalDate(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Usage Limits */}
              <div className="border-t dark:border-gray-700 pt-6">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">حدود الاستخدام (تخصيص)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الطلاب</label>
                    <input
                      type="text"
                      value={limitStudents}
                      onChange={(e) => setLimitStudents(e.target.value)}
                      placeholder="عدد أو 'غير محدود'"
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">المعلمون</label>
                    <input
                      type="text"
                      value={limitTeachers}
                      onChange={(e) => setLimitTeachers(e.target.value)}
                      placeholder="عدد أو 'غير محدود'"
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">التخزين (GB)</label>
                    <input
                      type="text"
                      value={limitStorage}
                      onChange={(e) => setLimitStorage(e.target.value)}
                      placeholder="عدد أو 'غير محدود'"
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الفروع</label>
                    <input
                      type="text"
                      value={limitBranches}
                      onChange={(e) => setLimitBranches(e.target.value)}
                      placeholder="عدد أو 'غير محدود'"
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Modules */}
              <div className="border-t dark:border-gray-700 pt-6">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">الوحدات (Modules)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modules.map(module => (
                    <div key={module.id} className="flex items-start space-x-3 rtl:space-x-reverse">
                      <div className="flex h-5 items-center">
                        <input
                          id={`module-${module.id}`}
                          name={`module-${module.id}`}
                          type="checkbox"
                          checked={selectedModules.includes(module.id)}
                          onChange={() => toggleModule(module.id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                      </div>
                      <div className="text-sm">
                        <label htmlFor={`module-${module.id}`} className="font-medium text-gray-700 dark:text-gray-300">
                          {module.name}
                        </label>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">{module.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex flex-row-reverse gap-2">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageSubscriptionModal;
