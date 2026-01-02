import React, { useState, useEffect, useMemo } from 'react';
import { Student, StudentGrades, Grade } from '../types';
import * as api from '../api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useAppContext } from '../contexts/AppContext';

const calculateTotal = (grades: Grade) => grades.homework + grades.quiz + grades.midterm + grades.final;
const getFinalGrade = (total: number) => {
    if (total >= 95) return { grade: 'A+', color: 'text-green-500' }; if (total >= 90) return { grade: 'A', color: 'text-green-500' };
    if (total >= 85) return { grade: 'B+', color: 'text-cyan-500' }; if (total >= 80) return { grade: 'B', color: 'text-cyan-500' };
    if (total >= 75) return { grade: 'C+', color: 'text-blue-500' }; if (total >= 70) return { grade: 'C', color: 'text-blue-500' };
    if (total >= 65) return { grade: 'D+', color: 'text-yellow-500' }; if (total >= 60) return { grade: 'D', color: 'text-yellow-500' };
    return { grade: 'F', color: 'text-red-500' };
};

const ParentGrades: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [grades, setGrades] = useState<StudentGrades[]>([]);
    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.parentId) { setLoading(false); return; }
        api.getParentDashboardData(user.parentId)
            .then(data => { setGrades(data.grades); setStudent(data.student); })
            .finally(() => setLoading(false));
    }, [user?.parentId]);

    const academicSummary = useMemo(() => {
        if (grades.length === 0) return { average: 0, highest: { subject: 'N/A', score: 0 }, lowest: { subject: 'N/A', score: 0 } };
        const scores = grades.map(g => ({ subject: g.subject, score: calculateTotal(g.grades) }));
        const totalSum = scores.reduce((acc, s) => acc + s.score, 0);
        const average = totalSum / scores.length;
        const highest = scores.reduce((max, s) => s.score > max.score ? s : max, scores[0]);
        const lowest = scores.reduce((min, s) => s.score < min.score ? s : min, scores[0]);
        return { average: parseFloat(average.toFixed(2)), highest, lowest };
    }, [grades]);
    
    const chartData = useMemo(() => grades.map(g => ({ name: g.subject, الدرجة: calculateTotal(g.grades) })), [grades]);

    if (loading) return <div className="text-center p-8">جاري تحميل الدرجات...</div>;
    if (!student || grades.length === 0) return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md">لا توجد بيانات درجات متاحة للطالب حاليًا.</div>;

    return (
        <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center"><h4 className="font-semibold text-gray-500 dark:text-gray-400">متوسط الدرجات</h4><p className="text-3xl font-bold text-rose-600 dark:text-rose-400 mt-2">{academicSummary.average}%</p></div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center"><h4 className="font-semibold text-gray-500 dark:text-gray-400">أعلى أداء</h4><p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">{academicSummary.highest.subject}</p><p className="text-lg font-semibold text-green-500">{academicSummary.highest.score}%</p></div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center"><h4 className="font-semibold text-gray-500 dark:text-gray-400">أقل أداء</h4><p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">{academicSummary.lowest.subject}</p><p className="text-lg font-semibold text-red-500">{academicSummary.lowest.score}%</p></div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"><h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">الأداء الأكاديمي حسب المادة</h3><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} /><XAxis dataKey="name" tick={{ fill: '#9ca3af' }} /><YAxis domain={[0, 100]} tick={{ fill: '#9ca3af' }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} /><Legend /><Bar dataKey="الدرجة" fill="#f43f5e" barSize={30} /></BarChart></ResponsiveContainer></div></div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"><h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">تفاصيل الدرجات</h3><div className="overflow-x-auto"><table className="w-full text-sm text-right text-gray-500 dark:text-gray-400"><thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th scope="col" className="px-4 py-3">المادة</th><th scope="col" className="px-4 py-3 text-center">الواجبات (10)</th><th scope="col" className="px-4 py-3 text-center">اختبار قصير (15)</th><th scope="col" className="px-4 py-3 text-center">منتصف الفصل (25)</th><th scope="col" className="px-4 py-3 text-center">النهائي (50)</th><th scope="col" className="px-4 py-3 text-center">المجموع (100)</th><th scope="col" className="px-4 py-3 text-center">التقدير</th></tr></thead>
            <tbody>{grades.map((grade) => { const total = calculateTotal(grade.grades); const final = getFinalGrade(total); return (<tr key={grade.subject} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"><td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white">{grade.subject}</td><td className="px-4 py-3 text-center">{grade.grades.homework}</td><td className="px-4 py-3 text-center">{grade.grades.quiz}</td><td className="px-4 py-3 text-center">{grade.grades.midterm}</td><td className="px-4 py-3 text-center">{grade.grades.final}</td><td className="px-4 py-3 text-center font-bold text-gray-800 dark:text-white">{total}</td><td className={`px-4 py-3 text-center font-bold ${final.color}`}>{final.grade}</td></tr>);})}</tbody></table></div></div>
        </div>
    );
};

export default ParentGrades;
