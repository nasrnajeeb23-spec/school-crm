

import React, { useState, useEffect, useMemo } from 'react';
import { Class, ClassRosterUpdate, NewClassData, SchoolSettings } from '../types';
import * as api from '../api';
import { UsersIcon, StudentsIcon, ClassesIcon as BookIcon, PlusIcon, ClassesIcon } from '../components/icons';
import EditClassRosterModal from '../components/EditClassRosterModal';
import AddClassModal from '../components/AddClassModal';
import { useToast } from '../contexts/ToastContext';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import { Teacher } from '../types';

interface ClassesListProps {
  schoolId: number;
  schoolSettings?: SchoolSettings | null;
}

const ClassesList: React.FC<ClassesListProps> = ({ schoolId, schoolSettings }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { addToast } = useToast();
  const [addDefaults, setAddDefaults] = useState<{ stage?: string; grade?: string } | null>(null);
  const [stageFilter, setStageFilter] = useState<string>('');
  const [gradeFilterUI, setGradeFilterUI] = useState<string>('');
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState<number>(30);
  const [editTeacherId, setEditTeacherId] = useState<string>('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [genForClassId, setGenForClassId] = useState<string>('');
  const [genDueDate, setGenDueDate] = useState<string>('');
  const [genIncludeBooks, setGenIncludeBooks] = useState<boolean>(true);
  const [genIncludeUniform, setGenIncludeUniform] = useState<boolean>(true);
  const [genIncludeActivities, setGenIncludeActivities] = useState<boolean>(true);
  const [genDiscounts, setGenDiscounts] = useState<string[]>([]);
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [promotionThreshold, setPromotionThreshold] = useState<number>(50);
  const [rolloverComputing, setRolloverComputing] = useState(false);
  const [rolloverPreview, setRolloverPreview] = useState<any[]>([]);
  const [isInitPreviewOpen, setIsInitPreviewOpen] = useState(false);
  const [initPreview, setInitPreview] = useState<{ missingCount: number; existingCount: number; preview: { gradeLevel: string; section: string; capacity: number }[] } | null>(null);
  const stageGradeMap: Record<string, string[]> = {
    'رياض أطفال': ['رياض أطفال'],
    'ابتدائي': ['الصف الأول','الصف الثاني','الصف الثالث','الصف الرابع','الصف الخامس','الصف السادس'],
    'إعدادي': ['أول إعدادي','ثاني إعدادي','ثالث إعدادي'],
    'ثانوي': ['أول ثانوي','ثاني ثانوي','ثالث ثانوي'],
  };
  const availableStages = useMemo(() => (schoolSettings?.availableStages && schoolSettings.availableStages.length > 0) ? schoolSettings.availableStages : Object.keys(stageGradeMap), [schoolSettings]);
  const gradesForStage = useMemo(() => stageFilter ? (stageGradeMap[stageFilter] || []) : [], [stageFilter]);

  useEffect(() => {
    fetchClasses();
  }, [schoolId]);

  useEffect(() => {
    api.getSchoolTeachers(schoolId).then(setTeachers).catch(()=>{});
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

  const openInitPreview = async () => {
    try {
      const data = await api.getDefaultClassesPreview(schoolId);
      setInitPreview(data);
      setIsInitPreviewOpen(true);
    } catch {
      addToast('فشل تحميل المعاينة.', 'error');
    }
  };
  const confirmInitStructure = async () => {
    try {
      const result = await api.initDefaultClasses(schoolId);
      addToast(`تم إنشاء الهيكل الافتراضي (${result.createdCount}).`, 'success');
      setIsInitPreviewOpen(false);
      setInitPreview(null);
      fetchClasses();
    } catch {
      addToast('فشل إنشاء الهيكل الافتراضي.', 'error');
    }
  };

  const handleUpdateRoster = async (update: ClassRosterUpdate) => {
    try {
        const updatedClass = await api.updateClassRoster({ ...update, schoolId });
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
        addToast(`تم إضافة فصل "${newClass.gradeLevel} (${newClass.section || 'أ'})" بنجاح.`, 'success');
    } catch (error) {
        console.error("Failed to add class:", error);
        addToast("فشل إضافة الفصل.", 'error');
    }
  };

  const beginEditDetails = (cls: Class) => {
    setEditingDetailsId(cls.id);
    setEditName(`${cls.gradeLevel} (${cls.section || 'أ'})`);
    setEditCapacity(typeof cls.capacity === 'number' ? cls.capacity : 30);
    setEditTeacherId('');
  };

  const saveEditDetails = async () => {
    if (!editingDetailsId) return;
    try {
      const updated = await api.updateClassDetails(schoolId, editingDetailsId, { name: editName, capacity: editCapacity, homeroomTeacherId: editTeacherId });
      setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditingDetailsId(null);
      addToast('تم تحديث بيانات الفصل بنجاح.', 'success');
    } catch (e: any) {
      addToast('فشل تحديث بيانات الفصل.', 'error');
    }
  };

  const cancelEditDetails = () => {
    setEditingDetailsId(null);
  };

  const handleDeleteClass = async (cls: Class) => {
    try {
      const resp = await api.deleteClass(schoolId, cls.id);
      if (resp?.deleted) {
        setClasses(prev => prev.filter(c => c.id !== cls.id));
        addToast('تم حذف الفصل بنجاح.', 'success');
      }
    } catch (e: any) {
      const deps = e?.data?.dependencies || {};
      if (e?.status === 409) {
        addToast(`تعذر حذف الفصل لوجود سجلات مرتبطة (حصص: ${deps.schedules||0}، حضور: ${deps.attendance||0}، درجات: ${deps.grades||0}).`, 'warning');
      } else {
        addToast('فشل حذف الفصل.', 'error');
      }
    }
  };

  const inferStageFromGrade = (grade: string): string => {
    if (grade === 'رياض أطفال') return 'رياض أطفال';
    if (['الصف الأول','الصف الثاني','الصف الثالث','الصف الرابع','الصف الخامس','الصف السادس'].includes(grade)) return 'ابتدائي';
    if (['أول إعدادي','ثاني إعدادي','ثالث إعدادي'].includes(grade)) return 'إعدادي';
    if (['أول ثانوي','ثاني ثانوي','ثالث ثانوي'].includes(grade)) return 'ثانوي';
    return '';
  };

  const openAddSectionForGrade = (grade: string) => {
    setAddDefaults({ stage: inferStageFromGrade(grade), grade });
    setIsAddModalOpen(true);
  };

  const classesFiltered = useMemo(() => {
    return classes
      .filter(c => !stageFilter || inferStageFromGrade(c.gradeLevel) === stageFilter)
      .filter(c => !gradeFilterUI || c.gradeLevel === gradeFilterUI);
  }, [classes, stageFilter, gradeFilterUI]);

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

  const gradeSummaries = useMemo(() => {
    const acc: Record<string, { count: number; capacity: number }> = {};
    for (const c of classes) {
      const grade = c.gradeLevel;
      if (stageFilter && inferStageFromGrade(grade) !== stageFilter) continue;
      if (!acc[grade]) acc[grade] = { count: 0, capacity: 0 };
      acc[grade].count += 1;
      acc[grade].capacity += typeof c.capacity === 'number' ? c.capacity : 0;
    }
    return Object.entries(acc).map(([grade, v]) => ({ grade, ...v }));
  }, [classes, stageFilter]);

  const getNextGradeName = (grade: string): string | null => {
    const all = Object.values(stageGradeMap).flat();
    const idx = all.indexOf(grade);
    if (idx === -1) return null;
    const next = all[idx + 1];
    return next || null;
  };

  const ensureTargetClass = async (grade: string): Promise<string | null> => {
    const existing = classes.find(c => c.gradeLevel === grade);
    if (existing) return existing.id;
    const section = 'أ';
    const name = `${grade} (${section})`;
    const homeroomTeacherId = teachers[0]?.id || '';
    try {
      const created = await api.addClass(schoolId, { name, gradeLevel: grade, homeroomTeacherId, capacity: 30, subjects: [], section });
      setClasses(prev => [created, ...prev]);
      return created.id;
    } catch {
      addToast('تعذر إنشاء فصل للصف التالي.', 'error');
      return null;
    }
  };

  const computeRolloverPreview = async () => {
    setRolloverComputing(true);
    try {
      const allGrades = await api.getAllGrades(schoolId);
      const res: any[] = [];
      for (const cls of classesFiltered) {
        const students = await api.getClassStudents(cls.id);
        const promoteIds: string[] = [];
        const repeatIds: string[] = [];
        const graduates: string[] = [];
        const nextGrade = getNextGradeName(cls.gradeLevel);
        for (const s of students) {
          const entries = allGrades.filter(g => g.classId === cls.id && g.studentId === s.id);
          const totals = entries.map(e => (Number(e.grades.homework||0) + Number(e.grades.quiz||0) + Number(e.grades.midterm||0) + Number(e.grades.final||0)));
          const avg = totals.length > 0 ? totals.reduce((a,b)=>a+b,0) / totals.length : 0;
          if (!nextGrade) {
            if (avg >= promotionThreshold) graduates.push(s.id); else repeatIds.push(s.id);
          } else {
            if (avg >= promotionThreshold) promoteIds.push(s.id); else repeatIds.push(s.id);
          }
        }
        let targetClassId: string | null = null;
        if (nextGrade && promoteIds.length > 0) {
          targetClassId = await ensureTargetClass(nextGrade);
        }
        res.push({ classId: cls.id, className: `${cls.gradeLevel} (${cls.section || 'أ'})`, nextGrade: nextGrade || '', promoteCount: promoteIds.length, repeatCount: repeatIds.length, graduateCount: graduates.length, promoteIds, repeatIds, graduates, targetClassId });
      }
      setRolloverPreview(res);
    } catch {
      addToast('فشل حساب المعاينة.', 'error');
      setRolloverPreview([]);
    } finally {
      setRolloverComputing(false);
    }
  };

  const executeRollover = async () => {
    if (!Array.isArray(rolloverPreview) || rolloverPreview.length === 0) return;
    try {
      for (const item of rolloverPreview) {
        const currentRoster = await api.getClassStudents(item.classId);
        const currentIds = currentRoster.map((s: any) => s.id);
        const toRemove = [...item.promoteIds, ...item.graduates];
        const nextCurrent = currentIds.filter((id: string) => !toRemove.includes(id));
        await api.updateClassRoster({ schoolId, classId: item.classId, studentIds: nextCurrent });
        if (item.targetClassId && item.promoteIds.length > 0) {
          const targetRoster = await api.getClassStudents(item.targetClassId);
          const targetIds = targetRoster.map((s: any) => s.id);
          const merged = Array.from(new Set([...targetIds, ...item.promoteIds]));
          await api.updateClassRoster({ schoolId, classId: item.targetClassId, studentIds: merged });
        }
      }
      addToast('تم تنفيذ ترحيل نهاية العام بنجاح.', 'success');
      setIsRolloverOpen(false);
      setRolloverPreview([]);
      fetchClasses();
    } catch {
      addToast('فشل ترحيل نهاية العام.', 'error');
    }
  };

  return (
    <>
      <div className="mt-6 space-y-6">
        <div className="flex justify-between items-center">
          <button 
            onClick={openInitPreview}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            إنشاء الهيكل الافتراضي
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 ml-2" />
              إضافة فصل جديد
            </button>
            <button 
              onClick={() => setIsRolloverOpen(true)}
              className="flex items-center px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors"
            >
              ترحيل نهاية العام
            </button>
          </div>
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
          <>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 overflow-x-auto">
            <div className="flex gap-4 min-w-max">
              {gradeSummaries.map(item => (
                <div key={item.grade} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center gap-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">الصف</div>
                    <div className="text-base font-semibold text-gray-800 dark:text-white">{item.grade}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">عدد الشعب</div>
                    <div className="text-base font-semibold text-gray-800 dark:text-white">{item.count}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">السعة الإجمالية</div>
                    <div className="text-base font-semibold text-gray-800 dark:text-white">{item.capacity}</div>
                  </div>
                  <button onClick={() => openAddSectionForGrade(item.grade)} className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm">إضافة شعبة</button>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <select value={stageFilter} onChange={e => { setStageFilter(e.target.value); setGradeFilterUI(''); }} className="w-full md:w-48 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">اختر المرحلة...</option>
                {availableStages.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
              <select value={gradeFilterUI} onChange={e => setGradeFilterUI(e.target.value)} className="w-full md:w-48 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500" disabled={!stageFilter}>
                <option value="">اختر الصف...</option>
                {gradesForStage.map(g => (<option key={g} value={g}>{g}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {classesFiltered.map((cls) => (
              <div key={cls.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col border border-gray-200 dark:border-gray-700 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="flex-grow">
                  {editingDetailsId === cls.id ? (
                    <div className="space-y-2">
                      <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700" />
                      <div className="flex items-center gap-2">
                        <label className="text-sm">السعة:</label>
                        <input type="number" min={10} max={200} value={editCapacity} onChange={e => setEditCapacity(parseInt(e.target.value||'30'))} className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700" />
                      </div>
                    </div>
                  ) : (
                    <h3 className="text-xl font-bold text-teal-600 dark:text-teal-400">{cls.gradeLevel} ({cls.section || 'أ'})</h3>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">{cls.gradeLevel}</p>
                  
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <UsersIcon className="h-5 w-5 ml-2 text-gray-400" />
                      <strong>المعلم المسؤول:</strong>
                      {editingDetailsId === cls.id ? (
                        <select value={editTeacherId} onChange={e => setEditTeacherId(e.target.value)} className="mr-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                          <option value="">اختر المعلم...</option>
                          {teachers.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                        </select>
                      ) : (
                        <span className="mr-2">{cls.homeroomTeacherName}</span>
                      )}
                    </div>
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <StudentsIcon className="h-5 w-5 ml-2 text-gray-400" />
                      <strong>عدد الطلاب:</strong>
                      <span className="mr-2">{cls.studentCount}</span>
                    </div>
                    {typeof cls.capacity === 'number' && (
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <span className="h-5 w-5 ml-2 text-gray-400">📦</span>
                        <strong>السعة:</strong>
                        <span className="mr-2">{editingDetailsId === cls.id ? editCapacity : cls.capacity}</span>
                      </div>
                    )}
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
                
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                  <button onClick={() => setEditingClass(cls)} className="font-medium text-teal-600 dark:text-teal-500 hover:underline text-sm">
                    إدارة الطلاب
                  </button>
                  {editingDetailsId === cls.id ? (
                    <>
                      <button onClick={saveEditDetails} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline text-sm">حفظ بيانات الفصل</button>
                      <button onClick={cancelEditDetails} className="font-medium text-gray-600 dark:text-gray-400 hover:underline text-sm">إلغاء</button>
                    </>
                  ) : (
                    <button className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline text-sm" onClick={() => openAddSectionForGrade(cls.gradeLevel)}>
                      إضافة شعبة لهذا الصف
                    </button>
                  )}
                  {editingDetailsId === cls.id ? null : (
                    <button onClick={() => beginEditDetails(cls)} className="font-medium text-teal-700 dark:text-teal-400 hover:underline text-sm">تحرير الفصل</button>
                  )}
                  <button onClick={() => handleDeleteClass(cls)} className="font-medium text-red-600 dark:text-red-500 hover:underline text-sm">حذف الفصل</button>
                  <button onClick={() => { setGenForClassId(cls.id); setGenDueDate(''); setGenIncludeBooks(true); setGenIncludeUniform(true); setGenIncludeActivities(true); setGenDiscounts([]); }} className="font-medium text-teal-600 dark:text-teal-500 hover:underline text-sm">توليد فواتير</button>
                </div>
                {genForClassId === cls.id && (
                  <div className="mt-4 p-4 border rounded-lg dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <input type="date" value={genDueDate} onChange={e => setGenDueDate(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                      <label className="flex items-center gap-2"><input type="checkbox" checked={genIncludeBooks} onChange={e => setGenIncludeBooks(e.target.checked)} /><span>تشمل الكتب</span></label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={genIncludeUniform} onChange={e => setGenIncludeUniform(e.target.checked)} /><span>يشمل الزي</span></label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={genIncludeActivities} onChange={e => setGenIncludeActivities(e.target.checked)} /><span>تشمل الأنشطة</span></label>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={genDiscounts.includes('Sibling')} onChange={() => setGenDiscounts(p => p.includes('Sibling') ? p.filter(x=>x!=='Sibling') : [...p, 'Sibling'])} /><span>خصم أخوة</span></label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={genDiscounts.includes('TopAchiever')} onChange={() => setGenDiscounts(p => p.includes('TopAchiever') ? p.filter(x=>x!=='TopAchiever') : [...p, 'TopAchiever'])} /><span>خصم متفوق</span></label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={genDiscounts.includes('Orphan')} onChange={() => setGenDiscounts(p => p.includes('Orphan') ? p.filter(x=>x!=='Orphan') : [...p, 'Orphan'])} /><span>خصم يتيم</span></label>
                    </div>
                    <div className="flex items-center gap-2"><button onClick={async () => { if (!genDueDate) { addToast('حدد تاريخ الاستحقاق.', 'error'); return; } try { const studs = await api.getClassStudents(cls.id); const ids = studs.map(s => s.id); const res = await api.generateInvoicesFromFees(schoolId, { studentIds: ids, dueDate: genDueDate, include: { books: genIncludeBooks, uniform: genIncludeUniform, activities: genIncludeActivities }, defaultDiscounts: genDiscounts }); addToast(`تم إنشاء ${res.createdCount} فاتورة.`, 'success'); setGenForClassId(''); } catch { addToast('فشل إنشاء الفواتير.', 'error'); } }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">توليد</button><button onClick={() => setGenForClassId('')} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white">إلغاء</button></div>
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
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
            schoolSettings={schoolSettings}
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleAddClass}
            defaultStage={addDefaults?.stage}
            defaultGrade={addDefaults?.grade}
        />
      )}
      {isRolloverOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={() => setIsRolloverOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl p-6 m-4 modal-content-scale-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">ترحيل نهاية العام</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">حد النجاح (%)</label>
                  <input type="number" min={0} max={100} value={promotionThreshold} onChange={e => setPromotionThreshold(parseInt(e.target.value||'50'))} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700" />
                </div>
                <div className="flex items-end">
                  <button onClick={computeRolloverPreview} disabled={rolloverComputing} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400">{rolloverComputing ? 'جاري الحساب...' : 'حساب المعاينة'}</button>
                </div>
                <div className="flex items-end">
                  <button onClick={executeRollover} disabled={!rolloverPreview.length} className="w-full px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors disabled:bg-teal-400">تنفيذ الترحيل</button>
                </div>
              </div>
              <div className="mt-4 max-h-96 overflow-y-auto">
                {rolloverPreview.length === 0 ? (
                  <div className="text-gray-600 dark:text-gray-300">لا توجد معاينة بعد. اضغط "حساب المعاينة".</div>
                ) : (
                  <div className="space-y-3">
                    {rolloverPreview.map((item: any) => (
                      <div key={item.classId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="text-sm font-semibold text-gray-800 dark:text-white">{item.className}</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">الصف التالي: {item.nextGrade || '—'}</div>
                        <div className="flex gap-4 text-sm mt-2">
                          <div>الترقية: {item.promoteCount}</div>
                          <div>البقاء: {item.repeatCount}</div>
                          <div>الخريجون: {item.graduateCount}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button onClick={() => setIsRolloverOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">إغلاق</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isInitPreviewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={() => setIsInitPreviewOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 modal-content-scale-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">معاينة الهيكل الافتراضي</h2>
            <div className="space-y-4">
              {!initPreview ? (
                <div className="text-gray-600 dark:text-gray-300">لا توجد بيانات.</div>
              ) : initPreview.preview.length === 0 ? (
                <div className="text-gray-600 dark:text-gray-300">لا توجد فصول ناقصة للإضافة.</div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {initPreview.preview.map((row, idx) => (
                    <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex justify-between">
                      <div className="text-sm text-gray-800 dark:text-white">{row.gradeLevel} ({row.section})</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">السعة: {row.capacity}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                <div>سيتم إنشاء: {initPreview?.missingCount ?? 0}</div>
                <div>الموجود مسبقًا: {initPreview?.existingCount ?? 0}</div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button onClick={() => setIsInitPreviewOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">إلغاء</button>
                <button onClick={confirmInitStructure} disabled={!initPreview || initPreview.preview.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400">تأكيد الإنشاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClassesList;
