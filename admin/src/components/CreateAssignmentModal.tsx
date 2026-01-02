import React, { useState } from 'react';
import { NewAssignmentData, Class } from '../types';

interface CreateAssignmentModalProps {
  classes: Class[];
  onClose: () => void;
  onSave: (data: NewAssignmentData) => Promise<void>;
}

const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({ classes, onClose, onSave }) => {
  const [formData, setFormData] = useState<NewAssignmentData>({
    title: '',
    description: '',
    classId: classes.length > 0 ? classes[0].id : '',
    dueDate: new Date().toISOString().split('T')[0],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave({ ...formData, files });
    // Parent handles closing
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">إنشاء واجب جديد</h2>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">عنوان الواجب</label>
            <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className={inputStyle} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="classId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الفصل الدراسي</label>
              <select name="classId" id="classId" value={formData.classId} onChange={handleChange} required className={inputStyle}>
                {classes.map(c => <option key={c.id} value={c.id}>{`${c.gradeLevel} (${c.section || 'أ'})`}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ التسليم</label>
              <input type="date" name="dueDate" id="dueDate" value={formData.dueDate} onChange={handleChange} required className={inputStyle} />
            </div>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الوصف والتعليمات</label>
            <textarea name="description" id="description" value={formData.description} onChange={handleChange} required rows={5} className={`${inputStyle} resize-y`}></textarea>
          </div>
          <div>
            <label htmlFor="attachments" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المرفقات (اختياري)</label>
            <input 
              type="file" 
              id="attachments" 
              name="attachments" 
              multiple 
              accept=".pdf,.docx,.xlsx,image/*,text/plain"
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                setFiles(list);
              }}
              className={inputStyle}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">الأنواع المسموحة: صور، PDF، DOCX، نص. الحد الأقصى لكل ملف 25MB.</p>
          </div>
        </form>
        <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
          <button type="button" onClick={handleSubmit} disabled={isSaving} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">
            {isSaving ? 'جاري النشر...' : 'نشر الواجب'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAssignmentModal;
