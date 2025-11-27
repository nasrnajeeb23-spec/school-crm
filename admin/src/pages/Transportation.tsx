import React, { useState, useEffect, useCallback, useRef } from 'react';
declare const L: any;
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
  const [editingConfigRoute, setEditingConfigRoute] = useState<Route | null>(null);
  const [stopsDraft, setStopsDraft] = useState<{ name: string; time?: string; lat?: number; lng?: number }[]>([]);
  const [departureTimeDraft, setDepartureTimeDraft] = useState<string>('');
  const [isAutoAssignOpen, setIsAutoAssignOpen] = useState(false);
  const [autoAssignOptions, setAutoAssignOptions] = useState<{ mode: 'geo' | 'text'; fillToCapacity: boolean; skipMissingLocation: boolean; fallbackToText: boolean }>({ mode: 'geo', fillToCapacity: true, skipMissingLocation: true, fallbackToText: true });
  const [autoAssignResult, setAutoAssignResult] = useState<{ assigned: any[]; skipped: any[]; capacityMap: Record<string, any> } | null>(null);
  const exportAutoAssignCSV = () => {
    if (!autoAssignResult) return;
    const rows = [] as string[];
    rows.push('type,studentId,routeId,stopName,distanceKm,score,reason');
    for (const x of autoAssignResult.assigned) {
      rows.push(['assigned', x.studentId, x.routeId, x.stopName ?? '', (x.distanceKm ?? '').toString(), (x.score ?? '').toString(), ''].map(v => String(v)).join(','));
    }
    for (const y of autoAssignResult.skipped) {
      rows.push(['skipped', y.studentId, y.routeId ?? '', '', '', '', y.reason ?? ''].map(v => String(v)).join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'auto-assign-result.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const [isStopsMapOpen, setIsStopsMapOpen] = useState(false);
  const stopsMapEl = useRef<HTMLDivElement | null>(null);
  const stopsMapInst = useRef<any>(null);
  useEffect(() => {
    if (!isStopsMapOpen) return;
    const points = (stopsDraft || []).filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');
    if (!stopsMapEl.current) return;
    if (stopsMapInst.current) { stopsMapInst.current.remove(); stopsMapInst.current = null; }
    const center = points.length > 0 ? [points[0].lat as number, points[0].lng as number] : [24.7136, 46.6753];
    const m = L.map(stopsMapEl.current).setView(center as any, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
    for (const p of points) { L.marker([p.lat as number, p.lng as number]).addTo(m).bindPopup(p.name || ''); }
    stopsMapInst.current = m;
    return () => { if (stopsMapInst.current) { stopsMapInst.current.remove(); stopsMapInst.current = null; } };
  }, [isStopsMapOpen, stopsDraft]);

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

    const openConfigEditor = (route: Route) => {
        setEditingConfigRoute(route);
        setStopsDraft(Array.isArray(route.stops) ? route.stops : []);
        setDepartureTimeDraft(route.departureTime || '');
    };

    const addStop = () => {
        setStopsDraft(prev => ([...prev, { name: '', time: '' }]));
    };
    const updateStop = (idx: number, field: 'name'|'time'|'lat'|'lng', value: string) => {
        setStopsDraft(prev => {
            const arr = [...prev];
            const row = { ...(arr[idx] || { name: '' }) } as any;
            row[field] = field === 'lat' || field === 'lng' ? Number(value) : value;
            arr[idx] = row;
            return arr;
        });
    };
    const removeStop = (idx: number) => {
        setStopsDraft(prev => {
            const arr = [...prev]; arr.splice(idx, 1); return arr;
        });
    };

    const saveRouteConfig = async () => {
        if (!editingConfigRoute) return;
        try {
            const updated = await api.updateRouteConfig(schoolId, editingConfigRoute.id, { departureTime: departureTimeDraft, stops: stopsDraft });
            addToast('تم حفظ إعدادات المسار بنجاح!', 'success');
            setEditingConfigRoute(null);
            setStopsDraft([]);
            setDepartureTimeDraft('');
            fetchData();
        } catch {
            addToast('فشل حفظ إعدادات المسار.', 'error');
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
                        <div className="flex justify-end mb-4 gap-3">
                             <button onClick={() => setIsAddRouteModalOpen(true)} className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"><PlusIcon className="h-5 w-5 ml-2" />إنشاء مسار</button>
                             <button onClick={() => setIsAutoAssignOpen(true)} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"><BusIcon className="h-5 w-5 ml-2" />توزيع تلقائي</button>
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
                                            <p className="text-sm">وقت الانطلاق: {route.departureTime || 'غير محدد'}</p>
                                            <p className="text-sm">عدد نقاط التوقف: {Array.isArray(route.stops) ? route.stops.length : 0}</p>
                                            <p className="text-sm">عدد الطلاب: {route.studentIds.length}</p>
                                            <div className="mt-2 flex justify-end gap-4">
                                                <button onClick={() => setEditingRoute(route)} className="text-sm font-medium text-teal-600 hover:underline flex items-center"><EditIcon className="w-4 h-4 ml-1" /> إدارة الطلاب</button>
                                                <button onClick={() => openConfigEditor(route)} className="text-sm font-medium text-teal-600 hover:underline flex items-center"><EditIcon className="w-4 h-4 ml-1" /> إعداد نقاط التوقف</button>
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
            {editingConfigRoute && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-16" onClick={() => setEditingConfigRoute(null)}>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">إعداد نقاط التوقف وأوقات الانطلاق</h2>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">وقت الانطلاق</label>
                      <input type="time" value={departureTimeDraft} onChange={e => setDepartureTimeDraft(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                    </div>
                      <div className="space-y-3">
                        {(stopsDraft || []).map((s, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <input type="text" value={s.name || ''} onChange={e => updateStop(idx, 'name', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" placeholder="اسم النقطة" />
                            <input type="time" value={s.time || ''} onChange={e => updateStop(idx, 'time', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                            <input type="text" value={s.lat ?? ''} onChange={e => updateStop(idx, 'lat', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" placeholder="خط العرض (اختياري)" />
                            <div className="flex gap-2">
                              <input type="text" value={s.lng ?? ''} onChange={e => updateStop(idx, 'lng', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" placeholder="خط الطول (اختياري)" />
                              {(typeof s.lat === 'number' && typeof s.lng === 'number') && (
                                <a href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=15/${s.lat}/${s.lng}`} target="_blank" rel="noreferrer" className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">فتح الخريطة</a>
                              )}
                              <button type="button" onClick={() => removeStop(idx)} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">حذف</button>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-3">
                          <button type="button" onClick={addStop} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">إضافة نقطة توقف</button>
                          <button type="button" onClick={() => setIsStopsMapOpen(true)} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">معاينة الخريطة</button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4 mt-4">
                      <button type="button" onClick={() => setEditingConfigRoute(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
                      <button type="button" onClick={saveRouteConfig} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">حفظ</button>
                    </div>
                  </div>
                </div>
            )}
            {isStopsMapOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-16" onClick={() => setIsStopsMapOpen(false)}>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl p-6 m-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">معاينة الخريطة</h3>
                      <button type="button" onClick={() => setIsStopsMapOpen(false)} className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إغلاق</button>
                    </div>
                    <div ref={stopsMapEl} className="w-full h-96 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
            )}
            {isAutoAssignOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-16" onClick={() => setIsAutoAssignOpen(false)}>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl p-6 m-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">توزيع تلقائي للطلاب على المسارات</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">وضع المطابقة</label>
                        <select value={autoAssignOptions.mode} onChange={e => setAutoAssignOptions(p => ({ ...p, mode: e.target.value as any }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                          <option value="geo">جغرافي (إحداثيات)</option>
                          <option value="text">نصي (العنوان/المدينة)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مراعاة السعة</label>
                        <select value={String(autoAssignOptions.fillToCapacity)} onChange={e => setAutoAssignOptions(p => ({ ...p, fillToCapacity: e.target.value === 'true' }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                          <option value="true">نعم</option>
                          <option value="false">لا</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تخطي الطلاب بلا موقع</label>
                        <select value={String(autoAssignOptions.skipMissingLocation)} onChange={e => setAutoAssignOptions(p => ({ ...p, skipMissingLocation: e.target.value === 'true' }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                          <option value="true">نعم</option>
                          <option value="false">لا</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">استخدام مطابقة نصية كاحتياطي</label>
                        <select value={String(autoAssignOptions.fallbackToText)} onChange={e => setAutoAssignOptions(p => ({ ...p, fallbackToText: e.target.value === 'true' }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                          <option value="true">نعم</option>
                          <option value="false">لا</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-4 mb-4">
                      <button type="button" onClick={() => setIsAutoAssignOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إغلاق</button>
                      <button type="button" onClick={async () => { try { const result = await api.autoAssignPreview(schoolId, autoAssignOptions); setAutoAssignResult(result); addToast(`معاينة: اقتراح توزيع ${result.assigned.length} طالب، وتخطي ${result.skipped.length}.`, 'success'); } catch { addToast('فشل المعاينة.', 'error'); } }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">معاينة</button>
                      <button type="button" onClick={async () => { try { const result = await api.autoAssignRoutes(schoolId, autoAssignOptions); setAutoAssignResult(result); addToast(`تم توزيع ${result.assigned.length} طالب، وتخطي ${result.skipped.length}.`, 'success'); fetchData(); } catch { addToast('فشل التوزيع التلقائي.', 'error'); } }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">اعتماد التوزيع</button>
                      <button type="button" onClick={exportAutoAssignCSV} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">تصدير CSV</button>
                    </div>
                    {autoAssignResult && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <h3 className="font-semibold mb-2">المعيّنون ({autoAssignResult.assigned.length})</h3>
                          <div className="space-y-1 text-sm">
                            {autoAssignResult.assigned.slice(0, 20).map((x, i) => (
                              <div key={i} className="flex justify-between"><span>طالب: {x.studentId}</span><span>مسار: {x.routeId}</span></div>
                              ))}
                            {autoAssignOptions.mode === 'geo' && (
                              <div className="text-xs text-gray-500 mt-2">يعرض أقرب نقطة وفق المسافة بالكيلومتر إن توفرت</div>
                            )}
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <h3 className="font-semibold mb-2">تفاصيل المعيّنين (أول 20)</h3>
                          <div className="space-y-1 text-sm">
                            {autoAssignResult.assigned.slice(0, 20).map((x, i) => (
                              <div key={i} className="flex justify-between"><span>نقطة: {x.stopName || '-'}</span><span>{autoAssignOptions.mode === 'geo' ? `مسافة: ${x.distanceKm ?? '-'} كم` : `مطابقة: ${x.score ?? '-'}`}</span></div>
                            ))}
                            {autoAssignResult.assigned.length > 20 && <div className="text-xs text-gray-500">عرض أول 20 فقط...</div>}
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <h3 className="font-semibold mb-2">المتخطّون ({autoAssignResult.skipped.length})</h3>
                          <div className="space-y-1 text-sm">
                            {autoAssignResult.skipped.slice(0, 20).map((x, i) => (
                              <div key={i} className="flex justify-between"><span>طالب: {x.studentId}</span><span>سبب: {x.reason}</span></div>
                            ))}
                            {autoAssignResult.skipped.length > 20 && <div className="text-xs text-gray-500">عرض أول 20 فقط...</div>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
            )}
        </>
    );
};

export default Transportation;
