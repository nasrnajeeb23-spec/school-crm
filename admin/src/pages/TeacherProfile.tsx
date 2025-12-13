import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Teacher, TeacherStatus, Class, UpdatableTeacherData, SchoolSettings, AttendanceStatus } from '../types';
import * as api from '../api';
import { BackIcon, EditIcon, PrintIcon, ClassesIcon, CalendarIcon } from '../components/icons';
import EditTeacherModal from '../components/EditTeacherModal';
import { useToast } from '../contexts/ToastContext';

const statusColorMap: { [key in TeacherStatus]: string } = {
  [TeacherStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [TeacherStatus.OnLeave]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

const attendanceStatusStyles: { [key in AttendanceStatus]: { bg: string; text: string } } = {
  [AttendanceStatus.Present]: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
  [AttendanceStatus.Absent]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
  [AttendanceStatus.Late]: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300' },
  [AttendanceStatus.Excused]: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
};

interface TeacherProfileProps {
  schoolId: number;
  schoolSettings: SchoolSettings | null;
}

const TeacherProfile: React.FC<TeacherProfileProps> = ({ schoolId, schoolSettings }) => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [teacherDetails, setTeacherDetails] = useState<{ classes: Class[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { addToast } = useToast();
  const [inviteLink, setInviteLink] = useState('');
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [salarySlips, setSalarySlips] = useState<any[]>([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  useEffect(() => {
    if (!teacherId) return;
    setLoading(true);
    api.getSchoolTeachers(schoolId)
      .then(list => list.find(t => String(t.id) === String(teacherId)))
      .then(async (teacherData) => {
        if (teacherData) setTeacher(teacherData);
        try {
          const key = `teacher_invite_link_${String(teacherId)}`;
          const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
          if (saved) setInviteLink(saved);
        } catch {}
        const allClasses = await api.getClasses(schoolId);
        const classes = allClasses.filter(c => String(c.homeroomTeacherName) === String(teacherData?.name));
        setTeacherDetails({ classes } as { classes: Class[] });
      })
      .catch(err => {
        console.error("Failed to fetch teacher details:", err);
        addToast("فشل تحميل بيانات المعلم.", "error");
      })
      .finally(() => setLoading(false));
  }, [teacherId, schoolId, addToast]);
  
  useEffect(() => {
    // دعوة المعلم: لا نعتمد على التخزين المحلي للرابط أو التوقيت
  }, [teacherId]);
  
  useEffect(() => {
    if (!teacher) return;
    setSalaryLoading(true);
    api.getSalarySlipsForSchool(schoolId, undefined, { personType: 'teacher', personId: teacher.id })
      .then(rows => {
        try {
          const onlyTeacher = Array.isArray(rows) ? rows.filter(r => String(r.personType) === 'teacher' && String(r.personId) === String(teacher.id)) : [];
          setSalarySlips(onlyTeacher);
        } catch {
          setSalarySlips([]);
        }
      })
      .catch(e => {
        const msg = String((e as any)?.message || '');
        if (/SUBSCRIPTION_EXPIRED|402|403/i.test(msg)) addToast('الرواتب غير متاحة ضمن الخطة الحالية.', 'warning');
      })
      .finally(() => setSalaryLoading(false));
  }, [teacher, schoolId, addToast]);

  useEffect(() => {
    if (!teacher) return;
    setAttendanceLoading(true);
    api.getTeachersAttendance(schoolId, attendanceDate)
      .then(rows => {
        const rec = Array.isArray(rows) ? rows.find((r: any) => String(r.teacherId) === String(teacher.id)) : null;
        if (rec) {
          setAttendanceStatus(rec.status as AttendanceStatus);
        } else {
          setAttendanceStatus(AttendanceStatus.Present);
        }
      })
      .catch(() => {
        addToast('فشل تحميل سجل الحضور.', 'error');
      })
      .finally(() => setAttendanceLoading(false));
  }, [teacher, schoolId, attendanceDate, addToast]);

  const handleUpdateTeacher = async (data: UpdatableTeacherData) => {
    if (!teacher) return;
    try {
        const updatedTeacher = await api.updateTeacher(schoolId, teacher.id, data);
        setTeacher(updatedTeacher);
        setIsEditModalOpen(false);
        addToast('تم تحديث بيانات المعلم بنجاح.', 'success');
    } catch (error) {
        addToast("فشل تحديث بيانات المعلم.", 'error');
    }
  };
  
  const formatCurrency = (amount?: number) => {
    const v = Number(amount || 0);
    return `ر.س ${v.toFixed(2)}`;
  };
  
  const handleGenerateLink = async () => {
    if (!teacher) return;
    try {
      setCreating(true);
      const res = await api.inviteTeacher(String(teacher.id), 'manual');
      if (res.activationLink) {
        setInviteLink(res.activationLink);
        try {
          const key = `teacher_invite_link_${String(teacherId)}`;
          if (typeof window !== 'undefined') localStorage.setItem(key, res.activationLink);
        } catch {}
        try {
          const list = await api.getSchoolTeachers(schoolId);
          const updated = list.find(t => String(t.id) === String(teacherId));
          if (updated) setTeacher(updated);
        } catch {}
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
  
  const handleToggleStatus = async () => {
    if (!teacher) return;
    try {
      setUpdatingStatus(true);
      const desiredActive = teacher.status === TeacherStatus.Active ? false : true;
      const res = await api.updateTeacherActiveStatus(schoolId, teacher.id, desiredActive);
      setTeacher(prev => prev ? { ...prev, status: res.status as TeacherStatus } : prev);
      addToast(desiredActive ? 'تم تفعيل حساب المعلم.' : 'تم تعيين حالة المعلم إلى في إجازة وإلغاء التفعيل.', 'success');
    } catch {
      addToast('فشل تحديث حالة المعلم.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAttendanceSave = async () => {
    if (!teacher || !attendanceStatus) return;
    try {
      setAttendanceSaving(true);
      await api.saveTeachersAttendance(schoolId, attendanceDate, [{ teacherId: Number(teacher.id), status: attendanceStatus }]);
      addToast('تم حفظ سجل الحضور بنجاح!', 'success');
    } catch {
      addToast('فشل حفظ سجل الحضور.', 'error');
    } finally {
      setAttendanceSaving(false);
    }
  };
  
  if (loading) return <div className="text-center p-8">جاري تحميل بيانات المعلم...</div>;
  if (!teacher) return <div className="text-center p-8">لم يتم العثور على المعلم.</div>;

  return (
    <>
      <div className="mt-6 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            <BackIcon className="h-5 w-5 ml-2" />
            <span>العودة إلى قائمة المعلمين</span>
        </button>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
           {schoolSettings && (
             <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 mb-6">
               {schoolSettings.schoolLogoUrl && (
                 <img 
                   src={api.getAssetUrl(schoolSettings.schoolLogoUrl as string)} 
                   alt="School Logo" 
                   className="w-12 h-12 rounded-lg"
                   onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                 />
               )}
               <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">{schoolSettings.schoolName}</h2>
             </div>
           )}
            <div className="flex flex-col md:flex-row items-center gap-6">
                <img src={`https://picsum.photos/seed/${teacher.id}/100/100`} alt={teacher.name} className="w-24 h-24 rounded-full border-4 border-teal-500" />
                <div className="flex-grow text-center md:text-right">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{teacher.name}</h2>
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>المادة: {teacher.subject}</span><span>|</span><span dir="ltr">الهاتف: {teacher.phone}</span><span>|</span><span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[teacher.status]}`}>{teacher.status}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditModalOpen(true)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" title="تعديل"><EditIcon className="h-5 w-5" /></button>
                    <button onClick={() => window.print()} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" title="طباعة"><PrintIcon className="h-5 w-5" /></button>
                    <button
                      onClick={handleToggleStatus}
                      disabled={updatingStatus}
                      aria-disabled={updatingStatus}
                      className={`px-3 py-2 rounded-md text-white ${updatingStatus ? 'bg-gray-400' : (teacher.status === TeacherStatus.Active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700')}`}
                    >
                      {updatingStatus ? 'جاري التحديث...' : (teacher.status === TeacherStatus.Active ? 'وضع إجازة' : 'إرجاع للنشاط')}
                    </button>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h4 className="font-semibold text-gray-800 dark:text-white">رابط الدعوة</h4>
          {inviteLink ? (
            <>
              <a
                href={inviteLink}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="break-all p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 underline block mt-3"
              >
                {inviteLink}
              </a>
              {(() => {
                let valid = false;
                let ago = 'لا يوجد';
                try {
                  const lastInviteAt = (teacher as any)?.lastInviteAt ? new Date(String((teacher as any).lastInviteAt)) : null;
                  if (lastInviteAt && !isNaN(lastInviteAt.getTime())) {
                    const diff = Math.max(0, Date.now() - lastInviteAt.getTime());
                    const mins = Math.floor(diff / 60000);
                    const hours = Math.floor(diff / 3600000);
                    const days = Math.floor(diff / 86400000);
                    ago = days > 0 ? `${days} يوم` : hours > 0 ? `${hours} ساعة` : `${mins} دقيقة`;
                    valid = lastInviteAt.getTime() + 72 * 3600 * 1000 > Date.now();
                  }
                } catch {}
                return (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    آخر دعوة: {ago} • حالة الرابط: {valid ? 'صالح' : 'منتهي'}
                  </div>
                );
              })()}
              <div className="flex flex-wrap gap-3 justify-end mt-3">
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
            <div className="flex flex-wrap gap-3 justify-between items-center mt-3">
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

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white flex items-center">
              <CalendarIcon className="h-6 w-6 ml-2 text-teal-500" />
              الحضور والغياب
            </h3>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ:</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          {attendanceLoading ? (
            <div className="text-center py-6">جاري تحميل سجل الحضور...</div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-300">الحالة الحالية:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${attendanceStatus ? `${attendanceStatusStyles[attendanceStatus].bg} ${attendanceStatusStyles[attendanceStatus].text}` : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                  {attendanceStatus || AttendanceStatus.Present}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(Object.values(AttendanceStatus) as AttendanceStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => setAttendanceStatus(status)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                      attendanceStatus === status
                        ? `${attendanceStatusStyles[status].bg} ${attendanceStatusStyles[status].text} ring-2 ring-offset-1 ring-teal-500`
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="flex justify-end w-full md:w-auto">
                <button
                  onClick={handleAttendanceSave}
                  disabled={attendanceSaving || attendanceLoading || !attendanceStatus}
                  aria-disabled={attendanceSaving || attendanceLoading || !attendanceStatus}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50"
                >
                  {attendanceSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">الرواتب والمستحقات</h3>
          {salaryLoading ? (
            <p>جاري تحميل بيانات الرواتب...</p>
          ) : salarySlips.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد كشوف رواتب لهذا المعلم.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-300">صافي الراتب (آخر شهر)</div>
                  <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {formatCurrency(Number(salarySlips[0]?.netAmount || 0))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{String(salarySlips[0]?.month || '')}</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-300">إجمالي الراتب</div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">
                    {formatCurrency(Number(salarySlips[0]?.baseAmount || 0) + Number(salarySlips[0]?.allowancesTotal || 0))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">قبل الخصومات</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3">الشهر</th>
                      <th className="px-6 py-3">الإجمالي</th>
                      <th className="px-6 py-3">العلاوات</th>
                      <th className="px-6 py-3">الخصومات</th>
                      <th className="px-6 py-3">الصافي</th>
                      <th className="px-6 py-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salarySlips.map(s => (
                      <tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4">{String(s.month || '')}</td>
                        <td className="px-6 py-4">{formatCurrency(Number(s.baseAmount || 0) + Number(s.allowancesTotal || 0))}</td>
                        <td className="px-6 py-4">{formatCurrency(Number(s.allowancesTotal || 0))}</td>
                        <td className="px-6 py-4">{formatCurrency(Number(s.deductionsTotal || 0))}</td>
                        <td className="px-6 py-4 font-semibold">{formatCurrency(Number(s.netAmount || 0))}</td>
                        <td className="px-6 py-4">{String(s.status || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4 flex items-center"><ClassesIcon className="h-6 w-6 ml-2 text-teal-500" />الفصول المسندة</h3>
          {loading ? (<p>جاري تحميل الفصول...</p>) : teacherDetails && teacherDetails.classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacherDetails.classes.map(cls => (
                <div key={cls.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="font-bold text-gray-800 dark:text-white">{`${cls.gradeLevel} (${cls.section || 'أ'})`}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{cls.gradeLevel}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{cls.studentCount} طالب</p>
                </div>
              ))}
            </div>
          ) : (<p className="text-center text-gray-500 dark:text-gray-400 py-4">لم يتم إسناد أي فصول لهذا المعلم بعد.</p>)}
        </div>
      </div>
      {isEditModalOpen && (<EditTeacherModal teacher={teacher} onClose={() => setIsEditModalOpen(false)} onSave={handleUpdateTeacher}/>)}
    </>
  );
};

export default TeacherProfile;
