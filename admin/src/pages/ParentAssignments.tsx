import React, { useEffect, useState } from 'react';
import * as api from '../api';
import { useAppContext } from '../contexts/AppContext';
import { AssignmentIcon } from '../components/icons';

const ParentAssignments: React.FC = () => {
  const { currentUser: user } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Array<{ student: any; assignments: any[] }>>([]);
  const [assignToSubmit, setAssignToSubmit] = useState<{ studentId: string; assignmentId: string; title: string } | null>(null);
  const [submitContent, setSubmitContent] = useState('');
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.parentId) { setLoading(false); return; }
    setLoading(true);
    api.getParentAssignments(String(user.parentId))
      .then((resp: any) => {
        if (resp && Array.isArray(resp.children)) {
          setData(resp.children);
        } else if (resp && resp.student && Array.isArray(resp.assignments)) {
          setData([{ student: resp.student, assignments: resp.assignments }]);
        } else {
          setData([]);
        }
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [user?.parentId]);
  
  if (loading) {
    return <div className="text-center p-8">جاري تحميل الواجبات...</div>;
  }
  
  if (data.length === 0) {
    return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md">لا توجد واجبات لعرضها.</div>;
  }

  return (
    <div className="mt-6 space-y-6">
      {data.map((child, idx) => (
        <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {child.student?.name || 'الطالب'} {child.student?.grade ? `— ${child.student.grade}` : ''}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{child.assignments.length} واجب</span>
          </div>
          {child.assignments.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">لا توجد واجبات لهذا الطالب.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {child.assignments.map((asg: any) => {
                const isDueSoon = asg?.dueDate && new Date(asg.dueDate) > new Date() && ((new Date(asg.dueDate).getTime() - Date.now()) / (1000 * 3600 * 24)) < 3;
                return (
                  <div key={String(asg.id)} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AssignmentIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        <p className="font-bold text-lg text-teal-700 dark:text-teal-400">{asg.title}</p>
                      </div>
                      {asg?.status && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{asg.status}</span>
                      )}
                    </div>
                    {asg?.description && <p className="mt-2 text-gray-700 dark:text-gray-300">{asg.description}</p>}
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      {asg?.dueDate && (
                        <p className={isDueSoon ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}>
                          تاريخ التسليم: {new Date(asg.dueDate).toLocaleDateString('ar-SA')}
                        </p>
                      )}
                      {asg?.teacherName && <p>المعلم: {asg.teacherName}</p>}
                    </div>
                    {Array.isArray(asg.attachments) && asg.attachments.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">مرفقات المعلم</p>
                        <ul className="list-disc pr-6 text-sm">
                          {asg.attachments.map((a: any, i: number) => (
                            <li key={`${asg.id}-${a.filename}-${i}`}>
                              <a
                                href={api.getAssetUrl(a.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal-600 dark:text-teal-400 hover:underline"
                              >
                                {a.originalName || a.filename}
                              </a>
                              {typeof a.size === 'number' ? ` — ${(a.size / (1024 * 1024)).toFixed(2)}MB` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4">
                      <button
                        className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                        onClick={() => setAssignToSubmit({ studentId: String(child.student.id), assignmentId: String(asg.id), title: String(asg.title || 'واجب') })}
                      >
                        رفع الحل
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
      {assignToSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={() => setAssignToSubmit(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">رفع حل: {assignToSubmit.title}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات/نص الحل (اختياري)</label>
                <textarea className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700"
                  rows={4}
                  value={submitContent}
                  onChange={e => setSubmitContent(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المرفقات</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.xlsx,image/*,text/plain"
                  onChange={e => setSubmitFiles(Array.from(e.target.files || []))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">الأنواع المسموحة: صور، PDF، DOCX، نص. الحد الأقصى لكل ملف 25MB.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500" onClick={() => setAssignToSubmit(null)}>إلغاء</button>
              <button
                className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400"
                disabled={submitting}
                onClick={async () => {
                  if (!user?.parentId) return;
                  setSubmitting(true);
                  try {
                    await api.submitParentAssignment(String(user.parentId), assignToSubmit.assignmentId, assignToSubmit.studentId, submitContent, submitFiles);
                    setAssignToSubmit(null);
                    setSubmitContent('');
                    setSubmitFiles([]);
                    // Refresh assignments to reflect status
                    setLoading(true);
                    api.getParentAssignments(String(user.parentId)).then((resp: any) => {
                      if (resp && Array.isArray(resp.children)) setData(resp.children);
                      else if (resp && resp.student && Array.isArray(resp.assignments)) setData([{ student: resp.student, assignments: resp.assignments }]);
                      else setData([]);
                    }).finally(() => setLoading(false));
                  } catch {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? 'جاري الرفع...' : 'إرسال'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentAssignments;
