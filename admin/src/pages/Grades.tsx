import React, { useState, useMemo, useEffect } from 'react';
import { Class, StudentGrades, Grade } from '../types';
import * as api from '../api';
import { useToast } from '../contexts/ToastContext';

// FIX: Added interface for component props to accept schoolId.
interface GradesProps {
    schoolId: number;
}

const Grades: React.FC<GradesProps> = ({ schoolId }) => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [gradesData, setGradesData] = useState<StudentGrades[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        // FIX: Corrected function call from getClasses to getSchoolClasses and passed the schoolId.
        api.getSchoolClasses(schoolId).then(data => {
            setClasses(data);
            if (data.length > 0) {
                const initialClass = data[0];
                setSelectedClass(initialClass.id);
                setSelectedSubject(initialClass.subjects[0] || '');
            } else {
                setLoading(false);
            }
        });
    }, [schoolId]);

    useEffect(() => {
        if (!selectedClass || !selectedSubject) {
            setGradesData([]);
            if (!selectedClass) setLoading(false);
            return;
        }
        
        setLoading(true);
        Promise.all([
            api.getClassStudents(selectedClass),
            api.getGrades(selectedClass, selectedSubject)
        ]).then(([classStudents, subjectGrades]) => {
            const gradesMap = new Map(subjectGrades.map(g => [g.studentId, g.grades]));
            
            const fullGradesData = classStudents.map(student => ({
                classId: selectedClass,
                subject: selectedSubject,
                studentId: student.id,
                studentName: student.name,
                grades: gradesMap.get(student.id) || { homework: 0, quiz: 0, midterm: 0, final: 0 }
            }));

            setGradesData(fullGradesData);
        }).catch(err => {
            console.error("Failed to load grades data", err);
            addToast('فشل تحميل بيانات الدرجات.', 'error');
        }).finally(() => {
            setLoading(false);
        });
    }, [selectedClass, selectedSubject]);

    const handleGradeChange = (studentId: string, gradeType: keyof Grade, value: string) => {
        const numericValue = Math.max(0, parseInt(value, 10) || 0);
        setGradesData(prevData =>
            prevData.map(studentGrade =>
                studentGrade.studentId === studentId
                    ? { ...studentGrade, grades: { ...studentGrade.grades, [gradeType]: numericValue } }
                    : studentGrade
            )
        );
    };

    const handleSaveGrades = async () => {
        setIsSaving(true);
        try {
            await api.saveGrades(gradesData);
            addToast('تم حفظ الدرجات بنجاح!', 'success');
        } catch (error) {
            console.error("Failed to save grades:", error);
            addToast('حدث خطأ أثناء حفظ الدرجات.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const calculateTotal = (grades: Grade) => grades.homework + grades.quiz + grades.midterm + grades.final;
    
    const getFinalGrade = (total: number) => {
        if (total >= 95) return 'A+'; if (total >= 90) return 'A'; if (total >= 85) return 'B+';
        if (total >= 80) return 'B'; if (total >= 75) return 'C+'; if (total >= 70) return 'C';
        if (total >= 65) return 'D+'; if (total >= 60) return 'D'; return 'F';
    };

    const currentSubjects = classes.find(c => c.id === selectedClass)?.subjects || [];

    return (
        <div className="mt-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اختر الفصل</label>
                        <select id="class-select" value={selectedClass}
                            onChange={(e) => {
                                const newClassId = e.target.value;
                                setSelectedClass(newClassId);
                                const newClassSubjects = classes.find(c => c.id === newClassId)?.subjects || [];
                                setSelectedSubject(newClassSubjects[0] || '');
                            }}
                            className="w-full md:w-64 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
                            {classes.map(c => <option key={c.id} value={c.id}>{`${c.gradeLevel} (${c.section || 'أ'})`}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="subject-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اختر المادة</label>
                        <select id="subject-select" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full md:w-64 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
                            {currentSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                    إدخال درجات - {(() => { const cls = classes.find(c => c.id === selectedClass); return cls ? `${cls.gradeLevel} (${cls.section || 'أ'})` : '...'; })()} - {selectedSubject}
                </h3>
                {loading ? (
                    <div className="text-center py-8">جاري تحميل الدرجات...</div>
                ) : gradesData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        {classes.length === 0 ? 'الرجاء إضافة فصول دراسية أولاً.' : 'لا يوجد طلاب في هذا الفصل.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-4 py-3">اسم الطالب</th>
                                    <th scope="col" className="px-4 py-3 text-center">الواجبات (10)</th>
                                    <th scope="col" className="px-4 py-3 text-center">اختبار قصير (15)</th>
                                    <th scope="col" className="px-4 py-3 text-center">منتصف الفصل (25)</th>
                                    <th scope="col" className="px-4 py-3 text-center">النهائي (50)</th>
                                    <th scope="col" className="px-4 py-3 text-center">المجموع (100)</th>
                                    <th scope="col" className="px-4 py-3 text-center">التقدير</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gradesData.map((item) => {
                                    const total = calculateTotal(item.grades);
                                    const finalGrade = getFinalGrade(total);
                                    return (
                                        <tr key={item.studentId} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white">{item.studentName}</td>
                                            <td className="px-2 py-1"><input type="number" value={item.grades.homework} onChange={e => handleGradeChange(item.studentId, 'homework', e.target.value)} className="w-20 text-center bg-gray-100 dark:bg-gray-700 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500"/></td>
                                            <td className="px-2 py-1"><input type="number" value={item.grades.quiz} onChange={e => handleGradeChange(item.studentId, 'quiz', e.target.value)} className="w-20 text-center bg-gray-100 dark:bg-gray-700 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500"/></td>
                                            <td className="px-2 py-1"><input type="number" value={item.grades.midterm} onChange={e => handleGradeChange(item.studentId, 'midterm', e.target.value)} className="w-20 text-center bg-gray-100 dark:bg-gray-700 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500"/></td>
                                            <td className="px-2 py-1"><input type="number" value={item.grades.final} onChange={e => handleGradeChange(item.studentId, 'final', e.target.value)} className="w-20 text-center bg-gray-100 dark:bg-gray-700 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500"/></td>
                                            <td className="px-4 py-2 text-center font-bold text-gray-800 dark:text-white">{total}</td>
                                            <td className="px-4 py-2 text-center font-bold text-teal-600 dark:text-teal-400">{finalGrade}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                 <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSaveGrades}
                        disabled={isSaving || loading || gradesData.length === 0}
                        className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? 'جاري الحفظ...' : 'حفظ الدرجات'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Grades;
