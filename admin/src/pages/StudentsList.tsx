

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Student, StudentStatus, NewStudentData, SchoolSettings, Class } from '../types';
import * as api from '../api';
import StudentFormModal from '../components/StudentFormModal';
import { PlusIcon, UsersIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';


const statusColorMap: { [key in StudentStatus]: string } = {
  [StudentStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [StudentStatus.Suspended]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

interface StudentsListProps {
  schoolId: number;
}

const StudentsList: React.FC<StudentsListProps> = ({ schoolId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StudentStatus>('all');
  const [gradeFilter, setGradeFilter] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();
  const location = useLocation();
  const [genForStudentId, setGenForStudentId] = useState<string>('');
  const [genDueDate, setGenDueDate] = useState<string>('');
  const [genIncludeBooks, setGenIncludeBooks] = useState<boolean>(true);
  const [genIncludeUniform, setGenIncludeUniform] = useState<boolean>(true);
  const [genIncludeActivities, setGenIncludeActivities] = useState<boolean>(true);
  const [genDiscounts, setGenDiscounts] = useState<string[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getSchoolStudents(schoolId).then(data => {
      setStudents(data);
    }).catch(err => {
      console.error("Failed to fetch students:", err);
      addToast("فشل تحميل قائمة الطلاب.", 'error');
    }).finally(() => {
        setLoading(false);
    });
    api.getSchoolSettings(schoolId).then(setSchoolSettings).catch(() => setSchoolSettings(null));
    api.getSchoolClasses(schoolId).then(setClasses).catch(() => setClasses([]));
  }, [schoolId, addToast]);
  
  const handleAddStudent = async (studentData: NewStudentData, selectedClassId?: string) => {
    try {
        const newStudent = await api.addSchoolStudent(schoolId, studentData);
        setStudents(prevStudents => [newStudent, ...prevStudents]);
        setIsModalOpen(false);
        addToast(`تم إضافة الطالب "${newStudent.name}" بنجاح.`, 'success');

        if (selectedClassId) {
          try {
            const existing = await api.getClassStudents(selectedClassId);
            const ids = [...existing.map(s => s.id), newStudent.id];
            await api.updateClassRoster({ schoolId, classId: selectedClassId, studentIds: ids });
            addToast('تم إضافة الطالب إلى كشف الفصل المحدد.', 'success');
          } catch (rosterErr) {
            console.warn('Roster update failed:', rosterErr);
            addToast('تم إضافة الطالب، تعذر إضافته إلى كشف الفصل تلقائياً.', 'warning');
          }
        }

        if ((schoolSettings?.admissionForm?.registrationFee || 0) > 0 && (schoolSettings?.admissionForm?.autoGenerateRegistrationInvoice ?? true)) {
          try {
            const baseDateStr = studentData.admissionDate || new Date().toISOString().split('T')[0];
            const base = new Date(baseDateStr);
            const addDays = Number(schoolSettings?.admissionForm?.registrationFeeDueDays ?? 7);
            base.setDate(base.getDate() + addDays);
            const dueStr = base.toISOString().split('T')[0];
            await api.addInvoice(schoolId, { studentId: newStudent.id, dueDate: dueStr, items: [{ description: 'رسوم التسجيل', amount: Number(schoolSettings?.admissionForm?.registrationFee || 0) }] });
            addToast('تم إنشاء فاتورة رسوم التسجيل تلقائياً.', 'info');
          } catch (invErr) {
            console.warn('Registration fee invoice failed:', invErr);
          }
        }

        try {
          const parent = await api.upsertSchoolParent(schoolId, {
            name: studentData.parentName,
            email: studentData.parentEmail,
            phone: studentData.parentPhone,
            studentId: newStudent.id,
          });
          try {
            await api.inviteParent(parent.id);
            addToast(`تم ربط ولي الأمر "${parent.name}" ودعوته عبر البريد.`, 'info');
          } catch (inviteErr) {
            console.warn('Parent invite failed:', inviteErr);
            addToast('تم ربط ولي الأمر، تعذر إرسال الدعوة الآن.', 'warning');
          }
        } catch (parentErr) {
          console.warn('Parent upsert failed:', parentErr);
          addToast('تم إضافة الطالب، تعذر ربط ولي الأمر تلقائياً.', 'warning');
        }
    } catch (error) {
        console.error("Failed to add student:", error);
        addToast("فشل إضافة الطالب. الرجاء المحاولة مرة أخرى.", 'error');
    }
  };

  const getDisplayGrade = (s: Student) => {
    if (s.classId) {
      const cls = classes.find(c => String(c.id) === String(s.classId));
      if (cls) return `${cls.gradeLevel} (${cls.section || 'أ'})`;
    }
    return s.grade;
  };

  const filteredStudents = students
    .filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(student => statusFilter === 'all' || student.status === statusFilter)
    .filter(student => !gradeFilter || getDisplayGrade(student).toLowerCase().includes(gradeFilter.toLowerCase()));

  return (
    <>
      <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <input type="text" placeholder="ابحث عن طالب..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-64 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teال-500" />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
              </div>
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="w-full md:w-40 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teال-500">
              <option value="all">كل الحالات</option>
              <option value={StudentStatus.Active}>نشط</option>
              <option value={StudentStatus.Suspended}>موقوف</option>
            </select>
            <input type="text" placeholder="فلترة حسب الصف" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="w-full md:w-48 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teال-500" />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 ml-2 rtl:mr-2 rtl:ml-0" />
            إضافة طالب جديد
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton />
          ) : filteredStudents.length === 0 ? (
            <EmptyState
                icon={UsersIcon}
                title="لا يوجد طلاب"
                message={searchTerm ? `لم يتم العثور على طلاب يطابقون بحثك "${searchTerm}".` : "ابدأ بإضافة الطلاب إلى مدرستك."}
                actionText="إضافة طالب جديد"
                onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3">اسم الطالب</th>
                  <th scope="col" className="px-6 py-3">الصف</th>
                  <th scope="col" className="px-6 py-3">اسم ولي الأمر</th>
                  <th scope="col" className="px-6 py-3">الحالة</th>
                  <th scope="col" className="px-6 py-3">تاريخ التسجيل</th>
                  <th scope="col" className="px-6 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <>
                  <tr key={student.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{student.name}</td>
                    <td className="px-6 py-4">{getDisplayGrade(student)}</td>
                    <td className="px-6 py-4">{student.parentName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[student.status]}`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{student.registrationDate}</td>
                  <td className="px-6 py-4 gap-2 whitespace-nowrap flex">
                    <Link 
                      to={`${location.pathname}/${student.id}`}
                      className="font-medium text-teal-600 dark:text-teal-500 hover:underline">
                      عرض التفاصيل
                    </Link>
                    <button onClick={() => { setGenForStudentId(student.id); setGenDueDate(''); setGenIncludeBooks(true); setGenIncludeUniform(true); setGenIncludeActivities(true); setGenDiscounts([]); }} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">توليد فاتورة</button>
                  </td>
                </tr>
                {genForStudentId === student.id && (
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                        <input type="date" value={genDueDate} onChange={e => setGenDueDate(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <label className="flex items-center gap-2"><input type="checkbox" checked={genIncludeBooks} onChange={e => setGenIncludeBooks(e.target.checked)} /><span>تشمل الكتب</span></label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={genIncludeUniform} onChange={e => setGenIncludeUniform(e.target.checked)} /><span>يشمل الزي</span></label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={genIncludeActivities} onChange={e => setGenIncludeActivities(e.target.checked)} /><span>تشمل الأنشطة</span></label>
                      </div>
                      <div className="flex items-center gap-4 mb-4">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={genDiscounts.includes('Sibling')} onChange={() => setGenDiscounts(p => p.includes('Sibling') ? p.filter(x=>x!=='Sibling') : [...p, 'Sibling'])} /><span>خصم أخوة</span></label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={genDiscounts.includes('TopAchiever')} onChange={() => setGenDiscounts(p => p.includes('TopAchiever') ? p.filter(x=>x!=='TopAchiever') : [...p, 'TopAchiever'])} /><span>خصم متفوق</span></label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={genDiscounts.includes('Orphan')} onChange={() => setGenDiscounts(p => p.includes('Orphan') ? p.filter(x=>x!=='Orphan') : [...p, 'Orphan'])} /><span>خصم يتيم</span></label>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={async () => { if (!genDueDate) { addToast('حدد تاريخ الاستحقاق.', 'error'); return; } try { await api.generateInvoicesFromFees(schoolId, { studentIds: [genForStudentId], dueDate: genDueDate, include: { books: genIncludeBooks, uniform: genIncludeUniform, activities: genIncludeActivities }, defaultDiscounts: genDiscounts }); addToast('تم توليد الفاتورة.', 'success'); setGenForStudentId(''); } catch { addToast('فشل توليد الفاتورة.', 'error'); } }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">توليد</button>
                        <button onClick={() => setGenForStudentId('')} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white">إلغاء</button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
              ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {isModalOpen && (
        <StudentFormModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddStudent}
          schoolId={schoolId}
        />
      )}
    </>
  );
};

export default StudentsList;
