import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { Plan } from '../types';
import { StudentsIcon, UsersIcon, StorageIcon, BranchesIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';

const LimitItem: React.FC<{ icon: React.ElementType; label: string; value: string | number }> = ({ icon: Icon, label, value }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
            <Icon className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            <p className="mr-3 text-base text-gray-600 dark:text-gray-300">{label}</p>
        </div>
        <p className="font-semibold text-gray-800 dark:text-white">
            {typeof value === 'number' ? `حتى ${value.toLocaleString()}` : value}
        </p>
    </div>
);

interface EditLimitsModalProps {
    plan: Plan;
    onClose: () => void;
    onSave: (id: string, limits: Plan['limits']) => Promise<void>;
}

const EditLimitsModal: React.FC<EditLimitsModalProps> = ({ plan, onClose, onSave }) => {
    const [limits, setLimits] = useState(plan.limits);
    const [saving, setSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLimits(prev => ({
            ...prev,
            [name]: Number(value)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(plan.id, limits);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    تعديل حدود: {plan.name}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الطلاب</label>
                        <input
                            type="number"
                            name="students"
                            value={limits.students}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المعلمون</label>
                        <input
                            type="number"
                            name="teachers"
                            value={limits.teachers}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مساحة التخزين (GB)</label>
                        <input
                            type="number"
                            name="storageGB"
                            value={limits.storageGB}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفروع</label>
                        <input
                            type="number"
                            name="branches"
                            value={limits.branches}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700"
                            disabled={saving}
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            disabled={saving}
                        >
                            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UsageLimits: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = () => {
    setLoading(true);
    api.getPlans().then(data => {
      setPlans(data);
      setLoading(false);
    }).catch(() => {
        addToast('فشل تحميل الخطط', 'error');
        setLoading(false);
    });
  };

  const handleUpdateLimits = async (id: string, limits: Plan['limits']) => {
      try {
          await api.updatePlan(id, { limits });
          addToast('تم تحديث الحدود بنجاح', 'success');
          fetchPlans();
      } catch (error) {
          addToast('فشل تحديث الحدود', 'error');
          throw error;
      }
  };

  if (loading) {
    return <div className="text-center p-8">جاري تحميل حدود الاستخدام...</div>;
  }

  return (
    <div className="space-y-8">
      <p className="text-gray-600 dark:text-gray-400">
        هنا يمكنك تحديد و تعديل حدود الموارد والاستخدام لكل خطة من خطط الاشتراك.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {plans.map((plan: Plan) => (
          <div
            key={plan.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 flex flex-col h-full ${plan.recommended ? 'border-2 border-indigo-500' : 'border border-gray-200 dark:border-gray-700'}`}
          >
            <h3 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">{plan.name}</h3>
            
            <div className="space-y-2 flex-grow">
               <LimitItem icon={StudentsIcon} label="الطلاب" value={plan.limits.students} />
               <LimitItem icon={UsersIcon} label="المعلمون" value={plan.limits.teachers} />
               <LimitItem icon={StorageIcon} label="مساحة التخزين (GB)" value={plan.limits.storageGB} />
               <LimitItem icon={BranchesIcon} label="الفروع" value={plan.limits.branches} />
            </div>

            <div className="mt-8">
              <button
                onClick={() => setEditingPlan(plan)}
                className="w-full py-3 px-6 text-base font-medium rounded-lg transition-colors bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                تعديل الحدود
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingPlan && (
          <EditLimitsModal
            plan={editingPlan}
            onClose={() => setEditingPlan(null)}
            onSave={handleUpdateLimits}
          />
      )}
    </div>
  );
};

export default UsageLimits;
