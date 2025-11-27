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

  const terms = settings?.terms && settings.terms.length > 0 ? settings.terms : [ { name: 'الفصل الأول', start: settings!.academicYearStart, end: '' }, { name: 'الفصل الثاني', start: '', end: settings!.academicYearEnd } ];
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
                          <label key={stage} className="flex items-center space-x-2 rtl:space-x-reverse">
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
                          <label key={day} className="flex items-center space-x-2 rtl:space-x-reverse">
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
                        <label key={m} className="flex items-center space-x-2 rtl:space-x-reverse">
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
                        <label key={idx} className="flex items-center space-x-2 rtl:space-x-reverse">
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
                        <label key={idx} className="flex items-center space-x-2 rtl:space-x-reverse">
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
                        <label key={idx} className="flex items-center space-x-2 rtl:space-x-reverse">
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
                    <label className="flex items-center space-x-2 rtl:space-x-reverse">
                      <input type="checkbox" checked={settings.admissionForm?.autoGenerateRegistrationInvoice ?? true} onChange={(e) => setSettings(prev => prev ? { ...prev, admissionForm: { ...prev.admissionForm, autoGenerateRegistrationInvoice: e.target.checked } } : null)} className="form-checkbox h-5 w-5 text-teal-600" />
                      <span className="text-gray-700 dark:text-gray-300">إنشاء فاتورة رسوم التسجيل تلقائياً</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 rtl:space-x-reverse">
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
                    <label className="flex items-center space-x-3 rtl:space-x-reverse"><input type="checkbox" name="email" checked={settings.notifications.email} onChange={handleCheckboxChange} className="form-checkbox h-5 w-5 text-teal-600" /><span className="text-gray-700 dark:text-gray-300">إشعارات البريد الإلكتروني</span></label>
                    <label className="flex items-center space-x-3 rtl:space-x-reverse"><input type="checkbox" name="sms" checked={settings.notifications.sms} onChange={handleCheckboxChange} className="form-checkbox h-5 w-5 text-teal-600" /><span className="text-gray-700 dark:text-gray-300">رسائل نصية (SMS)</span></label>
                    <label className="flex items-center space-x-3 rtl:space-x-reverse"><input type="checkbox" name="push" checked={settings.notifications.push} onChange={handleCheckboxChange} className="form-checkbox h-5 w-5 text-teal-600" /><span className="text-gray-700 dark:text-gray-300">إشعارات التطبيق</span></label>
                 </div>
            </div>

            <div className="flex justify-end pt-6">
                <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400">
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
