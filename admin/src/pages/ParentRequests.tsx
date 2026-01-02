import React, { useState, useEffect } from 'react';
import { ParentRequest, RequestStatus, NewParentRequestData } from '../types';
import * as api from '../api';
import NewRequestModal from '../components/NewRequestModal';
import { PlusIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import { useAppContext } from '../contexts/AppContext';


const statusColorMap: { [key in RequestStatus]: string } = {
  [RequestStatus.Pending]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [RequestStatus.Approved]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [RequestStatus.Rejected]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const ParentRequests: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [requests, setRequests] = useState<ParentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToast();

    const fetchRequests = () => {
        if (!user?.parentId) return;
        setLoading(true);
        api.getParentRequests(user.parentId)
            .then(setRequests)
            .catch(err => console.error("Failed to fetch requests", err))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        if (!user?.parentId) {
            setLoading(false);
            return;
        }
        fetchRequests();
    }, [user?.parentId]);

    const handleSubmitRequest = async (requestData: NewParentRequestData) => {
        if (!user?.parentId) return;
        try {
            const newRequest = await api.submitParentRequest(user.parentId, requestData);
            setRequests(prev => [newRequest, ...prev]);
            setIsModalOpen(false);
            addToast('تم إرسال طلبك بنجاح.', 'success');
        } catch (error) {
            console.error("Failed to submit request", error);
            addToast("فشل تقديم الطلب. الرجاء المحاولة مرة أخرى.", 'error');
        }
    };

    if (loading) {
        return <div className="text-center p-8">جاري تحميل الطلبات...</div>;
    }
    
    if (!user?.parentId) {
        return <div className="text-center p-8">المستخدم غير صالح لعرض هذه الصفحة.</div>;
    }

    return (
        <>
            <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">طلباتي</h2>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                    >
                        <PlusIcon className="h-5 w-5 ml-2" />
                        تقديم طلب جديد
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">تاريخ التقديم</th>
                                <th scope="col" className="px-6 py-3">نوع الطلب</th>
                                <th scope="col" className="px-6 py-3">الحالة</th>
                                <th scope="col" className="px-6 py-3">التفاصيل</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length > 0 ? requests.map((req) => (
                                <tr key={req.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4">{req.submissionDate}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{req.type}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[req.status]}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 max-w-sm truncate" title={req.details}>{req.details}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">لا توجد طلبات سابقة.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {isModalOpen && (
                <NewRequestModal 
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSubmitRequest}
                />
            )}
        </>
    );
};

export default ParentRequests;