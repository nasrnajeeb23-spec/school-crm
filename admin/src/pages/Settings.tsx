import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { SchoolSettings } from '../types';
import { useToast } from '../contexts/ToastContext';

interface SettingsProps {
    schoolId: number;
}

const Settings: React.FC<SettingsProps> = ({ schoolId }) => {
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  const [genSelecting, setGenSelecting] = useState<{students:boolean;classes:boolean;subjects:boolean;teachers:boolean;grades:boolean;attendance:boolean;schedule:boolean;fees:boolean}>({students:true,classes:true,subjects:true,teachers:true,grades:true,attendance:false,schedule:false,fees:true});
  const [importState, setImportState] = useState<{students:any[];classes:any[];grades:any[];logs:string[]}>({students:[],classes:[],grades:[],logs:[]});
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
      setSettings(prev => prev ? { ...prev, schoolLogoUrl: url } : null);
      addToast('تم رفع شعار المدرسة بنجاح.', 'success');
    } catch (err) {
      console.error('Failed to upload logo:', err);
      addToast('فشل رفع شعار المدرسة.', 'error');
    }
  };

  const allStages = ["رياض أطفال","ابتدائي","إعدادي","ثانوي"];
  const stages = settings?.availableStages && settings.availableStages.length > 0 ? settings.availableStages : allStages;
  const handleStageToggle = (stage: string) => {
    setSettings(prev => {
      if (!prev) return prev;
      const current = prev.availableStages && prev.availableStages.length > 0 ? prev.availableStages : [];
      const exists = current.includes(stage);
      const next = exists ? current.filter(s => s !== stage) : [...current, stage];
      return { ...prev, availableStages: next };
    });
  };

  const allDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const arDays: Record<string, string> = { Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت' };
  const workingDays = settings?.workingDays && settings.workingDays.length > 0 ? settings.workingDays : ['Sunday','Monday','Tuesday','Wednesday','Thursday'];
  const handleDayToggle = (day: string) => {
    setSettings(prev => {
      if (!prev) return prev;
      const current = prev.workingDays && prev.workingDays.length > 0 ? prev.workingDays : [];
      const exists = current.includes(day);
      const next = exists ? current.filter(d => d !== day) : [...current, day];
      return { ...prev, workingDays: next };
    });
  };

  const attendanceMethods = settings?.attendanceMethods && settings.attendanceMethods.length > 0 ? settings.attendanceMethods : ['Manual'];
  const handleAttendanceMethodToggle = (m: 'QR'|'RFID'|'Manual') => {
    setSettings(prev => {
      if (!prev) return prev;
      const arr = prev.attendanceMethods && prev.attendanceMethods.length > 0 ? prev.attendanceMethods : [];
      const exists = arr.includes(m);
      const next = exists ? arr.filter(x => x !== m) : [...arr, m];
      return { ...prev, attendanceMethods: next };
    });
  };

  const terms = settings?.terms && settings.terms.length > 0 ? settings.terms : [ { name: 'الفصل الأول', start: settings?.academicYearStart || '', end: '' }, { name: 'الفصل الثاني', start: '', end: settings?.academicYearEnd || '' } ];
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

  const holidays = settings?.holidays && settings.holidays.length > 0 ? settings.holidays : [];
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
        addToast('فشل حفظ الإعدادات.', 'error');
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
    const csv = toCSV(['subjectName'], []);
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

  const importStudents = async (rows: any[]) => {
    const logs: string[] = [];
    const classes = await api.getSchoolClasses(schoolId);
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
        const created = await api.addSchoolStudent(schoolId, payload);
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

  const importGrades = async (rows: any[]) => {
    const logs: string[] = [];
    try {
      const classes = await api.getSchoolClasses(schoolId);
      const entries: any[] = [];
      for (const r of rows) {
        try {
          const cls = classes.find((c: any) => `${c.gradeLevel} (${c.section||'أ'})` === r.className);
          if (!cls) { logs.push(`فصل غير موجود: ${r.className}`); continue; }
          entries.push({ classId: cls.id, subject: r.subjectName, studentId: r.studentId, studentName: '', grades: { homework: Number(r.homework||0), quiz: Number(r.quiz||0), midterm: Number(r.midterm||0), final: Number(r.final||0) } });
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
                    {settings.schoolLogoUrl && <img src={settings.schoolLogoUrl as string} alt="School Logo" className="mt-2 w-16 h-16 rounded" />}
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
                    <label htmlFor="registrationFee" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رسوم التسجيل (إن وجدت)</label>
                    <input type="number" min="0" name="registrationFee" id="registrationFee" value={(settings.admissionForm?.registrationFee ?? 0).toString()} onChange={(e) => setSettings(prev => prev ? { ...prev, admissionForm: { ...prev.admissionForm, registrationFee: Number(e.target.value) } } : null)} className={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="registrationFeeDueDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300">أيام حتى الاستحقاق</label>
                    <input type="number" min="0" name="registrationFeeDueDays" id="registrationFeeDueDays" value={(settings.admissionForm?.registrationFeeDueDays ?? 7).toString()} onChange={(e) => setSettings(prev => prev ? { ...prev, admissionForm: { ...prev.admissionForm, registrationFeeDueDays: Number(e.target.value) } } : null)} className={inputStyle} />
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={settings.admissionForm?.autoGenerateRegistrationInvoice ?? true} onChange={(e) => setSettings(prev => prev ? { ...prev, admissionForm: { ...prev.admissionForm, autoGenerateRegistrationInvoice: e.target.checked } } : null)} className="form-checkbox h-5 w-5 text-teal-600" />
                      <span className="text-gray-700 dark:text-gray-300">إنشاء فاتورة رسوم التسجيل تلقائياً</span>
                    </label>
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
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <span>جاهز للاستيراد:</span>
            <span>طلاب: {importState.students.length}</span>
            <span>فصول: {importState.classes.length}</span>
            <span>درجات: {importState.grades.length}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={importProcessing||importState.classes.length===0} onClick={async ()=>{ setImportProcessing(true); await importClasses(importState.classes); setImportProcessing(false); addToast('تم استيراد الفصول.', 'success'); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">استيراد الفصول</button>
            <button type="button" disabled={importProcessing||importState.students.length===0} onClick={async ()=>{ setImportProcessing(true); await importStudents(importState.students); setImportProcessing(false); addToast('تم استيراد الطلاب.', 'success'); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">استيراد الطلاب</button>
            <button type="button" disabled={importProcessing||importState.grades.length===0} onClick={async ()=>{ setImportProcessing(true); await importGrades(importState.grades); setImportProcessing(false); addToast('تم استيراد الدرجات.', 'success'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">استيراد الدرجات</button>
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
