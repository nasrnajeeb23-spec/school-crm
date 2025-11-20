import React, { useState, useMemo, useEffect } from 'react';
import { Class, ScheduleEntry } from '../types';
import * as api from '../api';

const timeSlots = [
    "08:00 - 09:00",
    "09:00 - 10:00",
    "10:00 - 11:00",
    "11:00 - 12:00",
    "12:00 - 13:00",
];

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const dayTranslations: { [key: string]: string } = {
    Sunday: 'الأحد',
    Monday: 'الاثنين',
    Tuesday: 'الثلاثاء',
    Wednesday: 'الأربعاء',
    Thursday: 'الخميس',
};

const subjectColors: { [key: string]: string } = {
    'الرياضيات': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    'العلوم': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-700',
    'اللغة الإنجليزية': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-700',
    'الدراسات الاجتماعية': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
    'اللغة العربية': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
    'التربية الفنية': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    'default': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
};

// FIX: Added interface for component props to accept schoolId.
interface ScheduleProps {
    schoolId: number;
}

const Schedule: React.FC<ScheduleProps> = ({ schoolId }) => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // FIX: Corrected function call from getClasses to getSchoolClasses and passed the schoolId.
        api.getSchoolClasses(schoolId).then(data => {
            setClasses(data);
            if (data.length > 0) {
                setSelectedClass(data[0].id);
            }
        });
    }, [schoolId]);

    useEffect(() => {
        if (!selectedClass) return;
        setLoading(true);
        api.getSchedule(selectedClass).then(data => {
            setSchedule(data);
            setLoading(false);
        });
    }, [selectedClass]);

    const scheduleData = useMemo(() => {
        const grid: { [key: string]: { [key: string]: ScheduleEntry } } = {};
        schedule.forEach(entry => {
            if (!grid[entry.timeSlot]) grid[entry.timeSlot] = {};
            grid[entry.timeSlot][entry.day] = entry;
        });
        return grid;
    }, [schedule]);

    return (
        <div className="mt-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            عرض جدول الفصل
                        </label>
                        <select
                            id="class-select"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full md:w-80 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md overflow-x-auto">
                {loading ? <div className="text-center py-8">جاري تحميل الجدول...</div> : (
                    <div className="grid grid-cols-6 min-w-[900px]">
                        <div className="font-bold text-center p-3 border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">الوقت</div>
                        {days.map(day => (
                            <div key={day} className="font-bold text-center p-3 border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                                {dayTranslations[day]}
                            </div>
                        ))}

                        {timeSlots.map(timeSlot => (
                            <React.Fragment key={timeSlot}>
                                <div className="font-semibold text-center p-3 border-l border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-400 flex items-center justify-center">
                                    {timeSlot}
                                </div>
                                {days.map(day => {
                                    const entry = scheduleData[timeSlot]?.[day];
                                    const colorClass = entry ? (subjectColors[entry.subject] || subjectColors.default) : '';
                                    return (
                                        <div key={`${timeSlot}-${day}`} className={`p-2 border-b border-l border-gray-200 dark:border-gray-600 ${entry ? colorClass : ''}`}>
                                            {entry && (
                                                <div className="text-center">
                                                    <p className="font-bold text-sm">{entry.subject}</p>
                                                    <p className="text-xs">{entry.teacherName}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Schedule;