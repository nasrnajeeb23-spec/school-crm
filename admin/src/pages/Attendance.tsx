import React, { useState, useMemo, useEffect } from 'react';
import { Class, DailyAttendance, AttendanceStatus, AttendanceRecord } from '../types';
import * as api from '../api';
import StatsCard from '../components/StatsCard';
import { CheckIcon, CanceledIcon, UsersIcon, PastDueIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';

const statusStyles: { [key in AttendanceStatus]: { bg: string; text: string; icon: React.ElementType } } = {
    [AttendanceStatus.Present]: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', icon: CheckIcon },
    [AttendanceStatus.Absent]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', icon: CanceledIcon },
    [AttendanceStatus.Late]: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300', icon: PastDueIcon },
    [AttendanceStatus.Excused]: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300', icon: UsersIcon },
};

// FIX: Added interface for component props to accept schoolId.
interface AttendanceProps {
    schoolId: number;
}

const Attendance: React.FC<AttendanceProps> = ({ schoolId }) => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        // FIX: Corrected function call from getClasses to getSchoolClasses and passed the schoolId.
        api.getSchoolClasses(schoolId).then(data => {
            setClasses(data);
            if (data.length > 0) {
                setSelectedClass(data[0].id);
            } else {
                setLoading(false);
            }
        });
    }, [schoolId]);

    useEffect(() => {
        if (!selectedClass) {
            setAttendanceRecords([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        Promise.all([
            api.getClassStudents(selectedClass),
            api.getAttendance(selectedClass, selectedDate)
        ]).then(([students, attendanceData]) => {
            const recordsMap = Array.isArray(attendanceData) ? new Map(attendanceData.map(r => [r.studentId, r.status])) : new Map();
            const fullRosterWithStatus = students.map(student => ({
                studentId: student.id,
                studentName: student.name,
                status: recordsMap.get(student.id) || AttendanceStatus.Present
            }));
            setAttendanceRecords(fullRosterWithStatus);
        }).catch(err => {
            console.error("Failed to load attendance data:", err);
            addToast('فشل تحميل بيانات الحضور.', 'error');
        }).finally(() => {
            setLoading(false);
        });
    }, [selectedClass, selectedDate]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendanceRecords(prev =>
            prev.map(record =>
                record.studentId === studentId ? { ...record, status } : record
            )
        );
    };

    const handleSaveAttendance = async () => {
        if (!selectedClass) return;
        setIsSaving(true);
        try {
            await api.saveAttendance(selectedClass, selectedDate, attendanceRecords);
            addToast('تم حفظ سجل الحضور بنجاح!', 'success');
        } catch (error) {
            console.error("Failed to save attendance:", error);
            addToast('حدث خطأ أثناء حفظ سجل الحضور.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const summary = useMemo(() => {
        return attendanceRecords.reduce((acc, record) => {
            acc[record.status] = (acc[record.status] || 0) + 1;
            return acc;
        }, {} as { [key in AttendanceStatus]?: number });
    }, [attendanceRecords]);

    return (
        <div className="mt-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            اختر الفصل
                        </label>
                        <select
                            id="class-select"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full md:w-64 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            اختر التاريخ
                        </label>
                        <input
                            type="date"
                            id="date-select"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard icon={CheckIcon} title="حاضر" value={(summary[AttendanceStatus.Present] || 0).toString()} description="إجمالي الطلاب الحاضرين" />
                <StatsCard icon={CanceledIcon} title="غائب" value={(summary[AttendanceStatus.Absent] || 0).toString()} description="إجمالي الطلاب الغائبين" />
                <StatsCard icon={PastDueIcon} title="متأخر" value={(summary[AttendanceStatus.Late] || 0).toString()} description="إجمالي الطلاب المتأخرين" />
                <StatsCard icon={UsersIcon} title="بعذر" value={(summary[AttendanceStatus.Excused] || 0).toString()} description="إجمالي الطلاب المعذورين" />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                    قائمة الطلاب - {classes.find(c => c.id === selectedClass)?.name}
                </h3>
                 {loading ? (
                    <div className="text-center py-8">جاري تحميل سجل الحضور...</div>
                 ) : attendanceRecords.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        {classes.length === 0 ? 'الرجاء إضافة فصول دراسية أولاً.' : 'لا يوجد طلاب في هذا الفصل.'}
                    </div>
                 ) : (
                    <div className="space-y-3">
                        {attendanceRecords.map(record => (
                            <div key={record.studentId} className="flex flex-wrap items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                <span className="font-medium text-gray-800 dark:text-white">{record.studentName}</span>
                                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                    {(Object.values(AttendanceStatus) as AttendanceStatus[]).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(record.studentId, status)}
                                            className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-200 ${
                                                record.status === status
                                                    ? `${statusStyles[status].bg} ${statusStyles[status].text}`
                                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                                            }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
                 <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSaveAttendance}
                        disabled={isSaving || loading || attendanceRecords.length === 0}
                        className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? 'جاري الحفظ...' : 'حفظ سجل الحضور'}
                    </button>
                </div>
            </div>

        </div>
    );
};

export default Attendance;
