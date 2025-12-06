import React, { useState, useEffect } from 'react';
import { SchoolSettings, Teacher, User } from '../../types';
import * as api from '../../api';
import type { SalaryStructurePayload } from '../../api';
import { NetProfitIcon } from '../../components/icons';
import { useToast } from '../../contexts/ToastContext';
import TableSkeleton from '../../components/TableSkeleton';
import BrandableCard from '../../components/BrandableCard';

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
    const [newStructure, setNewStructure] = useState<SalaryStructurePayload>({ name: '', type: 'Fixed', baseAmount: 0, allowances: [], deductions: [], appliesTo: 'staff', isDefault: false, absencePenaltyPerDay: 0, latePenaltyPerMinute: 0, overtimeRatePerMinute: 0 });
    
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

    useEffect(() => {
        fetchData();
    }, [schoolId]);

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.getSalaryStructures(schoolId),
            api.getSchoolStaff(schoolId),
            api.getSchoolTeachers(schoolId),
            api.getSalarySlipsForSchool(schoolId, month),
        ]).then(([structuresData, staffData, teachersData, slipsData]) => {
            setSalaryStructures(structuresData);
            setStaff(staffData);
            setTeachers(teachersData);
            setSalarySlips(slipsData);
        }).catch(err => {
            console.error("Failed to fetch payroll data:", err);
            addToast("فشل تحميل بيانات الرواتب.", 'error');
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
        try {
            const created = await api.createSalaryStructure(schoolId, newStructure);
            setSalaryStructures(prev => [created, ...prev]);
            setNewStructure({ name: '', type: 'Fixed', baseAmount: 0, allowances: [], deductions: [], appliesTo: 'staff', isDefault: false });
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
                    <input type="number" placeholder="الراتب الأساسي" value={Number(newStructure.baseAmount || 0)} onChange={e => setNewStructure(prev => ({ ...prev, baseAmount: Number(e.target.value || 0) }))} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
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
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th className="px-6 py-3">الاسم</th><th className="px-6 py-3">النوع</th><th className="px-6 py-3">أساسي</th><th className="px-6 py-3">ينطبق على</th><th className="px-6 py-3">إجراءات</th></tr></thead>
                        <tbody>
                            {salaryStructures.map(s => (<tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"><td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{s.name}</td><td className="px-6 py-4">{s.type}</td><td className="px-6 py-4">{Number(s.baseAmount || 0).toFixed(2)}</td><td className="px-6 py-4">{s.appliesTo === 'staff' ? 'الموظفون' : 'المعلمون'}</td><td className="px-6 py-4"><button onClick={() => handleDeleteStructure(s.id!)} className="font-medium text-red-600 dark:text-red-500 hover:underline">حذف</button></td></tr>))}
                        </tbody>
                    </table>
                </div>
            </BrandableCard>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    <button onClick={handleProcess} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">توليد كشوف الرواتب</button>
                    <button onClick={async () => { const slips = await api.getSalarySlipsForSchool(schoolId, month); setSalarySlips(slips); }} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">تحديث القائمة</button>
                </div>
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th className="px-6 py-3">الشخص</th><th className="px-6 py-3">النوع</th><th className="px-6 py-3">الشهر</th><th className="px-6 py-3">الصافي</th><th className="px-6 py-3">الحالة</th><th className="px-6 py-3">إجراءات</th></tr></thead>
                        <tbody>
                            {salarySlips.map(s => (
                                <tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{personName(s.personType, String(s.personId))}</td>
                                    <td className="px-6 py-4">{s.personType === 'staff' ? 'الموظف' : 'المعلم'}</td>
                                    <td className="px-6 py-4">{s.month}</td>
                                    <td className="px-6 py-4 font-semibold">{Number(s.netAmount || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4">{s.status}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex gap-2">
                                            {s.status === 'Draft' && (<button onClick={() => handleApprove(s.id)} className="font-medium text-teal-600 dark:text-teal-500 hover:underline">موافقة</button>)}
                                            {s.status !== 'Paid' && (
                                              <button onClick={() => setReceiptSlipId(s.id)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">سند استلام</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {receiptSlipId && (
                  <div className="mt-6 border-t pt-4">
                    <h5 className="font-semibold mb-2">رفع سند الاستلام</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <input type="text" placeholder="رقم السند" value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                      <input type="date" placeholder="تاريخ السند" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                      <input type="file" onChange={e => setReceiptFile(e.target.files?.[0] || null)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                      <div className="flex items-center gap-2">
                        <button onClick={handleSubmitReceipt} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">حفظ السند</button>
                        <button onClick={() => { setReceiptSlipId(''); setReceiptNumber(''); setReceiptDate(''); setReceiptFile(null); }} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">إلغاء</button>
                      </div>
                    </div>
                  </div>
                )}
            </BrandableCard>
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
