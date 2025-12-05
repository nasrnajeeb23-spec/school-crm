import React, { useState, useEffect } from 'react';
import { User, AttendanceStatus } from '../types';
import * as api from '../api';
import { CheckIcon, CanceledIcon, UsersIcon, PastDueIcon, CalendarIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import StatsCard from '../components/StatsCard';

const statusStyles: { [key in AttendanceStatus]: { bg: string; text: string; } } = {
    [AttendanceStatus.Present]: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
    [AttendanceStatus.Absent]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
    [AttendanceStatus.Late]: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300' },
    [AttendanceStatus.Excused]: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
};

interface StaffAttendanceProps {
    schoolId: number;
}

const StaffAttendance: React.FC<StaffAttendanceProps> = ({ schoolId }) => {
    const [staff, setStaff] = useState<User[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [attendanceMap, setAttendanceMap] = useState<{ [key: string]: AttendanceStatus }>({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        fetchData();
    }, [schoolId, selectedDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [staffData, attendanceData] = await Promise.all([
                api.getSchoolStaff(schoolId),
                api.getStaffAttendance(schoolId, selectedDate)
            ]);
            
            setStaff(staffData);
            
            const map: { [key: string]: AttendanceStatus } = {};
            if (attendanceData && Array.isArray(attendanceData)) {
                attendanceData.forEach((record: any) => {
                    map[record.userId] = record.status as AttendanceStatus;
                });
            }
            setAttendanceMap(map);
        } catch (error) {
            console.error("Failed to load staff attendance:", error);
            addToast('فشل تحميل بيانات الحضور.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (userId: string, status: AttendanceStatus) => {
        setAttendanceMap(prev => ({ ...prev, [userId]: status }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const records = Object.entries(attendanceMap).map(([userId, status]) => ({
                userId: parseInt(userId),
                status
            }));
            
            await api.saveStaffAttendance(schoolId, selectedDate, records);
            addToast('تم حفظ حضور الموظفين بنجاح!', 'success');
        } catch (error) {
            console.error("Failed to save attendance:", error);
            addToast('فشل حفظ سجل الحضور.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const summary = React.useMemo(() => {
        const stats = {
            [AttendanceStatus.Present]: 0,
            [AttendanceStatus.Absent]: 0,
            [AttendanceStatus.Late]: 0,
            [AttendanceStatus.Excused]: 0,
        };
        
        Object.values(attendanceMap).forEach(status => {
            if (stats[status] !== undefined) stats[status]++;
        });
        
        return stats;
    }, [attendanceMap]);

    return (
        <div className="space-y-6 mt-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-teal-600" />
                        سجل حضور الموظفين
                    </h2>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ:</label>
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)} 
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard icon={CheckIcon} title="حاضر" value={summary[AttendanceStatus.Present].toString()} description="الموظفين الحاضرين" />
                <StatsCard icon={CanceledIcon} title="غائب" value={summary[AttendanceStatus.Absent].toString()} description="الموظفين الغائبين" />
                <StatsCard icon={PastDueIcon} title="متأخر" value={summary[AttendanceStatus.Late].toString()} description="الموظفين المتأخرين" />
                <StatsCard icon={UsersIcon} title="إذن / عذر" value={summary[AttendanceStatus.Excused].toString()} description="الموظفين المعذورين" />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md overflow-hidden">
                {loading ? (
                    <div className="text-center py-8">جاري التحميل...</div>
                ) : staff.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">لا يوجد موظفين مسجلين.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm uppercase">
                                <tr>
                                    <th className="px-6 py-3 rounded-tr-lg">الموظف</th>
                                    <th className="px-6 py-3">القسم</th>
                                    <th className="px-6 py-3">الدور</th>
                                    <th className="px-6 py-3">الحالة</th>
                                    <th className="px-6 py-3 rounded-tl-lg text-center">تسجيل الحضور</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {staff.map(member => {
                                    const currentStatus = attendanceMap[member.id] || AttendanceStatus.Present;
                                    return (
                                        <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">{member.name}</td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{member.department || '-'}</td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{member.schoolRole || member.role}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyles[currentStatus].bg} ${statusStyles[currentStatus].text}`}>
                                                    {currentStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {(Object.values(AttendanceStatus) as AttendanceStatus[]).map(status => (
                                                        <button
                                                            key={status}
                                                            onClick={() => handleStatusChange(member.id, status)}
                                                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                                                                (attendanceMap[member.id] === status) || (!attendanceMap[member.id] && status === AttendanceStatus.Present)
                                                                    ? `${statusStyles[status].bg} ${statusStyles[status].text} ring-2 ring-offset-1 ring-teal-500`
                                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                            }`}
                                                        >
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                
                <div className="mt-6 flex justify-end border-t border-gray-200 dark:border-gray-700 pt-4">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || loading}
                        className="px-8 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium shadow-sm transition-all"
                    >
                        {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StaffAttendance;
