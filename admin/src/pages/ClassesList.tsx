

import React, { useState, useEffect } from 'react';
import { Class, ClassRosterUpdate, NewClassData } from '../types';
import * as api from '../api';
import { UsersIcon, StudentsIcon, ClassesIcon as BookIcon, PlusIcon, ClassesIcon } from '../components/icons';
import EditClassRosterModal from '../components/EditClassRosterModal';
import AddClassModal from '../components/AddClassModal';
import { useToast } from '../contexts/ToastContext';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';

interface ClassesListProps {
  schoolId: number;
}

const ClassesList: React.FC<ClassesListProps> = ({ schoolId }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchClasses();
  }, [schoolId]);

  const fetchClasses = () => {
    setLoading(true);
    api.getSchoolClasses(schoolId).then(data => {
      setClasses(data);
    }).catch(err => {
        console.error("Failed to fetch classes:", err);
        addToast("فشل تحميل قائمة الفصول.", 'error');
    }).finally(() => {
        setLoading(false);
    });
  };

  const handleUpdateRoster = async (update: ClassRosterUpdate) => {
    try {
        const updatedClass = await api.updateClassRoster(update);
        setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
        setEditingClass(null);
        addToast('تم تحديث قائمة الطلاب بنجاح.', 'success');
    } catch (error) {
        console.error("Failed to update class roster:", error);
        addToast("فشل تحديث قائمة الطلاب.", 'error');
    }
  };

  const handleAddClass = async (data: NewClassData) => {
    try {
        const newClass = await api.addClass(schoolId, data);
        setClasses(prev => [newClass, ...prev]);
        setIsAddModalOpen(false);
        addToast(`تم إضافة فصل "${newClass.name}" بنجاح.`, 'success');
    } catch (error) {
        console.error("Failed to add class:", error);
        addToast("فشل إضافة الفصل.", 'error');
    }
  };

  const ClassSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4 animate-pulse">
        <SkeletonLoader className="h-6 w-3/4" />
        <SkeletonLoader className="h-4 w-1/2" />
        <SkeletonLoader className="h-5 w-full mt-4" />
        <SkeletonLoader className="h-5 w-full" />
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <SkeletonLoader className="h-6 w-20 rounded-full" />
            <SkeletonLoader className="h-6 w-24 rounded-full" />
            <SkeletonLoader className="h-6 w-20 rounded-full" />
        </div>
    </div>
  );


  return (
    <>
      <div className="mt-6 space-y-6">
        <div className="flex justify-end">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 ml-2" />
            إضافة فصل جديد
          </button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <ClassSkeleton />
            <ClassSkeleton />
            <ClassSkeleton />
          </div>
        ) : classes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
                <EmptyState
                    icon={ClassesIcon}
                    title="لا توجد فصول دراسية"
                    message="ابدأ بتنظيم مدرستك عن طريق إضافة الفصول الدراسية."
                    actionText="إضافة فصل جديد"
                    onAction={() => setIsAddModalOpen(true)}
                />
            </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col border border-gray-200 dark:border-gray-700 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-teal-600 dark:text-teal-400">{cls.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{cls.gradeLevel}</p>
                  
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <UsersIcon className="h-5 w-5 ml-2 text-gray-400" />
                      <strong>المعلم المسؤول:</strong>
                      <span className="mr-2">{cls.homeroomTeacherName}</span>
                    </div>
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <StudentsIcon className="h-5 w-5 ml-2 text-gray-400" />
                      <strong>عدد الطلاب:</strong>
                      <span className="mr-2">{cls.studentCount}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold flex items-center text-gray-700 dark:text-gray-300 mb-2">
                        <BookIcon className="h-5 w-5 ml-2 text-gray-400" />
                        المواد الدراسية
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {cls.subjects.map((subject, index) => (
                        <span key={index} className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2 rtl:space-x-reverse">
                  <button onClick={() => setEditingClass(cls)} className="font-medium text-teal-600 dark:text-teal-500 hover:underline text-sm">
                    إدارة الطلاب
                  </button>
                  <button className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline text-sm">
                    تعديل
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editingClass && (
        <EditClassRosterModal
          classInfo={editingClass}
          schoolId={schoolId}
          onClose={() => setEditingClass(null)}
          onSave={handleUpdateRoster}
        />
      )}
      {isAddModalOpen && (
        <AddClassModal 
            schoolId={schoolId}
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleAddClass}
        />
      )}
    </>
  );
};

export default ClassesList;