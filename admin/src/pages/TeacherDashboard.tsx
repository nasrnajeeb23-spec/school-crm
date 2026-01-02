import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { User, Class, ScheduleEntry, ActionItem, ConversationType } from '../types';
import { ClassesIcon, ScheduleIcon, BellIcon, ActionItemIcon, ComposeIcon } from '../components/icons';
import { useAppContext } from '../contexts/AppContext';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

const TeacherDashboard: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [data, setData] = useState<{
        classes: Class[],
        schedule: ScheduleEntry[],
        actionItems: ActionItem[]
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();
    const [targetRole, setTargetRole] = useState<'TEACHER' | 'PARENT'>('PARENT');
    const [candidates, setCandidates] = useState<any[]>([]);
    const [selectedTargetId, setSelectedTargetId] = useState<string>('');
    const [quickMessage, setQuickMessage] = useState<string>('');
    const [isSending, setIsSending] = useState(false);
    
    useEffect(() => {
        if(!user?.teacherId) {
            setLoading(false);
            return;
        };
        api.getTeacherDashboardData(user.teacherId).then(dashboardData => {
            setData(dashboardData);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to fetch teacher dashboard data:", err);
            setLoading(false);
        });
    }, [user?.teacherId]);

    useEffect(() => {
        const loadCandidates = async () => {
            try {
                const users = await api.getUsersByRole(targetRole);
                setCandidates(users);
            } catch (error) {
                addToast('فشل تحميل قائمة المستلمين', 'error');
            }
        };
        loadCandidates();
    }, [targetRole]);

    if (loading) return <div className="text-center p-8">جاري تحميل البيانات...</div>;
    if (!data) return <div className="text-center p-8">لا توجد بيانات لعرضها.</div>;

    return (
        <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="flex items-center text-xl font-semibold text-gray-800 dark:text-white mb-4">
                        <ScheduleIcon className="h-6 w-6 ml-2 text-teal-500" />
                        جدولك لليوم ({new Date().toLocaleDateString('ar-EG', { weekday: 'long' })})
                    </h3>
                     <div className="space-y-3">
                        {data.schedule.length > 0 ? data.schedule.map(s => (
                            <div key={s.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
                               <div>
                                  <p className="font-semibold text-gray-800 dark:text-white">{s.subject}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.className || s.classId}</p>
                               </div>
                               <span className="text-sm font-medium text-teal-600 dark:text-teal-400">{s.timeSlot}</span>
                            </div>
                        )) : <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد حصص مجدولة لك اليوم.</p>}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                     <h3 className="flex items-center text-xl font-semibold text-gray-800 dark:text-white mb-4">
                        <BellIcon className="h-6 w-6 ml-2 rtl:mr-2 rtl:ml-0 text-teal-500" />
                        إجراءات مطلوبة
                    </h3>
                    <div className="space-y-4">
                        {data.actionItems.length > 0 ? data.actionItems.map((item: ActionItem) => (
                            <div key={item.id} className="flex items-start p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <ActionItemIcon type={item.type} className="h-6 w-6 mt-1 flex-shrink-0" />
                                <div className="mr-4">
                                    <p className="font-semibold text-gray-800 dark:text-white">{item.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500 mr-auto whitespace-nowrap">{item.date}</span>
                            </div>
                        )) : <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد إجراءات مطلوبة حاليًا.</p>}
                    </div>
                </div>
            </div>
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="flex items-center text-xl font-semibold text-gray-800 dark:text-white mb-4">
                    <ClassesIcon className="h-6 w-6 ml-2 text-teal-500" />
                    فصولك الدراسية
                </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {data.classes.length > 0 ? data.classes.map(c => (
                        <div key={c.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                             <p className="font-bold text-gray-800 dark:text-white">{`${c.gradeLevel} (${c.section || 'أ'})`}</p>
                             <p className="text-sm text-gray-500 dark:text-gray-400">{c.studentCount} طالب</p>
                        </div>
                     )) : <p className="text-center text-gray-500 dark:text-gray-400 py-4 col-span-full">أنت غير مسجل كمعلم أساسي لأي فصل.</p>}
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="flex items-center text-xl font-semibold text-gray-800 dark:text-white">
                            <ComposeIcon className="h-6 w-6 ml-2 text-teal-500" />
                            رسالة سريعة
                        </h3>
                        <Link to="/teacher/messaging" className="px-3 py-2 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-800">فتح المراسلة</Link>
                    </div>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!selectedTargetId || !quickMessage.trim()) return;
                        setIsSending(true);
                        try {
                            const schoolIdStr = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
                            const schoolId = schoolIdStr ? Number(schoolIdStr) : 1;
                            const title = targetRole === 'PARENT' ? 'محادثة مع ولي أمر' : 'محادثة مع معلم';
                            const payload: any = { title, schoolId };
                            if (targetRole === 'PARENT') payload.parentId = selectedTargetId;
                            if (targetRole === 'TEACHER') payload.teacherId = selectedTargetId;
                            const created = await api.createConversation(payload);
                            await api.sendMessage({ conversationId: created.id, text: quickMessage });
                            setQuickMessage(''); setSelectedTargetId('');
                            addToast('تم إرسال الرسالة بنجاح.', 'success');
                        } catch (error) {
                            addToast('فشل إرسال الرسالة.', 'error');
                        } finally { setIsSending(false); }
                    }} className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setTargetRole('PARENT')} className={`px-3 py-1 rounded-lg text-sm ${targetRole === 'PARENT' ? 'bg-teal-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>ولي أمر</button>
                                <button type="button" onClick={() => setTargetRole('TEACHER')} className={`px-3 py-1 rounded-lg text-sm ${targetRole === 'TEACHER' ? 'bg-teal-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>معلم</button>
                            </div>
                            <select value={selectedTargetId} onChange={e => setSelectedTargetId(e.target.value)} className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                                <option value="">اختر المستلم...</option>
                                {candidates.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">نص الرسالة</label>
                            <textarea className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 focus:outline-none" rows={3} value={quickMessage} onChange={e => setQuickMessage(e.target.value)} placeholder="اكتب رسالتك هنا" />
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={isSending || !quickMessage.trim() || !selectedTargetId} className={`px-4 py-2 rounded-lg text-white ${isSending || !quickMessage.trim() || !selectedTargetId ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}`}>{isSending ? 'جاري الإرسال...' : 'إرسال'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default TeacherDashboard;
