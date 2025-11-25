

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Student, StudentStatus, NewStudentData } from '../types';
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
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();
  const location = useLocation();

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
  }, [schoolId, addToast]);
  
  const handleAddStudent = async (studentData: NewStudentData) => {
    try {
        const newStudent = await api.addSchoolStudent(schoolId, studentData);
        setStudents(prevStudents => [newStudent, ...prevStudents]);
        setIsModalOpen(false);
        addToast(`تم إضافة الطالب "${newStudent.name}" بنجاح.`, 'success');

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

  const filteredStudents = students
    .filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(student => statusFilter === 'all' || student.status === statusFilter)
    .filter(student => !gradeFilter || student.grade.toLowerCase().includes(gradeFilter.toLowerCase()));

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
            <PlusIcon className="h-5 w-5 ml-2" />
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
                  <tr key={student.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{student.name}</td>
                    <td className="px-6 py-4">{student.grade}</td>
                    <td className="px-6 py-4">{student.parentName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[student.status]}`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{student.registrationDate}</td>
                    <td className="px-6 py-4 space-x-2 rtl:space-x-reverse whitespace-nowrap">
                      <Link 
                        to={`${location.pathname}/${student.id}`}
                        className="font-medium text-teal-600 dark:text-teal-500 hover:underline">
                        عرض التفاصيل
                      </Link>
                    </td>
                  </tr>
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
        />
      )}
    </>
  );
};

export default StudentsList;
