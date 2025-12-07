import React, { useState, useEffect } from 'react';
import { Subscription, SubscriptionStatus } from '../types';
import * as api from '../api';
import StatsCard from '../components/StatsCard';
import { SubscriptionIcon, MRRIcon, CanceledIcon } from '../components/icons';
import ManageSubscriptionModal from '../components/ManageSubscriptionModal';

const statusColorMap: { [key in SubscriptionStatus]: string } = {
  [SubscriptionStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [SubscriptionStatus.Trial]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [SubscriptionStatus.PastDue]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  [SubscriptionStatus.Canceled]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const SubscriptionsList: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSubscriptions = async () => {
    try {
        const data = await api.getSubscriptions();
        setSubscriptions(data);
        setLoading(false);
    } catch (error) {
        console.error("Failed to fetch subscriptions", error);
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleEditClick = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setIsModalOpen(true);
  };

  const handleModalSave = () => {
    fetchSubscriptions(); // Refresh list
  };

  if (loading) {
    return <div className="text-center p-8">جاري تحميل الاشتراكات...</div>;
  }

  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.status === SubscriptionStatus.Active || sub.status === SubscriptionStatus.Trial || sub.status === SubscriptionStatus.PastDue
  );
  
  const mrr = subscriptions.filter(sub => sub.status === SubscriptionStatus.Active).reduce(
    (acc, sub) => acc + sub.amount, 0
  );

  const canceledSubscriptions = subscriptions.filter(
    (sub) => sub.status === SubscriptionStatus.Canceled
  ).length;

  return (
    <div className="space-y-8">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard 
          icon={SubscriptionIcon} 
          title="إجمالي الاشتراكات" 
          value={activeSubscriptions.length.toString()}
          description="الاشتراكات النشطة والتجريبية" 
        />
        <StatsCard 
          icon={MRRIcon} 
          title="الإيرادات الشهرية المتكررة" 
          value={`$${mrr.toLocaleString()}`}
          description="بناءً على الاشتراكات النشطة"
        />
        <StatsCard 
          icon={CanceledIcon} 
          title="الاشتراكات الملغاة" 
          value={canceledSubscriptions.toString()}
          description="إجمالي الاشتراكات الملغاة"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">تفاصيل الاشتراكات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">اسم المدرسة</th>
                <th scope="col" className="px-6 py-3">الخطة</th>
                <th scope="col" className="px-6 py-3">الحالة</th>
                <th scope="col" className="px-6 py-3">تاريخ التجديد</th>
                <th scope="col" className="px-6 py-3">المبلغ</th>
                <th scope="col" className="px-6 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{sub.schoolName}</td>
                  <td className="px-6 py-4">{sub.plan}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[sub.status]}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{sub.renewalDate ? sub.renewalDate.split('T')[0] : '-'}</td>
                  <td className={`px-6 py-4 font-semibold`}>${sub.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <button 
                        onClick={() => handleEditClick(sub)}
                        className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline"
                    >
                      إدارة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {selectedSubscription && (
        <ManageSubscriptionModal
          subscription={selectedSubscription}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

export default SubscriptionsList;
