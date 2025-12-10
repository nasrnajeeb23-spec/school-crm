import React, { useState, useMemo, useEffect } from 'react';
import { ScheduleEntry, Student, SchoolSettings } from '../types';
import * as api from '../api';
import { useAppContext } from '../contexts/AppContext';

// Re-using the styles from School Admin's schedule
const subjectColors: { [key: string]: string } = {
    'الرياضيات': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    'العلوم': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-700',
    'اللغة الإنجليزية': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-700',
    'الدراسات الاجتماعية': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
    'اللغة العربية': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
    'التربية الفنية': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    'default': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
};

function buildTimeSlots(settings: SchoolSettings | null) {
    const sc = settings?.scheduleConfig || { periodCount: 5, periodDurationMinutes: 60, startTime: settings?.workingHoursStart || '08:00', gapMinutes: 0 };
    const toMin = (hm: string) => { const t = String(hm).split(':'), h = Number(t[0]), m = Number(t[1]); return h*60 + m; };
    const toHM = (min: number) => { const h = Math.floor(min/60), m = min%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; };
    const arr: string[] = [];
    let s = toMin(sc.startTime || '08:00');
    for (let i=0;i<Number(sc.periodCount||5);i++) { const e = s + Number(sc.periodDurationMinutes||60); arr.push(`${toHM(s)} - ${toHM(e)}`); s = e + Number(sc.gapMinutes||0); }
    return arr;
}
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const dayTranslations: { [key: string]: string } = {
    Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس',
};

const ParentSchedule: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [student, setStudent] = useState<Student | null>(null);
    const [children, setChildren] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<SchoolSettings | null>(null);

    useEffect(() => {
        if (!user?.parentId) {
            setLoading(false);
            return;
        }
        api.getStudentAndScheduleByParentId(user.parentId, selectedStudentId || undefined)
            .then(data => {
                if (Array.isArray((data as any).children) && (data as any).children.length) {
                    const arr = ((data as any).children as any[]);
                    setChildren(arr.map(x => x.student));
                    setStudent(arr[0].student);
                    setSchedule(arr[0].schedule || []);
                } else {
                    setStudent((data as any).student);
                    setSchedule(((data as any).schedule) || []);
                }
            })
            .catch(err => console.error("Failed to fetch schedule data", err))
            .finally(() => setLoading(false));
        if (user?.schoolId) { api.getSchoolSettings(user.schoolId).then(setSettings).catch(() => {}); }
    }, [user?.parentId, selectedStudentId]);
    
    const scheduleData = useMemo(() => {
        const grid: { [key: string]: { [key: string]: ScheduleEntry } } = {};
        schedule.forEach(entry => {
            if (!grid[entry.timeSlot]) grid[entry.timeSlot] = {};
            grid[entry.timeSlot][entry.day] = entry;
        });
        return grid;
    }, [schedule]);
    const timeSlots = useMemo(() => buildTimeSlots(settings), [settings]);

    if (loading) {
        return <div className="text-center p-8">جاري تحميل الجدول الدراسي...</div>;
    }

    if (!student || schedule.length === 0) {
        return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md">لا يوجد جدول دراسي متاح حاليًا.</div>;
    }

    const daysList = useMemo(() => {
        const wd = settings?.workingDays && Array.isArray(settings.workingDays) ? settings.workingDays : days;
        return days.filter(d => wd.includes(d));
    }, [settings]);

    return (
        <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md overflow-x-auto">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                الجدول الدراسي للطالب: {student.name}
            </h3>
            {children.length > 1 && (
              <div className="mb-4">
                <label className="block mb-1">اختر ابنًا</label>
                <select className="border rounded p-2" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                  <option value="">الكل</option>
                  {children.map(c => (
                    <option key={String((c as any).id)} value={String((c as any).id)}>{(c as any).name}</option>
                  ))}
                </select>
              </div>
            )}
            {loading ? <div className="text-center py-8">جاري تحميل الجدول...</div> : (
                <div className="grid min-w-[900px]" style={{ gridTemplateColumns: `auto repeat(${daysList.length}, minmax(140px, 1fr))` }}>
                    <div className="font-bold text-center p-3 border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">الوقت</div>
                    {daysList.map(day => (
                        <div key={day} className="font-bold text-center p-3 border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                            {dayTranslations[day]}
                        </div>
                    ))}

                    {timeSlots.map(timeSlot => (
                        <React.Fragment key={timeSlot}>
                            <div className="font-semibold text-center p-3 border-l border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-400 flex items-center justify-center">
                                {timeSlot}
                            </div>
                            {daysList.map(day => {
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
    );
};

export default ParentSchedule;
