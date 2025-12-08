import React, { useEffect, useState } from 'react';
import * as api from '../api';
import { Plan, Subscription } from '../types';
import { UsersIcon, StudentsIcon, BillingIcon } from './icons';

interface ResourceUsageWidgetProps {
    schoolId: number;
}

const ResourceUsageWidget: React.FC<ResourceUsageWidgetProps> = ({ schoolId }) => {
    const [usage, setUsage] = useState({
        students: { current: 0, max: 0, percent: 0 },
        teachers: { current: 0, max: 0, percent: 0 },
        invoices: { current: 0, max: 0, percent: 0 }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsage = async () => {
            try {
                // Fetch subscription details (now includes usage and limits)
                const state = await api.getSubscriptionState(schoolId);

                const limits = state.limits || state.plan?.limits || { students: 50, teachers: 5, invoices: 100 };
                const usageData: any = state.usage || { students: 0, teachers: 0, invoices: 0 };

                // If usage data is missing in state (legacy), fetch it manually
                if (!state.usage) {
                     const [s, t, i] = await Promise.all([
                        api.getSchoolStudentsCount(schoolId),
                        api.getSchoolTeachersCount(schoolId),
                        api.getSchoolInvoicesCount(schoolId)
                     ]);
                     usageData.students = s;
                     usageData.teachers = t;
                     usageData.invoices = i;
                }
                
                const maxStudents = limits.students === 'unlimited' ? 999999 : Number(limits.students);
                const maxTeachers = limits.teachers === 'unlimited' ? 999999 : Number(limits.teachers);
                const maxInvoices = limits.invoices === 'unlimited' ? 999999 : Number(limits.invoices || 100);

                setUsage({
                    students: {
                        current: usageData.students,
                        max: maxStudents,
                        percent: Math.min(100, Math.round((usageData.students / maxStudents) * 100))
                    },
                    teachers: {
                        current: usageData.teachers,
                        max: maxTeachers,
                        percent: Math.min(100, Math.round((usageData.teachers / maxTeachers) * 100))
                    },
                    invoices: {
                        current: usageData.invoices || 0,
                        max: maxInvoices,
                        percent: Math.min(100, Math.round(((usageData.invoices || 0) / maxInvoices) * 100))
                    }
                });
            } catch (e) {
                console.error("Failed to load usage stats", e);
            } finally {
                setLoading(false);
            }
        };
        fetchUsage();
    }, [schoolId]);

    if (loading) return null;

    const getProgressColor = (percent: number) => {
        if (percent >= 90) return 'bg-red-500';
        if (percent >= 75) return 'bg-amber-500';
        return 'bg-teal-500';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">استهلاك الموارد</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Students Usage */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                                <StudentsIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الطلاب</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {usage.students.current} / {usage.students.max === 999999 ? 'غير محدود' : usage.students.max}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(usage.students.percent)}`} 
                            style={{ width: `${usage.students.percent}%` }}
                        ></div>
                    </div>
                    {usage.students.percent >= 90 && (
                        <p className="text-xs text-red-500 mt-1">⚠️ اقتربت من الحد الأقصى، يرجى الترقية.</p>
                    )}
                </div>

                {/* Teachers Usage */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                                <UsersIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">المعلمون</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {usage.teachers.current} / {usage.teachers.max === 999999 ? 'غير محدود' : usage.teachers.max}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(usage.teachers.percent)}`} 
                            style={{ width: `${usage.teachers.percent}%` }}
                        ></div>
                    </div>
                    {usage.teachers.percent >= 90 && (
                        <p className="text-xs text-red-500 mt-1">⚠️ اقتربت من الحد الأقصى، يرجى الترقية.</p>
                    )}
                </div>

                {/* Invoices Usage */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-lg">
                                <BillingIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الفواتير</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {usage.invoices.current} / {usage.invoices.max === 999999 ? 'غير محدود' : usage.invoices.max}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(usage.invoices.percent)}`} 
                            style={{ width: `${usage.invoices.percent}%` }}
                        ></div>
                    </div>
                    {usage.invoices.percent >= 90 && (
                        <p className="text-xs text-red-500 mt-1">⚠️ اقتربت من الحد الأقصى، يرجى الترقية.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResourceUsageWidget;