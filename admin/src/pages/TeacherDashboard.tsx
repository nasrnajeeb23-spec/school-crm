import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { User, Class, ScheduleEntry, ActionItem } from '../types';
import { ClassesIcon, ScheduleIcon, BellIcon, ActionItemIcon } from '../components/icons';
import { useAppContext } from '../contexts/AppContext';

const TeacherDashboard: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [data, setData] = useState<{
        classes: Class[],
        schedule: ScheduleEntry[],
        actionItems: ActionItem[]
    } | null>(null);
    const [loading, setLoading] = useState(true);
    
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
                        <BellIcon className="h-6 w-6 ml-2 text-teal-500" />
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
        </div>
    );
}

export default TeacherDashboard;
