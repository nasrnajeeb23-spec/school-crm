import React, { useState, useEffect } from 'react';
import { BusOperator, Route } from '../types';
import * as api from '../api';
import { BusIcon, UsersIcon } from '../components/icons';
import SkeletonLoader from '../components/SkeletonLoader';
import { useAppContext } from '../contexts/AppContext';

const ParentTransportation: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [details, setDetails] = useState<{
        route: Route;
        operator: BusOperator | undefined;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.parentId) {
            setLoading(false);
            return;
        }
        api.getParentTransportationDetails(user.parentId)
            .then(setDetails)
            .catch(err => console.error("Failed to fetch transportation details:", err))
            .finally(() => setLoading(false));
    }, [user?.parentId]);

    if (loading) {
        return (
             <div className="mt-6 space-y-6">
                <SkeletonLoader className="h-48 w-full rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SkeletonLoader className="h-32 w-full rounded-xl" />
                    <SkeletonLoader className="h-32 w-full rounded-xl" />
                </div>
            </div>
        );
    }
    
    if (!details || !details.operator) {
        return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md">الطالب غير مسجل في خدمة النقل المدرسي حاليًا.</div>;
    }

    const { route, operator } = details;

    return (
        <div className="mt-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                    تتبع الحافلة - {route.name}
                </h3>
                <div className="relative h-64 md:h-80 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                    {/* This is a mock map image. In a real app, this would be an interactive map component. */}
                    <img src="https://www.google.com/maps/d/u/0/thumbnail?mid=1_A-4a_x8sXAMJv23-CR22xYySPc&hl=en" alt="خريطة المسار" className="w-full h-full object-cover" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse">
                         <BusIcon className="w-10 h-10 text-rose-500 drop-shadow-lg" />
                         <span className="absolute top-0 right-0 -mr-2 -mt-2 flex h-5 w-5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-500"></span>
                        </span>
                    </div>
                     <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-gray-800/80 p-2 rounded-md text-xs">
                        آخر تحديث: الآن
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h4 className="font-semibold text-lg flex items-center mb-3"><BusIcon className="w-6 h-6 ml-2 text-rose-500"/>تفاصيل الحافلة</h4>
                    <div className="space-y-1 text-sm">
                        <p><strong>رقم اللوحة:</strong> {operator.busPlateNumber}</p>
                        <p><strong>الموديل:</strong> {operator.busModel}</p>
                        <p><strong>السعة:</strong> {operator.busCapacity} مقعد</p>
                    </div>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h4 className="font-semibold text-lg flex items-center mb-3"><UsersIcon className="w-6 h-6 ml-2 text-rose-500"/>معلومات السائق</h4>
                     <div className="space-y-1 text-sm">
                        <p><strong>الاسم:</strong> {operator.name}</p>
                        <p><strong>رقم الهاتف:</strong> <a href={`tel:${operator.phone}`} className="text-teal-500 hover:underline" dir="ltr">{operator.phone}</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParentTransportation;