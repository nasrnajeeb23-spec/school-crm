import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { SchoolEvent, SchoolEventType } from '../types';
import { EventIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';

const eventTypeColors: { [key in SchoolEventType]: { bg: string, text: string } } = {
    [SchoolEventType.Meeting]: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-600 dark:text-blue-300' },
    [SchoolEventType.Activity]: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-600 dark:text-green-300' },
    [SchoolEventType.Exam]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-600 dark:text-red-300' },
    [SchoolEventType.Holiday]: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-600 dark:text-purple-300' },
};

interface CalendarProps {
    schoolId: number;
}

const Calendar: React.FC<CalendarProps> = ({ schoolId }) => {
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();
    
    useEffect(() => {
        setLoading(true);
        api.getSchoolEvents(schoolId).then(data => {
            const sortedEvents = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setEvents(sortedEvents);
        }).catch(err => {
            console.error("Failed to load events:", err);
            addToast("فشل تحميل أحداث التقويم.", 'error');
        }).finally(() => {
            setLoading(false);
        });
    }, [schoolId, addToast]);
    
    return (
        <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
                    <EventIcon className="h-6 w-6 ml-2 text-teal-500" />
                    التقويم والأحداث المدرسية
                </h2>
                <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                    إضافة حدث جديد
                </button>
            </div>
            {loading ? (
                <div className="text-center py-8">جاري تحميل الأحداث...</div>
            ) : events.length === 0 ? (
                 <div className="text-center py-8 text-gray-500 dark:text-gray-400">لا توجد أحداث مجدولة.</div>
            ) : (
                <div className="space-y-4">
                    {events.map(event => (
                        <div key={event.id} className={`p-4 rounded-lg flex items-start gap-4 ${eventTypeColors[event.eventType].bg}`}>
                             <div className="flex flex-col items-center justify-center h-14 w-14 bg-white/50 dark:bg-black/20 rounded-lg">
                                <span className="text-xs font-bold">{new Date(event.date).toLocaleString('ar-EG', { month: 'short' })}</span>
                                <span className="text-xl font-extrabold">{new Date(event.date).getDate()}</span>
                            </div>
                            <div className="flex-grow">
                                <p className={`font-bold ${eventTypeColors[event.eventType].text}`}>{event.title}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{event.time}</p>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${eventTypeColors[event.eventType].bg} ${eventTypeColors[event.eventType].text} border border-current`}>
                                {event.eventType}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Calendar;