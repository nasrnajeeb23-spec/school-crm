import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import * as api from '../api';
import { Student, StudentGrades, SchoolSettings, Teacher } from '../types';
import BrandableCard from '../components/BrandableCard';
import { useAppContext } from '../contexts/AppContext';
import { DownloadIcon } from '../components/icons';
import { formatCurrency } from '../currency-config';

const COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];

interface ReportsProps { schoolSettings: SchoolSettings | null }
const Reports: React.FC<ReportsProps> = ({ schoolSettings }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [grades, setGrades] = useState<StudentGrades[]>([]);
    const [loading, setLoading] = useState(true);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7));
    const [salarySlips, setSalarySlips] = useState<any[]>([]);

    const { currentUser } = useAppContext();
    const schoolId = currentUser?.schoolId || 0;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [studentsData, gradesData, teachersData, slipsData] = await Promise.all([
                api.getStudents(schoolId),
                api.getAllGrades(schoolId),
                api.getSchoolTeachers(schoolId),
                api.getSalarySlipsForSchool(schoolId, month),
            ]);
            setStudents(studentsData);
            setGrades(gradesData);
            setTeachers(teachersData);
            setSalarySlips(slipsData);
            setLoading(false);
        };
        fetchData();
    }, [schoolId, month]);

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

    const teacherPayrollImpact = useMemo(() => {
        const slips = Array.isArray(salarySlips) ? salarySlips.filter(s => s.personType === 'teacher') : [];
        const getName = (id: string) => {
            const t = teachers.find(x => String(x.id) === String(id));
            return t ? t.name : id;
        };
        return slips.map(slip => {
            const absenceDeduction = (Array.isArray(slip.deductions) ? slip.deductions : []).filter((d: any) => String(d.name).includes('غياب')).reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);
            const lateDeduction = (Array.isArray(slip.deductions) ? slip.deductions : []).filter((d: any) => String(d.name).includes('تأخير')).reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);
            const overtimeAllowance = (Array.isArray(slip.allowances) ? slip.allowances : []).filter((a: any) => String(a.name).includes('ساعات إضافية')).reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0);
            return {
                teacherName: getName(String(slip.personId)),
                month: slip.month,
                baseAmount: Number(slip.baseAmount || 0),
                allowancesTotal: Number(slip.allowancesTotal || 0),
                deductionsTotal: Number(slip.deductionsTotal || 0),
                netAmount: Number(slip.netAmount || 0),
                absenceDeduction,
                lateDeduction,
                overtimeAllowance,
            };
        });
    }, [salarySlips, teachers]);

    const exportTeacherPayrollCSV = () => {
        const headers = ['المعلم','الشهر','الأساسي','البدلات','الخصومات','الصافي','خصم الغياب','خصم التأخير','علاوة الإضافي'];
        const rows = teacherPayrollImpact.map(r => [r.teacherName, r.month, r.baseAmount, r.allowancesTotal, r.deductionsTotal, r.netAmount, r.absenceDeduction, r.lateDeduction, r.overtimeAllowance]);
        const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `تقارير-رواتب-المعلمين-${month}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const exportTeacherPayrollPDF = () => {
        const w = window.open('', '_blank');
        if (!w) return;
        const cur = (schoolSettings?.defaultCurrency || 'SAR') as string;
        const logo = schoolSettings?.schoolLogoUrl ? api.getAssetUrl(schoolSettings?.schoolLogoUrl as string) : '';
        const head = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px">
            <div style="text-align:right">
              <div style="font-size:20px;font-weight:bold">${schoolSettings?.schoolName || 'المدرسة'}</div>
              <div style="color:#6b7280;font-size:12px">تقرير الرواتب</div>
            </div>
            ${logo ? `<img src="${logo}" alt="Logo" style="height:60px;width:60px;object-fit:contain" onerror="this.style.display='none'"/>` : ''}
            <div style="text-align:left;font-family:monospace">
              <div style="font-size:12px;color:#6b7280">Month</div>
              <div>${month}</div>
            </div>
          </div>`;
        const rows = teacherPayrollImpact.map(r => `<tr>
          <td>${r.teacherName}</td>
          <td>${r.month}</td>
          <td>${formatCurrency(r.baseAmount, cur)}</td>
          <td>${formatCurrency(r.allowancesTotal, cur)}</td>
          <td>${formatCurrency(r.deductionsTotal, cur)}</td>
          <td>${formatCurrency(r.netAmount, cur)}</td>
          <td>${formatCurrency(r.absenceDeduction, cur)}</td>
          <td>${formatCurrency(r.lateDeduction, cur)}</td>
          <td>${formatCurrency(r.overtimeAllowance, cur)}</td>
        </tr>`).join('');
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>تقارير الرواتب</title>
        <style>
        body{font-family:Tajawal,Arial,sans-serif;padding:20px;direction:rtl}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ddd;padding:8px;text-align:right}
        th{background:#f3f4f6}
        </style></head><body>${head}<table><thead><tr>
        <th>المعلم</th><th>الشهر</th><th>الأساسي</th><th>البدلات</th><th>الخصومات</th><th>الصافي</th><th>خصم الغياب</th><th>خصم التأخير</th><th>علاوة الإضافي</th>
        </tr></thead><tbody>${rows}</tbody></table>
        <div style="margin-top:12px;color:#9ca3af;font-size:10px;text-align:center">تم توليد التقرير إلكترونياً عبر SchoolSaaS CRM</div>
        </body></html>`;
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
    };

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
            <BrandableCard schoolSettings={schoolSettings}>
                <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-lg text-gray-800 dark:text-white">تأثير الحضور على رواتب المعلمين (شهريًا)</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    <button onClick={exportTeacherPayrollPDF} className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"><DownloadIcon className="h-4 w-4 ml-2" />تصدير PDF</button>
                    <button onClick={exportTeacherPayrollCSV} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"><DownloadIcon className="h-4 w-4 ml-2" />تصدير CSV</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th className="px-6 py-3">المعلم</th><th className="px-6 py-3">الشهر</th><th className="px-6 py-3">الأساسي</th><th className="px-6 py-3">البدلات</th><th className="px-6 py-3">الخصومات</th><th className="px-6 py-3">الصافي</th><th className="px-6 py-3">خصم الغياب</th><th className="px-6 py-3">خصم التأخير</th><th className="px-6 py-3">علاوة الإضافي</th></tr></thead>
                        <tbody>
                            {teacherPayrollImpact.map(r => (
                                <tr key={`${r.teacherName}-${r.month}`} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{r.teacherName}</td>
                                    <td className="px-6 py-4">{r.month}</td>
                                    <td className="px-6 py-4">{r.baseAmount.toFixed(2)}</td>
                                    <td className="px-6 py-4">{r.allowancesTotal.toFixed(2)}</td>
                                    <td className="px-6 py-4">{r.deductionsTotal.toFixed(2)}</td>
                                    <td className="px-6 py-4 font-semibold">{r.netAmount.toFixed(2)}</td>
                                    <td className="px-6 py-4">{r.absenceDeduction.toFixed(2)}</td>
                                    <td className="px-6 py-4">{r.lateDeduction.toFixed(2)}</td>
                                    <td className="px-6 py-4">{r.overtimeAllowance.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
