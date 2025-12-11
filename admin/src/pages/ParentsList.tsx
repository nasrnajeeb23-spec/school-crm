import React, { useState, useEffect } from 'react';
import { Parent, ParentAccountStatus } from '../types';
import * as api from '../api';
import { useToast } from '../contexts/ToastContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { UsersIcon } from '../components/icons';

const statusColorMap: { [key in ParentAccountStatus]: string } = {
  [ParentAccountStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [ParentAccountStatus.Invited]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

interface ParentsListProps {
  schoolId: number;
}

const ParentsList: React.FC<ParentsListProps> = ({ schoolId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    setLoading(true);
    api.getSchoolParents(schoolId).then(data => {
      setParents(data);
    }).catch(err => {
      console.error("Failed to fetch parents:", err);
      addToast("فشل تحميل قائمة أولياء الأمور.", 'error');
    }).finally(() => {
        setLoading(false);
    });
  }, [schoolId, addToast]);

  const filteredParents = parents.filter(parent =>
    parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [sendingId, setSendingId] = useState<string | number | null>(null);
  const [channelByParent, setChannelByParent] = useState<Record<string, 'email' | 'sms' | 'manual'>>({});
  const [showManualShare, setShowManualShare] = useState(false);
  const [manualLink, setManualLink] = useState('');
  const [cooldownByParent, setCooldownByParent] = useState<Record<string, number>>({});

  const ManualShareModal: React.FC<{ link: string; onClose: () => void; }> = ({ link, onClose }) => {
    const [sharing, setSharing] = useState(false);
    const onShare = async () => {
      try {
        setSharing(true);
        const anyNav = navigator as any;
        if (anyNav.share) {
          await anyNav.share({ title: 'تفعيل الحساب', text: 'رابط تفعيل الحساب', url: link });
          addToast('تمت المشاركة بنجاح.', 'success');
        } else {
          await navigator.clipboard.writeText(link);
          addToast('تم نسخ الرابط. يمكنك مشاركته يدويًا.', 'info');
        }
      } catch {
        try { await navigator.clipboard.writeText(link); addToast('تعذرت المشاركة. تم نسخ الرابط.', 'warning'); } catch { addToast('تعذر نسخ الرابط. انسخه يدويًا.', 'error'); }
      } finally {
        setSharing(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md w-[90%] max-w-lg text-right">
          <h3 className="text-lg font-semibold mb-3">رابط التفعيل للمشاركة اليدوية</h3>
          <a href={link} target="_blank" rel="noopener noreferrer" dir="ltr" className="break-all p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 underline">{link}</a>
          <div className="flex gap-3 mt-4 justify-end">
            <button
              onClick={() => { try { navigator.clipboard.writeText(link); addToast('تم نسخ الرابط.', 'success'); } catch { addToast('تعذر نسخ الرابط. انسخه يدويًا.', 'error'); } }}
              className="px-3 py-2 bg-teal-600 text-white rounded-md"
            >نسخ الرابط</button>
            <button
              onClick={onShare}
              disabled={sharing}
              aria-disabled={sharing}
              className={`px-3 py-2 ${sharing ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md`}
            >{sharing ? 'جارٍ المشاركة...' : 'مشاركة'}</button>
            <button onClick={onClose} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md">إغلاق</button>
          </div>
        </div>
      </div>
    );
  };

  const handleInvite = async (parentId: string | number, channelOverride?: 'email' | 'sms' | 'manual') => {
    try {
      setSendingId(parentId);
      const channel = channelOverride || channelByParent[String(parentId)] || 'manual';
      const res = await api.inviteParent(String(parentId), channel);
      if (channel === 'manual') {
        if (res.activationLink) {
          setManualLink(res.activationLink);
          setShowManualShare(true);
        }
        addToast('تم إنشاء رابط التفعيل للمشاركة اليدوية.', 'success');
      } else if (channel === 'sms') {
        addToast('تم تسجيل طلب إرسال رسالة نصية. قد يتطلب إعداد مزوّد SMS.', 'info');
      } else {
        addToast('تم إرسال الدعوة إلى البريد الإلكتروني بنجاح.', 'success');
      }
      setParents(prev => prev.map(p => (p.id === parentId ? { ...p, status: ParentAccountStatus.Invited } : p)));
    } catch (e) {
      addToast('فشل إرسال الدعوة لولي الأمر.', 'error');
    } finally {
      setSendingId(null);
      setCooldownByParent(prev => ({ ...prev, [String(parentId)]: Date.now() + 2500 }));
    }
  };

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث باسم ولي الأمر أو الطالب..."
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
        <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
          إضافة ولي أمر
        </button>
      </div>
      <div className="overflow-x-auto">
        {loading ? <TableSkeleton /> : filteredParents.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="لا يوجد أولياء أمور"
            message={searchTerm ? `لم يتم العثور على نتائج تطابق بحثك.` : "لم يتم إضافة أولياء أمور بعد."}
          />
        ) : (
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">اسم ولي الأمر</th>
                <th scope="col" className="px-6 py-3">اسم الطالب</th>
                <th scope="col" className="px-6 py-3">البريد الإلكتروني</th>
                <th scope="col" className="px-6 py-3">حالة الحساب</th>
                <th scope="col" className="px-6 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredParents.map((parent) => (
                <tr key={parent.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{parent.name}</td>
                  <td className="px-6 py-4">{parent.studentName}</td>
                  <td className="px-6 py-4">{parent.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[parent.status]}`}>
                      {parent.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <select
                        value={channelByParent[String(parent.id)] || 'manual'}
                        onChange={(e) => setChannelByParent(prev => ({ ...prev, [String(parent.id)]: e.target.value as 'email' | 'sms' | 'manual' }))}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
                      >
                        <option value="email" disabled={!parent.email}>البريد الإلكتروني (مدفوع)</option>
                        <option value="sms" disabled={!parent.phone || String(parent.phone).trim() === ''}>رسالة نصية (مدفوعة)</option>
                        <option value="manual">مشاركة يدوية (مجاني)</option>
                      </select>
                      {(() => {
                        const cool = (cooldownByParent[String(parent.id)] || 0) > Date.now();
                        const disabled = sendingId === parent.id || cool;
                        const label = sendingId === parent.id ? 'جاري الإرسال...' : cool ? 'انتظر لحظة...' : (parent.status === ParentAccountStatus.Invited ? 'إعادة إرسال' : 'إرسال الدعوة');
                        return (
                          <button
                            onClick={() => handleInvite(parent.id)}
                            disabled={disabled}
                            aria-disabled={disabled}
                            className={`font-medium ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-indigo-600 dark:text-indigo-500'} hover:underline`}
                          >
                            {label}
                          </button>
                        );
                      })()}
                      <button className="font-medium text-red-600 dark:text-red-500 hover:underline">إلغاء التنشيط</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showManualShare && (
        <ManualShareModal link={manualLink} onClose={() => setShowManualShare(false)} />
      )}
    </div>
  );
};

export default ParentsList;
