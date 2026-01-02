import React, { useState, useEffect } from 'react';
import * as api from '../api';
<<<<<<< HEAD
import { SchoolSettings } from '../types';
=======
import { AttendanceStatus, SchoolSettings, StudentStatus } from '../types';
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
import { useToast } from '../contexts/ToastContext';
import GeneralSettings from './settings/GeneralSettings';

interface SettingsProps {
  schoolId: number;
}

const Settings: React.FC<SettingsProps> = ({ schoolId }) => {
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const { addToast } = useToast();

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    try {
      const k = `school_settings_draft_${schoolId}`;
      return typeof window !== 'undefined' ? !!localStorage.getItem(k) : false;
    } catch { return false; }
  });

  const [draftEnabled, setDraftEnabled] = useState<boolean>(() => {
    try {
      const k = `school_settings_draft_enabled_${schoolId}`;
      const v = typeof window !== 'undefined' ? localStorage.getItem(k) : null;
      return v ? v === '1' : true;
    } catch { return true; }
  });

  useEffect(() => {
    setLoading(true);
    api.getSchoolSettings(schoolId).then(data => {
      if (draftEnabled) {
        let merged = data;
        try {
          const k = `school_settings_draft_${schoolId}`;
          const s = typeof window !== 'undefined' ? localStorage.getItem(k) : null;
          if (s) {
            const d = JSON.parse(s);
            merged = { ...data, ...d };
          }
        } catch { }
        setSettings(merged);
      } else {
        setSettings(data);
      }
    }).catch(err => {
      console.error("Failed to load settings:", err);
    }).finally(() => {
      setLoading(false);
    });
  }, [schoolId, draftEnabled]);

  useEffect(() => {
    try {
      if (settings && draftEnabled) {
        const k = `school_settings_draft_${schoolId}`;
        if (typeof window !== 'undefined') {
          localStorage.setItem(k, JSON.stringify(settings));
          setHasDraft(true);
        }
      }
    } catch { }
  }, [schoolId, settings, draftEnabled]);

  useEffect(() => {
    try {
      const k = `school_settings_draft_enabled_${schoolId}`;
      if (typeof window !== 'undefined') localStorage.setItem(k, draftEnabled ? '1' : '0');
    } catch { }
  }, [schoolId, draftEnabled]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setLogoUploading(true);
      const url = await api.uploadSchoolLogo(schoolId, file);
      const timestampedUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
      setSettings(prev => prev ? { ...prev, schoolLogoUrl: timestampedUrl } : prev);
      try { e.target.value = ''; } catch { }
      addToast('تم رفع شعار المدرسة بنجاح.', 'success');
    } catch (err) {
      console.error('Failed to upload logo:', err);
      const m = String((err as any)?.message || '');
      addToast(m ? `فشل رفع شعار المدرسة: ${m}` : 'فشل رفع شعار المدرسة.', 'error');
    } finally { setLogoUploading(false); }
  };

  const restoreDraft = () => {
    try {
      const k = `school_settings_draft_${schoolId}`;
      const s = typeof window !== 'undefined' ? localStorage.getItem(k) : null;
      if (!s) { addToast('لا توجد مسودة محفوظة.', 'warning'); return; }
      const d = JSON.parse(s);
      setSettings(prev => prev ? { ...prev, ...d } : d);
      addToast('تم استعادة المسودة.', 'success');
    } catch {
      addToast('تعذر استعادة المسودة.', 'error');
    }
  };

  const clearDraft = () => {
    try {
      const k = `school_settings_draft_${schoolId}`;
      if (typeof window !== 'undefined') localStorage.removeItem(k);
      setHasDraft(false);
      addToast('تم حذف المسودة.', 'success');
    } catch {
      addToast('تعذر حذف المسودة.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await api.updateSchoolSettings(schoolId, settings);
      try {
        const k = `school_settings_draft_${schoolId}`;
        if (typeof window !== 'undefined') localStorage.removeItem(k);
      } catch { }
      setHasDraft(false);
      addToast('تم حفظ الإعدادات بنجاح!', 'success');
    } catch (err) {
      console.error("Failed to save settings:", err);
      const m = String((err as any)?.message || '');
      addToast(m ? `فشل حفظ الإعدادات: ${m}` : 'فشل حفظ الإعدادات.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsChange = (updates: Partial<SchoolSettings>) => {
    setSettings(prev => prev ? { ...prev, ...updates } : null);
  };

  if (loading) {
    return <div className="text-center p-8">جاري تحميل الإعدادات...</div>;
  }

  if (!settings) {
    return <div className="text-center p-8">لا يمكن تحميل الإعدادات.</div>;
  }

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

  const tabs = [
    { id: 'general', label: 'الإعدادات العامة' },
    { id: 'school', label: 'إعدادات المدرسة' },
    { id: 'security', label: 'الأمان' },
    { id: 'notifications', label: 'الإشعارات' },
    { id: 'stages', label: 'المراحل والفصول' }
  ];
<<<<<<< HEAD
=======
  const holidays = Array.isArray(settings.holidays) && settings.holidays.length > 0 ? settings.holidays : [];

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

  const previewTimeSlots = (() => {
    const sc = settings.scheduleConfig || { periodCount: 5, periodDurationMinutes: 60, startTime: settings.workingHoursStart || '08:00', gapMinutes: 0 };
    const toMin = (hm: string) => { const t = String(hm).split(':'); const h = Number(t[0]); const m = Number(t[1]); return h*60 + m; };
    const toHM = (min: number) => { const h = Math.floor(min/60); const m = min%60; const hh = String(h).padStart(2,'0'); const mm = String(m).padStart(2,'0'); return `${hh}:${mm}`; };
    const arr: string[] = [];
    let s = toMin(sc.startTime || '08:00');
    for (let i=0;i<Number(sc.periodCount||5);i++) { const e = s + Number(sc.periodDurationMinutes||60); arr.push(`${toHM(s)} - ${toHM(e)}`); s = e + Number(sc.gapMinutes||0); }
    return arr;
  })();

  const buildRefStagesGrades = () => {
    const map: Record<string,string[]> = {
      'رياض أطفال': ['KG1','KG2'],
      'ابتدائي': ['الأول','الثاني','الثالث','الرابع','الخامس','السادس'],
      'إعدادي': ['الأول','الثاني','الثالث'],
      'ثانوي': ['الأول','الثاني','الثالث']
    };
    const active = stages;
    const rows: any[] = [];
    for (const st of active) {
      (map[st] || []).forEach(g => rows.push({ stage: st, grade: g }));
    }
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
    const headers = ['gradeLevel','section','capacity','homeroomTeacherName'];
    const csv = toCSV(headers, []);
    downloadCSV('Classes.csv', csv);
  };

  const buildSubjectsTemplate = () => {
    const csv = toCSV(['className','subjectName'], []);
    downloadCSV('Subjects.csv', csv);
  };

  const buildClassSubjectTeachersTemplate = () => {
    const csv = toCSV(['className','subjectName','teacherName'], []);
    downloadCSV('ClassSubjectTeachers.csv', csv);
  };

  const buildGradesTemplate = () => {
    const currentTerm = (terms || [])[0]?.name || 'الفصل الأول';
    const headers = ['term','className','subjectName','studentId','homework','quiz','midterm','final'];
    const csv = toCSV(headers, []);
    downloadCSV(`Grades_${currentTerm}.csv`, csv);
  };

  const buildAttendanceTemplate = () => {
    const headers = ['date','className','studentId','status'];
    const csv = toCSV(headers, []);
    downloadCSV('Attendance.csv', csv);
  };

  const buildScheduleTemplate = () => {
    const headers = ['className','day','timeSlot','subjectName','teacherName'];
    const csv = toCSV(headers, []);
    downloadCSV('Schedule.csv', csv);
  };

  const buildFeesTemplate = () => {
    const headers = ['stage','tuitionFee','bookFees','uniformFees','activityFees','paymentPlanType'];
    const rows: any[] = stages.map(st => ({ stage: st, tuitionFee: '', bookFees: '', uniformFees: '', activityFees: '', paymentPlanType: 'شهري' }));
    const csv = toCSV(headers, rows);
    downloadCSV('Fees.csv', csv);
  };

  const handleGenerateTemplates = async () => {
    if (!settings) { addToast('احفظ الإعدادات أولاً.', 'error'); return; }
    try {
      if (genSelecting.students) buildStudentsTemplate();
      if (genSelecting.classes) buildClassesTemplate();
      if (genSelecting.subjects) buildSubjectsTemplate();
      if (genSelecting.classSubjectTeachers) buildClassSubjectTeachersTemplate();
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


  const exportStudentsCSV = async () => {
    const students = await api.getSchoolStudents(schoolId);
    const classes = await api.getSchoolClasses(schoolId);
    const pairs = await Promise.all(classes.map(async (c: any) => {
      try { const roster = await api.getClassStudents(c.id); return roster.map(s => ({ id: s.id, className: `${c.gradeLevel} (${c.section||'أ'})` })); } catch { return []; }
    }));
    const idToClass: Record<string,string> = {};
    pairs.flat().forEach(p => { idToClass[String(p.id)] = p.className; });
    const rows = students.map((s: any) => ({ studentId: s.id, nationalId: s.nationalId||'', name: s.name, dateOfBirth: s.dateOfBirth||'', gender: s.gender||'', city: s.city||'', address: s.address||'', admissionDate: s.admissionDate||'', parentName: s.parentName||'', parentPhone: s.parentPhone||'', parentEmail: s.parentEmail||'', className: idToClass[String(s.id)]||'' }));
    const f = exportFilters.className.trim();
    const filtered = f ? rows.filter(r => r.className === f) : rows;
    const csv = toCSV(['studentId','nationalId','name','dateOfBirth','gender','city','address','admissionDate','parentName','parentPhone','parentEmail','className'], filtered);
    downloadCSV('Export_Students.csv', csv);
  };

  const exportClassesCSV = async () => {
    const classes = await api.getSchoolClasses(schoolId);
    const teachers = await api.getSchoolTeachers(schoolId);
    const tMap: Record<string,string> = {};
    teachers.forEach((t: any) => { tMap[String(t.id)] = t.name; });
    const rows = classes.map((c: any) => ({ gradeLevel: c.gradeLevel, section: c.section||'أ', capacity: c.capacity||30, homeroomTeacherName: c.homeroomTeacherId ? (tMap[String(c.homeroomTeacherId)]||'') : '' }));
    const csv = toCSV(['gradeLevel','section','capacity','homeroomTeacherName'], rows);
    downloadCSV('Export_Classes.csv', csv);
  };

  const exportSubjectsCSV = async () => {
    const classes = await api.getSchoolClasses(schoolId);
    const rows: any[] = [];
    for (const c of classes as any[]) {
      const className = `${c.gradeLevel} (${c.section||'أ'})`;
      const list: string[] = Array.isArray((c as any).subjects) ? (c as any).subjects : [];
      if (list.length === 0) {
        try { const sched = await api.getSchedule(c.id); list.push(...Array.from(new Set((sched||[]).map((x: any) => x.subject).filter(Boolean)))); } catch {}
      }
      list.forEach(s => rows.push({ className, subjectName: s }));
    }
    const f = exportFilters.className.trim();
    const filtered = f ? rows.filter(r => r.className === f) : rows;
    const csv = toCSV(['className','subjectName'], filtered);
    downloadCSV('Export_Subjects.csv', csv);
  };

  const exportClassSubjectTeachersCSV = async () => {
    const classes = await api.getSchoolClasses(schoolId);
    const rows: any[] = [];
    for (const c of classes as any[]) {
      const className = `${c.gradeLevel} (${c.section||'أ'})`;
      try {
        const sched = await api.getSchedule(c.id);
        (sched||[]).forEach((x: any) => rows.push({ className, subjectName: x.subject, teacherName: x.teacherName||'' }));
      } catch {}
    }
    const f = exportFilters.className.trim();
    const filtered = f ? rows.filter(r => r.className === f) : rows;
    const csv = toCSV(['className','subjectName','teacherName'], filtered);
    downloadCSV('Export_ClassSubjectTeachers.csv', csv);
  };

  const exportGradesCSV = async () => {
    const entries = await api.getAllGrades(schoolId);
    const classes = await api.getSchoolClasses(schoolId);
    const idToName: Record<string,string> = {};
    classes.forEach((c: any) => { idToName[String(c.id)] = `${c.gradeLevel} (${c.section||'أ'})`; });
    const rows = (entries||[]).map((e: any) => ({ className: idToName[String(e.classId)]||'', subjectName: e.subject, studentId: e.studentId, studentName: e.studentName||'', homework: e.grades?.homework||0, quiz: e.grades?.quiz||0, midterm: e.grades?.midterm||0, final: e.grades?.final||0 }));
    const f = exportFilters.className.trim();
    const filtered = f ? rows.filter(r => r.className === f) : rows;
    const csv = toCSV(['className','subjectName','studentId','studentName','homework','quiz','midterm','final'], filtered);
    downloadCSV('Export_Grades.csv', csv);
  };

  const exportAttendanceCSV = async () => {
    const date = exportFilters.date.trim();
    if (!date) { addToast('حدد تاريخاً للحضور.', 'warning'); return; }
    const classes = await api.getSchoolClasses(schoolId);
    const rows: any[] = [];
    for (const c of classes as any[]) {
      const className = `${c.gradeLevel} (${c.section||'أ'})`;
      if (exportFilters.className.trim() && exportFilters.className.trim() !== className) continue;
      try {
        const res = await api.getAttendance(c.id, date);
        const arr = Array.isArray(res) ? res : (((res as any)?.records as any[]) || []);
        (arr||[]).forEach((r: any) => rows.push({ date, className, studentId: r.studentId, status: r.status }));
      } catch {}
    }
    const csv = toCSV(['date','className','studentId','status'], rows);
    downloadCSV('Export_Attendance.csv', csv);
  };

  const exportScheduleCSV = async () => {
    const classes = await api.getSchoolClasses(schoolId);
    const rows: any[] = [];
    for (const c of classes as any[]) {
      const className = `${c.gradeLevel} (${c.section||'أ'})`;
      if (exportFilters.className.trim() && exportFilters.className.trim() !== className) continue;
      try {
        const sched = await api.getSchedule(c.id);
        (sched||[]).forEach((x: any) => rows.push({ className, day: x.day, timeSlot: x.timeSlot, subjectName: x.subject, teacherName: x.teacherName||'' }));
      } catch {}
    }
    const csv = toCSV(['className','day','timeSlot','subjectName','teacherName'], rows);
    downloadCSV('Export_Schedule.csv', csv);
  };

  const exportFeesCSV = async () => {
    const list = await api.getFeeSetups(schoolId);
    const rows = (list||[]).map((x: any) => ({ stage: x.stage, tuitionFee: x.tuitionFee||0, bookFees: x.bookFees||0, uniformFees: x.uniformFees||0, activityFees: x.activityFees||0, paymentPlanType: x.paymentPlanType||'شهري' }));
    const csv = toCSV(['stage','tuitionFee','bookFees','uniformFees','activityFees','paymentPlanType'], rows);
    downloadCSV('Export_Fees.csv', csv);
  };

  const exportTeachersCSV = async () => {
    const list = await api.getSchoolTeachers(schoolId);
    const rows = (list||[]).map((t: any) => ({ teacherId: t.id, name: t.name, phone: t.phone||'', subject: t.subject||'' }));
    const csv = toCSV(['teacherId','name','phone','subject'], rows);
    downloadCSV('Export_Teachers.csv', csv);
  };

  const exportParentsCSV = async () => {
    const list = await api.getSchoolParents(schoolId);
    const rows = (list||[]).map((p: any) => ({ parentId: p.id, name: p.name, email: p.email||'', phone: p.phone||'', studentId: p.studentId }));
    const csv = toCSV(['parentId','name','email','phone','studentId'], rows);
    downloadCSV('Export_Parents.csv', csv);
  };

  const handleExportSelected = async () => {
    try {
      if (exportSelecting.students) await exportStudentsCSV();
      if (exportSelecting.classes) await exportClassesCSV();
      if (exportSelecting.subjects) await exportSubjectsCSV();
      if (exportSelecting.classSubjectTeachers) await exportClassSubjectTeachersCSV();
      if (exportSelecting.grades) await exportGradesCSV();
      if (exportSelecting.attendance) await exportAttendanceCSV();
      if (exportSelecting.schedule) await exportScheduleCSV();
      if (exportSelecting.fees) await exportFeesCSV();
      if (exportSelecting.teachers) await exportTeachersCSV();
      if (exportSelecting.parents) await exportParentsCSV();
      addToast('تم تصدير البيانات المحددة.', 'success');
    } catch { addToast('فشل تصدير البيانات.', 'error'); }
  };

  const handleDownloadZipSelected = async () => {
    try {
      const types = Object.entries(backupSelecting).filter(([,v]) => !!v).map(([k]) => k);
      const blob = await api.downloadBackupZip(schoolId, { types, filters: exportFilters });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Backup_${new Date().toISOString().slice(0,19).replace(/[:]/g,'-')}.zip`; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
      addToast('تم تنزيل الحزمة.', 'success');
    } catch { addToast('فشل تنزيل الحزمة.', 'error'); }
  };


  const saveBackupSchedule = async () => {
    try {
      const types = Object.entries(backupSelecting).filter(([,v]) => !!v).map(([k]) => k);
      const payload = { ...backupConfig, types };
      await api.updateBackupConfig(schoolId, payload);
      addToast('تم حفظ الجدولة.', 'success');
    } catch { addToast('فشل حفظ الجدولة.', 'error'); }
  };

  const runBackupNow = async () => {
    try {
      const types = Object.entries(backupSelecting).filter(([,v]) => !!v).map(([k]) => k);
      await api.runBackupStore(schoolId, { types, filters: exportFilters });
      const list = await api.getSchoolBackups(schoolId);
      setBackupsList(list);
      addToast('تم إنشاء نسخة احتياطية.', 'success');
    } catch { addToast('فشل إنشاء النسخة.', 'error'); }
  };

  const handleDownloadStored = async (file: string) => {
    try {
      const blob = await api.downloadStoredBackup(schoolId, file);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
      addToast('تم تنزيل النسخة.', 'success');
    } catch { addToast('فشل تنزيل النسخة.', 'error'); }
  };

  const parseCSVText = (text: string): { headers: string[]; rows: any[] } => {
    const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(l => l.trim() !== '');
    const parseLine = (line: string) => {
      const out: string[] = [];
      let cur = ''; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQ) {
          if (ch === '"') {
            if (line[i+1] === '"') { cur += '"'; i++; } else { inQ = false; }
          } else { cur += ch; }
        } else {
          if (ch === '"') inQ = true;
          else if (ch === ',') { out.push(cur); cur = ''; }
          else cur += ch;
        }
      }
      out.push(cur);
      return out;
    };
    const headers = lines.length ? parseLine(lines[0]).map(h => h.trim()) : [];
    const rows = lines.slice(1).map(l => {
      const cols = parseLine(l);
      const obj: any = {};
      headers.forEach((h, idx) => { obj[h] = cols[idx] || ''; });
      return obj;
    });
    return { headers, rows };
  };

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const computeNextRunLabel = (): string => {
    const cfg = backupConfig;
    const now = new Date();
    if (cfg.enabledDaily) {
      const parts = String(cfg.dailyTime || '02:00').split(':');
      const hh = Number(parts[0] || 0);
      const mm = Number(parts[1] || 0);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
      const next = today.getTime() > now.getTime() ? today : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hh, mm, 0, 0);
      return next.toLocaleString();
    }
    if (cfg.enabledMonthly) {
      const parts = String(cfg.monthlyTime || '03:00').split(':');
      const hh = Number(parts[0] || 0);
      const mm = Number(parts[1] || 0);
      const day = Math.max(1, Math.min(Number(cfg.monthlyDay || 1), 31));
      const daysThisMonth = getDaysInMonth(now.getFullYear(), now.getMonth());
      const targetDayThis = Math.min(day, daysThisMonth);
      let next = new Date(now.getFullYear(), now.getMonth(), targetDayThis, hh, mm, 0, 0);
      if (next.getTime() <= now.getTime()) {
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const daysNext = getDaysInMonth(y, m);
        const targetDayNext = Math.min(day, daysNext);
        next = new Date(y, m, targetDayNext, hh, mm, 0, 0);
      }
      return next.toLocaleString();
    }
    return 'غير مفعل';
  };
  const getLatestBackupLabel = (): string => {
    if (!Array.isArray(backupsList) || backupsList.length === 0) return 'لا توجد نسخ بعد';
    const latest = backupsList.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return new Date(latest.createdAt).toLocaleString();
  };

  const toEnDay = (d: string) => {
    const x = (d || '').trim();
    if (x === 'الأحد') return 'Sunday';
    if (x === 'الاثنين') return 'Monday';
    if (x === 'الثلاثاء') return 'Tuesday';
    if (x === 'الأربعاء') return 'Wednesday';
    if (x === 'الخميس') return 'Thursday';
    if (x === 'الجمعة') return 'Friday';
    if (x === 'السبت') return 'Saturday';
    return x;
  };

  const mapAttendanceStatus = (s: string): AttendanceStatus => {
    const v = (s || '').trim();
    if (/^حاضر$/i.test(v) || /^Present$/i.test(v)) return AttendanceStatus.Present;
    if (/^غائب$/i.test(v) || /^Absent$/i.test(v)) return AttendanceStatus.Absent;
    if (/^متأخر$/i.test(v) || /^Late$/i.test(v)) return AttendanceStatus.Late;
    if (/^(بعذر|مُعفى)$/i.test(v) || /^Excused$/i.test(v)) return AttendanceStatus.Excused;
    return AttendanceStatus.Present;
  };

  const mapPaymentPlan = (s: string) => {
    const v = (s || '').trim();
    if (v === 'شهري' || /^Monthly$/i.test(v)) return 'Monthly';
    if (v === 'فصلي' || /^Termly$/i.test(v) || /^Quarterly$/i.test(v)) return 'Termly';
    if (v === 'سنوي' || /^Yearly$/i.test(v)) return 'Installments';
    return 'Monthly';
  };

  const importStudents = async (rows: any[]) => {
    const logs: string[] = [];
    const classes = await api.getSchoolClasses(schoolId);
    const existingStudents = await api.getSchoolStudents(schoolId);
    const norm = (s: string) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const byNameDobArr: Record<string, any[]> = {};
    const byNamePhoneArr: Record<string, any[]> = {};
    for (const s of existingStudents) {
      const k1 = norm(s.name) + '|' + String(s.dateOfBirth || '');
      const k2 = norm(s.name) + '|' + String(s.parentPhone || '');
      (byNameDobArr[k1] ||= []).push(s);
      (byNamePhoneArr[k2] ||= []).push(s);
    }
    for (const r of rows) {
      try {
        const className = r.className || '';
        const gradeFromClass = className ? (className.split(' ')[0] || '') : '';
        const admissionDate = r.admissionDate || (settings?.academicYearStart || new Date().toISOString().slice(0,10));
        const payload: any = {
          name: r.name,
          grade: r.grade || gradeFromClass || 'الأول',
          parentName: r.parentName || '',
          dateOfBirth: r.dateOfBirth || '',
          gender: (r.gender === 'أنثى' ? 'أنثى' : 'ذكر'),
          nationalId: r.nationalId || '',
          parentPhone: r.parentPhone || '',
          parentEmail: r.parentEmail || '',
          address: r.address || '',
          city: r.city || '',
          admissionDate,
          emergencyContactName: r.emergencyContactName || r.parentName || '',
          emergencyContactPhone: r.emergencyContactPhone || r.parentPhone || '',
          medicalNotes: r.medicalNotes || ''
        };
        const keyDob = norm(payload.name) + '|' + String(payload.dateOfBirth || '');
        const keyPhone = norm(payload.name) + '|' + String(payload.parentPhone || '');
        let existing: any | null = null;
        const arrDob = byNameDobArr[keyDob] || [];
        const arrPhone = byNamePhoneArr[keyPhone] || [];
        if (arrDob.length === 1) existing = arrDob[0];
        else if (arrDob.length > 1) { logs.push(`مطابقة غامضة: ${payload.name} (${payload.dateOfBirth})`); continue; }
        else if (arrPhone.length === 1) existing = arrPhone[0];
        else if (arrPhone.length > 1) { logs.push(`مطابقة غامضة: ${payload.name} (هاتف ولي الأمر ${payload.parentPhone})`); continue; }
        const created = existing
          ? await api.updateStudent(existing.id, { name: payload.name, grade: payload.grade, parentName: payload.parentName, dateOfBirth: payload.dateOfBirth, status: StudentStatus.Active })
          : await api.addSchoolStudent(schoolId, payload);
        try { await api.upsertSchoolParent(schoolId, { name: payload.parentName, email: payload.parentEmail, phone: payload.parentPhone, studentId: created.id }); } catch {}
        if (className) {
          let target = classes.find((c: any) => `${c.gradeLevel} (${c.section||'أ'})` === className);
          if (!target) {
            const gradeLevel = gradeFromClass || 'الأول';
            target = await api.addClass(schoolId, { name: className, gradeLevel, section: 'أ', capacity: 30, homeroomTeacherId: '', subjects: [] });
          }
          const roster = await api.getClassStudents(target.id);
          const ids = Array.from(new Set([...roster.map((s: any) => s.id), created.id]));
          await api.updateClassRoster({ schoolId, classId: target.id, studentIds: ids });
        }
        logs.push(`تم: ${r.name}`);
      } catch {
        logs.push(`فشل: ${r.name}`);
      }
    }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importClasses = async (rows: any[]) => {
    const logs: string[] = [];
    for (const r of rows) {
      try {
        const created = await api.addClass(schoolId, { name: `${r.gradeLevel} (${r.section||'أ'})`, gradeLevel: r.gradeLevel, section: r.section||'أ', capacity: Number(r.capacity||30), homeroomTeacherId: '', subjects: [] });
        logs.push(`تم: ${created.name}`);
      } catch {
        logs.push(`فشل: ${r.gradeLevel}`);
      }
    }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importSubjects = async (rows: any[]) => {
    const logs: string[] = [];
    try {
      const classes = await api.getSchoolClasses(schoolId);
      const groups: Record<string, string[]> = {};
      for (const r of rows) {
        const className = String(r.className||'').trim();
        const subjectName = String(r.subjectName||'').trim();
        if (!className || !subjectName) { logs.push('سجل مواد ناقص'); continue; }
        (groups[className] ||= []).push(subjectName);
      }
      for (const [className, subjects] of Object.entries(groups)) {
        const cls = classes.find((c: any) => `${c.gradeLevel} (${c.section||'أ'})` === className);
        if (!cls) { logs.push(`فصل غير موجود: ${className}`); continue; }
        const unique = Array.from(new Set(subjects.filter(s => s))); 
        try { await api.updateClassSubjects(schoolId, cls.id, unique); logs.push(`تم تحديث مواد: ${className}`); } catch { logs.push(`فشل تحديث مواد: ${className}`); }
      }
    } catch { logs.push('تعذر تحميل الفصول'); }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importClassSubjectTeachers = async (rows: any[]) => {
    const logs: string[] = [];
    try {
      const classes = await api.getSchoolClasses(schoolId);
      const teachers = await api.getSchoolTeachers(schoolId);
      const groups: Record<string, any[]> = {};
      for (const r of rows) {
        const className = String(r.className||'').trim();
        if (!className) { logs.push('سجل ربط ناقص'); continue; }
        (groups[className] ||= []).push(r);
      }
      for (const [className, group] of Object.entries(groups)) {
        const cls = classes.find((c: any) => `${c.gradeLevel} (${c.section||'أ'})` === className);
        if (!cls) { logs.push(`فصل غير موجود: ${className}`); continue; }
        const mapping: Record<string, string> = {};
        for (const r of group) {
          const subject = String(r.subjectName||'').trim();
          const tName = String(r.teacherName||'').trim();
          if (!subject || !tName) { continue; }
          const t = teachers.find((x: any) => String(x.name).trim() === tName);
          if (t) mapping[subject] = String(t.id);
        }
        try { await api.updateSubjectTeacherMap(schoolId, String(cls.id), mapping); logs.push(`تم ربط مواد بمعلمين: ${className}`); } catch { logs.push(`فشل ربط مواد: ${className}`); }
      }
    } catch { logs.push('تعذر تحميل الفصول أو المعلمين'); }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importGrades = async (rows: any[]) => {
    const logs: string[] = [];
    try {
      const classes = await api.getSchoolClasses(schoolId);
      const students = await api.getSchoolStudents(schoolId);
      const norm = (s: string) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const byNameDobMap: Record<string, string[]> = {};
      const byNamePhoneMap: Record<string, string[]> = {};
      for (const s of students) {
        const k1 = norm(s.name) + '|' + String(s.dateOfBirth || '');
        const k2 = norm(s.name) + '|' + String(s.parentPhone || '');
        (byNameDobMap[k1] ||= []).push(String(s.id));
        (byNamePhoneMap[k2] ||= []).push(String(s.id));
      }
      const entries: any[] = [];
      for (const r of rows) {
        try {
          const cls = classes.find((c: any) => `${c.gradeLevel} (${c.section||'أ'})` === r.className);
          if (!cls) { logs.push(`فصل غير موجود: ${r.className}`); continue; }
          let sid = String(r.studentId || '').trim();
          if (!sid) {
            const k1 = norm(r.studentName || '') + '|' + String(r.dateOfBirth || '');
            const k2 = norm(r.studentName || '') + '|' + String(r.parentPhone || '');
            const arr1 = byNameDobMap[k1] || [];
            const arr2 = byNamePhoneMap[k2] || [];
            if (arr1.length === 1) sid = arr1[0];
            else if (arr1.length > 1) { logs.push(`مطابقة غامضة درجات: ${r.studentName} (${r.dateOfBirth})`); continue; }
            else if (arr2.length === 1) sid = arr2[0];
            else if (arr2.length > 1) { logs.push(`مطابقة غامضة درجات: ${r.studentName} (هاتف ولي الأمر ${r.parentPhone||''})`); continue; }
            else { logs.push(`طالب غير موجود: ${r.studentName || r.studentId}`); continue; }
          }
          entries.push({ classId: cls.id, subject: r.subjectName, studentId: sid, studentName: '', grades: { homework: Number(r.homework||0), quiz: Number(r.quiz||0), midterm: Number(r.midterm||0), final: Number(r.final||0) } });
        } catch {
          logs.push(`فشل تجهيز درجات: ${r.studentId} في ${r.className}`);
        }
      }
      if (entries.length > 0) {
        await api.saveGrades(entries);
        logs.push(`تم حفظ ${entries.length} صف درجات.`);
      }
    } catch {
      logs.push('تعذر تحميل الفصول');
    }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importAttendance = async (rows: any[]) => {
    const logs: string[] = [];
    try {
      const classes = await api.getSchoolClasses(schoolId);
      const students = await api.getSchoolStudents(schoolId);
      const norm = (s: string) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const byNameDobMap2: Record<string, string[]> = {};
      const byNamePhoneMap2: Record<string, string[]> = {};
      const studentNameById = new Map((students || []).map((s: any) => [String(s.id), String(s.name || '')]));
      for (const s of students) {
        const k1 = norm(s.name) + '|' + String(s.dateOfBirth || '');
        const k2 = norm(s.name) + '|' + String(s.parentPhone || '');
        (byNameDobMap2[k1] ||= []).push(String(s.id));
        (byNamePhoneMap2[k2] ||= []).push(String(s.id));
      }
      const groups: Record<string, any[]> = {};
      for (const r of rows) {
        const key = `${(r.className || '').trim()}||${(r.date || '').trim()}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      }
      for (const [key, group] of Object.entries(groups)) {
        const [className, date] = key.split('||');
        const cls = classes.find((c: any) => `${c.gradeLevel} (${c.section||'أ'})` === className);
        if (!cls) { logs.push(`فصل غير موجود: ${className}`); continue; }
        const records = group.map((r: any) => {
          let sid = String(r.studentId || '').trim();
          if (!sid) {
            const k1 = norm(r.studentName || '') + '|' + String(r.dateOfBirth || '');
            const k2 = norm(r.studentName || '') + '|' + String(r.parentPhone || '');
            const arr1 = byNameDobMap2[k1] || [];
            const arr2 = byNamePhoneMap2[k2] || [];
            if (arr1.length === 1) sid = arr1[0];
            else if (arr1.length > 1) sid = '';
            else if (arr2.length === 1) sid = arr2[0];
            else if (arr2.length > 1) sid = '';
          }
          if (!sid) return null;
          const resolvedName = studentNameById.get(sid) || String(r.studentName || '');
          return { studentId: sid, studentName: resolvedName, status: mapAttendanceStatus(r.status) };
        }).filter(Boolean) as { studentId: string; studentName: string; status: AttendanceStatus }[];
        try {
          await api.saveAttendance(cls.id, date, records);
          logs.push(`تم حفظ حضور ${records.length} سجل: ${className} ${date}`);
        } catch {
          logs.push(`فشل حفظ حضور: ${className} ${date}`);
        }
      }
    } catch {
      logs.push('تعذر تحميل الفصول');
    }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importSchedule = async (rows: any[]) => {
    const logs: string[] = [];
    try {
      const classes = await api.getSchoolClasses(schoolId);
      const teachers = await api.getSchoolTeachers(schoolId);
      const groups: Record<string, any[]> = {};
      for (const r of rows) {
        const key = (r.className || '').trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      }
      for (const [className, group] of Object.entries(groups)) {
        const cls = classes.find((c: any) => `${c.gradeLevel} (${c.section||'أ'})` === className);
        if (!cls) { logs.push(`فصل غير موجود: ${className}`); continue; }
        const entries: { day: 'Sunday'|'Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'; timeSlot: string; subject: string; }[] = [];
        const mapping: Record<string, string> = {};
        for (const r of group) {
          const day = toEnDay(r.day) as any;
          const timeSlot = r.timeSlot || '';
          const subject = r.subjectName || '';
          if (day && timeSlot && subject) entries.push({ day, timeSlot, subject });
          const tName = (r.teacherName || '').trim();
          if (tName) {
            const t = teachers.find((x: any) => String(x.name).trim() === tName);
            if (t) mapping[subject] = String(t.id);
          }
        }
        try {
          if (entries.length > 0) {
            await api.saveClassSchedule(cls.id, entries);
          }
          if (Object.keys(mapping).length > 0) {
            await api.updateSubjectTeacherMap(schoolId, cls.id, mapping);
          }
          logs.push(`تم حفظ جدول ${entries.length} حصة: ${className}`);
        } catch {
          logs.push(`فشل حفظ جدول: ${className}`);
        }
      }
    } catch {
      logs.push('تعذر تحميل الفصول أو المعلمين');
    }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const importFees = async (rows: any[]) => {
    const logs: string[] = [];
    try {
      const existing = await api.getFeeSetups(schoolId);
      for (const r of rows) {
        const stage = (r.stage || '').trim();
        const payload: any = {
          stage,
          tuitionFee: Number(r.tuitionFee || 0),
          bookFees: Number(r.bookFees || 0),
          uniformFees: Number(r.uniformFees || 0),
          activityFees: Number(r.activityFees || 0),
          paymentPlanType: mapPaymentPlan(r.paymentPlanType || 'شهري'),
        };
        try {
          const found = existing.find((x: any) => String(x.stage).trim() === stage);
          if (found) {
            await api.updateFeeSetup(schoolId, found.id, payload);
            logs.push(`تم تحديث رسوم مرحلة: ${stage}`);
          } else {
            await api.createFeeSetup(schoolId, payload);
            logs.push(`تم إنشاء رسوم مرحلة: ${stage}`);
          }
        } catch {
          logs.push(`فشل معالجة رسوم مرحلة: ${stage}`);
        }
      }
    } catch {
      logs.push('تعذر تحميل إعدادات الرسوم');
    }
    setImportState(prev => ({ ...prev, logs: [...prev.logs, ...logs] }));
  };

  const validateAll = async () => {
    try {
      const [classes, students, teachers] = await Promise.all([
        api.getSchoolClasses(schoolId),
        api.getSchoolStudents(schoolId),
        api.getSchoolTeachers(schoolId)
      ]);
      const classNames = new Set(classes.map((c: any) => `${c.gradeLevel} (${c.section||'أ'})`));
      const studentIds = new Set(students.map((s: any) => String(s.id)));
      const teacherNames = new Set(teachers.map((t: any) => String(t.name).trim()));

      const studentsErrors: string[] = [];
      let studentsValid = 0, studentsInvalid = 0;
      for (const r of importState.students) {
        const nameOk = !!String(r.name || '').trim();
        const parentOk = !!(String(r.parentPhone||'').trim() || String(r.parentEmail||'').trim() || String(r.parentName||'').trim());
        const cls = String(r.className||'').trim();
        const clsOk = !cls || classNames.has(cls);
        if (nameOk && parentOk && clsOk) studentsValid++; else {
          studentsInvalid++;
          const errs = [!nameOk ? 'اسم الطالب مفقود' : '', !parentOk ? 'بيانات ولي الأمر ناقصة' : '', (!clsOk ? `فصل غير موجود: ${cls}` : '')].filter(Boolean).join(' — ');
          studentsErrors.push(`${r.name || 'سجل'}: ${errs}`);
        }
      }

      const classesErrors: string[] = [];
      let classesValid = 0, classesInvalid = 0;
      for (const r of importState.classes) {
        const ok = !!String(r.gradeLevel||'').trim();
        if (ok) classesValid++; else { classesInvalid++; classesErrors.push('صف بدون مستوى'); }
      }

      const gradesErrors: string[] = [];
      let gradesValid = 0, gradesInvalid = 0;
      for (const r of importState.grades) {
        const cls = String(r.className||'').trim();
        const sid = String(r.studentId||'').trim();
        const subj = String(r.subjectName||'').trim();
        const numsOk = ['homework','quiz','midterm','final'].every(k => String(r[k]||'').trim() === '' || !isNaN(Number(r[k])));
        const ok = (!!cls && classNames.has(cls)) && (!!sid && studentIds.has(sid)) && !!subj && numsOk;
        if (ok) gradesValid++; else {
          gradesInvalid++;
          const errs = [!classNames.has(cls) ? `فصل غير موجود: ${cls}` : '', !studentIds.has(sid) ? `طالب غير موجود: ${sid}` : '', !subj ? 'مادة مفقودة' : '', !numsOk ? 'قيم درجات غير رقمية' : ''].filter(Boolean).join(' — ');
          gradesErrors.push(`سجل درجات: ${errs}`);
        }
      }

      const attendanceErrors: string[] = [];
      let attendanceValid = 0, attendanceInvalid = 0;
      for (const r of importState.attendance) {
        const cls = String(r.className||'').trim();
        const sid = String(r.studentId||'').trim();
        const date = String(r.date||'').trim();
        const status = String(r.status||'').trim();
        const statusOk = ['حاضر','غائب','متأخر','بعذر','مُعفى','Present','Absent','Late','Excused'].includes(status);
        const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date);
        const ok = (!!cls && classNames.has(cls)) && (!!sid && studentIds.has(sid)) && statusOk && dateOk;
        if (ok) attendanceValid++; else {
          attendanceInvalid++;
          const errs = [!classNames.has(cls) ? `فصل غير موجود: ${cls}` : '', !studentIds.has(sid) ? `طالب غير موجود: ${sid}` : '', !statusOk ? 'حالة حضور غير معروفة' : '', !dateOk ? 'تاريخ غير صحيح (YYYY-MM-DD)' : ''].filter(Boolean).join(' — ');
          attendanceErrors.push(`سجل حضور: ${errs}`);
        }
      }
    } catch {
      addToast('تعذر إجراء التحقق.', 'error');
    }
  };

  const validateAllPreview = async () => {
    try {
      const [classes, students, teachers] = await Promise.all([
        api.getSchoolClasses(schoolId),
        api.getSchoolStudents(schoolId),
        api.getSchoolTeachers(schoolId)
      ]);
      const classNames = new Set(classes.map((c: any) => `${c.gradeLevel} (${c.section||'أ'})`));
      const studentIds = new Set(students.map((s: any) => String(s.id)));
      const teacherNames = new Set(teachers.map((t: any) => String(t.name).trim()));
      const norm = (s: string) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const byNameDobMap: Record<string, string[]> = {};
      const byNamePhoneMap: Record<string, string[]> = {};
      for (const s of students) {
        const k1 = norm(s.name) + '|' + String(s.dateOfBirth || '');
        const k2 = norm(s.name) + '|' + String(s.parentPhone || '');
        (byNameDobMap[k1] ||= []).push(String(s.id));
        (byNamePhoneMap[k2] ||= []).push(String(s.id));
      }

      const studentsErrors: string[] = [];
      let studentsValid = 0, studentsInvalid = 0;
      for (const r of importState.students) {
        const nameOk = !!String(r.name || '').trim();
        const parentOk = !!(String(r.parentPhone||'').trim() || String(r.parentEmail||'').trim() || String(r.parentName||'').trim());
        const cls = String(r.className||'').trim();
        const clsOk = !cls || classNames.has(cls);
        const kCsvDob = norm(r.name || '') + '|' + String(r.dateOfBirth || '');
        const kCsvPhone = norm(r.name || '') + '|' + String(r.parentPhone || '');
        const dupDobCount = importState.students.filter(x => norm(x.name||'') + '|' + String(x.dateOfBirth||'') === kCsvDob).length;
        const dupPhoneCount = importState.students.filter(x => norm(x.name||'') + '|' + String(x.parentPhone||'') === kCsvPhone).length;
        if (nameOk && parentOk && clsOk) studentsValid++; else {
          studentsInvalid++;
          const errs = [!nameOk ? 'اسم الطالب مفقود' : '', !parentOk ? 'بيانات ولي الأمر ناقصة' : '', (!clsOk ? `فصل غير موجود: ${cls}` : ''), (dupDobCount>1 ? `تكرار في الملف (الاسم+تاريخ الميلاد)` : ''), (dupPhoneCount>1 ? `تكرار في الملف (الاسم+هاتف ولي الأمر)` : '')].filter(Boolean).join(' — ');
          studentsErrors.push(`${r.name || 'سجل'}: ${errs}`);
        }
      }

      const classesErrors: string[] = [];
      let classesValid = 0, classesInvalid = 0;
      for (const r of importState.classes) {
        const ok = !!String(r.gradeLevel||'').trim();
        if (ok) classesValid++; else { classesInvalid++; classesErrors.push('صف بدون مستوى'); }
      }

      const gradesErrors: string[] = [];
      let gradesValid = 0, gradesInvalid = 0;
      for (const r of importState.grades) {
        const cls = String(r.className||'').trim();
        const sid = String(r.studentId||'').trim();
        const subj = String(r.subjectName||'').trim();
        const numsOk = ['homework','quiz','midterm','final'].every(k => String(r[k]||'').trim() === '' || !isNaN(Number(r[k])));
        const ok = (!!cls && classNames.has(cls)) && (!!sid && studentIds.has(sid)) && !!subj && numsOk;
        if (ok) gradesValid++; else {
          gradesInvalid++;
          const k1 = norm(r.studentName || '') + '|' + String(r.dateOfBirth || '');
          const k2 = norm(r.studentName || '') + '|' + String(r.parentPhone || '');
          const amb = (!sid && ((byNameDobMap[k1]||[]).length>1 || (byNamePhoneMap[k2]||[]).length>1)) ? 'تطابق غامض في تحديد الطالب' : '';
          const errs = [!classNames.has(cls) ? `فصل غير موجود: ${cls}` : '', !studentIds.has(sid) && !amb ? `طالب غير موجود: ${sid || r.studentName || ''}` : '', amb, !subj ? 'مادة مفقودة' : '', !numsOk ? 'قيم درجات غير رقمية' : ''].filter(Boolean).join(' — ');
          gradesErrors.push(`سجل درجات: ${errs}`);
        }
      }

      const attendanceErrors: string[] = [];
      let attendanceValid = 0, attendanceInvalid = 0;
      for (const r of importState.attendance) {
        const cls = String(r.className||'').trim();
        const sid = String(r.studentId||'').trim();
        const date = String(r.date||'').trim();
        const status = String(r.status||'').trim();
        const statusOk = ['حاضر','غائب','متأخر','بعذر','مُعفى','Present','Absent','Late','Excused'].includes(status);
        const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date);
        const ok = (!!cls && classNames.has(cls)) && (!!sid && studentIds.has(sid)) && statusOk && dateOk;
        if (ok) attendanceValid++; else {
          attendanceInvalid++;
          const k1 = norm(r.studentName || '') + '|' + String(r.dateOfBirth || '');
          const k2 = norm(r.studentName || '') + '|' + String(r.parentPhone || '');
          const amb = (!sid && ((byNameDobMap[k1]||[]).length>1 || (byNamePhoneMap[k2]||[]).length>1)) ? 'تطابق غامض في تحديد الطالب' : '';
          const errs = [!classNames.has(cls) ? `فصل غير موجود: ${cls}` : '', !studentIds.has(sid) && !amb ? `طالب غير موجود: ${sid || r.studentName || ''}` : '', amb, !statusOk ? 'حالة حضور غير معروفة' : '', !dateOk ? 'تاريخ غير صحيح (YYYY-MM-DD)' : ''].filter(Boolean).join(' — ');
          attendanceErrors.push(`سجل حضور: ${errs}`);
        }
      }

      const scheduleErrors: string[] = [];
      let scheduleValid = 0, scheduleInvalid = 0;
      const daySet = new Set(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);
      const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d\s-\s(?:[01]\d|2[0-3]):[0-5]\d$/;
      for (const r of importState.schedule) {
        const cls = String(r.className||'').trim();
        const day = toEnDay(String(r.day||'').trim());
        const timeSlot = String(r.timeSlot||'').trim();
        const subject = String(r.subjectName||'').trim();
        const tName = String(r.teacherName||'').trim();
        const teacherOk = !tName || teacherNames.has(tName);
        const ok = (!!cls && classNames.has(cls)) && daySet.has(day) && timeRegex.test(timeSlot) && !!subject && teacherOk;
        if (ok) scheduleValid++; else {
          scheduleInvalid++;
          const errs = [!classNames.has(cls) ? `فصل غير موجود: ${cls}` : '', !daySet.has(day) ? 'يوم غير صحيح' : '', !timeRegex.test(timeSlot) ? 'وقت غير صحيح (HH:MM - HH:MM)' : '', !subject ? 'مادة مفقودة' : '', !teacherOk ? `معلم غير موجود: ${tName}` : ''].filter(Boolean).join(' — ');
          scheduleErrors.push(`سجل جدول: ${errs}`);
        }
      }

      const feesErrors: string[] = [];
      let feesValid = 0, feesInvalid = 0;
      for (const r of importState.fees) {
        const stage = String(r.stage||'').trim();
        const stageOk = stages.includes(stage);
        const numsOk = ['tuitionFee','bookFees','uniformFees','activityFees'].every(k => String(r[k]||'').trim() === '' || !isNaN(Number(r[k])));
        const ok = stageOk && numsOk;
        if (ok) feesValid++; else {
          feesInvalid++;
          const errs = [!stageOk ? `مرحلة غير معروفة: ${stage}` : '', !numsOk ? 'قيم الرسوم غير رقمية' : ''].filter(Boolean).join(' — ');
          feesErrors.push(`سجل رسوم: ${errs}`);
        }
      }

      const subjectsErrors: string[] = [];
      let subjectsValid = 0, subjectsInvalid = 0;
      for (const r of importState.subjects) {
        const cls = String(r.className||'').trim();
        const subject = String(r.subjectName||'').trim();
        const ok = !!cls && classNames.has(cls) && !!subject;
        if (ok) subjectsValid++; else { subjectsInvalid++; subjectsErrors.push(`سجل مواد: ${!classNames.has(cls) ? `فصل غير موجود: ${cls}` : (!subject ? 'مادة مفقودة' : 'بيانات ناقصة')}`); }
      }

      const cstErrors: string[] = [];
      let cstValid = 0, cstInvalid = 0;
      for (const r of importState.classSubjectTeachers) {
        const cls = String(r.className||'').trim();
        const subject = String(r.subjectName||'').trim();
        const tName = String(r.teacherName||'').trim();
        const ok = !!cls && classNames.has(cls) && !!subject && !!tName && teacherNames.has(tName);
        if (ok) cstValid++; else {
          cstInvalid++;
          const errs = [!classNames.has(cls) ? `فصل غير موجود: ${cls}` : '', !subject ? 'مادة مفقودة' : '', !tName ? 'اسم معلم مفقود' : (!teacherNames.has(tName) ? `معلم غير موجود: ${tName}` : '')].filter(Boolean).join(' — ');
          cstErrors.push(`سجل ربط: ${errs}`);
        }
      }

      setImportPreview({
        students: { valid: studentsValid, invalid: studentsInvalid, errors: studentsErrors },
        classes: { valid: classesValid, invalid: classesInvalid, errors: classesErrors },
        subjects: { valid: subjectsValid, invalid: subjectsInvalid, errors: subjectsErrors },
        classSubjectTeachers: { valid: cstValid, invalid: cstInvalid, errors: cstErrors },
        grades: { valid: gradesValid, invalid: gradesInvalid, errors: gradesErrors },
        attendance: { valid: attendanceValid, invalid: attendanceInvalid, errors: attendanceErrors },
        schedule: { valid: scheduleValid, invalid: scheduleInvalid, errors: scheduleErrors },
        fees: { valid: feesValid, invalid: feesInvalid, errors: feesErrors },
      });
    } catch {
      addToast('تعذر إجراء التحقق.', 'error');
    }
  };
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Draft Controls */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draftEnabled}
              onChange={(e) => setDraftEnabled(e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">حفظ المسودة تلقائياً</span>
          </label>
          {hasDraft && (
            <>
              <button type="button" onClick={restoreDraft} className="text-sm text-teal-600 hover:text-teal-700">
                استعادة المسودة
              </button>
              <button type="button" onClick={clearDraft} className="text-sm text-red-600 hover:text-red-700">
                حذف المسودة
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-md">
        <nav className="flex gap-2 overflow-x-auto" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <GeneralSettings
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onLogoChange={handleLogoChange}
          logoUploading={logoUploading}
          inputStyle={inputStyle}
        />
      )}

      {activeTab === 'school' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">إعدادات المدرسة</h3>
          <p className="text-gray-600 dark:text-gray-400">سيتم إضافة المزيد من الإعدادات قريباً...</p>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">إعدادات الأمان</h3>
          <p className="text-gray-600 dark:text-gray-400">سيتم إضافة المزيد من الإعدادات قريباً...</p>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">إعدادات الإشعارات</h3>
          <p className="text-gray-600 dark:text-gray-400">سيتم إضافة المزيد من الإعدادات قريباً...</p>
        </div>
      )}

      {activeTab === 'stages' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">إدارة المراحل والفصول</h3>
          <p className="text-gray-600 dark:text-gray-400">سيتم إضافة المزيد من الإعدادات قريباً...</p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </form>
  );
};

export default Settings;
