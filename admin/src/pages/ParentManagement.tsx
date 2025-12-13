import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../api';
import { Parent, ParentAccountStatus } from '../types';
import { BackIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';

interface ParentManagementProps {
  schoolId: number;
}

const ParentManagement: React.FC<ParentManagementProps> = ({ schoolId }) => {
  const { parentId } = useParams<{ parentId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [parent, setParent] = useState<Parent | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState('');
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!parentId) return;
    setLoading(true);
    api.getSchoolParents(schoolId)
      .then(list => list.find(p => String(p.id) === String(parentId)) || null)
      .then((p) => {
        setParent(p);
      })
      .catch(err => {
        console.error('Failed to fetch parent details:', err);
        addToast('فشل تحميل بيانات ولي الأمر.', 'error');
      })
      .finally(() => setLoading(false));
  }, [parentId, schoolId, addToast]);

  const handleGenerateLink = async () => {
    if (!parent) return;
    try {
      setCreating(true);
      const res = await api.inviteParent(String(parent.id), 'manual');
      if (res.activationLink) {
        setInviteLink(res.activationLink);
        addToast('تم إنشاء رابط الدعوة بنجاح.', 'success');
      } else {
        addToast('لم يتم استلام رابط دعوة من الخادم.', 'error');
      }
    } catch {
      addToast('فشل إنشاء رابط الدعوة.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async () => {
    if (!parent) return;
    try {
      setUpdatingStatus(true);
      const desiredActive = parent.status === ParentAccountStatus.Active ? false : true;
      const res = await api.updateParentActiveStatus(schoolId, String(parent.id), desiredActive);
      setParent(prev => prev ? { ...prev, status: res.status } : prev);
      addToast(desiredActive ? 'تم تفعيل حساب ولي الأمر.' : 'تم إلغاء تفعيل حساب ولي الأمر.', 'success');
    } catch {
      addToast('فشل تحديث حالة حساب ولي الأمر.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      addToast('تم نسخ الرابط.', 'success');
    } catch {
      addToast('تعذر نسخ الرابط. انسخه يدويًا.', 'error');
    }
  };

  const handleShare = async () => {
    if (!inviteLink) return;
    try {
      setSharing(true);
      const anyNav = navigator as any;
      if (anyNav.share) {
        await anyNav.share({ title: 'تفعيل الحساب', text: 'رابط تفعيل الحساب', url: inviteLink });
        addToast('تمت المشاركة بنجاح.', 'success');
      } else {
        await navigator.clipboard.writeText(inviteLink);
        addToast('تم نسخ الرابط. يمكنك مشاركته يدويًا.', 'info');
      }
    } catch {
      try { await navigator.clipboard.writeText(inviteLink); addToast('تعذرت المشاركة. تم نسخ الرابط.', 'warning'); } catch { addToast('تعذر نسخ الرابط. انسخه يدويًا.', 'error'); }
    } finally {
      setSharing(false);
    }
  };

  if (loading) return <div className="text-center p-8">جاري تحميل بيانات ولي الأمر...</div>;
  if (!parent) return <div className="text-center p-8">لم يتم العثور على ولي الأمر.</div>;

  return (
    <div className="mt-6 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
        <BackIcon className="h-5 w-5 ml-2" />
        <span>العودة إلى إدارة أولياء الأمور</span>
      </button>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">إدارة ولي الأمر</h2>
            <p className="text-gray-500 dark:text-gray-400">يمكنك إنشاء ومشاركة رابط الدعوة من هنا</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-2 text-sm">
            <p className="text-gray-500 dark:text-gray-400">اسم ولي الأمر</p>
            <p className="font-medium text-gray-900 dark:text-white">{parent.name}</p>
            <p className="text-gray-500 dark:text-gray-400 mt-4">اسم الطالب</p>
            <p className="font-medium text-gray-900 dark:text-white">{parent.studentName}</p>
            <p className="text-gray-500 dark:text-gray-400 mt-4">البريد الإلكتروني</p>
            <p className="font-medium text-gray-900 dark:text-white">{parent.email || 'غير متوفر'}</p>
            <p className="text-gray-500 dark:text-gray-400 mt-4">رقم الهاتف</p>
            <p className="font-medium text-gray-900 dark:text-white">{parent.phone || 'غير متوفر'}</p>
            <p className="text-gray-500 dark:text-gray-400 mt-4">رقم الطالب</p>
            <p className="font-medium text-gray-900 dark:text-white">{parent.studentId}</p>
            <div className="mt-6 flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400">حالة الحساب</p>
                <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${parent.status === ParentAccountStatus.Active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'}`}>
                  {parent.status}
                </span>
              </div>
              <button
                onClick={handleToggleActive}
                disabled={updatingStatus}
                aria-disabled={updatingStatus}
                className={`px-3 py-2 rounded-md text-white ${updatingStatus ? 'bg-gray-400' : (parent.status === ParentAccountStatus.Active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700')}`}
              >
                {updatingStatus ? 'جاري التحديث...' : (parent.status === ParentAccountStatus.Active ? 'إلغاء التفعيل' : 'تفعيل الحساب')}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800 dark:text-white">رابط الدعوة</h4>
            {inviteLink ? (
              <>
                <a
                  href={inviteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="break-all p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 underline block"
                >
                  {inviteLink}
                </a>
                <div className="flex flex-wrap gap-3 justify-end">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md"
                  >
                    نسخ الرابط
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    aria-disabled={sharing}
                    className={`px-3 py-2 ${sharing ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md`}
                  >
                    {sharing ? 'جارٍ المشاركة...' : 'مشاركة'}
                  </button>
                  <button
                    onClick={handleGenerateLink}
                    disabled={creating}
                    aria-disabled={creating}
                    className={`px-3 py-2 ${creating ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} text-white rounded-md`}
                  >
                    {creating ? 'جاري الإنشاء...' : 'إنشاء رابط جديد'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-3 justify-between items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  لم يتم إنشاء رابط دعوة بعد. اضغط الزر لإنشاء الرابط.
                </p>
                <button
                  onClick={handleGenerateLink}
                  disabled={creating}
                  aria-disabled={creating}
                  className={`px-3 py-2 ${creating ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md`}
                >
                  {creating ? 'جاري الإنشاء...' : 'إنشاء رابط دعوة'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentManagement;
