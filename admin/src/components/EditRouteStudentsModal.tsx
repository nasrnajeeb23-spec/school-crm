import React, { useState, useEffect } from 'react';
import { Route, Student } from '../types';
import * as api from '../api';

interface EditRouteStudentsModalProps {
  route: Route;
  schoolId: number;
  onClose: () => void;
  onSave: (routeId: string, studentIds: string[]) => Promise<void>;
}

const EditRouteStudentsModal: React.FC<EditRouteStudentsModalProps> = ({ route, schoolId, onClose, onSave }) => {
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set(route.studentIds));
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getSchoolStudents(schoolId)
        .then(setAllStudents)
        .catch(err => console.error("Failed to load students", err))
        .finally(() => setLoading(false));
  }, [schoolId]);

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
    await onSave(route.id, Array.from(selectedStudentIds));
    setIsSaving(false);
  };
  
  const filteredStudents = allStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-16" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">إدارة طلاب المسار</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">مسار: <span className="font-semibold">{route.name}</span></p>

        <input
          type="text"
          placeholder="ابحث عن طالب..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full mb-4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        
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
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
                <button type="button" onClick={handleSubmit} disabled={isSaving || loading} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EditRouteStudentsModal;
