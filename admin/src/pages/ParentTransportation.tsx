import React, { useState, useEffect, useRef } from 'react';
declare const L: any;
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
        nearestStop?: { name: string; lat?: number; lng?: number; time?: string; distanceKm?: number } | null;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    const mapEl = useRef<HTMLDivElement | null>(null);
    const mapInst = useRef<any>(null);

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

    useEffect(() => {
        const s = details?.nearestStop;
        if (!s || typeof s.lat !== 'number' || typeof s.lng !== 'number') return;
        if (!mapEl.current) return;
        if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
        const m = L.map(mapEl.current).setView([s.lat, s.lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
        L.marker([s.lat, s.lng]).addTo(m).bindPopup(s.name || 'نقطة توقف');
        mapInst.current = m;
        return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
    }, [details?.nearestStop?.lat, details?.nearestStop?.lng]);

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
                    {details?.nearestStop?.lat && details?.nearestStop?.lng ? (
                        <div ref={mapEl} className="w-full h-full" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">لا تتوفر إحداثيات لعرض الخريطة</div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-gray-800/80 p-2 rounded-md text-xs">
                        {details?.nearestStop ? (
                            <span>أقرب نقطة: {details.nearestStop.name} {details.nearestStop.distanceKm ? `(${details.nearestStop.distanceKm} كم)` : ''}</span>
                        ) : 'لا توجد نقطة قريبة'}
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
                        <p><strong>وقت الانطلاق:</strong> {route.departureTime || 'غير محدد'}</p>
                    </div>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h4 className="font-semibold text-lg flex items-center mb-3"><UsersIcon className="w-6 h-6 ml-2 text-rose-500"/>معلومات السائق</h4>
                     <div className="space-y-1 text-sm">
                        <p><strong>الاسم:</strong> {operator.name}</p>
                        <p><strong>رقم الهاتف:</strong> <a href={`tel:${operator.phone}`} className="text-teal-500 hover:underline" dir="ltr">{operator.phone}</a></p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md md:col-span-2">
                    <h4 className="font-semibold text-lg mb-3">نقاط التوقف</h4>
                    {Array.isArray(route.stops) && route.stops.length > 0 ? (
                        <ul className="list-disc pr-6 space-y-1 text-sm">
                            {route.stops.map((s, i) => (
                                <li key={i} className="flex items-center justify-between">
                                  <span>{s.name} {s.time ? `- ${s.time}` : ''}</span>
                                  {(typeof s.lat === 'number' && typeof s.lng === 'number') && (
                                    <a href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=15/${s.lat}/${s.lng}`} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline">فتح على الخريطة</a>
                                  )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">لا توجد نقاط توقف محددة.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParentTransportation;
