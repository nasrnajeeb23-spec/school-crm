import React, { useState, useEffect } from 'react';
import { User, Class, Student, StudentStatus } from '../types';
import * as api from '../api';
import { UsersIcon, ClassesIcon as BookIcon } from '../components/icons';
import { useAppContext } from '../contexts/AppContext';

const statusColorMap: { [key in StudentStatus]: string } = {
  [StudentStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [StudentStatus.Suspended]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

const TeacherMyClasses: React.FC = () => {
  const { currentUser: user } = useAppContext();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (!user?.teacherId) return;
    setLoadingClasses(true);
    api.getTeacherClasses(user.teacherId)
      .then(data => {
        setClasses(data);
        if (data.length > 0) setSelectedClass(data[0]);
      })
      .finally(() => setLoadingClasses(false));
  }, [user?.teacherId]);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; };
    setLoadingStudents(true);
    api.getClassStudents(selectedClass.id)
      .then(data => setStudents(data))
      .finally(() => setLoadingStudents(false));
  }, [selectedClass]);

  if (loadingClasses) return <div className="text-center p-8">جاري تحميل الفصول...</div>;
  if (classes.length === 0) return (<div className="mt-6 bg-white dark:bg-gray-800 p-12 rounded-xl shadow-md text-center"><h2 className="text-2xl font-bold text-gray-800 dark:text-white">لا توجد فصول دراسية</h2><p className="mt-2 text-gray-500 dark:text-gray-400">أنت غير مرتبط بأي فصل دراسي حاليًا.</p></div>);

  return (
    <div className="mt-6 flex flex-col lg:flex-row-reverse gap-6 h-[calc(100vh-12rem)]">
      <div className="lg:w-1/3 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 px-2">قائمة الفصول</h3>
        <div className="flex-grow overflow-y-auto">
          {classes.map(cls => (
            <button key={cls.id} onClick={() => setSelectedClass(cls)} className={`w-full text-right p-4 rounded-lg mb-2 transition-colors duration-200 ${selectedClass?.id === cls.id ? 'bg-teal-100 dark:bg-teal-900/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
              <p className={`font-bold ${selectedClass?.id === cls.id ? 'text-teal-700 dark:text-teal-300' : 'text-gray-800 dark:text-white'}`}>{cls.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{cls.gradeLevel}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:w-2/3 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col">
        {selectedClass ? (<>
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{selectedClass.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center"><BookIcon className="w-4 h-4 ml-1" /> {selectedClass.gradeLevel}</span>
                <span className="flex items-center"><UsersIcon className="w-4 h-4 ml-1" /> {selectedClass.studentCount} طالب</span>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">قائمة الطلاب</h3>
              {loadingStudents ? <div className="text-center py-8">جاري تحميل الطلاب...</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th scope="col" className="px-6 py-3">اسم الطالب</th><th scope="col" className="px-6 py-3">ولي الأمر</th><th scope="col" className="px-6 py-3">الحالة</th></tr></thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                          <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{student.name}</td>
                          <td className="px-6 py-4">{student.parentName}</td>
                          <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[student.status]}`}>{student.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>) : (<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400"><p>اختر فصلاً من القائمة لعرض تفاصيله.</p></div>)}
      </div>
    </div>
  );
};

export default TeacherMyClasses;
