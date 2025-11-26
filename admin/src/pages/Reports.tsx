import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import * as api from '../api';
import { Student, StudentGrades, SchoolSettings } from '../types';
import BrandableCard from '../components/BrandableCard';
import { useAppContext } from '../contexts/AppContext';
import { DownloadIcon } from '../components/icons';

const COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];

interface ReportsProps { schoolSettings: SchoolSettings | null }
const Reports: React.FC<ReportsProps> = ({ schoolSettings }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [grades, setGrades] = useState<StudentGrades[]>([]);
    const [loading, setLoading] = useState(true);

    const { currentUser } = useAppContext();
    const schoolId = currentUser?.schoolId || 0;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [studentsData, gradesData] = await Promise.all([
                api.getStudents(schoolId),
                api.getAllGrades(schoolId),
            ]);
            setStudents(studentsData);
            setGrades(gradesData);
            setLoading(false);
        };
        fetchData();
    }, [schoolId]);

    const studentDistribution = useMemo(() => {
        const counts = students.reduce((acc, student) => {
            acc[student.grade] = (acc[student.grade] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [students]);

    const academicPerformance = useMemo(() => {
        const subjectGrades: { [key: string]: { total: number; count: number } } = {};
        grades.forEach(grade => {
            if (!subjectGrades[grade.subject]) {
                subjectGrades[grade.subject] = { total: 0, count: 0 };
            }
            const totalScore = grade.grades.homework + grade.grades.quiz + grade.grades.midterm + grade.grades.final;
            subjectGrades[grade.subject].total += totalScore;
            subjectGrades[grade.subject].count += 1;
        });
        return Object.entries(subjectGrades).map(([name, data]) => ({
            name,
            average: parseFloat((data.total / data.count).toFixed(2)),
        }));
    }, [grades]);
    
    const attendanceTrend = [
        { day: 'الأحد', حاضر: 25, غائب: 5 },
        { day: 'الاثنين', حاضر: 28, غائب: 2 },
        { day: 'الثلاثاء', حاضر: 27, غائب: 3 },
        { day: 'الأربعاء', حاضر: 29, غائب: 1 },
        { day: 'الخميس', حاضر: 26, غائب: 4 },
    ];

    if (loading) {
        return <div className="text-center p-8">جاري تحميل التقارير...</div>;
    }

    return (
        <div className="mt-6 space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-gray-600 dark:text-gray-400">
                    نظرة عامة على أداء المدرسة وإحصائياتها الرئيسية.
                </p>
                <div className="flex gap-2">
                     <button className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                        <DownloadIcon className="h-4 w-4 ml-2" />
                        تصدير PDF
                    </button>
                     <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                        <DownloadIcon className="h-4 w-4 ml-2" />
                        تصدير Excel
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BrandableCard schoolSettings={schoolSettings} className="h-96">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">توزيع الطلاب حسب الصف</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={studentDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {studentDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </BrandableCard>
                <BrandableCard schoolSettings={schoolSettings} className="h-96">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">متوسط الأداء الأكاديمي حسب المادة</h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={academicPerformance} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                             <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
                             <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#9ca3af' }} />
                             <Tooltip cursor={{ fill: 'rgba(110, 231, 183, 0.1)' }}/>
                             <Legend />
                             <Bar dataKey="average" name="متوسط الدرجة" fill="#14b8a6" barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </BrandableCard>
            </div>
             <BrandableCard schoolSettings={schoolSettings} className="h-96">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">معدلات الحضور الأسبوعية</h3>
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={attendanceTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <XAxis dataKey="day" tick={{ fill: '#9ca3af' }}/>
                            <YAxis tick={{ fill: '#9ca3af' }}/>
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="حاضر" stroke="#10b981" strokeWidth={2} />
                            <Line type="monotone" dataKey="غائب" stroke="#ef4444" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </BrandableCard>
        </div>
    );
};

export default Reports;
