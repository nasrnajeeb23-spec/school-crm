import React, { useState, useEffect, useCallback } from 'react';
import { BusOperator, BusOperatorStatus, Route } from '../types';
import * as api from '../api';
import { PlusIcon, BusIcon, UsersIcon, EditIcon, CheckIcon, CanceledIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import AddRouteModal from '../components/AddRouteModal';
import EditRouteStudentsModal from '../components/EditRouteStudentsModal';

interface TransportationProps {
  schoolId: number;
}

const statusColors: { [key in BusOperatorStatus]: string } = {
    [BusOperatorStatus.Approved]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    [BusOperatorStatus.Pending]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [BusOperatorStatus.Rejected]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const Transportation: React.FC<TransportationProps> = ({ schoolId }) => {
    const [activeTab, setActiveTab] = useState('pending');
    const [operators, setOperators] = useState<BusOperator[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddRouteModalOpen, setIsAddRouteModalOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<Route | null>(null);

    const { addToast } = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [operatorsData, routesData] = await Promise.all([
                api.getBusOperators(schoolId),
                api.getRoutes(schoolId),
            ]);
            setOperators(operatorsData);
            setRoutes(routesData);
        } catch (error) {
            console.error("Failed to fetch transportation data", error);
            addToast("فشل تحميل بيانات النقل.", 'error');
        } finally {
            setLoading(false);
        }
    }, [schoolId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleApprove = async (operatorId: string) => {
        try {
            await api.approveBusOperator(operatorId);
            addToast('تمت الموافقة على طلب السائق بنجاح!', 'success');
            fetchData();
        } catch (error) {
            addToast('فشل في الموافقة على الطلب.', 'error');
        }
    };
    
    const handleAddRoute = async (data: Omit<Route, 'id' | 'studentIds'>) => {
         try {
            await api.addRoute(schoolId, data);
            addToast('تم إنشاء المسار بنجاح!', 'success');
            setIsAddRouteModalOpen(false);
            fetchData();
        } catch (error) {
            addToast('فشل إنشاء المسار.', 'error');
        }
    };

    const handleUpdateRouteStudents = async (routeId: string, studentIds: string[]) => {
        try {
            await api.updateRouteStudents(schoolId, routeId, studentIds);
            addToast('تم تحديث طلاب المسار بنجاح!', 'success');
            setEditingRoute(null);
            fetchData();
        } catch (error) {
            addToast('فشل تحديث طلاب المسار.', 'error');
        }
    };

    const pendingOperators = operators.filter(op => op.status === BusOperatorStatus.Pending);
    const approvedOperators = operators.filter(op => op.status === BusOperatorStatus.Approved);

    const renderContent = () => {
        if (loading) {
            return <p className="text-center p-8">جاري تحميل البيانات...</p>;
        }

        switch (activeTab) {
            case 'pending':
                return (
                    <div>
                        {pendingOperators.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {pendingOperators.map(op => (
                                    <div key={op.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
                                        <p className="font-bold">{op.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">الحافلة: {op.busPlateNumber} ({op.busModel})</p>
                                        <div className="mt-3 flex gap-2">
                                            <button onClick={() => handleApprove(op.id)} className="text-sm flex items-center px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"><CheckIcon className="w-4 h-4 ml-1"/>موافقة</button>
                                            <button className="text-sm flex items-center px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"><CanceledIcon className="w-4 h-4 ml-1"/>رفض</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-center text-gray-500 dark:text-gray-400 py-8">لا توجد طلبات انضمام جديدة.</p>}
                    </div>
                );
            case 'fleet':
                return (
                     <div>
                        <div className="flex justify-end mb-4">
                             <button onClick={() => setIsAddRouteModalOpen(true)} className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"><PlusIcon className="h-5 w-5 ml-2" />إنشاء مسار</button>
                        </div>
                        <div className="space-y-6">
                             <div>
                                <h4 className="font-semibold mb-2">أسطول النقل المعتمد</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {approvedOperators.map(op => (
                                        <div key={op.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-green-200 dark:border-green-700">
                                            <p className="font-bold">{op.name}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{op.busPlateNumber} ({op.busModel})</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-500" dir="ltr">{op.phone}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold mb-2">المسارات</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {routes.map(route => (
                                        <div key={route.id} className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                                            <h4 className="font-bold text-lg text-teal-600 dark:text-teal-400">{route.name}</h4>
                                            <p className="text-sm">السائق: {operators.find(d => d.id === route.busOperatorId)?.name || 'N/A'}</p>
                                            <p className="text-sm">الحافلة: {operators.find(b => b.id === route.busOperatorId)?.busPlateNumber || 'N/A'}</p>
                                            <p className="text-sm">عدد الطلاب: {route.studentIds.length}</p>
                                            <div className="mt-2 text-right">
                                                <button onClick={() => setEditingRoute(route)} className="text-sm font-medium text-teal-600 hover:underline flex items-center"><EditIcon className="w-4 h-4 ml-1" /> إدارة الطلاب</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };
    
    const tabs = [
        { id: 'pending', label: 'طلبات الانضمام', icon: UsersIcon },
        { id: 'fleet', label: 'أسطول النقل والمسارات', icon: BusIcon },
    ];

    return (
        <>
            <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                    <nav className="-mb-px flex space-x-6 rtl:space-x-reverse" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center
                                    ${activeTab === tab.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-600'}
                                `}
                            >
                                <tab.icon className="h-5 w-5 ml-2" />
                                <span>{tab.label}</span>
                                {tab.id === 'pending' && pendingOperators.length > 0 && <span className="ml-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">{pendingOperators.length}</span>}
                            </button>
                        ))}
                    </nav>
                </div>
                {renderContent()}
            </div>
            {isAddRouteModalOpen && <AddRouteModal busOperators={approvedOperators} onClose={() => setIsAddRouteModalOpen(false)} onSave={handleAddRoute} />}
            {editingRoute && <EditRouteStudentsModal route={editingRoute} schoolId={schoolId} onClose={() => setEditingRoute(null)} onSave={handleUpdateRouteStudents} />}
        </>
    );
};

export default Transportation;