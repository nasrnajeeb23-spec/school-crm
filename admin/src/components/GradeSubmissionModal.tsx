import React, { useState } from 'react';
import { Submission } from '../types';

interface GradeSubmissionModalProps {
  submission: Submission;
  onClose: () => void;
  onSave: (submissionId: string, grade: number, feedback: string) => Promise<void>;
}

const GradeSubmissionModal: React.FC<GradeSubmissionModalProps> = ({ submission, onClose, onSave }) => {
  const [grade, setGrade] = useState<number | ''>(submission.grade ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (grade === '') return;
    setIsSaving(true);
    await onSave(submission.id, grade as number, feedback);
    // Parent will close
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">تقييم تسليم</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">الطالب: <span className="font-semibold">{submission.studentName}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الدرجة (من 10)</label>
            <input
              type="number"
              name="grade"
              id="grade"
              value={grade}
              onChange={e => {
                  const val = parseInt(e.target.value);
                  if (val >= 0 && val <= 10) setGrade(val);
                  else if (e.target.value === '') setGrade('');
              }}
              required
              className={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات (اختياري)</label>
            <textarea
              name="feedback"
              id="feedback"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={4}
              className={`${inputStyle} resize-y`}
            ></textarea>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">إلغاء</button>
            <button type="submit" disabled={isSaving || grade === ''} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">
              {isSaving ? 'جاري الحفظ...' : 'حفظ التقييم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GradeSubmissionModal;
