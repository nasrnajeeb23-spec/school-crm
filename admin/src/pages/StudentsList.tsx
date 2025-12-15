
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Student, StudentStatus, NewStudentData, Class } from '../types';
import * as api from '../api';
import StudentFormModal from '../components/StudentFormModal';
import { PlusIcon, UsersIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { useSortableTable } from '../hooks/useSortableTable';
import Pagination from '../components/Pagination';
import ResponsiveTable from '../components/ResponsiveTable';
import SearchBar from '../components/SearchBar';


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
  const [showManualShare, setShowManualShare] = useState(false);
  const [manualLink, setManualLink] = useState('');
  const [sharing, setSharing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);


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



      try {
        const parent = await api.upsertSchoolParent(schoolId, {
          name: studentData.parentName,
          email: studentData.parentEmail,
          phone: studentData.parentPhone,
          studentId: newStudent.id,
        });
        try {
          const res = await api.inviteParent(parent.id, 'manual');
          if (res.activationLink) { setManualLink(res.activationLink); setShowManualShare(true); }
          addToast(`تم ربط ولي الأمر "${parent.name}". تم إنشاء رابط التفعيل للمشاركة اليدوية.`, 'success');
        } catch (inviteErr) {
          console.warn('Parent invite failed:', inviteErr);
          addToast('تم ربط ولي الأمر، تعذر تجهيز رابط التفعيل الآن.', 'warning');
        }
      } catch (parentErr) {
        console.warn('Parent upsert failed:', parentErr);
        addToast('تم إضافة الطالب، تعذر ربط ولي الأمر تلقائياً.', 'warning');
      }
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (msg.includes('LIMIT_EXCEEDED') || msg.includes('تم بلوغ حد الموارد')) {
        addToast('تم بلوغ حد الطلاب. يرجى الترقية أو زيادة الحد.', 'warning');
        try { window.location.assign('/superadmin/subscriptions'); } catch { }
        return;
      }
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

  // Add sorting functionality
  const { sortedData: sortedStudents, handleSort, getSortIcon } = useSortableTable(filteredStudents, 'name');

  // Pagination logic
  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = sortedStudents.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const renderRow = (student: Student) => (
    <>
      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{student.name}</td>
      <td className="px-6 py-4">{getDisplayGrade(student)}</td>
      <td className="px-6 py-4">{student.parentName}</td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[student.status]}`}>
          {student.status}
        </span>
      </td>
      <td className="px-6 py-4">{student.registrationDate}</td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <Link
            to={`${location.pathname}/${student.id}`}
            className="font-medium text-teal-600 dark:text-teal-500 hover:underline"
          >
            عرض التفاصيل
          </Link>
          <button
            onClick={() => {
              setGenForStudentId(student.id);
              setGenDueDate('');
              setGenIncludeBooks(true);
              setGenIncludeUniform(true);
              setGenIncludeActivities(true);
              setGenDiscounts([]);
            }}
            className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline"
          >
            توليد فاتورة
          </button>
        </div>
      </td>
    </>
  );

  const renderCard = (student: Student) => (
    <div key={student.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{student.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{getDisplayGrade(student)}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[student.status]}`}>
          {student.status}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">ولي الأمر:</span>
          <span className="text-gray-900 dark:text-white">{student.parentName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">تاريخ التسجيل:</span>
          <span className="text-gray-900 dark:text-white">{student.registrationDate}</span>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Link
          to={`${location.pathname}/${student.id}`}
          className="flex-1 text-center px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
          عرض التفاصيل
        </Link>
        <button
          onClick={() => {
            setGenForStudentId(student.id);
            setGenDueDate('');
            setGenIncludeBooks(true);
            setGenIncludeUniform(true);
            setGenIncludeActivities(true);
            setGenDiscounts([]);
          }}
          className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          توليد فاتورة
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-4 flex-1">
            <SearchBar
              onSearch={setSearchTerm}
              placeholder="ابحث عن طالب..."
              className="w-full md:w-64"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full md:w-40 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="all">كل الحالات</option>
              <option value={StudentStatus.Active}>نشط</option>
              <option value={StudentStatus.Suspended}>موقوف</option>
            </select>
            <input
              type="text"
              placeholder="فلترة حسب الصف"
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value)}
              className="w-full md:w-48 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
            <PlusIcon className="h-5 w-5 ml-2 rtl:mr-2 rtl:ml-0" />
            إضافة طالب جديد
          </button>
        </div>

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
          <>
            <ResponsiveTable
              headers={['اسم الطالب', 'الصف', 'اسم ولي الأمر', 'الحالة', 'تاريخ التسجيل', 'إجراءات']}
              data={paginatedStudents}
              renderRow={renderRow}
              renderCard={renderCard}
              keyExtractor={(s) => String(s.id)}
            />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              totalItems={sortedStudents.length}
            />
          </>
        )}
      </div>
      {isModalOpen && (
        <StudentFormModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddStudent}
          schoolId={schoolId}
        />
      )}
      {showManualShare && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md w-[90%] max-w-lg text-right">
            <h3 className="text-lg font-semibold mb-3">رابط التفعيل للمشاركة اليدوية</h3>
            <a href={manualLink} target="_blank" rel="noopener noreferrer" dir="ltr" className="break-all p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 underline">{manualLink}</a>
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => { try { navigator.clipboard.writeText(manualLink); addToast('تم نسخ الرابط.', 'success'); } catch { addToast('تعذر نسخ الرابط. انسخه يدويًا.', 'error'); } }}
                className="px-3 py-2 bg-teal-600 text-white rounded-md"
              >نسخ الرابط</button>
              <button
                onClick={async () => {
                  try {
                    setSharing(true);
                    const anyNav = navigator as any;
                    if (anyNav.share) {
                      await anyNav.share({ title: 'تفعيل الحساب', text: 'رابط تفعيل الحساب', url: manualLink });
                      addToast('تمت المشاركة بنجاح.', 'success');
                    } else {
                      await navigator.clipboard.writeText(manualLink);
                      addToast('تم نسخ الرابط. يمكنك مشاركته يدويًا.', 'info');
                    }
                  } catch {
                    try { await navigator.clipboard.writeText(manualLink); addToast('تعذرت المشاركة. تم نسخ الرابط.', 'warning'); } catch { addToast('تعذر نسخ الرابط. انسخه يدويًا.', 'error'); }
                  } finally {
                    setSharing(false);
                  }
                }}
                disabled={sharing}
                aria-disabled={sharing}
                className={`px-3 py-2 ${sharing ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md`}
              >{sharing ? 'جارٍ المشاركة...' : 'مشاركة'}</button>
              <button onClick={() => setShowManualShare(false)} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentsList;
