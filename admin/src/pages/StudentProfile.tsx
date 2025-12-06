
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Student, StudentStatus, InvoiceStatus, Grade, Invoice, StudentNote, StudentGrades, AttendanceStatus, AttendanceRecord, StudentDocument, UpdatableStudentData, SchoolSettings, Class, BehaviorRecord } from '../types';
import * as api from '../api';
import { BackIcon, EditIcon, PrintIcon, NoteIcon, UsersIcon, AttendanceIcon, FinanceIcon, GradesIcon, TrashIcon, PlusIcon, FileIcon, DownloadIcon, UploadIcon, SparklesIcon, CopyIcon, CheckIcon, StarIcon, AlertTriangleIcon } from '../components/icons';
import { GoogleGenAI } from "@google/genai";
import EditStudentModal from '../components/EditStudentModal';
import { useToast } from '../contexts/ToastContext';
import SkeletonLoader from '../components/SkeletonLoader';

// ... (rest of the helper components and constants remain the same)
const statusColorMap: { [key in StudentStatus]: string } = {
  [StudentStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [StudentStatus.Suspended]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};
const invoiceStatusColorMap: { [key in InvoiceStatus]: string } = {
  [InvoiceStatus.Paid]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [InvoiceStatus.Unpaid]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [InvoiceStatus.Overdue]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};
const attendanceStatusClasses: { [key in AttendanceStatus]: string } = {
    [AttendanceStatus.Present]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    [AttendanceStatus.Absent]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    [AttendanceStatus.Late]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [AttendanceStatus.Excused]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};
const calculateTotal = (grades: Grade) => grades.homework + grades.quiz + grades.midterm + grades.final;
const getFinalGrade = (total: number) => {
    if (total >= 95) return 'A+'; if (total >= 90) return 'A'; if (total >= 85) return 'B+';
    if (total >= 80) return 'B'; if (total >= 75) return 'C+'; if (total >= 70) return 'C';
    if (total >= 65) return 'D+'; if (total >= 60) return 'D'; return 'F';
};
const AttendancePieChart: React.FC<{ data: AttendanceRecord[] }> = ({ data }) => {
    const chartData = useMemo(() => {
        const counts = data.reduce((acc, record) => { acc[record.status] = (acc[record.status] || 0) + 1; return acc; }, {} as { [key in AttendanceStatus]?: number });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [data]);
    const COLORS: { [key: string]: string } = { 'حاضر': '#10b981', 'غائب': '#ef4444', 'متأخر': '#f59e0b', 'بعذر': '#3b82f6' };
    if (chartData.length === 0) return <div className="flex items-center justify-center h-full"><p>لا توجد بيانات حضور</p></div>;
    return (<ResponsiveContainer width="100%" height={150}><PieChart><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5}>{chartData.map((entry) => (<Cell key={`cell-${entry.name}`} fill={COLORS[entry.name] || '#ccc'} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>);
};
const GradesBarChart: React.FC<{ data: StudentGrades[] }> = ({ data }) => {
     const chartData = useMemo(() => { return data.map(g => ({ name: g.subject, score: calculateTotal(g.grades) })); }, [data]);
    if (chartData.length === 0) return <div className="flex items-center justify-center h-full"><p>لا توجد بيانات درجات</p></div>;
    return (<ResponsiveContainer width="100%" height={150}><BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}><XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 12 }} /><YAxis type="category" dataKey="name" width={80} tick={{ fill: '#9ca3af', fontSize: 12 }} /><Tooltip /><Bar dataKey="score" name="الدرجة" fill="#2dd4bf" barSize={15} /></BarChart></ResponsiveContainer>);
};

interface StudentProfileProps {
  schoolId: number;
  schoolSettings: SchoolSettings | null;
}

const StudentProfile: React.FC<StudentProfileProps> = ({ schoolId, schoolSettings }) => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [studentData, setStudentData] = useState<{ grades: StudentGrades[], invoices: Invoice[], notes: StudentNote[], attendance: AttendanceRecord[], documents: StudentDocument[] } | null>(null);
  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBehaviorModalOpen, setIsBehaviorModalOpen] = useState(false);
  const [newBehavior, setNewBehavior] = useState<Partial<BehaviorRecord>>({ type: 'Negative', severity: 'Low', date: new Date().toISOString().split('T')[0] });
  const { addToast } = useToast();
  const [aiComment, setAiComment] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState('');
  const [copied, setCopied] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);

  useEffect(() => {
    if (!studentId) return;
    
    setLoading(true);
    Promise.all([
        // In a real app, you would fetch the specific student by ID.
        // For this mock, we find them in the full list.
        api.getSchoolStudents(schoolId).then(students => students.find(s => s.id === studentId)),
        api.getStudentDetails(schoolId, studentId),
        api.getBehaviorRecords(schoolId, studentId)
    ]).then(([studentDetails, data, behavior]) => {
        if (studentDetails) setStudent(studentDetails);
        setStudentData(data);
        setBehaviorRecords(behavior);
    }).catch(err => {
        console.error("Failed to fetch student details:", err);
        addToast("فشل تحميل بيانات الطالب.", 'error');
    }).finally(() => setLoading(false));
  }, [studentId, schoolId, addToast]);

  useEffect(() => {
    api.getSchoolClasses(schoolId).then(setClasses).catch(() => setClasses([]));
  }, [schoolId]);
  
  const handleUpdateStudent = async (data: UpdatableStudentData) => {
    if (!student) return;
    try {
        const updatedStudent = await api.updateStudent(student.id, data);
        setStudent(updatedStudent);
        setIsEditModalOpen(false);
        addToast('تم تحديث بيانات الطالب بنجاح.', 'success');
    } catch (error) {
        addToast("فشل تحديث بيانات الطالب.", 'error');
    }
  };

  const handleAddBehavior = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !newBehavior.title) return;
    try {
      const added = await api.addBehaviorRecord(schoolId, student.id, newBehavior);
      setBehaviorRecords(prev => [added, ...prev]);
      setIsBehaviorModalOpen(false);
      setNewBehavior({ type: 'Negative', severity: 'Low', date: new Date().toISOString().split('T')[0], title: '', description: '', actionTaken: '' });
      addToast('تم إضافة السجل السلوكي بنجاح.', 'success');
    } catch (error) {
      addToast('فشل إضافة السجل السلوكي.', 'error');
    }
  };

  const handleDeleteBehavior = async (recordId: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    try {
      await api.deleteBehaviorRecord(schoolId, recordId);
      setBehaviorRecords(prev => prev.filter(r => r.id !== recordId));
      addToast('تم حذف السجل السلوكي.', 'success');
    } catch (error) {
      addToast('فشل حذف السجل السلوكي.', 'error');
    }
  };

  const generateAiReport = async () => {
    if (!studentData?.grades || studentData.grades.length === 0) {
      setAiError('لا توجد درجات متاحة لإنشاء تعليق.');
      return;
    }
    setLoadingAI(true);
    setAiComment('');
    setAiError('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const gradesText = studentData.grades.map(g => `${g.subject}: ${calculateTotal(g.grades)}`).join('\n');
      const prompt = `أنت معلم خبير في كتابة تقارير الطلاب. بناءً على الدرجات التالية للطالب '${student?.name}', اكتب تعليقًا موجزًا (حوالي 3-4 جمل) لبطاقة تقريره. يجب أن يكون التعليق بنّاءً ومشجعًا، مع الإشارة إلى نقاط القوة ومجالات التحسين. الدرجات من 100.\n\nالدرجات:\n${gradesText}`;
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      setAiComment(response.text);
    } catch (error) {
      setAiError('عذرًا، حدث خطأ أثناء إنشاء التعليق. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleCopy = () => {
    if (aiComment) {
        navigator.clipboard.writeText(aiComment);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: UsersIcon }, { id: 'grades', label: 'الدرجات', icon: GradesIcon },
    { id: 'attendance', label: 'الحضور', icon: AttendanceIcon }, { id: 'finance', label: 'المالية', icon: FinanceIcon },
    { id: 'behavior', label: 'السلوك', icon: StarIcon },
    { id: 'notes', label: 'ملاحظات', icon: NoteIcon }, { id: 'documents', label: 'مستندات', icon: FileIcon }
  ];
  
  // Skeleton Loader
  if (loading) {
    return (
        <div className="mt-6 space-y-6 animate-pulse">
            <SkeletonLoader className="h-8 w-48" />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <SkeletonLoader className="w-24 h-24 rounded-full" />
                    <div className="flex-grow space-y-3">
                        <SkeletonLoader className="h-8 w-3/4" />
                        <SkeletonLoader className="h-5 w-full" />
                    </div>
                </div>
            </div>
             <SkeletonLoader className="h-12 w-full rounded-lg" />
             <SkeletonLoader className="h-64 w-full rounded-lg" />
        </div>
    );
  }

  if (!student || !studentData) return <div className="text-center p-8">لم يتم العثور على الطالب.</div>;

  return (
    <>
      <div className="mt-6 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            <BackIcon className="h-5 w-5 ml-2" />
            <span>العودة إلى قائمة الطلاب</span>
        </button>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            {schoolSettings && (
                <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 mb-6">
                    {schoolSettings.schoolLogoUrl && (
                        <img 
                            src={schoolSettings.schoolLogoUrl as string} 
                            alt="School Logo" 
                            className="w-12 h-12 rounded-lg" 
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    )}
                    <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">{schoolSettings.schoolName}</h2>
                </div>
            )}
            <div className="flex flex-col md:flex-row items-center gap-6">
                <img src={student.profileImageUrl} alt={student.name} className="w-24 h-24 rounded-full border-4 border-teal-500" />
                <div className="flex-grow text-center md:text-right">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{student.name}</h2>
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{(() => { const cls = classes.find(c => String(c.id) === String(student.classId)); return cls ? `${cls.gradeLevel} (${cls.section || 'أ'})` : student.grade; })()}</span><span>|</span><span>ولي الأمر: {student.parentName}</span><span>|</span><span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[student.status]}`}>{student.status}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditModalOpen(true)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" title="تعديل"><EditIcon className="h-5 w-5" /></button>
                    <button onClick={() => window.print()} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" title="طباعة"><PrintIcon className="h-5 w-5" /></button>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-md"><nav className="flex gap-1" aria-label="Tabs">{tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><tab.icon className="h-5 w-5 ml-2 rtl:mr-2 rtl:ml-0" /><span>{tab.label}</span></button>))}</nav></div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md"><h4 className="font-semibold mb-2 text-center text-gray-700 dark:text-gray-200">ملخص الحضور</h4><AttendancePieChart data={studentData.attendance} /></div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md"><h4 className="font-semibold mb-2 text-center text-gray-700 dark:text-gray-200">ملخص الدرجات</h4><GradesBarChart data={studentData.grades} /></div>
            </div>
        )}

        {activeTab === 'grades' && (<div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"><div className="overflow-x-auto"><table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th className="px-4 py-3">المادة</th><th className="px-4 py-3 text-center">الواجبات (10)</th><th className="px-4 py-3 text-center">اختبار قصير (15)</th><th className="px-4 py-3 text-center">منتصف الفصل (25)</th><th className="px-4 py-3 text-center">النهائي (50)</th><th className="px-4 py-3 text-center">المجموع (100)</th><th className="px-4 py-3 text-center">التقدير</th></tr></thead>
            <tbody>{studentData.grades.map((grade) => { const total = calculateTotal(grade.grades); const final = getFinalGrade(total); return (<tr key={grade.subject} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700"><td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{grade.subject}</td><td className="px-4 py-3 text-center">{grade.grades.homework}</td><td className="px-4 py-3 text-center">{grade.grades.quiz}</td><td className="px-4 py-3 text-center">{grade.grades.midterm}</td><td className="px-4 py-3 text-center">{grade.grades.final}</td><td className="px-4 py-3 text-center font-bold">{total}</td><td className="px-4 py-3 text-center font-bold text-teal-600 dark:text-teal-400">{final}</td></tr>);})}</tbody>
        </table></div></div>)}
        
        {activeTab === 'attendance' && (<div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"><ul className="space-y-2">{studentData.attendance.map((rec, i) => <li key={i} className={`flex justify-between items-center p-3 rounded-lg ${attendanceStatusClasses[rec.status]}`}><span className="font-semibold">{rec.date}</span><span className="font-bold">{rec.status}</span></li>)}</ul></div>)}

        {activeTab === 'finance' && (<div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"><ul className="space-y-2">{studentData.invoices.map(inv => <li key={inv.id} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"><div><p className="font-semibold">فاتورة #{inv.id}</p><p className="text-xs text-gray-500 dark:text-gray-400">تستحق في: {inv.dueDate}</p></div><div className="text-left"><p className="font-bold text-lg">${inv.totalAmount.toFixed(2)}</p><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${invoiceStatusColorMap[inv.status]}`}>{inv.status}</span></div></li>)}</ul></div>)}

        {activeTab === 'behavior' && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-lg text-gray-800 dark:text-white">سجل السلوك</h4>
                        <button 
                            onClick={() => setIsBehaviorModalOpen(true)}
                            className="flex items-center px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700"
                        >
                            <PlusIcon className="h-4 w-4 ml-1"/>
                            إضافة سجل
                        </button>
                    </div>
                    
                    {behaviorRecords.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">لا توجد سجلات سلوكية مسجلة.</div>
                    ) : (
                        <ul className="space-y-3">
                            {behaviorRecords.map(record => (
                                <li key={record.id} className={`p-4 rounded-lg border-r-4 shadow-sm ${record.type === 'Positive' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h5 className="font-bold text-gray-800 dark:text-gray-200">{record.title}</h5>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${record.type === 'Positive' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                                    {record.type === 'Positive' ? 'إيجابي' : 'سلبي'}
                                                </span>
                                                {record.severity !== 'Low' && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                                                        {record.severity === 'Medium' ? 'متوسط' : record.severity === 'High' ? 'مرتفع' : 'حرج'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{record.description}</p>
                                            {record.actionTaken && (
                                                <div className="text-xs text-gray-500 bg-white dark:bg-gray-800 p-2 rounded mt-2">
                                                    <span className="font-semibold">الإجراء المتخذ:</span> {record.actionTaken}
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-400 mt-2">
                                                سجل بواسطة {record.recordedBy || 'المعلم'} في {record.date}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteBehavior(record.id)}
                                            className="p-1.5 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'notes' && (<div className="space-y-6"><div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"><h4 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">كتابة تعليق لبطاقة التقرير (AI)</h4><div><button onClick={generateAiReport} disabled={loadingAI} className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400"><SparklesIcon className="h-5 w-5 ml-2"/>{loadingAI ? 'جاري الإنشاء...' : 'إنشاء تعليق تلقائي'}</button>{(aiComment || aiError || loadingAI) && (<div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">{loadingAI && <p>...الذكاء الاصطناعي يكتب الآن</p>}{aiError && <p className="text-red-500">{aiError}</p>}{aiComment && (<div><textarea readOnly value={aiComment} className="w-full h-28 bg-transparent border-none resize-none p-0 focus:ring-0"></textarea><div className="text-left"><button onClick={handleCopy} className="text-sm font-medium text-teal-600 hover:underline flex items-center">{copied ? <CheckIcon className="w-4 h-4 ml-1 text-green-500" /> : <CopyIcon className="w-4 h-4 ml-1" />} {copied ? 'تم النسخ!' : 'نسخ النص'}</button></div></div>)}</div>)}</div></div><div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"><div className="flex justify-between items-center mb-4"><h4 className="font-semibold text-lg text-gray-800 dark:text-white">ملاحظات المعلمين</h4><button className="flex items-center px-3 py-1.5 bg-teal-100 text-teal-700 text-sm rounded-lg hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-300"><PlusIcon className="h-4 w-4 ml-1"/>إضافة ملاحظة</button></div><ul className="space-y-3">{studentData.notes.map(note => <li key={note.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-left">{note.author} - {note.date}</p></li>)}</ul></div></div>)}
        
        {activeTab === 'documents' && (<div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"><div className="flex justify-between items-center mb-4"><h4 className="font-semibold text-lg text-gray-800 dark:text-white">مستندات الطالب</h4><button className="flex items-center px-3 py-1.5 bg-teal-100 text-teal-700 text-sm rounded-lg hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-300"><UploadIcon className="h-4 w-4 ml-1"/>رفع مستند</button></div><ul className="space-y-2">{studentData.documents.map(doc => <li key={doc.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"><div className="flex items-center"><FileIcon className="w-6 h-6 text-gray-400 ml-3"/><p className="font-medium text-gray-800 dark:text-white">{doc.fileName}</p><p className="text-xs text-gray-500 dark:text-gray-400 mr-3">({doc.fileSize})</p></div><div className="flex items-center gap-3"><button className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><DownloadIcon className="w-5 h-5 text-gray-500 dark:text-gray-400"/></button><button className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"><TrashIcon className="w-5 h-5 text-red-500"/></button></div></li>)}</ul></div>)}

      </div>

      {isEditModalOpen && (
        <EditStudentModal 
            student={student}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleUpdateStudent}
        />
      )}

      {isBehaviorModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={() => setIsBehaviorModalOpen(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4 modal-content-scale-up" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">إضافة سجل سلوكي</h2>
                <form onSubmit={handleAddBehavior} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عنوان السجل</label>
                        <input 
                            type="text" 
                            required
                            value={newBehavior.title}
                            onChange={e => setNewBehavior({...newBehavior, title: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النوع</label>
                            <select 
                                value={newBehavior.type}
                                onChange={e => setNewBehavior({...newBehavior, type: e.target.value as any})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="Negative">سلبي</option>
                                <option value="Positive">إيجابي</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الشدة</label>
                            <select 
                                value={newBehavior.severity}
                                onChange={e => setNewBehavior({...newBehavior, severity: e.target.value as any})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="Low">منخفض</option>
                                <option value="Medium">متوسط</option>
                                <option value="High">مرتفع</option>
                                <option value="Critical">حرج</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التاريخ</label>
                        <input 
                            type="date" 
                            required
                            value={newBehavior.date}
                            onChange={e => setNewBehavior({...newBehavior, date: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label>
                        <textarea 
                            rows={3}
                            value={newBehavior.description}
                            onChange={e => setNewBehavior({...newBehavior, description: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                        ></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الإجراء المتخذ (اختياري)</label>
                        <input 
                            type="text" 
                            value={newBehavior.actionTaken}
                            onChange={e => setNewBehavior({...newBehavior, actionTaken: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                            placeholder="مثال: تنبيه شفهي، استدعاء ولي أمر..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => setIsBehaviorModalOpen(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                            إلغاء
                        </button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                        >
                            حفظ السجل
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </>
  );
};

export default StudentProfile;
