

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Teacher, TeacherStatus, NewTeacherData } from '../types';
import * as api from '../api';
import TeacherFormModal from '../components/TeacherFormModal';
import { PlusIcon, UsersIcon } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';

const statusColorMap: { [key in TeacherStatus]: string } = {
  [TeacherStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [TeacherStatus.OnLeave]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

interface TeachersListProps {
  schoolId: number;
}

const TeachersList: React.FC<TeachersListProps> = ({ schoolId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();
  const location = useLocation();

  useEffect(() => {
    setLoading(true);
    api.getSchoolTeachers(schoolId).then(data => {
      setTeachers(data);
    }).catch(err => {
      console.error("Failed to fetch teachers:", err);
      addToast("فشل تحميل قائمة المعلمين.", 'error');
    }).finally(() => {
        setLoading(false);
    });
  }, [schoolId, addToast]);

  const handleAddTeacher = async (teacherData: NewTeacherData) => {
    try {
        const newTeacher = await api.addSchoolTeacher(schoolId, teacherData);
        setTeachers(prevTeachers => [newTeacher, ...prevTeachers]);
        setIsModalOpen(false);
        addToast(`تم إضافة المعلم "${newTeacher.name}" بنجاح.`, 'success');
    } catch (error: any) {
        const msg = String(error?.message || '');
        if (msg.includes('LIMIT_EXCEEDED') || msg.includes('تم بلوغ حد الموارد')) {
          addToast('تم بلوغ حد المعلمين. يرجى الترقية أو زيادة الحد.', 'warning');
          try { window.location.assign('/superadmin/subscriptions'); } catch {}
          return;
        }
        console.error("Failed to add teacher:", error);
        addToast("فشل إضافة المعلم. الرجاء المحاولة مرة أخرى.", 'error');
    }
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث عن معلم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-80 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 ml-2" />
            إضافة معلم جديد
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton />
          ) : filteredTeachers.length === 0 ? (
            <EmptyState
                icon={UsersIcon}
                title="لا يوجد معلمون"
                message={searchTerm ? `لم يتم العثور على معلمين يطابقون بحثك "${searchTerm}".` : "ابدأ بإضافة المعلمين إلى مدرستك."}
                actionText="إضافة معلم جديد"
                onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3">اسم المعلم</th>
                  <th scope="col" className="px-6 py-3">المادة</th>
                  <th scope="col" className="px-6 py-3">رقم الاتصال</th>
                  <th scope="col" className="px-6 py-3">الحالة</th>
                  <th scope="col" className="px-6 py-3">تاريخ الانضمام</th>
                  <th scope="col" className="px-6 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{teacher.name}</td>
                    <td className="px-6 py-4">{teacher.subject}</td>
                    <td className="px-6 py-4" dir="ltr">{teacher.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[teacher.status]}`}>
                        {teacher.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{teacher.joinDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <Link to={`${location.pathname}/${teacher.id}`} className="font-medium text-teal-600 dark:text-teal-500 hover:underline">
                          عرض التفاصيل
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {isModalOpen && (
        <TeacherFormModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddTeacher}
        />
      )}
    </>
  );
};

export default TeachersList;
