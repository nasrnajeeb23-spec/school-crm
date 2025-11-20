import React, { useState, useEffect, useMemo } from 'react';
import * as api from '../api';
import { ScheduleEntry } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface TeacherScheduleProps {}

const timeSlots = [
    "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00",
];
const days: ('Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday')[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const dayTranslations: { [key: string]: string } = {
    Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس',
};
const subjectColors: { [key: string]: string } = {
    'الرياضيات': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    'العلوم': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700',
    'اللغة الإنجليزية': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-700',
    'الدراسات الاجتماعية': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
    'اللغة العربية': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
    'الفيزياء': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    'default': 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-200 dark:border-gray-600',
};


const TeacherSchedule: React.FC<TeacherScheduleProps> = () => {
    const { currentUser: user } = useAppContext();
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.teacherId) { setLoading(false); return; }
        api.getTeacherSchedule(user.teacherId)
            .then(setSchedule)
            .catch(err => console.error("Failed to fetch schedule", err))
            .finally(() => setLoading(false));
    }, [user?.teacherId]);

    const scheduleGrid = useMemo(() => {
        const grid: { [key: string]: { [key: string]: ScheduleEntry } } = {};
        schedule.forEach(entry => {
            if (!grid[entry.timeSlot]) grid[entry.timeSlot] = {};
            grid[entry.timeSlot][entry.day] = entry;
        });
        return grid;
    }, [schedule]);

    if (loading) {
        return <div className="text-center p-8">جاري تحميل الجدول الدراسي...</div>;
    }

    return (
        <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md overflow-x-auto">
            <div className="grid grid-cols-[auto_repeat(5,minmax(120px,1fr))] min-w-[750px]">
                <div className="font-bold text-center p-3 border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">الوقت</div>
                {days.map(day => (<div key={day} className="font-bold text-center p-3 border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{dayTranslations[day]}</div>))}
                {timeSlots.map(timeSlot => (
                    <React.Fragment key={timeSlot}>
                        <div className="font-semibold text-center p-3 border-l border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-400 flex items-center justify-center">{timeSlot}</div>
                        {days.map(day => {
                            const entry = scheduleGrid[timeSlot]?.[day];
                            const colorClass = entry ? (subjectColors[entry.subject] || subjectColors.default) : 'bg-white dark:bg-gray-800';
                            return (
                                <div key={`${day}-${timeSlot}`} className={`p-2 border-b border-l border-gray-200 dark:border-gray-600 ${colorClass}`}>
                                    {entry && (<div className="text-center"><p className="font-bold text-sm">{entry.subject}</p><p className="text-xs">{entry.classId}</p></div>)}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default TeacherSchedule;
