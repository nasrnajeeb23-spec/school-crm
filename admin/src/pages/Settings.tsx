import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { SchoolSettings, StudentStatus } from '../types';
import { useToast } from '../contexts/ToastContext';

interface SettingsProps {
    schoolId: number;
}

const Settings: React.FC<SettingsProps> = ({ schoolId }) => {
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  const [genSelecting, setGenSelecting] = useState<{students:boolean;classes:boolean;subjects:boolean;classSubjectTeachers:boolean;teachers:boolean;grades:boolean;attendance:boolean;schedule:boolean;fees:boolean}>({students:true,classes:true,subjects:true,classSubjectTeachers:true,teachers:true,grades:true,attendance:false,schedule:false,fees:true});
  const [importState, setImportState] = useState<{students:any[];classes:any[];subjects:any[];classSubjectTeachers:any[];grades:any[];attendance:any[];schedule:any[];fees:any[];logs:string[]}>({students:[],classes:[],subjects:[],classSubjectTeachers:[],grades:[],attendance:[],schedule:[],fees:[],logs:[]});
  const [importPreview, setImportPreview] = useState<{students:{valid:number;invalid:number;errors:string[]};classes:{valid:number;invalid:number;errors:string[]};subjects:{valid:number;invalid:number;errors:string[]};classSubjectTeachers:{valid:number;invalid:number;errors:string[]};grades:{valid:number;invalid:number;errors:string[]};attendance:{valid:number;invalid:number;errors:string[]};schedule:{valid:number;invalid:number;errors:string[]};fees:{valid:number;invalid:number;errors:string[]}}>({students:{valid:0,invalid:0,errors:[]},classes:{valid:0,invalid:0,errors:[]},subjects:{valid:0,invalid:0,errors:[]},classSubjectTeachers:{valid:0,invalid:0,errors:[]},grades:{valid:0,invalid:0,errors:[]},attendance:{valid:0,invalid:0,errors:[]},schedule:{valid:0,invalid:0,errors:[]},fees:{valid:0,invalid:0,errors:[]}});
  const [importProcessing, setImportProcessing] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getSchoolSettings(schoolId).then(data => {
      setSettings(data);
    }).catch(err => {
        console.error("Failed to load settings:", err);
    }).finally(() => {
        setLoading(false);
    });
  }, [schoolId]);

  const [exportSelecting, setExportSelecting] = useState<{students:boolean;classes:boolean;subjects:boolean;classSubjectTeachers:boolean;grades:boolean;attendance:boolean;schedule:boolean;fees:boolean;teachers:boolean;parents:boolean}>({students:true,classes:true,subjects:true,classSubjectTeachers:true,grades:true,attendance:false,schedule:false,fees:true,teachers:true,parents:true});
  const [exportFilters, setExportFilters] = useState<{className:string;date:string;subjectName:string}>({className:'',date:'',subjectName:''});
  const [backupSelecting, setBackupSelecting] = useState<{students:boolean;classes:boolean;subjects:boolean;classSubjectTeachers:boolean;grades:boolean;attendance:boolean;schedule:boolean;fees:boolean;teachers:boolean;parents:boolean}>({students:true,classes:true,subjects:true,classSubjectTeachers:true,grades:true,attendance:false,schedule:false,fees:true,teachers:true,parents:true});
  const [backupConfig, setBackupConfig] = useState<{enabledDaily:boolean;dailyTime:string;enabledMonthly:boolean;monthlyDay:number;monthlyTime:string;retainDays:number;types?:string[]}>({enabledDaily:false,dailyTime:'02:00',enabledMonthly:false,monthlyDay:1,monthlyTime:'03:00',retainDays:30,types:[]});
  const [backupsList, setBackupsList] = useState<any[]>([]);

  const setScheduleCfg = (update: Partial<{ periodCount: number; periodDurationMinutes: number; startTime: string; gapMinutes?: number }>) => {
    setSettings(prev => {
      if (!prev) return prev;
      const base = {
        periodCount: prev.scheduleConfig?.periodCount ?? 5,
        periodDurationMinutes: prev.scheduleConfig?.periodDurationMinutes ?? 60,
        startTime: prev.scheduleConfig?.startTime ?? '08:00',
        gapMinutes: prev.scheduleConfig?.gapMinutes ?? 0,
      };
      return { ...prev, scheduleConfig: { ...base, ...update } };
    });
  };

  useEffect(() => {
    api.getBackupConfig(schoolId).then(cfg => {
      setBackupConfig({
        enabledDaily: !!cfg.enabledDaily,
        dailyTime: cfg.dailyTime || '02:00',
        enabledMonthly: !!cfg.enabledMonthly,
        monthlyDay: Number(cfg.monthlyDay || 1),
        monthlyTime: cfg.monthlyTime || '03:00',
        retainDays: Number(cfg.retainDays || 30),
        types: Array.isArray(cfg.types) ? cfg.types : []
      });
      const typesArr = Array.isArray(cfg.types) ? cfg.types : [];
      if (typesArr.length > 0) {
        setBackupSelecting(prev => {
          const next: any = { ...prev };
          Object.keys(next).forEach(k => { next[k] = typesArr.includes(k); });
          return next;
        });
      }
    }).catch(() => {});
    api.getSchoolBackups(schoolId).then(setBackupsList).catch(() => {});
  }, [schoolId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => prev ? { ...prev, [name]: value } : null);
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSettings(prev => prev ? { ...prev, notifications: { ...prev.notifications, [name]: checked } } : null);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = await api.uploadSchoolLogo(schoolId, file);
      // Add timestamp to prevent caching issues
      const timestampedUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
      setSettings(prev => prev ? { ...prev, schoolLogoUrl: timestampedUrl } : null);
      addToast('تم رفع شعار المدرسة بنجاح.', 'success');
    } catch (err) {
      console.error('Failed to upload logo:', err);
      const m = String((err as any)?.message || '');
      addToast(m ? `فشل رفع شعار المدرسة: ${m}` : 'فشل رفع شعار المدرسة.', 'error');
    }
  };

  
  const handleStageToggle = (stage: string) => {
    setSettings(prev => {
      if (!prev) return prev;
      const current = prev.availableStages && prev.availableStages.length > 0 ? prev.availableStages : [];
      const exists = current.includes(stage);
      const next = exists ? current.filter(s => s !== stage) : [...current, stage];
      return { ...prev, availableStages: next };
    });
  };

  
  const handleDayToggle = (day: string) => {
    setSettings(prev => {
      if (!prev) return prev;
      const current = prev.workingDays && prev.workingDays.length > 0 ? prev.workingDays : [];
      const exists = current.includes(day);
      const next = exists ? current.filter(d => d !== day) : [...current, day];
      return { ...prev, workingDays: next };
    });
  };

  
  const handleAttendanceMethodToggle = (m: 'QR'|'RFID'|'Manual') => {
    setSettings(prev => {
      if (!prev) return prev;
      const arr = prev.attendanceMethods && prev.attendanceMethods.length > 0 ? prev.attendanceMethods : [];
      const exists = arr.includes(m);
      const next = exists ? arr.filter(x => x !== m) : [...arr, m];
      return { ...prev, attendanceMethods: next };
    });
  };

  
  const addTerm = () => {
    setSettings(prev => prev ? { ...prev, terms: [ ...(prev.terms || []), { name: '', start: '', end: '' } ] } : null);
  };
  const updateTerm = (idx: number, field: 'name'|'start'|'end', value: string) => {
    setSettings(prev => {
      if (!prev) return prev;
      const arr = [...(prev.terms || [])];
      const row = { ...(arr[idx] || { name: '', start: '', end: '' }) } as { name: string; start: string; end: string };
      (row as any)[field] = value;
      arr[idx] = row;
      return { ...prev, terms: arr };
    });
  };
  const removeTerm = (idx: number) => {
    setSettings(prev => {
      if (!prev) return prev;
      const arr = [...(prev.terms || [])];
      arr.splice(idx, 1);
      return { ...prev, terms: arr };
    });
  };

  
  const addHoliday = () => {
    setSettings(prev => prev ? { ...prev, holidays: [ ...(prev.holidays || []), { date: '', title: '' } ] } : null);
  };
  const updateHoliday = (idx: number, field: 'date'|'title', value: string) => {
    setSettings(prev => {
      if (!prev) return prev;
      const arr = [...(prev.holidays || [])];
      const row = { ...(arr[idx] || { date: '', title: '' }) } as { date: string; title: string };
      (row as any)[field] = value;
      arr[idx] = row;
      return { ...prev, holidays: arr };
    });
  };
  const removeHoliday = (idx: number) => {
    setSettings(prev => {
      if (!prev) return prev;
      const arr = [...(prev.holidays || [])];
      arr.splice(idx, 1);
      return { ...prev, holidays: arr };
    });
  };

  const handleLateThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setSettings(prev => prev ? { ...prev, lateThresholdMinutes: value === '' ? undefined : Number(value) } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
        await api.updateSchoolSettings(schoolId, settings);
        addToast('تم حفظ الإعدادات بنجاح!', 'success');
    } catch(err) {
        console.error("Failed to save settings:", err);
        const m = String((err as any)?.message || '');
        addToast(m ? `فشل حفظ الإعدادات: ${m}` : 'فشل حفظ الإعدادات.', 'error');
    } finally {
        setSaving(false);
    }
  };

  const handleAdmissionFieldToggle = (key: 'studentFields' | 'parentFields' | 'requiredDocuments', value: string) => {
    setSettings(prev => {
      if (!prev) return prev;
      const current = prev.admissionForm && Array.isArray((prev.admissionForm as any)[key]) ? (prev.admissionForm as any)[key] as string[] : [];
      const exists = current.includes(value);
      const next = exists ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, admissionForm: { ...prev.admissionForm, [key]: next } };
    });
  };

  if (loading) {
    return <div className="text-center p-8">جاري تحميل الإعدادات...</div>;
  }

  if (!settings) {
    return <div className="text-center p-8">لا يمكن تحميل الإعدادات.</div>;
  }

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700";

  const allStages = ["رياض أطفال","ابتدائي","إعدادي","ثانوي"];
  const stages = Array.isArray(settings.availableStages) && settings.availableStages.length > 0 ? settings.availableStages : allStages;
  const allDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const arDays: Record<string, string> = { Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت' };
  const workingDays = Array.isArray(settings.workingDays) && settings.workingDays.length > 0 ? settings.workingDays : ['Sunday','Monday','Tuesday','Wednesday','Thursday'];
  const attendanceMethods = Array.isArray(settings.attendanceMethods) && settings.attendanceMethods.length > 0 ? settings.attendanceMethods : ['Manual'];
  const terms = Array.isArray(settings.terms) && settings.terms.length > 0 ? settings.terms : [
    { name: 'الفصل الأول', start: settings.academicYearStart || '', end: '' },
    { name: 'الفصل الثاني', start: '', end: settings.academicYearEnd || '' }
  ];
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
        const arr = Array.isArray(res) ? res : (res?.records || []);
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

  const mapAttendanceStatus = (s: string): 'Present' | 'Absent' | 'Late' | 'Excused' => {
    const v = (s || '').trim();
    if (/^حاضر$/i.test(v) || /^Present$/i.test(v)) return 'Present';
    if (/^غائب$/i.test(v) || /^Absent$/i.test(v)) return 'Absent';
    if (/^متأخر$/i.test(v) || /^Late$/i.test(v)) return 'Late';
    if (/^مُعفى$/i.test(v) || /^Excused$/i.test(v)) return 'Excused';
    return 'Present';
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
          return sid ? { studentId: sid, status: mapAttendanceStatus(r.status) } : null;
        }).filter(Boolean) as { studentId: string; status: 'Present'|'Absent'|'Late'|'Excused' }[];
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

  return (
    <div className="mt-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">الإعدادات العامة للمدرسة</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المدرسة</label>
                    <input type="text" name="schoolName" id="schoolName" value={settings.schoolName} onChange={handleInputChange} className={inputStyle} />
                </div>
                 <div>
                    <label htmlFor="schoolAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300">عنوان المدرسة</label>
                    <input type="text" name="schoolAddress" id="schoolAddress" value={settings.schoolAddress} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                    <label htmlFor="schoolLogo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">شعار المدرسة</label>
                    <input type="file" id="schoolLogo" accept="image/*" onChange={handleLogoChange} className="mt-1 block w-full" />
                    {settings.schoolLogoUrl && (
                        <img 
                            src={api.getAssetUrl(settings.schoolLogoUrl as string)} 
                            alt="School Logo" 
                            className="mt-2 w-16 h-16 rounded object-contain" 
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    )}
                </div>
                <div>
                    <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">هاتف التواصل</label>
                    <input type="tel" name="contactPhone" id="contactPhone" value={settings.contactPhone || ''} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                    <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
                    <input type="email" name="contactEmail" id="contactEmail" value={settings.contactEmail || ''} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                    <label htmlFor="geoLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الموقع الجغرافي</label>
                    <input type="text" name="geoLocation" id="geoLocation" value={settings.geoLocation || ''} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h3 className="text-md font-semibold mb-3 text-gray-800 dark:text-white">إعدادات الاتصالات</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">البريد الإلكتروني</span>
                        <label className="inline-flex items-center cursor-pointer">
                          <span className="mr-2 text-xs">استخدام مزود المنصة</span>
                          <input type="checkbox" checked={!!settings.emailConfig?.usePlatformProvider} onChange={(e)=>setSettings(prev=>prev?{...prev,emailConfig:{...(prev.emailConfig||{}),usePlatformProvider:e.target.checked}}:null)} />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <input type="text" placeholder="SMTP Host" value={settings.emailConfig?.host||''} onChange={(e)=>setSettings(prev=>prev?{...prev,emailConfig:{...(prev.emailConfig||{}),host:e.target.value}}:null)} className={inputStyle} disabled={!!settings.emailConfig?.usePlatformProvider} />
                        <input type="number" placeholder="SMTP Port" value={settings.emailConfig?.port||'' as any} onChange={(e)=>setSettings(prev=>prev?{...prev,emailConfig:{...(prev.emailConfig||{}),port:Number(e.target.value)}}:null)} className={inputStyle} disabled={!!settings.emailConfig?.usePlatformProvider} />
                        <label className="inline-flex items-center">
                          <input type="checkbox" checked={!!settings.emailConfig?.secure} onChange={(e)=>setSettings(prev=>prev?{...prev,emailConfig:{...(prev.emailConfig||{}),secure:e.target.checked}}:null)} disabled={!!settings.emailConfig?.usePlatformProvider} />
                          <span className="ml-2 text-sm">اتصال آمن (SSL)</span>
                        </label>
                        <input type="text" placeholder="SMTP User" value={settings.emailConfig?.user||''} onChange={(e)=>setSettings(prev=>prev?{...prev,emailConfig:{...(prev.emailConfig||{}),user:e.target.value}}:null)} className={inputStyle} disabled={!!settings.emailConfig?.usePlatformProvider} />
                        <input type="password" placeholder="SMTP Password" value={settings.emailConfig?.pass||''} onChange={(e)=>setSettings(prev=>prev?{...prev,emailConfig:{...(prev.emailConfig||{}),pass:e.target.value}}:null)} className={inputStyle} disabled={!!settings.emailConfig?.usePlatformProvider} />
                        <input type="text" placeholder="From Address" value={settings.emailConfig?.from||''} onChange={(e)=>setSettings(prev=>prev?{...prev,emailConfig:{...(prev.emailConfig||{}),from:e.target.value}}:null)} className={inputStyle} disabled={!!settings.emailConfig?.usePlatformProvider} />
                      </div>
                    </div>
                    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">الرسائل النصية</span>
                        <label className="inline-flex items-center cursor-pointer">
                          <span className="mr-2 text-xs">استخدام مزود المنصة</span>
                          <input type="checkbox" checked={!!settings.smsConfig?.usePlatformProvider} onChange={(e)=>setSettings(prev=>prev?{...prev,smsConfig:{...(prev.smsConfig||{}),usePlatformProvider:e.target.checked}}:null)} />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <select value={settings.smsConfig?.provider||'twilio'} onChange={(e)=>setSettings(prev=>prev?{...prev,smsConfig:{...(prev.smsConfig||{}),provider:e.target.value}}:null)} className={inputStyle} disabled={!!settings.smsConfig?.usePlatformProvider}>
                          <option value="twilio">Twilio</option>
                        </select>
                        <input type="text" placeholder="Account SID" value={settings.smsConfig?.accountSid||''} onChange={(e)=>setSettings(prev=>prev?{...prev,smsConfig:{...(prev.smsConfig||{}),accountSid:e.target.value}}:null)} className={inputStyle} disabled={!!settings.smsConfig?.usePlatformProvider} />
                        <input type="text" placeholder="Auth Token" value={settings.smsConfig?.authToken||''} onChange={(e)=>setSettings(prev=>prev?{...prev,smsConfig:{...(prev.smsConfig||{}),authToken:e.target.value}}:null)} className={inputStyle} disabled={!!settings.smsConfig?.usePlatformProvider} />
                        <input type="text" placeholder="From Number" value={settings.smsConfig?.from||''} onChange={(e)=>setSettings(prev=>prev?{...prev,smsConfig:{...(prev.smsConfig||{}),from:e.target.value}}:null)} className={inputStyle} disabled={!!settings.smsConfig?.usePlatformProvider} />
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                    <label htmlFor="genderType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">نوع المدرسة (بنين/بنات/مختلط)</label>
                    <select name="genderType" id="genderType" value={settings.genderType || ''} onChange={(e) => setSettings(prev => prev ? { ...prev, genderType: e.target.value } : null)} className={inputStyle}>
                        <option value="">اختر النوع...</option>
                        <option value="بنين">بنين</option>
                        <option value="بنات">بنات</option>
                        <option value="مختلط">مختلط</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="levelType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">مرحلة المدرسة</label>
                    <select name="levelType" id="levelType" value={settings.levelType || ''} onChange={(e) => setSettings(prev => prev ? { ...prev, levelType: e.target.value } : null)} className={inputStyle}>
                        <option value="">اختر المرحلة...</option>
                        <option value="أساسي">أساسي</option>
                        <option value="ثانوي">ثانوي</option>
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المراحل الدراسية المتاحة</label>
                    <div className="mt-2 flex flex-wrap gap-4">
                        {allStages.map(stage => (
                          <label key={stage} className="flex items-center gap-2">
                            <input type="checkbox" checked={stages.includes(stage)} onChange={() => handleStageToggle(stage)} className="form-checkbox h-5 w-5 text-teal-600" />
                            <span className="text-gray-700 dark:text-gray-300">{stage}</span>
                          </label>
                        ))}
                    </div>
                </div>
                <div>
                    <label htmlFor="ownershipType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">نوع الملكية</label>
                    <select name="ownershipType" id="ownershipType" value={settings.ownershipType || ''} onChange={(e) => setSettings(prev => prev ? { ...prev, ownershipType: e.target.value } : null)} className={inputStyle}>
                        <option value="">اختر النوع...</option>
                        <option value="حكومي">حكومي</option>
                        <option value="أهلي">أهلي</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">أوقات الدوام</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="workingHoursStart" className="block text-xs text-gray-500 dark:text-gray-400">من</label>
                            <input type="time" name="workingHoursStart" id="workingHoursStart" value={settings.workingHoursStart || ''} onChange={handleInputChange} className={inputStyle} />
                        </div>
                        <div>
                            <label htmlFor="workingHoursEnd" className="block text-xs text-gray-500 dark:text-gray-400">إلى</label>
                            <input type="time" name="workingHoursEnd" id="workingHoursEnd" value={settings.workingHoursEnd || ''} onChange={handleInputChange} className={inputStyle} />
                        </div>
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">أيام العمل</label>
                    <div className="mt-2 flex flex-wrap gap-4">
                        {allDays.map(day => (
                          <label key={day} className="flex items-center gap-2">
                            <input type="checkbox" checked={workingDays.includes(day)} onChange={() => handleDayToggle(day)} className="form-checkbox h-5 w-5 text-teal-600" />
                            <span className="text-gray-700 dark:text-gray-300">{arDays[day]}</span>
                          </label>
                        ))}
                    </div>
                </div>
                <div className="md:col-span-2">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">إعداد نظام الحضور</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="lessonStartTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">وقت بدء الحصة</label>
                      <input type="time" name="lessonStartTime" id="lessonStartTime" value={settings.lessonStartTime || ''} onChange={handleInputChange} className={inputStyle} />
                    </div>
                    <div>
                      <label htmlFor="lateThresholdMinutes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">وقت التأخير (بالدقائق)</label>
                      <input type="number" min="0" name="lateThresholdMinutes" id="lateThresholdMinutes" value={(settings.lateThresholdMinutes ?? 10).toString()} onChange={handleLateThresholdChange} className={inputStyle} />
                    </div>
                    <div>
                      <label htmlFor="departureTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">وقت الانصراف</label>
                      <input type="time" name="departureTime" id="departureTime" value={settings.departureTime || ''} onChange={handleInputChange} className={inputStyle} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">طرق الحضور</label>
                    <div className="mt-2 flex flex-wrap gap-4">
                      {(['QR','RFID','Manual'] as ('QR'|'RFID'|'Manual')[]).map(m => (
                        <label key={m} className="flex items-center gap-2">
                          <input type="checkbox" checked={attendanceMethods.includes(m)} onChange={() => handleAttendanceMethodToggle(m)} className="form-checkbox h-5 w-5 text-teal-600" />
                          <span className="text-gray-700 dark:text-gray-300">{m === 'Manual' ? 'يدوي' : m}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                    <label htmlFor="academicYearStart" className="block text-sm font-medium text-gray-700 dark:text-gray-300">بداية العام الدراسي</label>
                    <input type="date" name="academicYearStart" id="academicYearStart" value={settings.academicYearStart} onChange={handleInputChange} className={inputStyle} />
                </div>
                 <div>
                    <label htmlFor="academicYearEnd" className="block text-sm font-medium text-gray-700 dark:text-gray-300">نهاية العام الدراسي</label>
                    <input type="date" name="academicYearEnd" id="academicYearEnd" value={settings.academicYearEnd} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div className="md:col-span-2">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">إعداد العام الدراسي والفصول</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الفصول الدراسية</label>
                      <div className="mt-2 space-y-3">
                        {terms.map((t, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input type="text" value={t.name} onChange={e => updateTerm(idx, 'name', e.target.value)} className={inputStyle} placeholder="اسم الفصل" />
                            <input type="date" value={t.start} onChange={e => updateTerm(idx, 'start', e.target.value)} className={inputStyle} />
                            <input type="date" value={t.end} onChange={e => updateTerm(idx, 'end', e.target.value)} className={inputStyle} />
                            <button type="button" onClick={() => removeTerm(idx)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">حذف</button>
                          </div>
                        ))}
                        <button type="button" onClick={addTerm} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">إضافة فصل</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">أيام الإجازات</label>
                      <div className="mt-2 space-y-3">
                        {holidays.map((h, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input type="date" value={h.date} onChange={e => updateHoliday(idx, 'date', e.target.value)} className={inputStyle} />
                            <input type="text" value={h.title} onChange={e => updateHoliday(idx, 'title', e.target.value)} className={inputStyle} placeholder="عنوان الإجازة" />
                            <button type="button" onClick={() => removeHoliday(idx)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">حذف</button>
                          </div>
                        ))}
                        <button type="button" onClick={addHoliday} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">إضافة إجازة</button>
                      </div>
                    </div>
                  </div>
      </div>
    </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">النسخ الاحتياطي والتصدير المضغوط</h3>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">اختر أنواع البيانات للحزمة، ويمكنك استخدام نفس المرشحات.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={backupSelecting.students} onChange={e => setBackupSelecting(prev => ({ ...prev, students: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>طلاب</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={backupSelecting.classes} onChange={e => setBackupSelecting(prev => ({ ...prev, classes: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>فصول</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={backupSelecting.subjects} onChange={e => setBackupSelecting(prev => ({ ...prev, subjects: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>مواد</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={backupSelecting.classSubjectTeachers} onChange={e => setBackupSelecting(prev => ({ ...prev, classSubjectTeachers: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>ربط المادة بالمعلم</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={backupSelecting.grades} onChange={e => setBackupSelecting(prev => ({ ...prev, grades: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>درجات</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={backupSelecting.attendance} onChange={e => setBackupSelecting(prev => ({ ...prev, attendance: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>حضور</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={backupSelecting.schedule} onChange={e => setBackupSelecting(prev => ({ ...prev, schedule: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>الجدول الدراسي</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={backupSelecting.fees} onChange={e => setBackupSelecting(prev => ({ ...prev, fees: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>الرسوم</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={backupSelecting.teachers} onChange={e => setBackupSelecting(prev => ({ ...prev, teachers: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>المعلمين</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={backupSelecting.parents} onChange={e => setBackupSelecting(prev => ({ ...prev, parents: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>أولياء الأمور</span></label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الفصل (اختياري)</label>
              <input type="text" value={exportFilters.className} onChange={e => setExportFilters(prev => ({ ...prev, className: e.target.value }))} placeholder="مثال: الأول (أ)" className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الحضور (YYYY-MM-DD)</label>
              <input type="date" value={exportFilters.date} onChange={e => setExportFilters(prev => ({ ...prev, date: e.target.value }))} className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المادة (اختياري)</label>
              <input type="text" value={exportFilters.subjectName} onChange={e => setExportFilters(prev => ({ ...prev, subjectName: e.target.value }))} className={inputStyle} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleDownloadZipSelected} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">تنزيل حزمة مضغوطة</button>
            <button type="button" onClick={runBackupNow} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">إنشاء نسخة احتياطية الآن</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={backupConfig.enabledDaily} onChange={e => setBackupConfig(prev => ({ ...prev, enabledDaily: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>تفعيل نسخ يومي</span></label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الوقت</label>
                  <input type="time" value={backupConfig.dailyTime} onChange={e => setBackupConfig(prev => ({ ...prev, dailyTime: e.target.value }))} className={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاحتفاظ (أيام)</label>
                  <input type="number" min={0} value={backupConfig.retainDays} onChange={e => setBackupConfig(prev => ({ ...prev, retainDays: Number(e.target.value) }))} className={inputStyle} />
                </div>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={backupConfig.enabledMonthly} onChange={e => setBackupConfig(prev => ({ ...prev, enabledMonthly: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>تفعيل نسخ شهري</span></label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اليوم من الشهر</label>
                  <input type="number" min={1} max={31} value={backupConfig.monthlyDay} onChange={e => setBackupConfig(prev => ({ ...prev, monthlyDay: Number(e.target.value) }))} className={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الوقت</label>
                  <input type="time" value={backupConfig.monthlyTime} onChange={e => setBackupConfig(prev => ({ ...prev, monthlyTime: e.target.value }))} className={inputStyle} />
                </div>
              </div>
            </div>
          </div>
          <div>
            <button type="button" onClick={saveBackupSchedule} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">حفظ الجدولة</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-300">التشغيل القادم</div>
              <div className="text-gray-900 dark:text-white">{computeNextRunLabel()}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-300">آخر نسخة مكتملة</div>
              <div className="text-gray-900 dark:text-white">{getLatestBackupLabel()}</div>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">النسخ المخزنة</h4>
            {backupsList.length === 0 ? (
              <div className="text-gray-600 dark:text-gray-300">لا توجد نسخ بعد.</div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {backupsList.map((b, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="text-gray-700 dark:text-gray-300">
                      <div className="font-medium">{b.file}</div>
                      <div className="text-sm">{new Date(b.createdAt).toLocaleString()} — {Math.round((Number(b.size||0))/1024)} KB</div>
                    </div>
                    <button type="button" onClick={() => handleDownloadStored(b.file)} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">تنزيل</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">إعداد نماذج التسجيل</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">بيانات الطالب المطلوبة</label>
                    <div className="mt-2 space-y-2">
                      {['الاسم الكامل','تاريخ الميلاد','الجنس','الرقم الوطني','العنوان','المدينة','تاريخ القبول'].map((field, idx) => (
                        <label key={idx} className="flex items-center gap-2">
                          <input type="checkbox" checked={settings.admissionForm?.studentFields?.includes(field) || false} onChange={() => handleAdmissionFieldToggle('studentFields', field)} className="form-checkbox h-5 w-5 text-teal-600" />
                          <span className="text-gray-700 dark:text-gray-300">{field}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">بيانات ولي الأمر المطلوبة</label>
                    <div className="mt-2 space-y-2">
                      {['الاسم','هاتف الاتصال','بريد الإلكتروني','العلاقة بالطالب'].map((field, idx) => (
                        <label key={idx} className="flex items-center gap-2">
                          <input type="checkbox" checked={settings.admissionForm?.parentFields?.includes(field) || false} onChange={() => handleAdmissionFieldToggle('parentFields', field)} className="form-checkbox h-5 w-5 text-teal-600" />
                          <span className="text-gray-700 dark:text-gray-300">{field}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المرفقات المطلوبة</label>
                    <div className="mt-2 space-y-2">
                      {['صورة شخصية','نسخة من شهادة الميلاد','نسخة من بطاقة الهوية','شهادة تحصيل'].map((doc, idx) => (
                        <label key={idx} className="flex items-center gap-2">
                          <input type="checkbox" checked={settings.admissionForm?.requiredDocuments?.includes(doc) || false} onChange={() => handleAdmissionFieldToggle('requiredDocuments', doc)} className="form-checkbox h-5 w-5 text-teal-600" />
                          <span className="text-gray-700 dark:text-gray-300">{doc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={settings.admissionForm?.consentFormRequired || false} onChange={(e) => setSettings(prev => prev ? { ...prev, admissionForm: { ...prev.admissionForm, consentFormRequired: e.target.checked } } : null)} className="form-checkbox h-5 w-5 text-teal-600" />
                      <span className="text-gray-700 dark:text-gray-300">يتطلب نموذج موافقة</span>
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="consentFormText" className="block text-sm font-medium text-gray-700 dark:text-gray-300">نص نموذج الموافقة</label>
                    <textarea id="consentFormText" value={settings.admissionForm?.consentFormText || ''} onChange={(e) => setSettings(prev => prev ? { ...prev, admissionForm: { ...prev.admissionForm, consentFormText: e.target.value } } : null)} rows={3} className={inputStyle}></textarea>
                  </div>
                </div>
            </div>

            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                 <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">إعدادات الإشعارات</h4>
                 <div className="flex flex-col sm:flex-row gap-6">
                    <label className="flex items-center gap-3"><input type="checkbox" name="email" checked={settings.notifications.email} onChange={handleCheckboxChange} className="form-checkbox h-5 w-5 text-teal-600" /><span className="text-gray-700 dark:text-gray-300">إشعارات البريد الإلكتروني</span></label>
                    <label className="flex items-center gap-3"><input type="checkbox" name="sms" checked={settings.notifications.sms} onChange={handleCheckboxChange} className="form-checkbox h-5 w-5 text-teal-600" /><span className="text-gray-700 dark:text-gray-300">رسائل نصية (SMS)</span></label>
                    <label className="flex items-center gap-3"><input type="checkbox" name="push" checked={settings.notifications.push} onChange={handleCheckboxChange} className="form-checkbox h-5 w-5 text-teal-600" /><span className="text-gray-700 dark:text-gray-300">إشعارات التطبيق</span></label>
                 </div>
            </div>

            <div className="flex justify-end pt-6">
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400">
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">تصدير البيانات</h3>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">اختر ما تريد تصديره ويمكنك التصفية باسم الفصل أو تاريخ الحضور.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={exportSelecting.students} onChange={e => setExportSelecting(prev => ({ ...prev, students: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>تصدير الطلاب</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={exportSelecting.classes} onChange={e => setExportSelecting(prev => ({ ...prev, classes: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>تصدير الفصول</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={exportSelecting.subjects} onChange={e => setExportSelecting(prev => ({ ...prev, subjects: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>تصدير المواد</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={exportSelecting.classSubjectTeachers} onChange={e => setExportSelecting(prev => ({ ...prev, classSubjectTeachers: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>تصدير ربط المادة بالمعلم</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={exportSelecting.grades} onChange={e => setExportSelecting(prev => ({ ...prev, grades: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>تصدير الدرجات</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={exportSelecting.attendance} onChange={e => setExportSelecting(prev => ({ ...prev, attendance: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>تصدير الحضور</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={exportSelecting.schedule} onChange={e => setExportSelecting(prev => ({ ...prev, schedule: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>تصدير الجدول الدراسي</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={exportSelecting.fees} onChange={e => setExportSelecting(prev => ({ ...prev, fees: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>تصدير الرسوم</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={exportSelecting.teachers} onChange={e => setExportSelecting(prev => ({ ...prev, teachers: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>تصدير المعلمين</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={exportSelecting.parents} onChange={e => setExportSelecting(prev => ({ ...prev, parents: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>تصدير أولياء الأمور</span></label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الفصل (اختياري)</label>
              <input type="text" value={exportFilters.className} onChange={e => setExportFilters(prev => ({ ...prev, className: e.target.value }))} placeholder="مثال: الأول (أ)" className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الحضور (YYYY-MM-DD)</label>
              <input type="date" value={exportFilters.date} onChange={e => setExportFilters(prev => ({ ...prev, date: e.target.value }))} className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المادة (اختياري)</label>
              <input type="text" value={exportFilters.subjectName} onChange={e => setExportFilters(prev => ({ ...prev, subjectName: e.target.value }))} className={inputStyle} />
            </div>
          </div>
          <div>
            <button type="button" onClick={handleExportSelected} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">تصدير البيانات المحددة</button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">توليد قوالب الاستيراد الذكية</h3>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">سيتم توليد القوالب وفق إعدادات مدرستك الحالية.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={genSelecting.students} onChange={e => setGenSelecting(prev => ({ ...prev, students: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>قالب الطلاب</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={genSelecting.classes} onChange={e => setGenSelecting(prev => ({ ...prev, classes: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>قالب الفصول</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={genSelecting.subjects} onChange={e => setGenSelecting(prev => ({ ...prev, subjects: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>قالب المواد</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={genSelecting.classSubjectTeachers} onChange={e => setGenSelecting(prev => ({ ...prev, classSubjectTeachers: e.target.checked }))} className="form-checkbox h-5 w-5 text-teal-600" /><span>قالب ربط المادة بالمعلم</span></label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملف المواد (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, subjects: rows })); }} className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملف الدرجات (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, grades: rows })); }} className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملف الحضور (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, attendance: rows })); }} className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملف الجدول (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, schedule: rows })); }} className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملف الرسوم (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, fees: rows })); }} className="mt-1 block w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملف ربط المادة بالمعلم (CSV)</label>
              <input type="file" accept=".csv" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const {rows}=parseCSVText(text); setImportState(prev=>({ ...prev, classSubjectTeachers: rows })); }} className="mt-1 block w-full" />
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <span>جاهز للاستيراد:</span>
            <span>طلاب: {importState.students.length}</span>
            <span>فصول: {importState.classes.length}</span>
            <span>مواد: {importState.subjects.length}</span>
            <span>ربط مواد/معلمين: {importState.classSubjectTeachers.length}</span>
            <span>درجات: {importState.grades.length}</span>
            <span>حضور: {importState.attendance.length}</span>
            <span>جدول: {importState.schedule.length}</span>
            <span>رسوم: {importState.fees.length}</span>
          </div>
          <div className="mt-3">
            <button type="button" onClick={async ()=>{ await validateAllPreview(); addToast('تم فحص الملفات.', 'info'); }} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">تحقق الملفات المختارة</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
            <div>
              <div className="font-semibold">طلاب: صالح {importPreview.students.valid} | غير صالح {importPreview.students.invalid}</div>
              {importPreview.students.errors.slice(0,10).map((e,i)=>(<div key={i} className="text-red-600 dark:text-red-400">{e}</div>))}
            </div>
            <div>
              <div className="font-semibold">فصول: صالح {importPreview.classes.valid} | غير صالح {importPreview.classes.invalid}</div>
              {importPreview.classes.errors.slice(0,10).map((e,i)=>(<div key={i} className="text-red-600 dark:text-red-400">{e}</div>))}
            </div>
            <div>
              <div className="font-semibold">مواد: صالح {importPreview.subjects.valid} | غير صالح {importPreview.subjects.invalid}</div>
              {importPreview.subjects.errors.slice(0,10).map((e,i)=>(<div key={i} className="text-red-600 dark:text-red-400">{e}</div>))}
            </div>
            <div>
              <div className="font-semibold">درجات: صالح {importPreview.grades.valid} | غير صالح {importPreview.grades.invalid}</div>
              {importPreview.grades.errors.slice(0,10).map((e,i)=>(<div key={i} className="text-red-600 dark:text-red-400">{e}</div>))}
            </div>
            <div>
              <div className="font-semibold">حضور: صالح {importPreview.attendance.valid} | غير صالح {importPreview.attendance.invalid}</div>
              {importPreview.attendance.errors.slice(0,10).map((e,i)=>(<div key={i} className="text-red-600 dark:text-red-400">{e}</div>))}
            </div>
            <div>
              <div className="font-semibold">جدول: صالح {importPreview.schedule.valid} | غير صالح {importPreview.schedule.invalid}</div>
              {importPreview.schedule.errors.slice(0,10).map((e,i)=>(<div key={i} className="text-red-600 dark:text-red-400">{e}</div>))}
            </div>
            <div>
              <div className="font-semibold">رسوم: صالح {importPreview.fees.valid} | غير صالح {importPreview.fees.invalid}</div>
              {importPreview.fees.errors.slice(0,10).map((e,i)=>(<div key={i} className="text-red-600 dark:text-red-400">{e}</div>))}
            </div>
            <div>
              <div className="font-semibold">ربط مواد/معلمين: صالح {importPreview.classSubjectTeachers.valid} | غير صالح {importPreview.classSubjectTeachers.invalid}</div>
              {importPreview.classSubjectTeachers.errors.slice(0,10).map((e,i)=>(<div key={i} className="text-red-600 dark:text-red-400">{e}</div>))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={importProcessing||importState.classes.length===0} onClick={async ()=>{ setImportProcessing(true); await importClasses(importState.classes); setImportProcessing(false); addToast('تم استيراد الفصول.', 'success'); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">استيراد الفصول</button>
            <button type="button" disabled={importProcessing||importState.students.length===0} onClick={async ()=>{ setImportProcessing(true); await importStudents(importState.students); setImportProcessing(false); addToast('تم استيراد الطلاب.', 'success'); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">استيراد الطلاب</button>
            <button type="button" disabled={importProcessing||importState.subjects.length===0} onClick={async ()=>{ setImportProcessing(true); await importSubjects(importState.subjects); setImportProcessing(false); addToast('تم استيراد المواد.', 'success'); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">استيراد المواد</button>
            <button type="button" disabled={importProcessing||importState.grades.length===0} onClick={async ()=>{ setImportProcessing(true); await importGrades(importState.grades); setImportProcessing(false); addToast('تم استيراد الدرجات.', 'success'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">استيراد الدرجات</button>
            <button type="button" disabled={importProcessing||importState.attendance.length===0} onClick={async ()=>{ setImportProcessing(true); await importAttendance(importState.attendance); setImportProcessing(false); addToast('تم استيراد الحضور.', 'success'); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">استيراد الحضور</button>
            <button type="button" disabled={importProcessing||importState.schedule.length===0} onClick={async ()=>{ setImportProcessing(true); await importSchedule(importState.schedule); setImportProcessing(false); addToast('تم استيراد الجدول.', 'success'); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">استيراد الجدول</button>
            <button type="button" disabled={importProcessing||importState.fees.length===0} onClick={async ()=>{ setImportProcessing(true); await importFees(importState.fees); setImportProcessing(false); addToast('تم استيراد الرسوم.', 'success'); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400">استيراد الرسوم</button>
            <button type="button" disabled={importProcessing||importState.classSubjectTeachers.length===0} onClick={async ()=>{ setImportProcessing(true); await importClassSubjectTeachers(importState.classSubjectTeachers); setImportProcessing(false); addToast('تم ربط المواد بالمعلمين.', 'success'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">استيراد ربط المادة بالمعلم</button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto text-sm">
            {importState.logs.length === 0 ? <div className="text-gray-500">لا توجد سجلات بعد.</div> : importState.logs.map((l,i)=>(<div key={i} className="text-gray-700 dark:text-gray-300">{l}</div>))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
                <div className="md:col-span-2">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">إعداد الجدول الدراسي</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">وقت بداية الحصص</label>
                      <input type="time" value={settings.scheduleConfig?.startTime || settings.workingHoursStart || ''} onChange={(e) => setScheduleCfg({ startTime: e.target.value })} className={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">عدد الحصص يوميًا</label>
                      <input type="number" min={1} max={20} value={String(settings.scheduleConfig?.periodCount ?? 5)} onChange={(e) => setScheduleCfg({ periodCount: Number(e.target.value || 5) })} className={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مدة الحصة (دقائق)</label>
                      <input type="number" min={10} max={180} value={String(settings.scheduleConfig?.periodDurationMinutes ?? 60)} onChange={(e) => setScheduleCfg({ periodDurationMinutes: Number(e.target.value || 60) })} className={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">فاصل بين الحصص (دقائق)</label>
                      <input type="number" min={0} max={60} value={String(settings.scheduleConfig?.gapMinutes ?? 0)} onChange={(e) => setScheduleCfg({ gapMinutes: Number(e.target.value || 0) })} className={inputStyle} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">معاينة الفترات الزمنية</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {previewTimeSlots.map((ts, idx) => (
                        <span key={idx} className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">{ts}</span>
                      ))}
                    </div>
                  </div>
                </div>
