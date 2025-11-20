import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Teacher, TeacherStatus, Class, UpdatableTeacherData, SchoolSettings } from '../types';
import * as api from '../api';
import { BackIcon, EditIcon, PrintIcon, ClassesIcon } from '../components/icons';
import EditTeacherModal from '../components/EditTeacherModal';
import { useToast } from '../contexts/ToastContext';

const statusColorMap: { [key in TeacherStatus]: string } = {
  [TeacherStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [TeacherStatus.OnLeave]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

interface TeacherProfileProps {
  schoolId: number;
  schoolSettings: SchoolSettings | null;
}

const TeacherProfile: React.FC<TeacherProfileProps> = ({ schoolId, schoolSettings }) => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [teacherDetails, setTeacherDetails] = useState<{ classes: Class[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (!teacherId) return;
    setLoading(true);
    Promise.all([
        // In real app, fetch teacher by ID. Here, we find from list.
        api.getSchoolTeachers(schoolId).then(teachers => teachers.find(t => t.id === teacherId)),
        api.getTeacherDetails(teacherId)
    ]).then(([teacherData, detailsData]) => {
      if (teacherData) setTeacher(teacherData);
      setTeacherDetails(detailsData as { classes: Class[] });
    }).catch(err => {
      console.error("Failed to fetch teacher details:", err);
      addToast("فشل تحميل بيانات المعلم.", "error");
    }).finally(() => setLoading(false));
  }, [teacherId, schoolId, addToast]);

  const handleUpdateTeacher = async (data: UpdatableTeacherData) => {
    if (!teacher) return;
    try {
        const updatedTeacher = await api.updateTeacher(teacher.id, data);
        setTeacher(updatedTeacher);
        setIsEditModalOpen(false);
        addToast('تم تحديث بيانات المعلم بنجاح.', 'success');
    } catch (error) {
        addToast("فشل تحديث بيانات المعلم.", 'error');
    }
  };
  
  if (loading) return <div className="text-center p-8">جاري تحميل بيانات المعلم...</div>;
  if (!teacher) return <div className="text-center p-8">لم يتم العثور على المعلم.</div>;

  return (
    <>
      <div className="mt-6 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            <BackIcon className="h-5 w-5 ml-2" />
            <span>العودة إلى قائمة المعلمين</span>
        </button>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
           {schoolSettings && (<div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 mb-6"><img src={schoolSettings.schoolLogoUrl as string} alt="School Logo" className="w-12 h-12 rounded-lg" /><h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">{schoolSettings.schoolName}</h2></div>)}
            <div className="flex flex-col md:flex-row items-center gap-6">
                <img src={`https://picsum.photos/seed/${teacher.id}/100/100`} alt={teacher.name} className="w-24 h-24 rounded-full border-4 border-teal-500" />
                <div className="flex-grow text-center md:text-right">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{teacher.name}</h2>
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>المادة: {teacher.subject}</span><span>|</span><span dir="ltr">الهاتف: {teacher.phone}</span><span>|</span><span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[teacher.status]}`}>{teacher.status}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditModalOpen(true)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" title="تعديل"><EditIcon className="h-5 w-5" /></button>
                    <button onClick={() => window.print()} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" title="طباعة"><PrintIcon className="h-5 w-5" /></button>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-4 flex items-center"><ClassesIcon className="h-6 w-6 ml-2 text-teal-500" />الفصول المسندة</h3>
          {loading ? (<p>جاري تحميل الفصول...</p>) : teacherDetails && teacherDetails.classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacherDetails.classes.map(cls => (
                <div key={cls.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="font-bold text-gray-800 dark:text-white">{cls.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{cls.gradeLevel}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{cls.studentCount} طالب</p>
                </div>
              ))}
            </div>
          ) : (<p className="text-center text-gray-500 dark:text-gray-400 py-4">لم يتم إسناد أي فصول لهذا المعلم بعد.</p>)}
        </div>
      </div>
      {isEditModalOpen && (<EditTeacherModal teacher={teacher} onClose={() => setIsEditModalOpen(false)} onSave={handleUpdateTeacher}/>)}
    </>
  );
};

export default TeacherProfile;