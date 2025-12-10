import React, { useState, useMemo, useEffect } from 'react';
import { Class, ScheduleEntry, Teacher, SchoolSettings } from '../types';
import { showToast } from '../utils/toast';
import * as api from '../api';

function buildTimeSlots(settings: SchoolSettings | null) {
    const sc = settings?.scheduleConfig || { periodCount: 5, periodDurationMinutes: 60, startTime: settings?.workingHoursStart || '08:00', gapMinutes: 0 };
    const toMin = (hm: string) => { const t = String(hm).split(':'); const h = Number(t[0]); const m = Number(t[1]); return h*60 + m; };
    const toHM = (min: number) => { const h = Math.floor(min/60); const m = min%60; const hh = String(h).padStart(2,'0'); const mm = String(m).padStart(2,'0'); return `${hh}:${mm}`; };
    const arr: string[] = [];
    let s = toMin(sc.startTime || '08:00');
    for (let i=0;i<Number(sc.periodCount||5);i++) { const e = s + Number(sc.periodDurationMinutes||60); arr.push(`${toHM(s)} - ${toHM(e)}`); s = e + Number(sc.gapMinutes||0); }
    return arr;
}

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const dayTranslations: { [key: string]: string } = {
    Sunday: 'الأحد',
    Monday: 'الاثنين',
    Tuesday: 'الثلاثاء',
    Wednesday: 'الأربعاء',
    Thursday: 'الخميس',
};

const subjectColors: { [key: string]: string } = {
    'الرياضيات': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    'العلوم': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-700',
    'اللغة الإنجليزية': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-700',
    'الدراسات الاجتماعية': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
    'اللغة العربية': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
    'التربية الفنية': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    'default': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
};

// FIX: Added interface for component props to accept schoolId.
interface ScheduleProps {
    schoolId: number;
}

const Schedule: React.FC<ScheduleProps> = ({ schoolId }) => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [savingMapping, setSavingMapping] = useState(false);
    const [editing, setEditing] = useState(false);
    const [gridSubjects, setGridSubjects] = useState<Record<string, Record<string, string>>>({});
    const [subjectsEdit, setSubjectsEdit] = useState<string[]>([]);
    const [newSubject, setNewSubject] = useState('');
    const [savingSubjects, setSavingSubjects] = useState(false);
    const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
    const [subjectFilter, setSubjectFilter] = useState('');
    const [autoFillPattern, setAutoFillPattern] = useState<'balanced'|'repeat_first_day'>('balanced');

    useEffect(() => {
        // FIX: Corrected function call from getClasses to getSchoolClasses and passed the schoolId.
        api.getSchoolClasses(schoolId).then(data => {
            setClasses(data);
            if (data.length > 0) {
                setSelectedClass(data[0].id);
            }
        });
        api.getSchoolTeachers(schoolId).then(setTeachers);
        api.getSchoolSettings(schoolId).then(setSchoolSettings).catch(() => {});
    }, [schoolId]);

    useEffect(() => {
        if (!selectedClass) return;
        setLoading(true);
        api.getSchedule(selectedClass).then(data => {
            setSchedule(data);
            const nextGrid: Record<string, Record<string, string>> = {};
            data.forEach(e => {
                if (!nextGrid[e.timeSlot]) nextGrid[e.timeSlot] = {};
                nextGrid[e.timeSlot][e.day] = e.subject;
            });
            setGridSubjects(nextGrid);
            setLoading(false);
        });
        const cls = classes.find(c => c.id === selectedClass);
        const map = (cls?.subjectTeacherMap || {}) as Record<string, string | number>;
        const normalized: Record<string, string> = {};
        Object.keys(map).forEach(k => { normalized[k] = String((map as any)[k]); });
        setMapping(normalized);
    }, [selectedClass, classes]);

    const scheduleData = useMemo(() => {
        const grid: { [key: string]: { [key: string]: ScheduleEntry } } = {};
        schedule.forEach(entry => {
            if (!grid[entry.timeSlot]) grid[entry.timeSlot] = {};
            grid[entry.timeSlot][entry.day] = entry;
        });
        return grid;
    }, [schedule]);
    const timeSlots = useMemo(() => buildTimeSlots(schoolSettings), [schoolSettings]);
    const daysList = useMemo(() => {
        const wd = schoolSettings?.workingDays && Array.isArray(schoolSettings.workingDays) ? schoolSettings.workingDays : days;
        return days.filter(d => wd.includes(d));
    }, [schoolSettings]);
    const parseSlot = (s: string) => {
        try {
            const parts = String(s).split('-');
            const a = (parts[0] || '').trim();
            const b = (parts[1] || '').trim();
            const toMin = (hm: string) => { const t = String(hm).split(':'); const h = Number(t[0]); const m = Number(t[1]); return h*60 + m; };
            const start = toMin(a);
            const end = toMin(b);
            return { start, end, ok: Number.isFinite(start) && Number.isFinite(end) && start < end };
        } catch { return { start: 0, end: 0, ok: false }; }
    };
    const isDirty = useMemo(() => {
        const scheduleMap: Record<string, string> = {};
        schedule.forEach(e => { scheduleMap[`${e.day}|${e.timeSlot}`] = e.subject; });
        const currentMap: Record<string, string> = {};
        timeSlots.forEach(ts => {
            daysList.forEach(d => {
                const subj = gridSubjects[ts]?.[d] || '';
                if (subj) currentMap[`${d}|${ts}`] = subj;
            });
        });
        const keys1 = Object.keys(scheduleMap);
        const keys2 = Object.keys(currentMap);
        if (keys1.length !== keys2.length) return true;
        for (const k of keys1) {
            if ((currentMap[k] || '') !== scheduleMap[k]) return true;
        }
        return false;
    }, [schedule, gridSubjects, timeSlots, daysList]);

    const teacherNameMap = useMemo(() => {
        const m: Record<string, string> = {};
        teachers.forEach(t => { m[String(t.id)] = t.name; });
        return m;
    }, [teachers]);

    const unassignedCount = useMemo(() => {
        let c = 0;
        timeSlots.forEach(ts => {
            daysList.forEach(d => {
                const subj = gridSubjects[ts]?.[d] || '';
                if (subj && !mapping[subj]) c++;
            });
        });
        return c;
    }, [gridSubjects, mapping, timeSlots, daysList]);

    const overlapWarnings = useMemo(() => {
        const warnings: Array<{ teacherId: string; teacherName: string; day: string; timeSlot: string; otherTimeSlot: string; }> = [];
        const byTeacherDay: Record<string, Array<{ start: number; end: number; timeSlot: string }>> = {};
        timeSlots.forEach(ts => {
            const ps = parseSlot(ts);
            if (!ps.ok) return;
            daysList.forEach(d => {
                const subj = gridSubjects[ts]?.[d] || '';
                const tId = subj ? String(mapping[subj] || '') : '';
                if (!tId) return;
                const key = `${tId}:${d}`;
                if (!byTeacherDay[key]) byTeacherDay[key] = [];
                for (const prev of byTeacherDay[key]) {
                    if (ps.start < prev.end && prev.start < ps.end) {
                        warnings.push({ teacherId: tId, teacherName: teacherNameMap[tId] || '', day: d, timeSlot: ts, otherTimeSlot: prev.timeSlot });
                    }
                }
                byTeacherDay[key].push({ start: ps.start, end: ps.end, timeSlot: ts });
            });
        });
        return warnings;
    }, [gridSubjects, mapping, timeSlots, daysList, teacherNameMap]);

    const currentClass = useMemo(() => classes.find(c => c.id === selectedClass) || null, [classes, selectedClass]);
    const classSubjects = useMemo(() => (currentClass?.subjects || []), [currentClass]);
    useEffect(() => { setSubjectsEdit(classSubjects); }, [classSubjects]);

    const handleMappingChange = (subject: string, teacherId: string) => {
        setMapping(prev => ({ ...prev, [subject]: teacherId }));
    };

    const saveMapping = async () => {
        if (!currentClass) return;
        setSavingMapping(true);
        try {
            const updated = await api.updateSubjectTeacherMap(schoolId, currentClass.id, mapping);
            setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
        } finally {
            setSavingMapping(false);
        }
    };

    const handleSubjectSelect = (timeSlot: string, day: string, subject: string) => {
        setGridSubjects(prev => ({
            ...prev,
            [timeSlot]: { ...(prev[timeSlot] || {}), [day]: subject }
        }));
    };

    const filteredSubjects = useMemo(() => {
        const list = classSubjects;
        const f = subjectFilter.trim();
        if (!f) return list;
        return list.filter(s => s.toLowerCase().includes(f.toLowerCase()));
    }, [classSubjects, subjectFilter]);

    const applyAutoFill = () => {
        if (autoFillPattern === 'balanced') {
            if (!classSubjects || classSubjects.length === 0) return;
            let i = 0;
            const next: Record<string, Record<string, string>> = {};
            timeSlots.forEach(ts => {
                next[ts] = {};
                daysList.forEach(d => {
                    next[ts][d] = classSubjects[i % classSubjects.length];
                    i++;
                });
            });
            setGridSubjects(next);
        } else if (autoFillPattern === 'repeat_first_day') {
            if (!classSubjects || classSubjects.length === 0) return;
            const next: Record<string, Record<string, string>> = {};
            const firstDay = daysList[0];
            let i = 0;
            timeSlots.forEach(ts => {
                const base = gridSubjects[ts]?.[firstDay] || classSubjects[i % classSubjects.length];
                i++;
                next[ts] = {};
                daysList.forEach(d => { next[ts][d] = base; });
            });
            setGridSubjects(next);
        }
    };

    const saveSchedule = async () => {
        if (!selectedClass) return;
        if (unassignedCount > 0) { showToast('لا يمكن الحفظ مع مواد غير مسندة لمعلم', 'error'); return; }
        if (overlapWarnings.length > 0) { showToast('يوجد تعارضات زمنية داخل الفصل. عدّلها ثم احفظ.', 'warning'); return; }
        const entries: { day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday'; timeSlot: string; subject: string; }[] = [];
        timeSlots.forEach(ts => {
            daysList.forEach(d => {
                const subj = gridSubjects[ts]?.[d] || '';
                if (subj) entries.push({ day: d as any, timeSlot: ts, subject: subj });
            });
        });
        try {
            await api.saveClassSchedule(selectedClass, entries);
            const refreshed = await api.getSchedule(selectedClass);
            setSchedule(refreshed);
            setEditing(false);
            showToast('تم حفظ الجدول بنجاح', 'success');
        } catch (e: any) {
            const conflicts = e?.data?.conflicts || [];
            if (Array.isArray(conflicts) && conflicts.length > 0) {
                conflicts.slice(0, 6).forEach((c: any) => {
                    const teacher = c.teacherName || '';
                    const clsName = c.conflictWithClassName ? ` — تعارض مع فصل ${c.conflictWithClassName}` : '';
                    const msg = `تعارض: ${dayTranslations[c.day] || c.day} ${c.timeSlot} — المعلم: ${teacher}${clsName}`;
                    showToast(msg, 'error');
                });
                showToast('تعذر الحفظ بسبب تعارضات في الجدول. عدّل الحصص ثم أعد المحاولة.', 'warning');
            } else {
                showToast('تعذر حفظ الجدول. حاول مرة أخرى.', 'error');
            }
        }
    };

    const addSubject = () => {
        const s = newSubject.trim();
        if (!s) return;
        if (!subjectsEdit.includes(s)) setSubjectsEdit(prev => [...prev, s]);
        setNewSubject('');
    };

    const removeSubject = (s: string) => {
        setSubjectsEdit(prev => prev.filter(x => x !== s));
        setMapping(prev => { const next = { ...prev }; delete next[s]; return next; });
    };

    const saveSubjects = async () => {
        if (!currentClass) return;
        setSavingSubjects(true);
        try {
            const updated = await api.updateClassSubjects(schoolId, currentClass.id, subjectsEdit);
            setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
        } finally {
            setSavingSubjects(false);
        }
    };

    return (
        <div className="mt-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            عرض جدول الفصل
                        </label>
                        <select
                            id="class-select"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full md:w-80 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            {classes.map(c => <option key={c.id} value={c.id}>{`${c.gradeLevel} (${c.section || 'أ'})`}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md overflow-x-auto">
                {loading ? <div className="text-center py-8">جاري تحميل الجدول...</div> : (
                    <div className="grid min-w-[900px]" style={{ gridTemplateColumns: `auto repeat(${daysList.length}, minmax(140px, 1fr))` }}>
                        <div className="font-bold text-center p-3 border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">الوقت</div>
                        {daysList.map(day => (
                            <div key={day} className="font-bold text-center p-3 border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                                {dayTranslations[day]}
                            </div>
                        ))}

                        {timeSlots.map(timeSlot => (
                            <React.Fragment key={timeSlot}>
                                <div className="font-semibold text-center p-3 border-l border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-400 flex items-center justify-center">
                                    {timeSlot}
                                </div>
                                {daysList.map(day => {
                                    const entry = scheduleData[timeSlot]?.[day];
                                    const colorClass = entry ? (subjectColors[entry.subject] || subjectColors.default) : '';
                                    const isEditing = editing;
                                    const subj = gridSubjects[timeSlot]?.[day] || '';
                                    const unassigned = subj && !mapping[subj];
                                    const dayIdx = daysList.indexOf(day);
                                    const timeIdx = timeSlots.indexOf(timeSlot);
                                    const shadeClass = isEditing ? (dayIdx % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-700') : '';
                                    return (
                                        <div key={`${timeSlot}-${day}`} className={`p-2 border-b border-l border-gray-200 dark:border-gray-600 ${entry && !isEditing ? colorClass : ''} ${entry && !isEditing && !entry.teacherName ? 'ring-2 ring-red-400' : ''} ${shadeClass}`}>
                                            {isEditing ? (
                                                <>
                                                    <select
                                                        value={subj}
                                                        onChange={(e) => handleSubjectSelect(timeSlot, day, e.target.value)}
                                                        className="w-full text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
                                                    >
                                                        <option value="">—</option>
                                                        {filteredSubjects.map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                    {unassigned ? (<div className="mt-1 text-xs text-red-600">غير مسند لمعلم</div>) : null}
                                                </>
                                            ) : (
                                                entry && (
                                                    <div className="text-center">
                                                        <p className="font-bold text-sm">{entry.subject}</p>
                                                        <p className={`text-xs ${!entry.teacherName ? 'text-red-600' : ''}`}>{entry.teacherName || 'غير مسند'}</p>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mt-6">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    <button onClick={() => setEditing(e => !e)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        {editing ? 'إنهاء التحرير' : 'تحرير الجدول'}
                    </button>
                    {editing && (
                        <>
                            <input value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} placeholder="فلترة المواد" className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700" />
                            <select value={autoFillPattern} onChange={(e) => setAutoFillPattern(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                                <option value="balanced">ملء تلقائي (توزيع بالتساوي)</option>
                                <option value="repeat_first_day">ملء تلقائي (تكرار اليوم الأول)</option>
                            </select>
                            <button onClick={applyAutoFill} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">تطبيق الملء</button>
                            <div className="flex items-center gap-3 text-sm">
                                <span className={`px-2 py-1 rounded ${unassignedCount>0?'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300':'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>مواد غير مسندة: {unassignedCount}</span>
                                <span className={`px-2 py-1 rounded ${overlapWarnings.length>0?'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300':'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>تعارض فترات: {overlapWarnings.length}</span>
                            </div>
                            <button onClick={saveSchedule} disabled={!isDirty || unassignedCount>0 || overlapWarnings.length>0} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-not-allowed">حفظ الجدول</button>
                        </>
                    )}
                </div>
                {editing && overlapWarnings.length>0 && (
                    <div className="mt-2 p-3 rounded bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 text-sm">
                        {overlapWarnings.slice(0,8).map((w,i)=>(
                            <div key={`${w.teacherId}-${w.day}-${w.timeSlot}-${i}`}>{w.teacherName || 'معلم'} — {dayTranslations[w.day] || w.day}: {w.timeSlot} يتعارض مع {w.otherTimeSlot}</div>
                        ))}
                    </div>
                )}
                {currentClass && (
                    <div>
                        <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">إدارة المواد للفصل المختار</h4>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {subjectsEdit.map(s => {
                                const unassigned = !mapping[s];
                                const chipClass = unassigned
                                  ? "px-2 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-400 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700 flex items-center gap-2"
                                  : "px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 flex items-center gap-2";
                                return (
                                  <span key={s} className={chipClass}>
                                    {s}
                                    {unassigned && <span className="ml-1 text-[10px]">غير مسند</span>}
                                    <button onClick={() => removeSubject(s)} className="text-red-600 hover:text-red-700">×</button>
                                  </span>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="أضف مادة جديدة" className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700" />
                            <button onClick={addSubject} className="px-3 py-1 bg-indigo-600 text-white rounded-md">إضافة مادة</button>
                            <button onClick={saveSubjects} disabled={savingSubjects} className="px-3 py-1 bg-teal-600 text-white rounded-md disabled:bg-teal-400">{savingSubjects ? 'جاري الحفظ...' : 'حفظ المواد'}</button>
                        </div>
                        <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">إسناد المعلمين لكل مادة</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {subjectsEdit.map(subj => (
                                <div key={subj} className="flex items-center gap-2">
                                    <span className="w-36 text-sm">{subj}</span>
                                    <select value={mapping[subj] || ''} onChange={(e) => handleMappingChange(subj, e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                                        <option value="">اختر المعلم...</option>
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    {!mapping[subj] && <span className="text-xs text-red-600">غير مسند</span>}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4">
                            <button onClick={saveMapping} disabled={savingMapping} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400">
                                {savingMapping ? 'جاري الحفظ...' : 'حفظ الإسناد'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Schedule;
