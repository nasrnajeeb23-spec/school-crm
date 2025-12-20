import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusOperator, BusOperatorStatus } from '../types';
import * as api from '../api';
import { PlusIcon, UsersIcon, CheckIcon, CanceledIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';

const statusColorMap: { [key in BusOperatorStatus]: string } = {
  [BusOperatorStatus.Approved]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [BusOperatorStatus.Pending]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [BusOperatorStatus.Rejected]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

interface DriversListProps {
  schoolId: number;
  withContainer?: boolean;
  detailsPathPrefix?: string;
}

const DriversList: React.FC<DriversListProps> = ({ schoolId, withContainer = true, detailsPathPrefix = '' }) => {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [drivers, setDrivers] = useState<BusOperator[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [savingDriver, setSavingDriver] = useState(false);
  const [driverForm, setDriverForm] = useState<{ name: string; email: string; phone: string; licenseNumber: string; busPlateNumber: string; busCapacity: number; busModel: string }>({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    busPlateNumber: '',
    busCapacity: 20,
    busModel: '',
  });

  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; email: string; phone: string; licenseNumber: string; busPlateNumber: string; busCapacity: number; busModel: string }>({
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
  const [creatingInviteFor, setCreatingInviteFor] = useState<string | null>(null);
  const [sharingInvite, setSharingInvite] = useState(false);

  const validateForm = (form: { name: string; email: string; phone: string; licenseNumber: string; busPlateNumber: string; busCapacity: number; busModel: string }, requireEmail: boolean) => {
    if (!form.name.trim()) return 'يرجى إدخال اسم السائق.';
    if (requireEmail && !form.email.trim()) return 'يرجى إدخال البريد الإلكتروني.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'يرجى إدخال بريد إلكتروني صحيح.';
    if (!form.phone.trim()) return 'يرجى إدخال رقم الهاتف.';
    if (!form.licenseNumber.trim()) return 'يرجى إدخال رقم الرخصة.';
    if (!form.busPlateNumber.trim()) return 'يرجى إدخال رقم اللوحة.';
    if (!form.busModel.trim()) return 'يرجى إدخال موديل الحافلة.';
    const cap = Number(form.busCapacity || 0);
    if (!cap || Number.isNaN(cap) || cap < 1) return 'يرجى إدخال سعة صحيحة (1 فأكثر).';
    return null;
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await api.getBusOperators(schoolId);
      setDrivers(Array.isArray(list) ? list : []);
    } catch (e) {
      addToast('فشل تحميل قائمة السائقين.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [schoolId]);

  const filteredDrivers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return drivers;
    return drivers.filter(d => {
      const nameMatch = String(d.name || '').toLowerCase().includes(term);
      const emailMatch = String(d.email || '').toLowerCase().includes(term);
      const phoneMatch = String(d.phone || '').toLowerCase().includes(term);
      const plateMatch = String(d.busPlateNumber || '').toLowerCase().includes(term);
      const licenseMatch = String(d.licenseNumber || '').toLowerCase().includes(term);
      return nameMatch || emailMatch || phoneMatch || plateMatch || licenseMatch;
    });
  }, [drivers, searchTerm]);

  const openDetails = (operatorId: string) => {
    navigate(`${detailsPathPrefix}${operatorId}`);
  };

  const handleApprove = async (operatorId: string) => {
    try {
      await api.approveBusOperator(operatorId);
      addToast('تمت الموافقة على السائق.', 'success');
      await refresh();
    } catch {
      addToast('فشل في الموافقة على السائق.', 'error');
    }
  };

  const handleReject = async (operatorId: string) => {
    try {
      await api.rejectBusOperator(operatorId);
      addToast('تم رفض السائق.', 'success');
      await refresh();
    } catch {
      addToast('فشل في رفض السائق.', 'error');
    }
  };

  const handleDelete = async (operatorId: string, driverName: string) => {
    if (!confirm(`هل أنت متأكد من حذف السائق "${driverName}"؟ سيتم تعطيل حسابه وفصل المسارات عنه.`)) return;
    try {
      await api.deleteBusOperator(operatorId);
      addToast('تم حذف السائق.', 'success');
      await refresh();
    } catch {
      addToast('فشل حذف السائق.', 'error');
    }
  };

  const handleInvite = async (operatorId: string) => {
    try {
      setCreatingInviteFor(operatorId);
      const res = await api.getBusOperatorInviteLink(operatorId);
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
      setCreatingInviteFor(null);
    }
  };

  const saveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm(driverForm, true);
    if (err) {
      addToast(err, 'warning');
      return;
    }
    try {
      setSavingDriver(true);
      const created = await api.createBusOperator(schoolId, driverForm);
      setDrivers(prev => [created, ...prev]);
      setIsAddDriverOpen(false);
      setDriverForm({ name: '', email: '', phone: '', licenseNumber: '', busPlateNumber: '', busCapacity: 20, busModel: '' });
      addToast('تم إنشاء السائق بنجاح.', 'success');
    } catch (error: any) {
      addToast(error?.message || 'فشل إنشاء السائق.', 'error');
    } finally {
      setSavingDriver(false);
    }
  };

  const openEdit = (d: BusOperator) => {
    setEditingDriverId(d.id);
    setEditForm({
      name: d.name || '',
      email: String(d.email || ''),
      phone: d.phone || '',
      licenseNumber: d.licenseNumber || '',
      busPlateNumber: d.busPlateNumber || '',
      busCapacity: Number(d.busCapacity || 0) || 20,
      busModel: d.busModel || '',
    });
    setIsEditDriverOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriverId) return;
    const err = validateForm(editForm, false);
    if (err) {
      addToast(err, 'warning');
      return;
    }
    try {
      setSavingEdit(true);
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim() ? editForm.email.trim() : null,
        phone: editForm.phone.trim(),
        licenseNumber: editForm.licenseNumber.trim(),
        busPlateNumber: editForm.busPlateNumber.trim(),
        busCapacity: Number(editForm.busCapacity || 0),
        busModel: editForm.busModel.trim(),
      };
      const updated = await api.updateBusOperator(editingDriverId, payload);
      setDrivers(prev => prev.map(x => (String(x.id) === String(updated.id) ? updated : x)));
      setIsEditDriverOpen(false);
      setEditingDriverId(null);
      addToast('تم تحديث بيانات السائق.', 'success');
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (msg.includes('409') || msg.includes('Email already in use')) {
        addToast('البريد الإلكتروني مستخدم مسبقًا.', 'warning');
      } else {
        addToast('فشل تحديث بيانات السائق.', 'error');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const content = (
    <>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث عن سائق..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-80 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <button
          onClick={() => setIsAddDriverOpen(true)}
          className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 ml-2" />
          إضافة سائق جديد
        </button>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <TableSkeleton />
        ) : filteredDrivers.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="لا يوجد سائقون"
            message={searchTerm ? `لم يتم العثور على سائقين يطابقون بحثك "${searchTerm}".` : "ابدأ بإضافة السائقين إلى مدرستك."}
            actionText="إضافة سائق جديد"
            onAction={() => setIsAddDriverOpen(true)}
          />
        ) : (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">الاسم</th>
                <th scope="col" className="px-6 py-3">البريد الإلكتروني</th>
                <th scope="col" className="px-6 py-3">رقم الاتصال</th>
                <th scope="col" className="px-6 py-3">رقم الرخصة</th>
                <th scope="col" className="px-6 py-3">رقم اللوحة</th>
                <th scope="col" className="px-6 py-3">الحالة</th>
                <th scope="col" className="px-6 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((d) => (
                <tr key={d.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{d.name}</td>
                  <td className="px-6 py-4" dir="ltr">{d.email || '—'}</td>
                  <td className="px-6 py-4" dir="ltr">{d.phone}</td>
                  <td className="px-6 py-4">{d.licenseNumber}</td>
                  <td className="px-6 py-4">{d.busPlateNumber}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[d.status]}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openDetails(d.id)} className="font-medium text-teal-600 dark:text-teal-500 hover:underline">
                        عرض التفاصيل
                      </button>
                      <button onClick={() => openEdit(d)} className="text-sm px-3 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700">
                        تعديل
                      </button>
                      {d.status === BusOperatorStatus.Pending && (
                        <>
                          <button onClick={() => handleApprove(d.id)} className="text-sm flex items-center px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600">
                            <CheckIcon className="w-4 h-4 ml-1" />
                            موافقة
                          </button>
                          <button onClick={() => handleReject(d.id)} className="text-sm flex items-center px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600">
                            <CanceledIcon className="w-4 h-4 ml-1" />
                            رفض
                          </button>
                        </>
                      )}
                      {d.status === BusOperatorStatus.Approved && (
                        <button
                          onClick={() => handleInvite(d.id)}
                          disabled={creatingInviteFor === d.id}
                          aria-disabled={creatingInviteFor === d.id}
                          className={`text-sm px-3 py-1 ${creatingInviteFor === d.id ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md`}
                        >
                          {creatingInviteFor === d.id ? 'جارٍ الإنشاء...' : 'رابط التفعيل'}
                        </button>
                      )}
                      <button onClick={() => handleDelete(d.id, d.name)} className="text-sm px-3 py-1 bg-gray-800 text-white rounded-md hover:bg-gray-900">
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isAddDriverOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={() => setIsAddDriverOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">إضافة سائق</h2>
            <form onSubmit={saveDriver} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم</label>
                  <input value={driverForm.name} onChange={e => setDriverForm(p => ({ ...p, name: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
                  <input type="email" value={driverForm.email} onChange={e => setDriverForm(p => ({ ...p, email: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                  <input value={driverForm.phone} onChange={e => setDriverForm(p => ({ ...p, phone: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الرخصة</label>
                  <input value={driverForm.licenseNumber} onChange={e => setDriverForm(p => ({ ...p, licenseNumber: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم اللوحة</label>
                  <input value={driverForm.busPlateNumber} onChange={e => setDriverForm(p => ({ ...p, busPlateNumber: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الموديل</label>
                  <input value={driverForm.busModel} onChange={e => setDriverForm(p => ({ ...p, busModel: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعة</label>
                  <input type="number" min={1} value={driverForm.busCapacity} onChange={e => setDriverForm(p => ({ ...p, busCapacity: Number(e.target.value || 0) }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setIsAddDriverOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
                <button type="submit" disabled={savingDriver} aria-disabled={savingDriver} className={`px-4 py-2 ${savingDriver ? 'bg-teal-400' : 'bg-teal-600 hover:bg-teal-700'} text-white rounded-lg`}>{savingDriver ? 'جاري الحفظ...' : 'حفظ'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {isEditDriverOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={() => { setIsEditDriverOpen(false); setEditingDriverId(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">تعديل بيانات سائق</h2>
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم</label>
                  <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                  <input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الرخصة</label>
                  <input value={editForm.licenseNumber} onChange={e => setEditForm(p => ({ ...p, licenseNumber: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم اللوحة</label>
                  <input value={editForm.busPlateNumber} onChange={e => setEditForm(p => ({ ...p, busPlateNumber: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الموديل</label>
                  <input value={editForm.busModel} onChange={e => setEditForm(p => ({ ...p, busModel: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">السعة</label>
                  <input type="number" min={1} value={editForm.busCapacity} onChange={e => setEditForm(p => ({ ...p, busCapacity: Number(e.target.value || 0) }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => { setIsEditDriverOpen(false); setEditingDriverId(null); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
                <button type="submit" disabled={savingEdit} aria-disabled={savingEdit} className={`px-4 py-2 ${savingEdit ? 'bg-teal-400' : 'bg-teal-600 hover:bg-teal-700'} text-white rounded-lg`}>{savingEdit ? 'جاري الحفظ...' : 'حفظ'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  if (!withContainer) return content;

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
      {content}
    </div>
  );
};

export default DriversList;
