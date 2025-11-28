import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { Class, Assignment, Submission, NewAssignmentData, SubmissionStatus } from '../types';
import { PlusIcon, BackIcon, UsersIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import CreateAssignmentModal from '../components/CreateAssignmentModal';
import GradeSubmissionModal from '../components/GradeSubmissionModal';
import { useAppContext } from '../contexts/AppContext';

const statusColorMap: { [key in SubmissionStatus]: string } = {
  [SubmissionStatus.Submitted]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [SubmissionStatus.Late]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [SubmissionStatus.Graded]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [SubmissionStatus.NotSubmitted]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const TeacherAssignments: React.FC = () => {
    const { currentUser: user } = useAppContext();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [submissionToGrade, setSubmissionToGrade] = useState<Submission | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        if (!user?.teacherId) return;
        api.getTeacherClasses(user.teacherId).then(data => {
            setClasses(data);
            if (data.length > 0) setSelectedClassId(data[0].id);
            else setLoading(false);
        });
    }, [user?.teacherId]);

    useEffect(() => {
        if (!selectedClassId) return;
        setLoading(true);
        api.getAssignmentsForClass(selectedClassId).then(setAssignments).finally(() => setLoading(false));
    }, [selectedClassId]);

    useEffect(() => {
        if (!selectedAssignment) return;
        setLoading(true);
        api.getSubmissionsForAssignment(selectedAssignment.id).then(setSubmissions).finally(() => setLoading(false));
    }, [selectedAssignment]);

    const handleCreateAssignment = async (data: NewAssignmentData) => {
        try {
            const newAssignment = await api.createAssignment(data);
            if (newAssignment.classId === selectedClassId) setAssignments(prev => [newAssignment, ...prev]);
            addToast('تم إنشاء الواجب بنجاح!', 'success');
            setIsCreateModalOpen(false);
        } catch (error) { addToast('فشل إنشاء الواجب.', 'error'); }
    };
    
    const handleGradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
        try {
            const updatedSubmission = await api.gradeSubmission(submissionId, grade, feedback);
            setSubmissions(prev => prev.map(s => s.id === updatedSubmission.id ? updatedSubmission : s));
            addToast('تم رصد الدرجة بنجاح.', 'success');
            setSubmissionToGrade(null);
        } catch (error) { addToast('فشل رصد الدرجة.', 'error'); }
    };

    if (!selectedAssignment) {
        return (
            <>
                <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4"><label htmlFor="class-filter" className="text-sm font-medium">عرض واجبات فصل:</label><select id="class-filter" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="pr-8 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">{classes.map(c => <option key={c.id} value={c.id}>{`${c.gradeLevel} (${c.section || 'أ'})`}</option>)}</select></div>
                         <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"><PlusIcon className="h-5 w-5 ml-2" />واجب جديد</button>
                    </div>
                    {loading ? <p>جاري تحميل الواجبات...</p> : (
                        <div className="space-y-3">
                        {assignments.length > 0 ? assignments.map(asg => (<button key={asg.id} onClick={() => setSelectedAssignment(asg)} className="block w-full text-left p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><div className="flex justify-between items-center"><div><p className="font-bold text-lg text-teal-700 dark:text-teal-400">{asg.title}</p><p className="text-sm text-gray-500 dark:text-gray-400">{asg.className}</p></div><div className="text-left"><p className="text-sm font-semibold">تاريخ التسليم: {asg.dueDate}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{asg.submissionCount} تسليم</p></div></div></button>)) : <p className="text-center py-8 text-gray-500 dark:text-gray-400">لا توجد واجبات لهذا الفصل.</p>}
                        </div>
                    )}
                </div>
                {isCreateModalOpen && <CreateAssignmentModal classes={classes} onClose={() => setIsCreateModalOpen(false)} onSave={handleCreateAssignment} />}
            </>
        );
    }

    return (
        <>
            <div className="mt-6 space-y-6">
                 <button onClick={() => setSelectedAssignment(null)} className="flex items-center text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-semibold"><BackIcon className="h-5 w-5 ml-2" /><span>العودة لقائمة الواجبات</span></button>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"><h2 className="text-2xl font-bold text-gray-800 dark:text-white">{selectedAssignment.title}</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedAssignment.className} | تاريخ التسليم: {selectedAssignment.dueDate}</p><p className="mt-4 text-gray-700 dark:text-gray-300">{selectedAssignment.description}</p></div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                     <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center"><UsersIcon className="h-6 w-6 ml-2 text-teal-500" />تسليمات الطلاب</h3>
                    <div className="overflow-x-auto">
                        {loading ? <p>جاري تحميل التسليمات...</p> : (
                            <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th className="px-6 py-3">اسم الطالب</th><th className="px-6 py-3">تاريخ التسليم</th><th className="px-6 py-3">الحالة</th><th className="px-6 py-3">الدرجة</th><th className="px-6 py-3">إجراء</th></tr></thead>
                                <tbody>
                                {submissions.map(sub => (<tr key={sub.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700"><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{sub.studentName}</td><td className="px-6 py-4">{sub.submissionDate || '-'}</td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[sub.status]}`}>{sub.status}</span></td><td className="px-6 py-4 font-semibold">{sub.grade !== undefined ? `${sub.grade} / 10` : '-'}</td><td className="px-6 py-4">{sub.status !== SubmissionStatus.NotSubmitted && (<button onClick={() => setSubmissionToGrade(sub)} className="font-medium text-teal-600 dark:text-teal-500 hover:underline">{sub.status === SubmissionStatus.Graded ? 'تعديل الدرجة' : 'تقييم'}</button>)}</td></tr>))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
            {submissionToGrade && <GradeSubmissionModal submission={submissionToGrade} onClose={() => setSubmissionToGrade(null)} onSave={handleGradeSubmission} />}
        </>
    );
};

export default TeacherAssignments;
