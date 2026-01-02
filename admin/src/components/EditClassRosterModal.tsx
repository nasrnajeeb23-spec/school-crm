import React, { useState, useEffect } from 'react';
import { Class, Student, ClassRosterUpdate } from '../types';
import * as api from '../api';

interface EditClassRosterModalProps {
  classInfo: Class;
  schoolId: number;
  onClose: () => void;
  onSave: (update: ClassRosterUpdate) => Promise<void>;
}

const EditClassRosterModal: React.FC<EditClassRosterModalProps> = ({ classInfo, schoolId, onClose, onSave }) => {
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getSchoolStudents(schoolId),
      api.getClassStudents(classInfo.id) // Get current students in the class
    ]).then(([allSchoolStudents, classStudents]) => {
      setAllStudents(allSchoolStudents);
      setSelectedStudentIds(new Set(classStudents.map(s => s.id)));
    }).catch(err => {
      console.error("Failed to load students for roster management", err);
    }).finally(() => {
      setLoading(false);
    });
  }, [schoolId, classInfo.id]);

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave({
      classId: classInfo.id,
      studentIds: Array.from(selectedStudentIds)
    });
    setIsSaving(false);
  };
  
  const filteredStudents = allStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-16 modal-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 flex flex-col max-h-[80vh] modal-content-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">إدارة طلاب الفصل</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">فصل: <span className="font-semibold">{`${classInfo.gradeLevel} (${classInfo.section || 'أ'})`}</span></p>

        <div className="relative mb-4">
            <input
              type="text"
              placeholder="ابحث عن طالب لإضافته..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
             <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
        </div>
        
        <div className="flex-grow overflow-y-auto border-t border-b border-gray-200 dark:border-gray-700 py-2">
          {loading ? <p className="text-center py-8">جاري تحميل الطلاب...</p> : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-2">
                {filteredStudents.map(student => (
                  <label key={student.id} className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.has(student.id)}
                      onChange={() => handleToggleStudent(student.id)}
                      className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="mr-3 text-gray-800 dark:text-gray-200">{student.name}</span>
                    <span className="mr-auto text-sm text-gray-500 dark:text-gray-400">{student.grade}</span>
                  </label>
                ))}
              </div>
            </form>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 mt-4">
           <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedStudentIds.size} طالب محدد
           </p>
           <div className="flex gap-4">
                <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                إلغاء
                </button>
                <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving || loading}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400"
                >
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EditClassRosterModal;
