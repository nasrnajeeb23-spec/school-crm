import React, { useState, useEffect, useRef } from 'react';
import { SchoolSettings, Teacher, User } from '../../types';
import * as api from '../../api';
import type { SalaryStructurePayload } from '../../api';
import { NetProfitIcon } from '../../components/icons';
import { useToast } from '../../contexts/ToastContext';
import TableSkeleton from '../../components/TableSkeleton';
import BrandableCard from '../../components/BrandableCard';
import { useReactToPrint } from 'react-to-print';

interface FinancePayrollProps {
    schoolId: number;
    schoolSettings: SchoolSettings | null;
}

const FinancePayroll: React.FC<FinancePayrollProps> = ({ schoolId, schoolSettings }) => {
    const [loading, setLoading] = useState(true);
    const [salaryStructures, setSalaryStructures] = useState<SalaryStructurePayload[]>([]);
    const [staff, setStaff] = useState<User[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [salarySlips, setSalarySlips] = useState<any[]>([]);
    const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7));
    
    // Structure State
    const [newStructure, setNewStructure] = useState<SalaryStructurePayload>({ name: '', type: 'Fixed', baseAmount: 0, hourlyRate: 0, lessonRate: 0, allowances: [], deductions: [], appliesTo: 'staff', isDefault: false, absencePenaltyPerDay: 0, latePenaltyPerMinute: 0, overtimeRatePerMinute: 0 });
    const [editingStructure, setEditingStructure] = useState<SalaryStructurePayload | null>(null);
    const [editForm, setEditForm] = useState<SalaryStructurePayload | null>(null);
    const [detailSlip, setDetailSlip] = useState<any | null>(null);
    const slipPrintRef = useRef<HTMLDivElement>(null);
    const handleSlipPrint = useReactToPrint({ content: () => slipPrintRef.current, documentTitle: detailSlip ? `SL-${schoolId}-${detailSlip.month}-${detailSlip.personType}-${detailSlip.personId}` : 'SalarySlip' });
    const [slipsStatusFilter, setSlipsStatusFilter] = useState<'all' | 'Draft' | 'Approved' | 'Paid'>('all');
    const [slipsSearch, setSlipsSearch] = useState<string>('');
    const [editSlipBase, setEditSlipBase] = useState<string>('');
    const [editSlipAllowName, setEditSlipAllowName] = useState<string>('');
    const [editSlipAllowAmount, setEditSlipAllowAmount] = useState<string>('');
    const [editSlipDeductName, setEditSlipDeductName] = useState<string>('');
    const [editSlipDeductAmount, setEditSlipDeductAmount] = useState<string>('');
    const [detailDelimiter, setDetailDelimiter] = useState<string>('; ');
    const [csvCurrency, setCsvCurrency] = useState<string>('SAR');
    
    // Assignment State
    const [assignTargetType, setAssignTargetType] = useState<'staff' | 'teacher'>('staff');
    const [assignTargetId, setAssignTargetId] = useState<string>('');
    const [assignStructureId, setAssignStructureId] = useState<string>('');
    
    // Receipt/Slip State
    const [receiptSlipId, setReceiptSlipId] = useState<string>('');
    const [receiptNumber, setReceiptNumber] = useState<string>('');
    const [receiptDate, setReceiptDate] = useState<string>('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);

    // Attendance State
    const [attendanceUserId, setAttendanceUserId] = useState<string>('');
    const [attendanceDate, setAttendanceDate] = useState<string>('');
    const [attendanceCheckIn, setAttendanceCheckIn] = useState<string>('');
    const [attendanceCheckOut, setAttendanceCheckOut] = useState<string>('');
    const [attendanceHoursWorked, setAttendanceHoursWorked] = useState<string>('');
    const [attendanceStatus, setAttendanceStatus] = useState<'Present' | 'Absent' | 'Late'>('Present');
    const [attendanceLateMinutes, setAttendanceLateMinutes] = useState<string>('');
    const [attendanceOvertimeMinutes, setAttendanceOvertimeMinutes] = useState<string>('');

    const { addToast } = useToast();
    const [lastErrorToastAt, setLastErrorToastAt] = useState<number>(0);
    const addErrorOnce = (msg: string) => {
        const now = Date.now();
        if (now - lastErrorToastAt < 3000) return;
        setLastErrorToastAt(now);
        addToast(msg, 'error');
    };

    useEffect(() => {
        fetchData();
    }, [schoolId]);

    useEffect(() => {
        (async () => {
            try {
                const slips = await api.getSalarySlipsForSchool(schoolId, month);
                setSalarySlips(slips);
            } catch (e) {
                addErrorOnce('فشل تحديث كشوف الرواتب للشهر المحدد.');
            }
        })();
    }, [month]);

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.getSalaryStructures(schoolId),
            api.getSchoolStaff(schoolId),
            api.getSchoolTeachers(schoolId),
        ]).then(([structuresData, staffData, teachersData]) => {
            setSalaryStructures(structuresData);
            setStaff(staffData);
            setTeachers(teachersData);
        }).catch(err => {
            console.error("Failed to fetch payroll data:", err);
            addErrorOnce("فشل تحميل بيانات الرواتب.");
        }).finally(() => setLoading(false));
    };

    const personName = (type: 'staff' | 'teacher', id: string) => {
        if (type === 'staff') {
            const u = staff.find(s => String(s.id) === String(id));
            return u ? u.name : id;
        } else {
            const t = teachers.find(s => String(s.id) === String(id));
            return t ? t.name : id;
        }
    };

    const handleCreateStructure = async () => {
        const name = String(newStructure.name || '').trim();
        if (name.length < 2) { addToast('اسم الهيكل قصير جدًا.', 'error'); return; }
        const type = String(newStructure.type || 'Fixed');
        const baseAmount = Number(newStructure.baseAmount || 0);
        const hourlyRate = Number(newStructure.hourlyRate || 0);
        const lessonRate = Number(newStructure.lessonRate || 0);
        const absencePenaltyPerDay = Math.max(0, Number(newStructure.absencePenaltyPerDay || 0));
        const latePenaltyPerMinute = Math.max(0, Number(newStructure.latePenaltyPerMinute || 0));
        const overtimeRatePerMinute = Math.max(0, Number(newStructure.overtimeRatePerMinute || 0));
        if (type === 'Fixed' || type === 'PartTime') {
            if (baseAmount < 0) { addToast('الراتب الأساسي يجب ألا يكون سالبًا.', 'error'); return; }
        }
        if (type === 'Hourly') {
            if (hourlyRate <= 0) { addToast('أدخل أجراً صحيحًا بالساعة.', 'error'); return; }
        }
        if (type === 'PerLesson') {
            if (lessonRate <= 0) { addToast('أدخل أجراً صحيحًا للحصة.', 'error'); return; }
        }
        const payload: SalaryStructurePayload = {
            ...newStructure,
            name,
            type: type as any,
            baseAmount,
            hourlyRate,
            lessonRate,
            absencePenaltyPerDay,
            latePenaltyPerMinute,
            overtimeRatePerMinute,
        };
        try {
            const created = await api.createSalaryStructure(schoolId, payload);
            setSalaryStructures(prev => [created, ...prev]);
            setNewStructure({ name: '', type: 'Fixed', baseAmount: 0, hourlyRate: 0, lessonRate: 0, allowances: [], deductions: [], appliesTo: 'staff', isDefault: false, absencePenaltyPerDay: 0, latePenaltyPerMinute: 0, overtimeRatePerMinute: 0 });
            addToast('تم إنشاء هيكل راتب.', 'success');
        } catch (e) { addToast('فشل إنشاء هيكل الراتب.', 'error'); }
    };

    const handleDeleteStructure = async (id: string) => {
        try { await api.deleteSalaryStructure(schoolId, id); setSalaryStructures(prev => prev.filter(s => s.id !== id)); addToast('تم حذف الهيكل.', 'success'); } catch { addToast('فشل حذف الهيكل.', 'error'); }
    };

    const handleAssign = async () => {
        try {
            if (!assignTargetId || !assignStructureId) return;
            if (assignTargetType === 'staff') await api.assignSalaryStructureToStaff(schoolId, assignTargetId, assignStructureId);
            else await api.assignSalaryStructureToTeacher(schoolId, assignTargetId, assignStructureId);
            addToast('تم الربط بنجاح.', 'success');
        } catch (e) { addToast('فشل الربط.', 'error'); }
    };

    const handleProcess = async () => {
        try { const res = await api.processPayrollForMonth(schoolId, month); addToast(`تم توليد ${res.createdCount} كشف راتب.`, 'success'); const slips = await api.getSalarySlipsForSchool(schoolId, month); setSalarySlips(slips); } catch (e) { addToast('فشل إصدار الرواتب.', 'error'); }
    };

    const handleApprove = async (id: string) => {
        try { const updated = await api.approveSalarySlip(schoolId, id); setSalarySlips(prev => prev.map(s => s.id === id ? updated : s)); addToast('تمت الموافقة على الكشف.', 'success'); } catch { addToast('فشل الموافقة.', 'error'); }
    };

    const handleExportSlipsCsv = () => {
        const rows = salarySlips.filter(s => (slipsStatusFilter === 'all' || String(s.status) === slipsStatusFilter) && String(personName(s.personType, String(s.personId))).toLowerCase().includes(String(slipsSearch || '').trim().toLowerCase()));
        const header = ['رقم الكشف','الاسم','النوع','الشهر','الأساسي','إجمالي العلاوات','إجمالي الخصومات','الصافي','الحالة','رقم السند','تاريخ السند','العملة'];
        const fmt = (v: any) => {
            const str = v == null ? '' : String(v);
            if (/[",\n]/.test(str)) return `"${str.replace(/"/g,'""')}"`;
            return str;
        };
        const lines = [header.join(',')];
        for (const s of rows) {
            const num = `SL-${schoolId}-${s.month}-${s.personType}-${s.personId}`;
            const name = personName(s.personType, String(s.personId));
            const type = s.personType === 'staff' ? 'الموظف' : 'المعلم';
            const base = Number(s.baseAmount || 0).toFixed(2);
            const at = Number(s.allowancesTotal || 0).toFixed(2);
            const dt = Number(s.deductionsTotal || 0).toFixed(2);
            const net = Number(s.netAmount || 0).toFixed(2);
            const status = s.status || '';
            const rn = s.receiptNumber || '';
            const rd = s.receiptDate || '';
            lines.push([num,name,type,s.month,base,at,dt,net,status,rn,rd,csvCurrency].map(fmt).join(','));
        }
        const csv = '\ufeff' + lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PayrollSlips_${schoolId}_${month}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportSummaryCsv = () => {
        const groups = ['Draft','Approved','Paid'];
        const calc = (st?: string) => {
            const arr = salarySlips.filter(s => (!st ? true : String(s.status) === st));
            const count = arr.length;
            const total = arr.reduce((sum, s) => sum + Number(s.netAmount || 0), 0);
            return { count, total: total.toFixed(2) };
        };
        const all = calc();
        const header = ['الحالة','عدد الكشوف','إجمالي الصافي','العملة'];
        const lines = [header.join(',')];
        for (const g of groups) {
            const r = calc(g);
            lines.push([g, String(r.count), r.total, csvCurrency].join(','));
        }
        lines.push(['All', String(all.count), all.total, csvCurrency].join(','));
        const csv = '\ufeff' + lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PayrollSummary_${schoolId}_${month}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportSlipsByStatusCsv = (st: 'Draft' | 'Approved' | 'Paid') => {
        const rows = salarySlips.filter(s => String(s.status) === st);
        const header = ['رقم الكشف','الاسم','النوع','الشهر','الأساسي','إجمالي العلاوات','إجمالي الخصومات','الصافي','الحالة','رقم السند','تاريخ السند','العملة'];
        const fmt = (v: any) => {
            const str = v == null ? '' : String(v);
            if (/[",\n]/.test(str)) return `"${str.replace(/"/g,'""')}"`;
            return str;
        };
        const lines = [header.join(',')];
        for (const s of rows) {
            const num = `SL-${schoolId}-${s.month}-${s.personType}-${s.personId}`;
            const name = personName(s.personType, String(s.personId));
            const type = s.personType === 'staff' ? 'الموظف' : 'المعلم';
            const base = Number(s.baseAmount || 0).toFixed(2);
            const at = Number(s.allowancesTotal || 0).toFixed(2);
            const dt = Number(s.deductionsTotal || 0).toFixed(2);
            const net = Number(s.netAmount || 0).toFixed(2);
            const status = s.status || '';
            const rn = s.receiptNumber || '';
            const rd = s.receiptDate || '';
            lines.push([num,name,type,s.month,base,at,dt,net,status,rn,rd,csvCurrency].map(fmt).join(','));
        }
        const csv = '\ufeff' + lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PayrollSlips_${schoolId}_${month}_${st}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportComponentsCsv = () => {
        const header = ['رقم الكشف','الاسم','النوع','الشهر','الفئة','البند','المبلغ','العملة'];
        const fmt = (v: any) => {
            const str = v == null ? '' : String(v);
            if (/[",\n]/.test(str)) return `"${str.replace(/"/g,'""')}"`;
            return str;
        };
        const lines = [header.join(',')];
        for (const s of salarySlips) {
            const num = `SL-${schoolId}-${s.month}-${s.personType}-${s.personId}`;
            const name = personName(s.personType, String(s.personId));
            const type = s.personType === 'staff' ? 'الموظف' : 'المعلم';
            const monthStr = s.month;
            const allowances = Array.isArray(s.allowances) ? s.allowances : [];
            const deductions = Array.isArray(s.deductions) ? s.deductions : [];
            for (const a of allowances) {
                lines.push([num,name,type,monthStr,'علاوة', String(a.name || ''), Number(a.amount || 0).toFixed(2), csvCurrency].map(fmt).join(','));
            }
            for (const d of deductions) {
                lines.push([num,name,type,monthStr,'خصم', String(d.name || ''), Number(d.amount || 0).toFixed(2), csvCurrency].map(fmt).join(','));
            }
        }
        const csv = '\ufeff' + lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PayrollComponents_${schoolId}_${month}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportUnifiedCsv = () => {
        const rows = salarySlips.filter(s => (slipsStatusFilter === 'all' || String(s.status) === slipsStatusFilter) && String(personName(s.personType, String(s.personId))).toLowerCase().includes(String(slipsSearch || '').trim().toLowerCase()));
        const header = ['رقم الكشف','الاسم','النوع','الشهر','الأساسي','إجمالي العلاوات','إجمالي الخصومات','الصافي','الحالة','رقم السند','تاريخ السند','تفاصيل العلاوات','تفاصيل الخصومات','العملة'];
        const fmt = (v: any) => {
            const str = v == null ? '' : String(v);
            if (/[",\n]/.test(str)) return `"${str.replace(/"/g,'""')}"`;
            return str;
        };
        const lines = [header.join(',')];
        for (const s of rows) {
            const num = `SL-${schoolId}-${s.month}-${s.personType}-${s.personId}`;
            const name = personName(s.personType, String(s.personId));
            const type = s.personType === 'staff' ? 'الموظف' : 'المعلم';
            const base = Number(s.baseAmount || 0).toFixed(2);
            const at = Number(s.allowancesTotal || 0).toFixed(2);
            const dt = Number(s.deductionsTotal || 0).toFixed(2);
            const net = Number(s.netAmount || 0).toFixed(2);
            const status = s.status || '';
            const rn = s.receiptNumber || '';
            const rd = s.receiptDate || '';
            const allowList = (Array.isArray(s.allowances) ? s.allowances : []).map((a: any) => `${String(a.name || '')}:${Number(a.amount || 0).toFixed(2)}`).join(detailDelimiter);
            const deductList = (Array.isArray(s.deductions) ? s.deductions : []).map((d: any) => `${String(d.name || '')}:${Number(d.amount || 0).toFixed(2)}`).join(detailDelimiter);
            lines.push([num,name,type,s.month,base,at,dt,net,status,rn,rd,allowList,deductList,csvCurrency].map(fmt).join(','));
        }
        const csv = '\ufeff' + lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PayrollUnified_${schoolId}_${month}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSubmitReceipt = async () => {
        if (!receiptSlipId) return;
        try {
            const updated = await api.submitPayrollReceipt(schoolId, receiptSlipId, { receiptNumber, receiptDate, attachment: receiptFile });
            setSalarySlips(prev => prev.map(s => s.id === receiptSlipId ? updated : s));
            setReceiptSlipId(''); setReceiptNumber(''); setReceiptDate(''); setReceiptFile(null);
            addToast('تم رفع سند الاستلام وتحديث الحالة إلى مدفوع.', 'success');
        } catch { addToast('فشل رفع السند.', 'error'); }
    };

    if (loading) return <TableSkeleton />;

    return (
        <div className="mt-6 space-y-6">
            <BrandableCard schoolSettings={schoolSettings}>
                <div className="flex items-center justify-between mb-4"><h4 className="font-semibold">هياكل الرواتب</h4></div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                    <input type="text" placeholder="اسم الهيكل" value={newStructure.name} onChange={e => setNewStructure(prev => ({ ...prev, name: e.target.value }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    <select value={newStructure.type} onChange={e => setNewStructure(prev => ({ ...prev, type: e.target.value as any }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                        <option value="Fixed">راتب شهري ثابت</option>
                        <option value="Hourly">بالساعات</option>
                        <option value="PartTime">دوام جزئي</option>
                        <option value="PerLesson">بالحصص</option>
                    </select>
                    {(newStructure.type === 'Fixed' || newStructure.type === 'PartTime') && (
                      <input type="number" placeholder="الراتب الأساسي" value={Number(newStructure.baseAmount || 0)} onChange={e => setNewStructure(prev => ({ ...prev, baseAmount: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    )}
                    {newStructure.type === 'Hourly' && (
                      <input type="number" step="0.01" placeholder="الأجر بالساعة" value={Number(newStructure.hourlyRate || 0)} onChange={e => setNewStructure(prev => ({ ...prev, hourlyRate: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    )}
                    {newStructure.type === 'PerLesson' && (
                      <input type="number" step="0.01" placeholder="الأجر للحصة" value={Number(newStructure.lessonRate || 0)} onChange={e => setNewStructure(prev => ({ ...prev, lessonRate: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    )}
                    <select value={newStructure.appliesTo || 'staff'} onChange={e => setNewStructure(prev => ({ ...prev, appliesTo: e.target.value as any }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                        <option value="staff">الموظفون</option>
                        <option value="teacher">المعلمون</option>
                    </select>
                    <button onClick={handleCreateStructure} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">إضافة هيكل</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input type="number" step="0.01" placeholder="غرامة غياب/اليوم" value={Number(newStructure.absencePenaltyPerDay || 0)} onChange={e => setNewStructure(prev => ({ ...prev, absencePenaltyPerDay: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    <input type="number" step="0.0001" placeholder="غرامة تأخير/دقيقة" value={Number(newStructure.latePenaltyPerMinute || 0)} onChange={e => setNewStructure(prev => ({ ...prev, latePenaltyPerMinute: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    <input type="number" step="0.0001" placeholder="أجر إضافي/دقيقة" value={Number(newStructure.overtimeRatePerMinute || 0)} onChange={e => setNewStructure(prev => ({ ...prev, overtimeRatePerMinute: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    <div className="col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="text" placeholder="اسم العلاوة" id="allowName" className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" step="0.01" placeholder="قيمة العلاوة" id="allowAmount" className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <button onClick={() => {
                            const nameEl = document.getElementById('allowName') as HTMLInputElement | null;
                            const amtEl = document.getElementById('allowAmount') as HTMLInputElement | null;
                            const name = nameEl?.value || '';
                            const amount = Number(amtEl?.value || 0);
                            if (!name.trim()) { addToast('أدخل اسم العلاوة.', 'error'); return; }
                            if (amount < 0) { addToast('قيمة العلاوة يجب ألا تكون سالبة.', 'error'); return; }
                            setNewStructure(prev => ({ ...prev, allowances: [...(prev.allowances || []), { name, amount }] }));
                            if (nameEl) nameEl.value = '';
                            if (amtEl) amtEl.value = '';
                        }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">إضافة علاوة</button>
                    </div>
                </div>
                {Array.isArray(newStructure.allowances) && newStructure.allowances.length > 0 && (
                    <div className="mb-4">
                        <div className="text-sm font-semibold mb-2">العلاوات</div>
                        <div className="flex flex-wrap gap-2">
                            {newStructure.allowances!.map((a, idx) => (
                                <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full dark:bg-green-900 dark:text-green-200">
                                    {a.name}: {Number(a.amount).toFixed(2)}
                                    <button onClick={() => setNewStructure(prev => ({ ...prev, allowances: (prev.allowances || []).filter((_, i) => i !== idx) }))} className="ml-2 text-red-600">×</button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    <div className="col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="text" placeholder="اسم الخصم" id="deductName" className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" step="0.01" placeholder="قيمة الخصم" id="deductAmount" className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <button onClick={() => {
                            const nameEl = document.getElementById('deductName') as HTMLInputElement | null;
                            const amtEl = document.getElementById('deductAmount') as HTMLInputElement | null;
                            const name = nameEl?.value || '';
                            const amount = Number(amtEl?.value || 0);
                            if (!name.trim()) { addToast('أدخل اسم الخصم.', 'error'); return; }
                            if (amount < 0) { addToast('قيمة الخصم يجب ألا تكون سالبة.', 'error'); return; }
                            setNewStructure(prev => ({ ...prev, deductions: [...(prev.deductions || []), { name, amount }] }));
                            if (nameEl) nameEl.value = '';
                            if (amtEl) amtEl.value = '';
                        }} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">إضافة خصم</button>
                    </div>
                </div>
                {Array.isArray(newStructure.deductions) && newStructure.deductions.length > 0 && (
                    <div className="mb-4">
                        <div className="text-sm font-semibold mb-2">الخصومات</div>
                        <div className="flex flex-wrap gap-2">
                            {newStructure.deductions!.map((d, idx) => (
                                <span key={idx} className="px-3 py-1 bg-red-100 text-red-800 rounded-full dark:bg-red-900 dark:text-red-200">
                                    {d.name}: {Number(d.amount).toFixed(2)}
                                    <button onClick={() => setNewStructure(prev => ({ ...prev, deductions: (prev.deductions || []).filter((_, i) => i !== idx) }))} className="ml-2 text-red-600">×</button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th className="px-6 py-3">الاسم</th><th className="px-6 py-3">النوع</th><th className="px-6 py-3">أساسي</th><th className="px-6 py-3">ينطبق على</th><th className="px-6 py-3">إجراءات</th></tr></thead>
                        <tbody>
                            {salaryStructures.map(s => (<tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"><td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{s.name}</td><td className="px-6 py-4">{s.type}</td><td className="px-6 py-4">{Number(s.baseAmount || 0).toFixed(2)}</td><td className="px-6 py-4">{s.appliesTo === 'staff' ? 'الموظفون' : 'المعلمون'}</td><td className="px-6 py-4"><div className="flex gap-3"><button onClick={() => { setEditingStructure(s); setEditForm({ ...s }); }} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">تحرير</button><button onClick={() => handleDeleteStructure(s.id!)} className="font-medium text-red-600 dark:text-red-500 hover:underline">حذف</button></div></td></tr>))}
                </tbody>
            </table>
        </div>
    </BrandableCard>
            {editingStructure && editForm && (
                <BrandableCard schoolSettings={schoolSettings}>
                    <div className="flex items-center justify-between mb-4"><h4 className="font-semibold">تحرير هيكل الراتب</h4></div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                        <input type="text" placeholder="اسم الهيكل" value={editForm.name} onChange={e => setEditForm(prev => ({ ...(prev as any), name: e.target.value }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <select value={editForm.type} onChange={e => setEditForm(prev => ({ ...(prev as any), type: e.target.value as any }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="Fixed">راتب شهري ثابت</option>
                            <option value="Hourly">بالساعات</option>
                            <option value="PartTime">دوام جزئي</option>
                            <option value="PerLesson">بالحصص</option>
                        </select>
                        {(editForm.type === 'Fixed' || editForm.type === 'PartTime') && (
                          <input type="number" placeholder="الراتب الأساسي" value={Number(editForm.baseAmount || 0)} onChange={e => setEditForm(prev => ({ ...(prev as any), baseAmount: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        )}
                        {editForm.type === 'Hourly' && (
                          <input type="number" step="0.01" placeholder="الأجر بالساعة" value={Number(editForm.hourlyRate || 0)} onChange={e => setEditForm(prev => ({ ...(prev as any), hourlyRate: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        )}
                        {editForm.type === 'PerLesson' && (
                          <input type="number" step="0.01" placeholder="الأجر للحصة" value={Number(editForm.lessonRate || 0)} onChange={e => setEditForm(prev => ({ ...(prev as any), lessonRate: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <input type="number" step="0.01" placeholder="غرامة غياب/اليوم" value={Number(editForm.absencePenaltyPerDay || 0)} onChange={e => setEditForm(prev => ({ ...(prev as any), absencePenaltyPerDay: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" step="0.0001" placeholder="غرامة تأخير/دقيقة" value={Number(editForm.latePenaltyPerMinute || 0)} onChange={e => setEditForm(prev => ({ ...(prev as any), latePenaltyPerMinute: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" step="0.0001" placeholder="أجر إضافي/دقيقة" value={Number(editForm.overtimeRatePerMinute || 0)} onChange={e => setEditForm(prev => ({ ...(prev as any), overtimeRatePerMinute: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                        <input type="text" placeholder="اسم العلاوة" id="editAllowName" className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" step="0.01" placeholder="قيمة العلاوة" id="editAllowAmount" className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <button onClick={() => {
                            const nameEl = document.getElementById('editAllowName') as HTMLInputElement | null;
                            const amtEl = document.getElementById('editAllowAmount') as HTMLInputElement | null;
                            const name = nameEl?.value || '';
                            const amount = Number(amtEl?.value || 0);
                            if (!name.trim()) { addToast('أدخل اسم العلاوة.', 'error'); return; }
                            if (amount < 0) { addToast('قيمة العلاوة يجب ألا تكون سالبة.', 'error'); return; }
                            setEditForm(prev => ({ ...(prev as any), allowances: [...((prev?.allowances as any[]) || []), { name, amount }] }) as any);
                            if (nameEl) nameEl.value = '';
                            if (amtEl) amtEl.value = '';
                        }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">إضافة علاوة</button>
                    </div>
                    {Array.isArray(editForm.allowances) && editForm.allowances.length > 0 && (
                        <div className="mb-4">
                            <div className="text-sm font-semibold mb-2">العلاوات</div>
                            <div className="flex flex-wrap gap-2">
                                {editForm.allowances!.map((a, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full dark:bg-green-900 dark:text-green-200">
                                        {a.name}: {Number(a.amount).toFixed(2)}
                                        <button onClick={() => setEditForm(prev => {
                                            const arr = [ ...(prev!.allowances || []) ];
                                            arr.splice(idx, 1);
                                            return { ...(prev as any), allowances: arr };
                                        })} className="ml-2 text-red-600">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                        <input type="text" placeholder="اسم الخصم" id="editDeductName" className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" step="0.01" placeholder="قيمة الخصم" id="editDeductAmount" className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <button onClick={() => {
                            const nameEl = document.getElementById('editDeductName') as HTMLInputElement | null;
                            const amtEl = document.getElementById('editDeductAmount') as HTMLInputElement | null;
                            const name = nameEl?.value || '';
                            const amount = Number(amtEl?.value || 0);
                            if (!name.trim()) { addToast('أدخل اسم الخصم.', 'error'); return; }
                            if (amount < 0) { addToast('قيمة الخصم يجب ألا تكون سالبة.', 'error'); return; }
                            setEditForm(prev => ({ ...(prev as any), deductions: [...((prev?.deductions as any[]) || []), { name, amount }] }) as any);
                            if (nameEl) nameEl.value = '';
                            if (amtEl) amtEl.value = '';
                        }} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">إضافة خصم</button>
                    </div>
                    {Array.isArray(editForm.deductions) && editForm.deductions.length > 0 && (
                        <div className="mb-4">
                            <div className="text-sm font-semibold mb-2">الخصومات</div>
                            <div className="flex flex-wrap gap-2">
                                {editForm.deductions!.map((d, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-red-100 text-red-800 rounded-full dark:bg-red-900 dark:text-red-200">
                                        {d.name}: {Number(d.amount).toFixed(2)}
                                        <button onClick={() => setEditForm(prev => {
                                            const arr = [ ...(prev!.deductions || []) ];
                                            arr.splice(idx, 1);
                                            return { ...(prev as any), deductions: arr };
                                        })} className="ml-2 text-red-600">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button onClick={async () => {
                            if (!editingStructure?.id) return;
                            const name = String(editForm!.name || '').trim();
                            const type = String(editForm!.type || 'Fixed');
                            const baseAmount = Number(editForm!.baseAmount || 0);
                            const hourlyRate = Number(editForm!.hourlyRate || 0);
                            const lessonRate = Number(editForm!.lessonRate || 0);
                            if (name.length < 2) { addToast('اسم الهيكل قصير جدًا.', 'error'); return; }
                            if ((type === 'Fixed' || type === 'PartTime') && baseAmount < 0) { addToast('الراتب الأساسي يجب ألا يكون سالبًا.', 'error'); return; }
                            if (type === 'Hourly' && hourlyRate <= 0) { addToast('أدخل أجراً صحيحًا بالساعة.', 'error'); return; }
                            if (type === 'PerLesson' && lessonRate <= 0) { addToast('أدخل أجراً صحيحًا للحصة.', 'error'); return; }
                            try {
                                const updated = await api.updateSalaryStructure(schoolId, editingStructure.id!, {
                                    name,
                                    type: type as any,
                                    baseAmount,
                                    hourlyRate,
                                    lessonRate,
                                    absencePenaltyPerDay: Math.max(0, Number(editForm!.absencePenaltyPerDay || 0)),
                                    latePenaltyPerMinute: Math.max(0, Number(editForm!.latePenaltyPerMinute || 0)),
                                    overtimeRatePerMinute: Math.max(0, Number(editForm!.overtimeRatePerMinute || 0)),
                                    allowances: (editForm!.allowances || []).map(a => ({ name: a.name, amount: Math.max(0, Number(a.amount || 0)) })),
                                    deductions: (editForm!.deductions || []).map(d => ({ name: d.name, amount: Math.max(0, Number(d.amount || 0)) })),
                                });
                                setSalaryStructures(prev => prev.map(s => s.id === updated.id ? updated : s));
                                setEditingStructure(null);
                                setEditForm(null);
                                addToast('تم حفظ التعديلات.', 'success');
                            } catch { addToast('فشل حفظ التعديلات.', 'error'); }
                        }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">حفظ</button>
                        <button onClick={() => { setEditingStructure(null); setEditForm(null); }} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">إلغاء</button>
                    </div>
                </BrandableCard>
            )}
            <BrandableCard schoolSettings={schoolSettings}>
                <div className="flex items-center justify-between mb-4"><h4 className="font-semibold">الربط بين الموظفين/المعلمين وهيكل الراتب</h4></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select value={assignTargetType} onChange={e => setAssignTargetType(e.target.value as any)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                        <option value="staff">الموظفون</option>
                        <option value="teacher">المعلمون</option>
                    </select>
                    <select value={assignTargetId} onChange={e => setAssignTargetId(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                        <option value="">اختر الشخص...</option>
                        {(assignTargetType === 'staff' ? staff : teachers).map(p => (<option key={p.id} value={String(p.id)}>{p.name}</option>))}
                    </select>
                    <select value={assignStructureId} onChange={e => setAssignStructureId(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                        <option value="">اختر الهيكل...</option>
                        {salaryStructures.filter(s => (assignTargetType === 'staff' ? s.appliesTo === 'staff' : s.appliesTo === 'teacher')).map(s => (<option key={s.id} value={s.id!}>{s.name}</option>))}
                    </select>
                    <button onClick={handleAssign} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">ربط</button>
                </div>
            </BrandableCard>
            <BrandableCard schoolSettings={schoolSettings}>
                <div className="flex items-center justify-between mb-4"><h4 className="font-semibold">إصدار الرواتب الشهرية</h4></div>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    <button onClick={handleProcess} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">توليد كشوف الرواتب</button>
                    <button onClick={async () => { const slips = await api.getSalarySlipsForSchool(schoolId, month); setSalarySlips(slips); }} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">تحديث القائمة</button>
                    <input type="text" placeholder="بحث بالاسم..." value={slipsSearch} onChange={e => setSlipsSearch(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    <select value={slipsStatusFilter} onChange={e => setSlipsStatusFilter(e.target.value as any)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                      <option value="all">كل الحالات</option>
                      <option value="Draft">مسودة</option>
                      <option value="Approved">موافق عليه</option>
                      <option value="Paid">مدفوع</option>
                    </select>
                    <button onClick={handleExportSlipsCsv} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">تصدير CSV</button>
                    <button onClick={() => handleExportSlipsByStatusCsv('Draft')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">تصدير مسودة</button>
                    <button onClick={() => handleExportSlipsByStatusCsv('Approved')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">تصدير موافق</button>
                    <button onClick={() => handleExportSlipsByStatusCsv('Paid')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">تصدير مدفوع</button>
                    <button onClick={handleExportComponentsCsv} className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700">تصدير تفاصيل العلاوات/الخصومات</button>
                    <button onClick={handleExportUnifiedCsv} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">تصدير CSV موحد</button>
                    <select value={detailDelimiter} onChange={e => setDetailDelimiter(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                      <option value="; ">فاصل التفاصيل: ;</option>
                      <option value=" | ">فاصل التفاصيل: |</option>
                      <option value=" / ">فاصل التفاصيل: /</option>
                    </select>
                    <select value={csvCurrency} onChange={e => setCsvCurrency(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                      <option value="SAR">العملة: SAR</option>
                      <option value="USD">العملة: USD</option>
                      <option value="YER">العملة: YER</option>
                      <option value="EGP">العملة: EGP</option>
                    </select>
                </div>
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th className="px-6 py-3">الشخص</th><th className="px-6 py-3">النوع</th><th className="px-6 py-3">الشهر</th><th className="px-6 py-3">الصافي</th><th className="px-6 py-3">الحالة</th><th className="px-6 py-3">إجراءات</th></tr></thead>
                        <tbody>
                            {(() => {
                                const filteredSlips = salarySlips.filter(s => (slipsStatusFilter === 'all' || String(s.status) === slipsStatusFilter) && String(personName(s.personType, String(s.personId))).toLowerCase().includes(String(slipsSearch || '').trim().toLowerCase()));
                                if (filteredSlips.length === 0) {
                                    return (
                                        <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                            <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">لا توجد كشوف رواتب للشهر المحدد.</td>
                                        </tr>
                                    );
                                }
                                return filteredSlips.map(s => (
                                    <tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{personName(s.personType, String(s.personId))}</td>
                                        <td className="px-6 py-4">{s.personType === 'staff' ? 'الموظف' : 'المعلم'}</td>
                                        <td className="px-6 py-4">{s.month}</td>
                                        <td className="px-6 py-4 font-semibold">{Number(s.netAmount || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4">{s.status}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex gap-2">
                                                {s.status === 'Draft' && (<button onClick={() => handleApprove(s.id)} className="font-medium text-teal-600 dark:text-teal-500 hover:underline">موافقة</button>)}
                                                <button onClick={() => { setDetailSlip(s); setEditSlipBase(String(Number(s.baseAmount || 0))); }} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">تفاصيل</button>
                                                {s.status !== 'Paid' && (
                                                  <button onClick={() => setReceiptSlipId(s.id)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">سند استلام</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
                {receiptSlipId && (
                  <div className="mt-6 border-t pt-4">
                    <h5 className="font-semibold mb-2">رفع سند الاستلام</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <input type="text" placeholder="رقم السند" value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                      <input type="date" placeholder="تاريخ السند" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                      <input type="file" accept=".pdf,image/png,image/jpeg,.png,.jpg,.jpeg,application/pdf" onChange={e => {
                        const f = e.target.files?.[0] || null;
                        if (f) {
                          const okType = ['application/pdf','image/png','image/jpeg'].includes(f.type);
                          const okExt = /\.(pdf|png|jpe?g)$/i.test(f.name || '');
                          const okSize = f.size <= 10 * 1024 * 1024;
                          if (!okType || !okExt) { addToast('نوع الملف غير مدعوم. يسمح بـ PDF و PNG و JPG.', 'error'); e.currentTarget.value = ''; setReceiptFile(null); return; }
                          if (!okSize) { addToast('الملف يتجاوز 10MB.', 'error'); e.currentTarget.value = ''; setReceiptFile(null); return; }
                        }
                        setReceiptFile(f);
                      }} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                      <div className="flex items-center gap-2">
                        <button onClick={() => {
                          if (!receiptNumber || !receiptDate) { addToast('أدخل رقم وتاريخ السند.', 'error'); return; }
                          handleSubmitReceipt();
                        }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">حفظ السند</button>
                        <button onClick={() => { setReceiptSlipId(''); setReceiptNumber(''); setReceiptDate(''); setReceiptFile(null); }} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">إلغاء</button>
                      </div>
                    </div>
                  </div>
                )}
            </BrandableCard>
            <BrandableCard schoolSettings={schoolSettings}>
                <div className="flex items-center justify-between mb-4"><h4 className="font-semibold">تقرير شهري مجمل حسب الحالة</h4></div>
                {(() => {
                    const calc = (st?: string) => {
                        const arr = salarySlips.filter(s => (!st ? true : String(s.status) === st));
                        const count = arr.length;
                        const total = arr.reduce((sum, s) => sum + Number(s.netAmount || 0), 0);
                        return { count, total: total.toFixed(2) };
                    };
                    const draft = calc('Draft');
                    const approved = calc('Approved');
                    const paid = calc('Paid');
                    const all = calc();
                    return (
                        <div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr><th className="px-6 py-3">الحالة</th><th className="px-6 py-3">عدد الكشوف</th><th className="px-6 py-3">إجمالي الصافي</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700"><td className="px-6 py-3">مسودة</td><td className="px-6 py-3">{draft.count}</td><td className="px-6 py-3">{draft.total}</td></tr>
                                        <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700"><td className="px-6 py-3">موافق عليه</td><td className="px-6 py-3">{approved.count}</td><td className="px-6 py-3">{approved.total}</td></tr>
                                        <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700"><td className="px-6 py-3">مدفوع</td><td className="px-6 py-3">{paid.count}</td><td className="px-6 py-3">{paid.total}</td></tr>
                                        <tr className="bg-white dark:bg-gray-800"><td className="px-6 py-3 font-semibold">الكل</td><td className="px-6 py-3 font-semibold">{all.count}</td><td className="px-6 py-3 font-semibold">{all.total}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4">
                                <button onClick={handleExportSummaryCsv} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">تصدير CSV للتقرير</button>
                            </div>
                        </div>
                    );
                })()}
            </BrandableCard>
            {detailSlip && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div ref={slipPrintRef} className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-2xl text-right">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      {schoolSettings?.schoolLogoUrl && (<img src={api.getAssetUrl(String(schoolSettings?.schoolLogoUrl))} alt="Logo" className="w-10 h-10 rounded-lg" />)}
                      <div>
                        <div className="text-lg font-bold">{schoolSettings?.schoolName || 'المدرسة'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{detailSlip ? `رقم الكشف: SL-${schoolId}-${detailSlip.month}-${detailSlip.personType}-${detailSlip.personId}` : ''}</div>
                      </div>
                    </div>
                    <button onClick={() => setDetailSlip(null)} className="text-gray-500 hover:text-gray-700">×</button>
                  </div>
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="text-gray-600 dark:text-gray-400">الشخص:</span> {personName(detailSlip.personType, String(detailSlip.personId))}</div>
                      <div><span className="text-gray-600 dark:text-gray-400">النوع:</span> {detailSlip.personType === 'staff' ? 'الموظف' : 'المعلم'}</div>
                      <div><span className="text-gray-600 dark:text-gray-400">الشهر:</span> {detailSlip.month}</div>
                      <div><span className="text-gray-600 dark:text-gray-400">الحالة:</span> {detailSlip.status}</div>
                    </div>
                    <div className="border-t pt-4">
                      <div className="font-semibold mb-2">تفاصيل الراتب:</div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div><span className="text-gray-600 dark:text-gray-400">الراتب الأساسي:</span> {Number(editSlipBase || detailSlip.baseAmount || 0).toFixed(2)}</div>
                        <div><span className="text-gray-600 dark:text-gray-400">إجمالي العلاوات:</span> {((Array.isArray(detailSlip.allowances) ? detailSlip.allowances : []).reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0)).toFixed(2)}</div>
                        <div><span className="text-gray-600 dark:text-gray-400">إجمالي الخصومات:</span> {((Array.isArray(detailSlip.deductions) ? detailSlip.deductions : []).reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0)).toFixed(2)}</div>
                        <div className="font-semibold"><span className="text-gray-600 dark:text-gray-400">الصافي:</span> {(() => {
                          const base = Number(editSlipBase || detailSlip.baseAmount || 0);
                          const at = (Array.isArray(detailSlip.allowances) ? detailSlip.allowances : []).reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0);
                          const dt = (Array.isArray(detailSlip.deductions) ? detailSlip.deductions : []).reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);
                          return (base + at - dt).toFixed(2);
                        })()}</div>
                      </div>
                      {Array.isArray(detailSlip.allowances) && detailSlip.allowances.length > 0 && (
                        <div className="mb-2">
                          <div className="text-sm font-semibold mb-1">العلاوات</div>
                          <div className="flex flex-wrap gap-2">
                            {detailSlip.allowances.map((a: any, i: number) => (
                              <span key={i} className="px-3 py-1 bg-green-100 text-green-800 rounded-full dark:bg-green-900 dark:text-green-200">{a.name}: {Number(a.amount || 0).toFixed(2)}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {Array.isArray(detailSlip.deductions) && detailSlip.deductions.length > 0 && (
                        <div>
                          <div className="text-sm font-semibold mb-1">الخصومات</div>
                          <div className="flex flex-wrap gap-2">
                            {detailSlip.deductions.map((d: any, i: number) => (
                              <span key={i} className="px-3 py-1 bg-red-100 text-red-800 rounded-full dark:bg-red-900 dark:text-red-200">{d.name}: {Number(d.amount || 0).toFixed(2)}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-4">
                        <div className="text-sm font-semibold mb-2">تفاصيل الغياب/التأخير/الإضافي</div>
                        <div className="grid grid-cols-3 gap-2">
                          <div><span className="text-gray-600 dark:text-gray-400">أيام الغياب:</span> {Number(detailSlip.absenceDays || 0)}</div>
                          <div><span className="text-gray-600 dark:text-gray-400">دقائق التأخير:</span> {Number(detailSlip.lateMinutes || 0)}</div>
                          <div><span className="text-gray-600 dark:text-gray-400">دقائق إضافية:</span> {Number(detailSlip.overtimeMinutes || 0)}</div>
                        </div>
                        <div className="mt-3 border rounded-lg p-3">
                          {(() => {
                            const struct = salaryStructures.find(s => String(s.id) === String(detailSlip.structureId));
                            const absenceRate = struct?.absencePenaltyPerDay != null ? Number(struct.absencePenaltyPerDay) : 0;
                            const lateRate = struct?.latePenaltyPerMinute != null ? Number(struct.latePenaltyPerMinute) : 0;
                            const overtimeRate = (() => {
                              if (struct?.overtimeRatePerMinute != null) return Number(struct.overtimeRatePerMinute);
                              const hr = struct?.hourlyRate != null ? Number(struct.hourlyRate) : 0;
                              return hr > 0 ? hr / 60 : 0;
                            })();
                            const getAmount = (arr: any[] | undefined, name: string) => {
                              const item = (arr || []).find(a => String(a.name) === name);
                              return Number(item?.amount || 0);
                            };
                            const absenceAmount = getAmount(detailSlip.deductions, 'غياب');
                            const lateAmount = getAmount(detailSlip.deductions, 'تأخير');
                            const overtimeAmount = getAmount(detailSlip.allowances, 'ساعات إضافية');
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
                                  <div className="font-semibold text-red-700 dark:text-red-300">غرامة الغياب</div>
                                  <div><span className="text-gray-600 dark:text-gray-400">العدد:</span> {Number(detailSlip.absenceDays || 0)}</div>
                                  <div><span className="text-gray-600 dark:text-gray-400">سعر/يوم:</span> {absenceRate.toFixed(2)}</div>
                                  <div className="font-semibold"><span className="text-gray-600 dark:text-gray-400">المبلغ:</span> {absenceAmount.toFixed(2)}</div>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded p-2">
                                  <div className="font-semibold text-orange-700 dark:text-orange-300">غرامة التأخير</div>
                                  <div><span className="text-gray-600 dark:text-gray-400">الدقائق:</span> {Number(detailSlip.lateMinutes || 0)}</div>
                                  <div><span className="text-gray-600 dark:text-gray-400">سعر/دقيقة:</span> {lateRate.toFixed(4)}</div>
                                  <div className="font-semibold"><span className="text-gray-600 dark:text-gray-400">المبلغ:</span> {lateAmount.toFixed(2)}</div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
                                  <div className="font-semibold text-green-700 dark:text-green-300">بدل الساعات الإضافية</div>
                                  <div><span className="text-gray-600 dark:text-gray-400">الدقائق:</span> {Number(detailSlip.overtimeMinutes || 0)}</div>
                                  <div><span className="text-gray-600 dark:text-gray-400">سعر/دقيقة:</span> {overtimeRate.toFixed(4)}</div>
                                  <div className="font-semibold"><span className="text-gray-600 dark:text-gray-400">المبلغ:</span> {overtimeAmount.toFixed(2)}</div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    {detailSlip.receiptNumber && (
                      <div className="border-t pt-4">
                        <div className="font-semibold mb-2">سند الاستلام</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><span className="text-gray-600 dark:text-gray-400">رقم السند:</span> {detailSlip.receiptNumber}</div>
                          <div><span className="text-gray-600 dark:text-gray-400">تاريخ السند:</span> {detailSlip.receiptDate}</div>
                          <div><span className="text-gray-600 dark:text-gray-400">تم الاستلام بواسطة:</span> {detailSlip.receivedBy || ''}</div>
                        </div>
                      </div>
                    )}
                    {detailSlip.status === 'Draft' && (
                      <div className="border-t pt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input type="number" step="0.01" placeholder="الراتب الأساسي" value={editSlipBase} onChange={e => setEditSlipBase(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                          <input type="text" placeholder="اسم علاوة" value={editSlipAllowName} onChange={e => setEditSlipAllowName(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                          <div className="flex gap-2">
                            <input type="number" step="0.01" placeholder="قيمة علاوة" value={editSlipAllowAmount} onChange={e => setEditSlipAllowAmount(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 flex-1" />
                            <button onClick={() => {
                              const name = String(editSlipAllowName || '').trim();
                              const amt = Number(editSlipAllowAmount || 0);
                              if (!name) { addToast('أدخل اسم العلاوة.', 'error'); return; }
                              if (isNaN(amt) || amt < 0) { addToast('قيمة العلاوة غير صحيحة.', 'error'); return; }
                              setDetailSlip((prev: any) => ({ ...prev, allowances: [...(prev.allowances || []), { name, amount: amt }] }));
                              setEditSlipAllowName(''); setEditSlipAllowAmount('');
                            }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">إضافة علاوة</button>
                          </div>
                        </div>
                        {Array.isArray(detailSlip.allowances) && detailSlip.allowances.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {detailSlip.allowances.map((a: any, idx: number) => (
                              <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full dark:bg-green-900 dark:text-green-200">
                                {a.name}: {Number(a.amount).toFixed(2)}
                                <button onClick={() => setDetailSlip((prev: any) => ({ ...prev, allowances: (prev.allowances || []).filter((_: any, i: number) => i !== idx) }))} className="ml-2 text-red-600">×</button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input type="text" placeholder="اسم خصم" value={editSlipDeductName} onChange={e => setEditSlipDeductName(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                          <div className="flex gap-2 md:col-span-2">
                            <input type="number" step="0.01" placeholder="قيمة خصم" value={editSlipDeductAmount} onChange={e => setEditSlipDeductAmount(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 flex-1" />
                            <button onClick={() => {
                              const name = String(editSlipDeductName || '').trim();
                              const amt = Number(editSlipDeductAmount || 0);
                              if (!name) { addToast('أدخل اسم الخصم.', 'error'); return; }
                              if (isNaN(amt) || amt < 0) { addToast('قيمة الخصم غير صحيحة.', 'error'); return; }
                              setDetailSlip((prev: any) => ({ ...prev, deductions: [...(prev.deductions || []), { name, amount: amt }] }));
                              setEditSlipDeductName(''); setEditSlipDeductAmount('');
                            }} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">إضافة خصم</button>
                          </div>
                        </div>
                        {Array.isArray(detailSlip.deductions) && detailSlip.deductions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {detailSlip.deductions.map((d: any, idx: number) => (
                              <span key={idx} className="px-3 py-1 bg-red-100 text-red-800 rounded-full dark:bg-red-900 dark:text-red-200">
                                {d.name}: {Number(d.amount).toFixed(2)}
                                <button onClick={() => setDetailSlip((prev: any) => ({ ...prev, deductions: (prev.deductions || []).filter((_: any, i: number) => i !== idx) }))} className="ml-2 text-red-600">×</button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex justify-end gap-2">
                          <button onClick={async () => {
                            try {
                              const updated = await api.updateSalarySlip(schoolId, detailSlip.id, {
                                baseAmount: Number(editSlipBase || 0),
                                allowances: Array.isArray(detailSlip.allowances) ? detailSlip.allowances : [],
                                deductions: Array.isArray(detailSlip.deductions) ? detailSlip.deductions : [],
                              });
                              setSalarySlips(prev => prev.map(s => s.id === updated.id ? updated : s));
                              setDetailSlip(updated);
                              addToast('تم حفظ التعديلات على الكشف.', 'success');
                            } catch {
                              addToast('فشل حفظ تعديلات الكشف.', 'error');
                            }
                          }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">حفظ التعديلات</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={handleSlipPrint} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">طباعة</button>
                    <button onClick={handleSlipPrint} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">تصدير PDF</button>
                    <button onClick={() => setDetailSlip(null)} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">إغلاق</button>
                  </div>
                </div>
              </div>
            )}
            <BrandableCard schoolSettings={schoolSettings}>
                <div className="flex items-center justify-between mb-4"><h4 className="font-semibold">تسجيل حضور الموظفين</h4></div>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <select value={attendanceUserId} onChange={e => setAttendanceUserId(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                        <option value="">اختر الموظف...</option>
                        {staff.map(u => (<option key={u.id} value={String(u.id)}>{u.name}</option>))}
                    </select>
                    <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    <input type="time" placeholder="دخول" value={attendanceCheckIn} onChange={e => setAttendanceCheckIn(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    <input type="time" placeholder="خروج" value={attendanceCheckOut} onChange={e => setAttendanceCheckOut(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    <input type="number" step="0.01" placeholder="ساعات العمل" value={attendanceHoursWorked} onChange={e => setAttendanceHoursWorked(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    <select value={attendanceStatus} onChange={e => setAttendanceStatus(e.target.value as any)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"><option value="Present">حاضر</option><option value="Absent">غائب</option><option value="Late">متأخر</option></select>
                    <input type="number" placeholder="دقائق تأخير" value={attendanceLateMinutes} onChange={e => setAttendanceLateMinutes(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    <input type="number" placeholder="دقائق إضافية" value={attendanceOvertimeMinutes} onChange={e => setAttendanceOvertimeMinutes(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    <button onClick={async () => {
                      if (!attendanceUserId || !attendanceDate) { addToast('اختر الموظف والتاريخ.', 'error'); return; }
                      try { await api.createStaffAttendance(schoolId, { userId: attendanceUserId, date: attendanceDate, checkIn: attendanceCheckIn || undefined, checkOut: attendanceCheckOut || undefined, hoursWorked: attendanceHoursWorked ? Number(attendanceHoursWorked) : undefined, status: attendanceStatus, lateMinutes: attendanceLateMinutes ? Number(attendanceLateMinutes) : undefined, overtimeMinutes: attendanceOvertimeMinutes ? Number(attendanceOvertimeMinutes) : undefined }); addToast('تم تسجيل الحضور.', 'success'); setAttendanceCheckIn(''); setAttendanceCheckOut(''); setAttendanceHoursWorked(''); setAttendanceLateMinutes(''); setAttendanceOvertimeMinutes(''); } catch { addToast('فشل تسجيل الحضور.', 'error'); }
                    }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">تسجيل</button>
                </div>
            </BrandableCard>
        </div>
    );
};

export default FinancePayroll;
