import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BusOperator, BusOperatorStatus, Route } from '../types';
import * as api from '../api';
import { CheckIcon, CanceledIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import TableSkeleton from '../components/TableSkeleton';

const statusColorMap: { [key in BusOperatorStatus]: string } = {
  [BusOperatorStatus.Approved]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [BusOperatorStatus.Pending]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [BusOperatorStatus.Rejected]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

interface DriverProfileProps {
  schoolId: number;
}

const DriverProfile: React.FC<DriverProfileProps> = ({ schoolId }) => {
  const { operatorId } = useParams<{ operatorId: string }>();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<BusOperator | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [saving, setSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; phone: string; licenseNumber: string; busPlateNumber: string; busCapacity: number; busModel: string }>({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    busPlateNumber: '',
    busCapacity: 20,
    busModel: '',
  });

  const [showManualShare, setShowManualShare] = useState(false);
  const [manualLink, setManualLink] = useState<string>('');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [sharingInvite, setSharingInvite] = useState(false);

  const load = async () => {
    if (!operatorId) return;
    setLoading(true);
    try {
      const [op, rs] = await Promise.all([
        api.getBusOperatorById(operatorId),
        api.getRoutes(schoolId),
      ]);
      setDriver(op);
      setRoutes(Array.isArray(rs) ? rs : []);
      setForm({
        name: op.name || '',
        email: String(op.email || ''),
        phone: op.phone || '',
        licenseNumber: op.licenseNumber || '',
        busPlateNumber: op.busPlateNumber || '',
        busCapacity: Number(op.busCapacity || 0) || 20,
        busModel: op.busModel || '',
      });
    } catch (e: any) {
      addToast(e?.message || 'فشل تحميل بيانات السائق.', 'error');
      setDriver(null);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [operatorId, schoolId]);

  const driverRoutes = useMemo(() => {
    if (!driver) return [];
    return routes.filter(r => String(r.busOperatorId || '') === String(driver.id));
  }, [routes, driver]);

  const totalStudents = useMemo(() => {
    return driverRoutes.reduce((acc, r) => acc + (Array.isArray(r.studentIds) ? r.studentIds.length : 0), 0);
  }, [driverRoutes]);

  const handleApprove = async () => {
    if (!driver) return;
    try {
      await api.approveBusOperator(driver.id);
      addToast('تمت الموافقة على السائق.', 'success');
      await load();
    } catch {
      addToast('فشل في الموافقة على السائق.', 'error');
    }
  };

  const handleReject = async () => {
    if (!driver) return;
    try {
      await api.rejectBusOperator(driver.id);
      addToast('تم رفض السائق.', 'success');
      await load();
    } catch {
      addToast('فشل في رفض السائق.', 'error');
    }
  };

  const handleSave = async () => {
    if (!driver || !operatorId) return;
    if (!form.name.trim()) { addToast('يرجى إدخال اسم السائق.', 'warning'); return; }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { addToast('يرجى إدخال بريد إلكتروني صحيح.', 'warning'); return; }
    if (!form.phone.trim()) { addToast('يرجى إدخال رقم الهاتف.', 'warning'); return; }
    if (!form.licenseNumber.trim()) { addToast('يرجى إدخال رقم الرخصة.', 'warning'); return; }
    if (!form.busPlateNumber.trim()) { addToast('يرجى إدخال رقم اللوحة.', 'warning'); return; }
    if (!form.busModel.trim()) { addToast('يرجى إدخال موديل الحافلة.', 'warning'); return; }
    const cap = Number(form.busCapacity || 0);
    if (!cap || Number.isNaN(cap) || cap < 1) { addToast('يرجى إدخال سعة صحيحة (1 فأكثر).', 'warning'); return; }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() ? form.email.trim() : null,
        phone: form.phone.trim(),
        licenseNumber: form.licenseNumber.trim(),
        busPlateNumber: form.busPlateNumber.trim(),
        busCapacity: cap,
        busModel: form.busModel.trim(),
      };
      const updated = await api.updateBusOperator(operatorId, payload);
      setDriver(updated);
      setIsEditing(false);
      addToast('تم حفظ بيانات السائق.', 'success');
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('409') || msg.includes('Email already in use')) {
        addToast('البريد الإلكتروني مستخدم مسبقًا.', 'warning');
      } else {
        addToast('فشل حفظ البيانات.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!driver) return;
    if (!confirm(`هل أنت متأكد من حذف السائق "${driver.name}"؟ سيتم تعطيل حسابه وفصل المسارات عنه.`)) return;
    try {
      setSaving(true);
      await api.deleteBusOperator(driver.id);
      addToast('تم حذف السائق.', 'success');
      navigate('../../', { relative: 'path', state: { tab: 'drivers' } });
    } catch {
      addToast('فشل حذف السائق.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!driver) return;
    try {
      setCreatingInvite(true);
      const res = await api.getBusOperatorInviteLink(driver.id);
      if (res?.activationLink) {
        setManualLink(res.activationLink);
        setShowManualShare(true);
        addToast('تم إنشاء رابط التفعيل.', 'success');
      } else {
        addToast('لم يتم استلام رابط تفعيل من الخادم.', 'error');
      }
    } catch {
      addToast('فشل إنشاء رابط التفعيل.', 'error');
    } finally {
      setCreatingInvite(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <TableSkeleton />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="text-center text-gray-700 dark:text-gray-200">لم يتم العثور على السائق.</div>
        <div className="flex justify-end mt-4">
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">رجوع</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{driver.name}</h2>
            <div className="mt-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[driver.status]}`}>{driver.status}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-end">
            {driver.status === BusOperatorStatus.Pending && (
              <>
                <button onClick={handleApprove} className="text-sm flex items-center px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">
                  <CheckIcon className="w-4 h-4 ml-1" />
                  موافقة
                </button>
                <button onClick={handleReject} className="text-sm flex items-center px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                  <CanceledIcon className="w-4 h-4 ml-1" />
                  رفض
                </button>
              </>
            )}
            {driver.status === BusOperatorStatus.Approved && (
              <button onClick={handleInvite} disabled={creatingInvite} aria-disabled={creatingInvite} className={`text-sm px-3 py-2 ${creatingInvite ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md`}>
                {creatingInvite ? 'جارٍ الإنشاء...' : 'رابط التفعيل'}
              </button>
            )}
            <button onClick={() => setIsEditing(p => !p)} className="text-sm px-3 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">
              {isEditing ? 'إلغاء التعديل' : 'تعديل البيانات'}
            </button>
            <button onClick={handleDelete} disabled={saving} aria-disabled={saving} className={`text-sm px-3 py-2 ${saving ? 'bg-gray-400' : 'bg-gray-800 hover:bg-gray-900'} text-white rounded-md`}>
              حذف السائق
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-gray-500 dark:text-gray-300">عدد المسارات</div>
            <div className="text-xl font-bold text-gray-800 dark:text-white">{driverRoutes.length}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-gray-500 dark:text-gray-300">إجمالي الطلاب</div>
            <div className="text-xl font-bold text-gray-800 dark:text-white">{totalStudents}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-gray-500 dark:text-gray-300">سعة الحافلة</div>
            <div className="text-xl font-bold text-gray-800 dark:text-white">{driver.busCapacity}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-3">معلومات السائق</h3>
            <div className="space-y-2">
              <div className="flex justify-between gap-4"><span className="text-gray-500 dark:text-gray-300">البريد</span><span dir="ltr">{driver.email || '—'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500 dark:text-gray-300">الهاتف</span><span dir="ltr">{driver.phone}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500 dark:text-gray-300">رقم الرخصة</span><span>{driver.licenseNumber}</span></div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-3">معلومات الحافلة</h3>
            <div className="space-y-2">
              <div className="flex justify-between gap-4"><span className="text-gray-500 dark:text-gray-300">رقم اللوحة</span><span>{driver.busPlateNumber}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500 dark:text-gray-300">الموديل</span><span>{driver.busModel}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500 dark:text-gray-300">السعة</span><span>{driver.busCapacity}</span></div>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold mb-4">تعديل بيانات السائق</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الرخصة</label>
                <input value={form.licenseNumber} onChange={e => setForm(p => ({ ...p, licenseNumber: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم اللوحة</label>
                <input value={form.busPlateNumber} onChange={e => setForm(p => ({ ...p, busPlateNumber: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">موديل الحافلة</label>
                <input value={form.busModel} onChange={e => setForm(p => ({ ...p, busModel: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعة</label>
                <input type="number" min={1} value={form.busCapacity} onChange={e => setForm(p => ({ ...p, busCapacity: Number(e.target.value || 0) }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
              <button onClick={handleSave} disabled={saving} aria-disabled={saving} className={`px-4 py-2 ${saving ? 'bg-teal-400' : 'bg-teal-600 hover:bg-teal-700'} text-white rounded-lg`}>{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="font-semibold mb-3">المسارات المرتبطة</h3>
          {driverRoutes.length === 0 ? (
            <div className="text-sm text-gray-600 dark:text-gray-300">لا توجد مسارات مرتبطة بهذا السائق.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-right">المسار</th>
                    <th className="px-4 py-2 text-right">وقت الانطلاق</th>
                    <th className="px-4 py-2 text-right">نقاط التوقف</th>
                    <th className="px-4 py-2 text-right">الطلاب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {driverRoutes.map(r => (
                    <tr key={r.id} className="bg-white dark:bg-gray-800">
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2">{r.departureTime || '—'}</td>
                      <td className="px-4 py-2">{Array.isArray(r.stops) ? r.stops.length : 0}</td>
                      <td className="px-4 py-2">{Array.isArray(r.studentIds) ? r.studentIds.length : 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => navigate('../', { relative: 'path' })} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">العودة لإدارة السائقين</button>
          <button onClick={() => navigate('../../', { relative: 'path', state: { tab: 'drivers' } })} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">العودة للنقل المدرسي</button>
        </div>
      </div>

      {showManualShare && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowManualShare(false)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md w-[90%] max-w-lg text-right" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">رابط التفعيل للمشاركة</h3>
            <a href={manualLink} target="_blank" rel="noopener noreferrer" dir="ltr" className="break-all p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 underline">{manualLink}</a>
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => { try { navigator.clipboard.writeText(manualLink); addToast('تم نسخ الرابط.', 'success'); } catch { addToast('تعذر نسخ الرابط. انسخه يدويًا.', 'error'); } }}
                className="px-3 py-2 bg-teal-600 text-white rounded-md"
              >نسخ الرابط</button>
              <button
                onClick={async () => {
                  try {
                    setSharingInvite(true);
                    const anyNav = navigator as any;
                    if (anyNav.share) {
                      await anyNav.share({ title: 'تفعيل الحساب', text: 'رابط تفعيل الحساب', url: manualLink });
                      addToast('تمت المشاركة بنجاح.', 'success');
                    } else {
                      await navigator.clipboard.writeText(manualLink);
                      addToast('تم نسخ الرابط. يمكنك مشاركته يدويًا.', 'info');
                    }
                  } catch {
                    try { await navigator.clipboard.writeText(manualLink); addToast('تعذرت المشاركة. تم نسخ الرابط.', 'warning'); } catch { addToast('تعذر نسخ الرابط. انسخه يدويًا.', 'error'); }
                  } finally {
                    setSharingInvite(false);
                  }
                }}
                disabled={sharingInvite}
                aria-disabled={sharingInvite}
                className={`px-3 py-2 ${sharingInvite ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md`}
              >{sharingInvite ? 'جارٍ المشاركة...' : 'مشاركة'}</button>
              <button onClick={() => setShowManualShare(false)} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DriverProfile;
