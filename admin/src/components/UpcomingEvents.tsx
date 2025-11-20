import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { SchoolEvent, SchoolEventType } from '../types';
import { EventIcon } from './icons';

interface UpcomingEventsProps {
    navigateTo: (view: string) => void;
    schoolId: number;
}

const eventTypeColors: { [key in SchoolEventType]: string } = {
    [SchoolEventType.Meeting]: 'bg-blue-500',
    [SchoolEventType.Activity]: 'bg-green-500',
    [SchoolEventType.Exam]: 'bg-red-500',
    [SchoolEventType.Holiday]: 'bg-purple-500',
};

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ navigateTo, schoolId }) => {
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    
    useEffect(() => {
        // FIX: Corrected function call to getSchoolEvents and passed the school id.
        api.getSchoolEvents(schoolId).then(allEvents => {
            const upcoming = allEvents
                .filter(event => new Date(event.date) >= new Date())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 4);
            setEvents(upcoming);
        });
    }, [schoolId]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h3 className="flex items-center text-xl font-semibold text-gray-800 dark:text-white">
                    <EventIcon className="h-6 w-6 ml-2 text-teal-500" />
                    الأحداث القادمة
                </h3>
                <button onClick={() => navigateTo('calendar')} className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
                    عرض التقويم
                </button>
            </div>
            <div className="space-y-4">
                {events.length > 0 ? events.map((event: SchoolEvent) => (
                    <div key={event.id} className="flex items-center">
                        <div className="flex flex-col items-center justify-center h-12 w-12 bg-teal-100 dark:bg-teal-900/50 rounded-lg text-teal-600 dark:text-teal-300">
                            <span className="text-xs font-bold">{new Date(event.date).toLocaleString('ar-EG', { month: 'short' })}</span>
                            <span className="text-lg font-extrabold">{new Date(event.date).getDate()}</span>
                        </div>
                        <div className="mr-4 flex-grow">
                            <p className="font-semibold text-gray-800 dark:text-white">{event.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{event.time}</p>
                        </div>
                         <div className={`flex-shrink-0 w-3 h-3 rounded-full ${eventTypeColors[event.eventType]}`} title={event.eventType}></div>
                    </div>
                )) : <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">لا توجد أحداث قادمة.</p>}
            </div>
        </div>
    );
};

export default UpcomingEvents;