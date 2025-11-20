import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceRecord, AttendanceStatus } from '../types';
import * as api from '../api';
import { CheckIcon, CanceledIcon, PastDueIcon, UsersIcon } from '../components/icons';
import { useAppContext } from '../contexts/AppContext';

const statusInfo: { [key in AttendanceStatus]: { text: string; bg: string; border: string; icon: React.ElementType } } = {
  [AttendanceStatus.Present]: { text: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/50', border: 'border-green-500', icon: CheckIcon },
  [AttendanceStatus.Absent]: { text: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/50', border: 'border-red-500', icon: CanceledIcon },
  [AttendanceStatus.Late]: { text: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/50', border: 'border-yellow-500', icon: PastDueIcon },
  [AttendanceStatus.Excused]: { text: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/50', border: 'border-blue-500', icon: UsersIcon },
};

const ParentAttendance: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (!user?.parentId) { setLoading(false); return; }
        api.getParentDashboardData(user.parentId).then(data => setAttendanceData(data.attendance)).finally(() => setLoading(false));
    }, [user?.parentId]);

    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear(); 
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1); 
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday

        let days: ({ day: number; date: string; status: AttendanceStatus | undefined; } | null)[] = Array(startDayOfWeek).fill(null);
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateString = date.toISOString().split('T')[0];
            const record = attendanceData.find(r => r.date === dateString);
            days.push({
                day: i,
                date: dateString,
                status: record?.status,
            });
        }
        return days;
    }, [currentDate, attendanceData]);

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    if (loading) {
        return <div className="text-center p-8">جاري تحميل سجل الحضور...</div>;
    }

    if (!user?.parentId) {
        return <div className="text-center p-8">المستخدم غير صالح لعرض هذه الصفحة.</div>;
    }

    if (attendanceData.length === 0) {
        return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md">لا توجد بيانات حضور متاحة للطالب.</div>;
    }

    return (
        <div className="mt-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{currentDate.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</h3>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarData.map((day, index) => (
                        <div key={index} className={`w-full aspect-square flex items-center justify-center rounded-lg transition-colors ${day?.status ? statusInfo[day.status].bg : ''}`}>
                           {day && <span className={`text-sm ${day?.status ? `${statusInfo[day.status].text} font-bold` : 'text-gray-700 dark:text-gray-300'}`}>{day.day}</span>}
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {Object.entries(statusInfo).map(([status, info]) => (
                        <div key={status} className="flex items-center">
                            <span className={`w-3 h-3 rounded-full ${info.bg} border ${info.border}`}></span>
                            <span className="mr-2 text-xs text-gray-600 dark:text-gray-400">{status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ParentAttendance;
