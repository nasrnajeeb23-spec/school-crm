import React, { useEffect, useState } from 'react';
import * as api from '../api';
import { SchoolSettings } from '../types';
import { useToast } from '../contexts/ToastContext';

interface ImportExportProps {
  schoolId: number;
}

const ImportExport: React.FC<ImportExportProps> = ({ schoolId }) => {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [genSelecting, setGenSelecting] = useState<{students:boolean;classes:boolean;subjects:boolean;teachers:boolean;grades:boolean;attendance:boolean;schedule:boolean;fees:boolean}>({students:true,classes:true,subjects:true,teachers:true,grades:true,attendance:true,schedule:true,fees:true});
  const [importState, setImportState] = useState<{students:any[];classes:any[];grades:any[];classSubjects:any[];subjectTeachers:any[];attendance:any[];schedule:any[];fees:any[];logs:string[]}>({students:[],classes:[],grades:[],classSubjects:[],subjectTeachers:[],attendance:[],schedule:[],fees:[],logs:[]});
  const [importProcessing, setImportProcessing] = useState(false);
  const [feeGenDueDate, setFeeGenDueDate] = useState<string>('');
  const [feeIncludeBooks, setFeeIncludeBooks] = useState<boolean>(true);
  const [feeIncludeUniform, setFeeIncludeUniform] = useState<boolean>(true);
  const [feeIncludeActivities, setFeeIncludeActivities] = useState<boolean>(true);
  const [feeDefaultDiscounts, setFeeDefaultDiscounts] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<{warnings:string[];errors:string[];summary:Record<string,number>}>({warnings:[],errors:[],summary:{}});

  useEffect(() => {
    setLoading(true);
    api.getSchoolSettings(schoolId).then(setSettings).catch(() => addToast('تعذر تحميل إعدادات المدرسة.', 'error')).finally(() => setLoading(false));
  }, [schoolId]);

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

  const allStages = ["رياض أطفال","ابتدائي","إعدادي","ثانوي"];
  const stages = settings?.availableStages && settings.availableStages.length > 0 ? settings.availableStages : allStages;
  const workingDays = settings?.workingDays && settings.workingDays.length > 0 ? settings.workingDays : ['Sunday','Monday','Tuesday','Wednesday','Thursday'];
  const terms = settings?.terms && settings.terms.length > 0 ? settings.terms : [ { name: 'الفصل الأول', start: settings?.academicYearStart || '', end: '' }, { name: 'الفصل الثاني', start: '', end: settings?.academicYearEnd || '' } ];
  const arDays: Record<string, string> = { Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت' };

  const toCSV = (headers: string[], rows: any[]) => {
    const esc = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      if (s.includes(',') || s.includes('\n') || s.includes('"')) return '"' + s.replace(/"/g,'""') + '"';
      return s;
    };
    const head = headers.join(',');
    const body = rows.map(r => headers.map(h => esc(r[h])).join(',')).join('\n');
    return head + '\n' + body + (body ? '\n' : '');
  };

  const downloadCSV = (filename: string, csv: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  };

  const mapArabicDayToEnglish = (ar: string): 'Sunday'|'Monday'|'Tuesday'|'Wednesday'|'Thursday' => {
    const m: any = { 'الأحد': 'Sunday', 'الاثنين': 'Monday', 'الثلاثاء': 'Tuesday', 'الأربعاء': 'Wednesday', 'الخميس': 'Thursday' };
    return (m[ar] || ar) as any;
  };

  const mapPaymentPlan = (val: string): 'Monthly'|'Termly'|'Installments' => {
    const s = String(val || '').trim();
    const m: any = { 'شهري': 'Monthly', 'فصلي': 'Termly', 'أقساط': 'Installments', 'Monthly': 'Monthly', 'Termly': 'Termly', 'Installments': 'Installments' };
    return (m[s] || 'Monthly') as any;
  };

  const buildRefStagesGrades = () => {
    const map: Record<string,string[]> = {
      'رياض أطفال': ['KG1','KG2'],
      'ابتدائي': ['الأول','الثاني','الثالث','الرابع','الخامس','السادس'],
      'إعدادي': ['الأول','الثاني','الثالث'],
      'ثانوي': ['الأول','الثاني','الثالث']
    };
    const rows: any[] = [];
    for (const st of stages) { (map[st] || []).forEach(g => rows.push({ stage: st, grade: g })); }
    const csv = toCSV(['stage','grade'], rows);
    downloadCSV('RefStagesGrades.csv', csv);
  };

  const buildRefWorkingDays = () => {
    const rows = (workingDays || []).map(d => ({ day: arDays[d] || d }));
    const csv = toCSV(['day'], rows);
    downloadCSV('RefWorkingDays.csv', csv);
  };

  const buildRefTerms = () => {
    const rows = (terms || []).map(t => ({ name: t.name, start: t.start, end: t.end }));
    const csv = toCSV(['name','start','end'], rows);
    downloadCSV('RefTerms.csv', csv);
  };

  const buildRefTeachers = async () => {
    try {
      const list = await api.getSchoolTeachers(schoolId);
      const rows = list.map((t: any) => ({ teacherId: t.id, name: t.name }));
      const csv = toCSV(['teacherId','name'], rows);
      downloadCSV('RefTeachers.csv', csv);
    } catch {
      addToast('تعذر تحميل قائمة المعلمين.', 'error');
    }
  };

  const buildStudentsTemplate = () => {
    const base = ['studentId','nationalId','name','dateOfBirth','gender','city','address','admissionDate','parentName','parentPhone','parentEmail','className'];
    const csv = toCSV(base, []);
    downloadCSV('Students.csv', csv);
  };

  const buildClassesTemplate = () => {
    const headers = ['gradeLevel','section','capacity'];
    const csv = toCSV(headers, []);
    downloadCSV('Classes.csv', csv);
  };

  const buildSubjectsTemplate = () => {
    const csv = toCSV(['subjectName'], []);
    downloadCSV('Subjects.csv', csv);
  };

  const buildClassSubjectTeacherTemplate = () => {
    const csv = toCSV(['className','subjectName','teacherName'], []);
    downloadCSV('ClassSubjectTeachers.csv', csv);
  };

  const buildGradesTemplate = () => {
    const currentTerm = (terms[0]?.name || 'الفصل الأول');
    const headers = ['className','subjectName','studentId','studentName','homework','quiz','midterm','final'];
    const csv = toCSV(headers, []);
    downloadCSV(`Grades_${currentTerm}.csv`, csv);
  };

  const buildAttendanceTemplate = () => {
    const headers = ['className','date','studentId','status'];
    const csv = toCSV(headers, []);
    downloadCSV('Attendance.csv', csv);
  };

  const buildScheduleTemplate = () => {
    const headers = ['className','day','timeSlot','subjectName'];
    const csv = toCSV(headers, []);
    downloadCSV('Schedule.csv', csv);
  };

  const buildFeesTemplate = () => {
    const headers = ['stage','tuitionFee','bookFees','uniformFees','activityFees','paymentPlanType'];
    const rows = (stages || []).map(s => ({ stage: s, tuitionFee: '', bookFees: '', uniformFees: '', activityFees: '', paymentPlanType: 'شهري' }));
    const csv = toCSV(headers, rows);
    downloadCSV('Fees.csv', csv);
  };

  const handleGenerateTemplates = async () => {
    try {
      if (genSelecting.students) buildStudentsTemplate();
      if (genSelecting.classes) buildClassesTemplate();
      if (genSelecting.subjects) buildSubjectsTemplate();
      if (genSelecting.teachers) await buildRefTeachers();
      if (genSelecting.grades) buildGradesTemplate();
      if (genSelecting.attendance) buildAttendanceTemplate();
      if (genSelecting.schedule) buildScheduleTemplate();
      if (genSelecting.fees) buildFeesTemplate();
      buildRefStagesGrades();
      buildRefWorkingDays();
      buildRefTerms();
      addToast('تم إنشاء القوالب بنجاح.', 'success');
    } catch {
      addToast('فشل إنشاء القوالب.', 'error');
    }
  };

  const parseCSVText = (text: string): { headers: string[]; rows: any[] } => {
    const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(l => l.trim() !== '');
    const parseLine = (line: string) => {
      const out: string[] = [];
      let cur = ''; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQ) {
          if (ch === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else { inQ = false; } }
          else { cur += ch; }
        } else {
          if (ch === '"') inQ = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
        }
      }
      out.push(cur);
      return out;
    };
    const headers = lines.length ? parseLine(lines[0]).map(h => h.trim()) : [];
    const rows = lines.slice(1).map(l => { const cols = parseLine(l); const obj: any = {}; headers.forEach((h, idx) => { obj[h] = cols[idx] || ''; }); return obj; });
    return { headers, rows };
  };

  const importStudents = async (rows: any[]) => {
    const logs: string[] = [];
    for (const r of rows) {
      try {
        const payload: any = { name: r.name, nationalId: r.nationalId, dateOfBirth: r.dateOfBirth, gender: r.gender, city: r.city, address: r.address, parentName: r.parentName, parentPhone: r.parentPhone, parentEmail: r.parentEmail };
        const created = await api.addSchoolStudent(schoolId, payload);
        if (r.className) {
          const classes = await api.getSchoolClasses(schoolId);
          let target = classes.find((c: any) => `${c.gradeLevel} (${c.section||'أ'})` === r.className);
          if (!target) {
            const gradeLevel = r.className.split(' ')[0] || 'الأول';
            target = await api.addClass(schoolId, { name: r.className, gradeLevel, section: 'أ', capacity: 30, homeroomTeacherId: '', subjects: [] });
          }
          const roster = await api.getClassStudents(target.id);
          const ids = Array.from(new Set([...roster.map((s: any) => s.id), created.id]));
          await api.updateClassRoster({ schoolId, classId: target.id, studentIds: ids });
        }
        logs.push(`تم: ${r.name}`);
      } catch { logs.push(`فشل: ${r.name}`); }
    }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importClasses = async (rows: any[]) => {
    const logs: string[] = [];
    for (const r of rows) {
      try { const created = await api.addClass(schoolId, { name: `${r.gradeLevel} (${r.section||'أ'})`, gradeLevel: r.gradeLevel, section: r.section||'أ', capacity: Number(r.capacity||30), homeroomTeacherId: '', subjects: [] }); logs.push(`تم: ${created.name}`); } catch { logs.push(`فشل: ${r.gradeLevel}`); }
    }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importGrades = async (rows: any[]) => {
    const logs: string[] = [];
    try {
      const classes = await api.getSchoolClasses(schoolId);
      const batch: any[] = [];
      for (const r of rows) {
        try {
          const cls = classes.find((c: any) => `${c.gradeLevel} (${c.section||'أ'})` === r.className);
          if (!cls) { logs.push(`فصل غير موجود: ${r.className}`); continue; }
          batch.push({ classId: cls.id, subject: r.subjectName, studentId: r.studentId, studentName: r.studentName || '', grades: { homework: Number(r.homework||0), quiz: Number(r.quiz||0), midterm: Number(r.midterm||0), final: Number(r.final||0) } });
        } catch { logs.push(`فشل تجهيز درجات: ${r.studentId} في ${r.className}`); }
      }
      if (batch.length > 0) { await api.saveGrades(batch as any); logs.push(`تم استيراد ${batch.length} سجل درجات.`); }
    } catch { logs.push('تعذر تحميل الفصول'); }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importClassSubjects = async (rows: any[]) => {
    const logs: string[] = [];
    try {
      const classes = await api.getSchoolClasses(schoolId);
      const byClass: Record<string, Set<string>> = {};
      for (const r of rows) { const key = String(r.className || '').trim(); const subj = String(r.subjectName || '').trim(); if (!key || !subj) continue; if (!byClass[key]) byClass[key] = new Set(); byClass[key].add(subj); }
      for (const [className, subjectsSet] of Object.entries(byClass)) {
        const cls = classes.find((c: any) => `${c.gradeLevel} (${c.section||'أ'})` === className);
        if (!cls) { logs.push(`فصل غير موجود: ${className}`); continue; }
        const subjects = Array.from(subjectsSet);
        try { await api.updateClassSubjects(schoolId, cls.id, subjects); logs.push(`تم مواد: ${className}`); } catch { logs.push(`فشل مواد: ${className}`); }
      }
    } catch { logs.push('تعذر تحميل الفصول'); }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importSubjectTeachers = async (rows: any[]) => {
    const logs: string[] = [];
    try {
      const classes = await api.getSchoolClasses(schoolId);
      const teachers = await api.getSchoolTeachers(schoolId);
      const byClass: Record<string, Record<string, string|number>> = {};
      for (const r of rows) {
        const className = String(r.className || '').trim();
        const subjectName = String(r.subjectName || '').trim();
        const teacherName = String(r.teacherName || '').trim();
        if (!className || !subjectName || !teacherName) continue;
        const t = teachers.find((x: any) => String(x.name || '').trim() === teacherName);
        if (!t) { logs.push(`معلم غير موجود: ${teacherName}`); continue; }
        if (!byClass[className]) byClass[className] = {};
        byClass[className][subjectName] = t.id;
      }
      for (const [className, mapping] of Object.entries(byClass)) {
        const cls = classes.find((c: any) => `${c.gradeLevel} (${c.section||'أ'})` === className);
        if (!cls) { logs.push(`فصل غير موجود: ${className}`); continue; }
        try { await api.updateSubjectTeacherMap(schoolId, cls.id, mapping); logs.push(`تم معلمي المواد: ${className}`); } catch { logs.push(`فشل معلمي المواد: ${className}`); }
      }
    } catch { logs.push('تعذر تحميل المعلمين/الفصول'); }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importAttendance = async (rows: any[]) => {
    const logs: string[] = [];
    try {
      const classes = await api.getSchoolClasses(schoolId);
      const byClassDate: Record<string, { classId: string; date: string; records: any[] }> = {};
      for (const r of rows) {
        const className = String(r.className || '').trim();
        const date = String(r.date || '').trim();
        const studentId = String(r.studentId || '').trim();
        const status = String(r.status || '').trim();
        if (!className || !date || !studentId) continue;
        const cls = classes.find((c: any) => `${c.gradeLevel} (${c.section||'أ'})` === className);
        if (!cls) { logs.push(`فصل غير موجود: ${className}`); continue; }
        const key = `${cls.id}|${date}`;
        if (!byClassDate[key]) byClassDate[key] = { classId: cls.id, date, records: [] };
        byClassDate[key].records.push({ studentId, studentName: '', status });
      }
      for (const item of Object.values(byClassDate)) { try { await api.saveAttendance(item.classId, item.date, item.records as any); logs.push(`تم حضور: ${item.classId} بتاريخ ${item.date}`); } catch { logs.push(`فشل حضور: ${item.classId} بتاريخ ${item.date}`); } }
    } catch { logs.push('تعذر تحميل الفصول'); }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importSchedule = async (rows: any[]) => {
    const logs: string[] = [];
    try {
      const classes = await api.getSchoolClasses(schoolId);
      const byClass: Record<string, { classId: string; entries: { day: 'Sunday'|'Monday'|'Tuesday'|'Wednesday'|'Thursday'; timeSlot: string; subject: string; }[] }> = {};
      for (const r of rows) {
        const className = String(r.className || '').trim();
        const dayAr = String(r.day || '').trim();
        const timeSlot = String(r.timeSlot || '').trim();
        const subjectName = String(r.subjectName || '').trim();
        if (!className || !dayAr || !timeSlot || !subjectName) continue;
        const cls = classes.find((c: any) => `${c.gradeLevel} (${c.section||'أ'})` === className);
        if (!cls) { logs.push(`فصل غير موجود: ${className}`); continue; }
        const day = mapArabicDayToEnglish(dayAr);
        const key = cls.id;
        if (!byClass[key]) byClass[key] = { classId: cls.id, entries: [] };
        byClass[key].entries.push({ day, timeSlot, subject: subjectName });
      }
      for (const item of Object.values(byClass)) { try { await api.saveClassSchedule(item.classId, item.entries); logs.push(`تم الجدول: ${item.classId}`); } catch { logs.push(`فشل الجدول: ${item.classId}`); } }
    } catch { logs.push('تعذر تحميل الفصول'); }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importFees = async (rows: any[]) => {
    const logs: string[] = [];
    try {
      const existing = await api.getFeeSetups(schoolId);
      for (const r of rows) {
        try {
          const stage = String(r.stage || '').trim();
          if (!stage) { logs.push('مرحلة مفقودة في سطر الرسوم'); continue; }
          const payload: any = { stage, tuitionFee: Number(r.tuitionFee || 0), bookFees: Number(r.bookFees || 0), uniformFees: Number(r.uniformFees || 0), activityFees: Number(r.activityFees || 0), paymentPlanType: mapPaymentPlan(String(r.paymentPlanType || '')), discounts: [] };
          const found = existing.find((f: any) => f.stage === stage);
          if (found) { await api.updateFeeSetup(schoolId, found.id, payload); logs.push(`تم تحديث رسوم: ${stage}`); }
          else { await api.createFeeSetup(schoolId, payload); logs.push(`تم إنشاء رسوم: ${stage}`); }
        } catch { logs.push(`فشل رسوم: ${r.stage}`); }
      }
      if (feeGenDueDate) { try { await api.generateInvoicesFromFees(schoolId, { stage: undefined, dueDate: feeGenDueDate, include: { books: feeIncludeBooks, uniform: feeIncludeUniform, activities: feeIncludeActivities }, defaultDiscounts: feeDefaultDiscounts }); logs.push('تم توليد فواتير من الرسوم.'); } catch { logs.push('فشل توليد الفواتير من الرسوم.'); } }
    } catch { logs.push('تعذر تحميل إعدادات الرسوم'); }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const validateStudents = async (rows: any[]) => { const warnings: string[] = []; const errors: string[] = []; for (const r of rows) { const name = String(r.name || '').trim(); const nid = String(r.nationalId || '').trim(); if (!name && !nid) errors.push('صف طالب بدون اسم أو رقم وطني'); const phone = String(r.parentPhone || '').trim(); if (phone && !/^\+?\d[\d\s-]{6,}$/.test(phone)) warnings.push(`هاتف ولي الأمر غير صالح: ${phone}`); } return { warnings, errors }; };
  const validateClasses = async (rows: any[]) => { const warnings: string[] = []; const errors: string[] = []; for (const r of rows) { const grade = String(r.gradeLevel || '').trim(); if (!grade) errors.push('صف فصل بدون صف دراسي'); const cap = Number(r.capacity || 0); if (cap && cap <= 0) warnings.push(`سعة فصل غير منطقية: ${cap}`); } return { warnings, errors }; };
  const validateClassSubjects = async (rows: any[]) => { const warnings: string[] = []; const errors: string[] = []; for (const r of rows) { const className = String(r.className || '').trim(); const subjectName = String(r.subjectName || '').trim(); if (!className || !subjectName) errors.push('سطر مواد بدون فصل أو مادة'); } return { warnings, errors }; };
  const validateSubjectTeachers = async (rows: any[]) => { const warnings: string[] = []; const errors: string[] = []; for (const r of rows) { const className = String(r.className || '').trim(); const subjectName = String(r.subjectName || '').trim(); const teacherName = String(r.teacherName || '').trim(); if (!className || !subjectName || !teacherName) errors.push('سطر إسناد بدون فصل أو مادة أو معلم'); } return { warnings, errors }; };
  const validateGrades = async (rows: any[]) => { const warnings: string[] = []; const errors: string[] = []; for (const r of rows) { const nums = ['homework','quiz','midterm','final'].map(k => Number(r[k]||0)); nums.forEach(n => { if (n < 0 || n > 100) errors.push('درجة خارج النطاق 0-100'); }); const sid = String(r.studentId || '').trim(); if (!sid) errors.push('سطر درجات بدون رقم طالب'); } return { warnings, errors }; };
  const validateAttendance = async (rows: any[]) => { const warnings: string[] = []; const errors: string[] = []; const statuses = ['حاضر','غائب','متأخر','بعذر']; for (const r of rows) { const date = String(r.date || '').trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push(`تاريخ غير صالح: ${date}`); const status = String(r.status || '').trim(); if (!statuses.includes(status)) warnings.push(`حالة حضور غير معروفة: ${status}`); } return { warnings, errors }; };
  const validateSchedule = async (rows: any[]) => { const warnings: string[] = []; const errors: string[] = []; for (const r of rows) { const day = String(r.day || '').trim(); const ts = String(r.timeSlot || '').trim(); const subj = String(r.subjectName || '').trim(); if (!day || !ts || !subj) errors.push('سطر جدول ناقص'); if (!/^[0-2]\d:\d{2}\s-\s[0-2]\d:\d{2}$/.test(ts)) warnings.push(`فترة زمنية غير قياسية: ${ts}`); } return { warnings, errors }; };
  const validateFees = async (rows: any[]) => { const warnings: string[] = []; const errors: string[] = []; const validStages = new Set(stages); for (const r of rows) { const stage = String(r.stage || '').trim(); if (!stage) errors.push('سطر رسوم بدون مرحلة'); else if (!validStages.has(stage)) warnings.push(`مرحلة غير مدعومة: ${stage}`); const plan = String(r.paymentPlanType || '').trim(); if (plan && !['شهري','فصلي','أقساط','Monthly','Termly','Installments'].includes(plan)) warnings.push(`خطة دفع غير معروفة: ${plan}`); } return { warnings, errors }; };

  const runImportPreview = async () => {
    setImportPreview({ warnings: [], errors: [], summary: {} });
    const results = await Promise.all([
      validateStudents(importState.students),
      validateClasses(importState.classes),
      validateClassSubjects(importState.classSubjects),
      validateSubjectTeachers(importState.subjectTeachers),
      validateGrades(importState.grades),
      validateAttendance(importState.attendance),
      validateSchedule(importState.schedule),
      validateFees(importState.fees)
    ]);
    const keys = ['طلاب','فصول','مواد','إسناد','درجات','حضور','جدول','رسوم'];
    const warnings: string[] = []; const errors: string[] = []; const summary: Record<string,number> = {};
    results.forEach((r, i) => { summary[keys[i]] = (i===0?importState.students.length:i===1?importState.classes.length:i===2?importState.classSubjects.length:i===3?importState.subjectTeachers.length:i===4?importState.grades.length:i===5?importState.attendance.length:i===6?importState.schedule.length:importState.fees.length); warnings.push(...r.warnings.map(w => `${keys[i]}: ${w}`)); errors.push(...r.errors.map(e => `${keys[i]}: ${e}`)); });
    setImportPreview({ warnings, errors, summary });
    if (errors.length === 0) addToast('المعاينة ناجحة دون أخطاء.', 'success'); else addToast('اكتشفت أخطاء في المعاينة.', 'error');
  };

  const executeAllImports = async () => {
    if (importProcessing) return;
    setImportProcessing(true);
    try {
      if (importState.classes.length) await importClasses(importState.classes);
      if (importState.students.length) await importStudents(importState.students);
      if (importState.classSubjects.length) await importClassSubjects(importState.classSubjects);
      if (importState.subjectTeachers.length) await importSubjectTeachers(importState.subjectTeachers);
      if (importState.grades.length) await importGrades(importState.grades);
      if (importState.attendance.length) await importAttendance(importState.attendance);
      if (importState.schedule.length) await importSchedule(importState.schedule);
      if (importState.fees.length) await importFees(importState.fees);
      addToast('تم تنفيذ جميع الاستيرادات.', 'success');
    } catch { addToast('حدث خطأ أثناء التنفيذ.', 'error'); } finally { setImportProcessing(false); }
  };

  if (loading || !settings) return <div className="text-center p-8">جاري تحميل إعدادات البيانات...</div>;

  return (
    <div className="mt-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">توليد قوالب الاستيراد الذكية</h3>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">سيتم توليد القوالب وفق إعدادات مدرستك الحالية.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={genSelecting.students} onChange={e => setGenSelecting(prev => ({ ...prev, students: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>قالب الطلاب</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={genSelecting.classes} onChange={e => setGenSelecting(prev => ({ ...prev, classes: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>قالب الفصول</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={genSelecting.subjects} onChange={e => setGenSelecting(prev => ({ ...prev, subjects: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>قالب المواد</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={genSelecting.teachers} onChange={e => setGenSelecting(prev => ({ ...prev, teachers: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>قائمة المعلمين (مرجع)</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={genSelecting.grades} onChange={e => setGenSelecting(prev => ({ ...prev, grades: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>قالب الدرجات</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={genSelecting.attendance} onChange={e => setGenSelecting(prev => ({ ...prev, attendance: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>قالب الحضور</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={genSelecting.schedule} onChange={e => setGenSelecting(prev => ({ ...prev, schedule: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>قالب الجدول الدراسي</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={genSelecting.fees} onChange={e => setGenSelecting(prev => ({ ...prev, fees: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>قالب الرسوم</span></label>
          </div>
          <div>
            <button type="button" onClick={handleGenerateTemplates} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">توليد القوالب المحددة</button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">استيراد سريع للفصل الحالي</h3>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملف الطلاب (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, students: rows })); }} className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملف الفصول (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, classes: rows })); }} className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملف الدرجات (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, grades: rows })); }} className="mt-1 block w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مواد الفصول (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, classSubjects: rows })); }} className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">معلمو المواد (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, subjectTeachers: rows })); }} className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الحضور (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, attendance: rows })); }} className="mt-1 block w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الجدول الدراسي (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, schedule: rows })); }} className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الرسوم (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, fees: rows })); }} className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الاستحقاق للفواتير</label>
              <input type="date" value={feeGenDueDate} onChange={e => setFeeGenDueDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={feeIncludeBooks} onChange={e=>setFeeIncludeBooks(e.target.checked)} className="form-checkbox h-4 w-4 text-teal-600" /><span>كتب</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={feeIncludeUniform} onChange={e=>setFeeIncludeUniform(e.target.checked)} className="form-checkbox h-4 w-4 text-teal-600" /><span>زي</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={feeIncludeActivities} onChange={e=>setFeeIncludeActivities(e.target.checked)} className="form-checkbox h-4 w-4 text-teal-600" /><span>أنشطة</span></label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <span>جاهز للاستيراد:</span>
            <span>طلاب: {importState.students.length}</span>
            <span>فصول: {importState.classes.length}</span>
            <span>درجات: {importState.grades.length}</span>
            <span>مواد الفصول: {importState.classSubjects.length}</span>
            <span>معلمو المواد: {importState.subjectTeachers.length}</span>
            <span>حضور: {importState.attendance.length}</span>
            <span>جدول: {importState.schedule.length}</span>
            <span>رسوم: {importState.fees.length}</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            <button type="button" onClick={runImportPreview} disabled={importProcessing} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">تحقق قبل التنفيذ</button>
            <button type="button" onClick={executeAllImports} disabled={importProcessing || importPreview.errors.length>0} className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:bg-teal-400">تنفيذ الكل</button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={importProcessing||importState.classes.length===0} onClick={async ()=>{ setImportProcessing(true); await importClasses(importState.classes); setImportProcessing(false); addToast('تم استيراد الفصول.', 'success'); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">استيراد الفصول</button>
            <button type="button" disabled={importProcessing||importState.students.length===0} onClick={async ()=>{ setImportProcessing(true); await importStudents(importState.students); setImportProcessing(false); addToast('تم استيراد الطلاب.', 'success'); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">استيراد الطلاب</button>
            <button type="button" disabled={importProcessing||importState.grades.length===0} onClick={async ()=>{ setImportProcessing(true); await importGrades(importState.grades); setImportProcessing(false); addToast('تم استيراد الدرجات.', 'success'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">استيراد الدرجات</button>
            <button type="button" disabled={importProcessing||importState.classSubjects.length===0} onClick={async ()=>{ setImportProcessing(true); await importClassSubjects(importState.classSubjects); setImportProcessing(false); addToast('تم استيراد مواد الفصول.', 'success'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">استيراد مواد الفصول</button>
            <button type="button" disabled={importProcessing||importState.subjectTeachers.length===0} onClick={async ()=>{ setImportProcessing(true); await importSubjectTeachers(importState.subjectTeachers); setImportProcessing(false); addToast('تم استيراد معلمي المواد.', 'success'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">استيراد معلمي المواد</button>
            <button type="button" disabled={importProcessing||importState.attendance.length===0} onClick={async ()=>{ setImportProcessing(true); await importAttendance(importState.attendance); setImportProcessing(false); addToast('تم استيراد الحضور.', 'success'); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">استيراد الحضور</button>
            <button type="button" disabled={importProcessing||importState.schedule.length===0} onClick={async ()=>{ setImportProcessing(true); await importSchedule(importState.schedule); setImportProcessing(false); addToast('تم استيراد الجدول الدراسي.', 'success'); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">استيراد الجدول</button>
            <button type="button" disabled={importProcessing||importState.fees.length===0} onClick={async ()=>{ setImportProcessing(true); await importFees(importState.fees); setImportProcessing(false); addToast('تم استيراد الرسوم والفواتير.', 'success'); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400">استيراد الرسوم</button>
          </div>

          { (importPreview.errors.length>0 || importPreview.warnings.length>0) && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded border border-red-300 bg-red-50 dark:bg-red-900/30 dark:border-red-700">
                <div className="font-semibold text-red-700 dark:text-red-300">الأخطاء</div>
                {importPreview.errors.length === 0 ? <div className="text-sm text-red-600 dark:text-red-400">لا توجد</div> : (
                  <div className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-300">{importPreview.errors.map((e,i)=>(<div key={i}>{e}</div>))}</div>
                )}
              </div>
              <div className="p-3 rounded border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 dark:border-yellow-700">
                <div className="font-semibold text-yellow-700 dark:text-yellow-300">التحذيرات</div>
                {importPreview.warnings.length === 0 ? <div className="text-sm text-yellow-700 dark:text-yellow-300">لا توجد</div> : (
                  <div className="mt-2 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">{importPreview.warnings.map((w,i)=>(<div key={i}>{w}</div>))}</div>
                )}
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto text-sm mt-3">
            {importState.logs.length === 0 ? <div className="text-gray-500">لا توجد سجلات بعد.</div> : importState.logs.map((l,i)=>(<div key={i} className="text-gray-700 dark:text-gray-300">{l}</div>))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportExport;
