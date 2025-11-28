import React, { useState, useEffect } from 'react';
import { Class, DailyAttendance, AttendanceStatus, AttendanceRecord } from '../types';
import * as api from '../api';
import StatsCard from '../components/StatsCard';
import { CheckIcon, CanceledIcon, UsersIcon, PastDueIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import { useAppContext } from '../contexts/AppContext';

const statusStyles: { [key in AttendanceStatus]: { bg: string; text: string; } } = {
    [AttendanceStatus.Present]: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
    [AttendanceStatus.Absent]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
    [AttendanceStatus.Late]: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300' },
    [AttendanceStatus.Excused]: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
};

const TeacherAttendance: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (!user?.teacherId) { setLoading(false); return; }
        api.getTeacherClasses(user.teacherId).then(data => {
            setClasses(data);
            if (data.length > 0) setSelectedClass(data[0].id);
            else setLoading(false);
        });
    }, [user?.teacherId]);

    useEffect(() => {
        if (!selectedClass) return;
        setLoading(true);
        Promise.all([
            api.getClassStudents(selectedClass),
            api.getAttendance(selectedClass, selectedDate)
        ]).then(([students, attendanceData]) => {
            const recordsMap = new Map(attendanceData?.records.map(r => [r.studentId, r.status]));
            const fullRosterWithStatus = students.map(student => ({
                studentId: student.id,
                studentName: student.name,
                status: recordsMap.get(student.id) || AttendanceStatus.Present
            }));
            setAttendanceRecords(fullRosterWithStatus);
        }).finally(() => setLoading(false));
    }, [selectedClass, selectedDate]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendanceRecords(prev => prev.map(record => record.studentId === studentId ? { ...record, status } : record));
    };

    const handleSaveAttendance = async () => {
        if (!selectedClass) return;
        setIsSaving(true);
        try {
            await api.saveAttendance(selectedClass, selectedDate, attendanceRecords);
            addToast('تم حفظ سجل الحضور بنجاح!', 'success');
        } catch (error) {
            addToast('حدث خطأ أثناء حفظ سجل الحضور.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const summary = React.useMemo(() => {
        return attendanceRecords.reduce((acc, record) => { acc[record.status] = (acc[record.status] || 0) + 1; return acc; }, {} as { [key in AttendanceStatus]?: number });
    }, [attendanceRecords]);

    if (!user?.teacherId) return <div className="text-center p-8">معرف المعلم غير موجود.</div>;
    
    return (
        <div className="mt-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اختر الفصل</label>
                        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={classes.length === 0} className="w-full md:w-64 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
                            {classes.map(c => <option key={c.id} value={c.id}>{`${c.gradeLevel} (${c.section || 'أ'})`}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اختر التاريخ</label>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">قائمة الطلاب - {(() => { const cls = classes.find(c => c.id === selectedClass); return cls ? `${cls.gradeLevel} (${cls.section || 'أ'})` : '...'; })()}</h3>
                 {loading ? (<div className="text-center py-8">جاري تحميل سجل الحضور...</div>) : attendanceRecords.length === 0 ? (<div className="text-center py-8 text-gray-500 dark:text-gray-400">لا يوجد طلاب في هذا الفصل.</div>) : (
                    <div className="space-y-3">
                        {attendanceRecords.map(record => (
                            <div key={record.studentId} className="flex flex-wrap items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                <span className="font-medium text-gray-800 dark:text-white">{record.studentName}</span>
                                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                    {(Object.values(AttendanceStatus) as AttendanceStatus[]).map(status => (<button key={status} onClick={() => handleStatusChange(record.studentId, status)} className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-200 ${record.status === status ? `${statusStyles[status].bg} ${statusStyles[status].text}` : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'}`}>{status}</button>))}
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
                 <div className="mt-6 flex justify-end">
                    <button onClick={handleSaveAttendance} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50" disabled={loading || isSaving || attendanceRecords.length === 0}>
                        {isSaving ? 'جاري الحفظ...' : 'حفظ سجل الحضور'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TeacherAttendance;
