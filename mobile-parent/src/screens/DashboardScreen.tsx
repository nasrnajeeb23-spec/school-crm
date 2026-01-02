import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TextInput, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Share, Linking } from 'react-native';
import * as api from '../api';
import { User, Student, Invoice, StudentGrades, AttendanceStatus, InvoiceStatus, RequestType } from '../types';

interface DashboardScreenProps {
    user: User;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ user }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [quickDetails, setQuickDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
    const [schoolSettings, setSchoolSettings] = useState<any | null>(null);
    
    // Student Selector State
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    useEffect(() => {
        if (!user.parentId) { setLoading(false); return; }
        
        // Fetch students first
        api.getParentStudents(user.parentId).then(studentList => {
            setStudents(studentList);
            if (studentList.length > 0) {
                setSelectedStudentId(String(studentList[0].id));
            } else {
                setLoading(false);
            }
        }).catch(err => {
            console.error("Failed to fetch students", err);
            setLoading(false);
        });
    }, [user.parentId]);

    useEffect(() => {
        if (!user.parentId || !selectedStudentId) return;
        
        setLoading(true);
        api.getParentDashboardData(user.parentId, selectedStudentId)
            .then(setData)
            .catch(err => console.error("Failed to fetch dashboard data", err))
            .finally(() => setLoading(false));
    }, [user.parentId, selectedStudentId]);

    useEffect(() => {
        if (!user.schoolId) return;
        api.getSchoolSettings(user.schoolId).then(setSchoolSettings).catch(() => {});
    }, [user.schoolId]);

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#dc2626" /></View>;
    }

    if (!students.length) {
         return <View style={styles.center}><Text>لا يوجد طلاب مرتبطين بهذا الحساب.</Text></View>;
    }

    if (!data) {
        return <View style={styles.center}><Text>لا توجد بيانات لعرضها.</Text></View>;
    }

    const latestGrade = data.grades && data.grades.length > 0 ? data.grades[0] : null;
    const unpaidInvoices = data.invoices ? data.invoices.filter((inv: Invoice) => inv.status !== InvoiceStatus.Paid) : [];
    const attendanceSummary = data.attendance ? data.attendance.reduce((acc: any, record: any) => {
        acc[record.status] = (acc[record.status] || 0) + 1;
        return acc;
    }, {}) : {};
    
    const getGradeInfo = (grade: StudentGrades | null) => {
        if (!grade) return { total: 0, finalGrade: 'N/A' };
        const total = grade.grades.homework + grade.grades.quiz + grade.grades.midterm + grade.grades.final;
        if (total >= 90) return { total, finalGrade: 'A' };
        if (total >= 80) return { total, finalGrade: 'B' };
        if (total >= 70) return { total, finalGrade: 'C' };
        if (total >= 60) return { total, finalGrade: 'D' };
        return { total, finalGrade: 'F' };
    };

    return (
        <ScrollView style={styles.container}>
            {/* Student Selector */}
            {students.length > 1 && (
                <View style={styles.studentSelector}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                        {students.map(student => (
                            <TouchableOpacity 
                                key={student.id} 
                                style={[styles.studentChip, String(student.id) === String(selectedStudentId) && styles.selectedStudentChip]}
                                onPress={() => setSelectedStudentId(String(student.id))}
                            >
                                <Text style={[styles.studentChipText, String(student.id) === String(selectedStudentId) && styles.selectedStudentChipText]}>
                                    {student.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <View style={styles.profileHeader}>
                <Image source={{ uri: data.student?.profileImageUrl || 'https://via.placeholder.com/150' }} style={styles.avatar} />
                <Text style={styles.studentName}>{data.student?.name}</Text>
                <Text style={styles.studentGrade}>{data.student?.gradeLevel || 'الصف غير محدد'}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>ملخص الأداء</Text>
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{getGradeInfo(latestGrade).finalGrade}</Text>
                        <Text style={styles.statLabel}>آخر درجة ({latestGrade?.subject || 'N/A'})</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{(attendanceSummary[AttendanceStatus.Present] || 0)} <Text style={styles.statUnit}>/ {data.attendance?.length || 0} يوم</Text></Text>
                        <Text style={styles.statLabel}>الحضور</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{unpaidInvoices.length}</Text>
                        <Text style={styles.statLabel}>فاتورة غير مدفوعة</Text>
                        {unpaidInvoices.length > 0 && (
                          <TouchableOpacity onPress={() => setInvoiceToPrint(unpaidInvoices[0])} style={styles.printButton}>
                            <Text style={styles.printButtonText}>طباعة/مشاركة</Text>
                          </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
            
            <View style={styles.card}>
                <Text style={styles.cardTitle}>إعلانات المدرسة</Text>
                {data.announcements && data.announcements.length > 0 ? (
                    data.announcements.map((ann: any) => (
                        <View key={ann.id} style={styles.announcementItem}>
                            <Text style={styles.announcementText}>{ann.lastMessage || ann.description || ann.title}</Text>
                            <Text style={styles.announcementTime}>{ann.timestamp || ann.date}</Text>
                        </View>
                    ))
                ) : (
                    <Text style={{ textAlign: 'center', color: '#6b7280', padding: 10 }}>لا توجد إعلانات جديدة</Text>
                )}
            </View>

            <View style={styles.card}>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.cardTitle}>طلب سريع</Text>
                </View>
                <Text style={{ textAlign: 'right', color: '#6b7280', marginBottom: 8 }}>أدخل تفاصيل الطلب ثم اضغط إرسال.</Text>
                <TextInput
                    style={styles.input}
                    placeholder="تفاصيل الطلب..."
                    multiline
                    value={quickDetails}
                    onChangeText={setQuickDetails}
                />
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'flex-end', marginTop: 8 }}>
                    <TouchableOpacity
                        disabled={!quickDetails.trim() || isSubmitting}
                        onPress={async () => {
                            if (!user.parentId || !quickDetails.trim()) return;
                            setIsSubmitting(true);
                            try {
                                await api.submitParentRequest(user.parentId, { type: RequestType.Leave, details: quickDetails.trim() });
                                setQuickDetails('');
                                alert('تم إرسال الطلب بنجاح');
                            } catch (e) {
                                alert('حدث خطأ أثناء إرسال الطلب');
                            } finally { setIsSubmitting(false); }
                        }}
                        style={{ backgroundColor: isSubmitting || !quickDetails.trim() ? '#9ca3af' : '#dc2626', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isSubmitting ? 'جاري الإرسال...' : 'إرسال'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <Modal visible={!!invoiceToPrint} transparent animationType="fade" onRequestClose={() => setInvoiceToPrint(null)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setInvoiceToPrint(null)}>
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>فاتورة رسوم</Text>
                            <Pressable onPress={() => setInvoiceToPrint(null)}><Text style={styles.closeText}>✕</Text></Pressable>
                        </View>
                        <View style={styles.brandRow}>
                            {schoolSettings?.schoolLogoUrl ? (
                                <Image source={{ uri: api.getAssetUrl(String(schoolSettings.schoolLogoUrl)) }} style={styles.logo} />
                            ) : null}
                            <View style={{ flex: 1 }}>
                                <Text style={styles.schoolName}>{schoolSettings?.schoolName || 'المدرسة'}</Text>
                                {schoolSettings?.schoolAddress ? <Text style={styles.schoolMeta}>{schoolSettings.schoolAddress}</Text> : null}
                                {(schoolSettings?.contactPhone || schoolSettings?.contactEmail) ? <Text style={styles.schoolMeta}>{[schoolSettings?.contactPhone, schoolSettings?.contactEmail].filter(Boolean).join(' • ')}</Text> : null}
                            </View>
                        </View>
                        {invoiceToPrint && (
                            <View style={{ gap: 6 }}>
                                <Text style={styles.field}>الطالب: {invoiceToPrint.studentName}</Text>
                                <Text style={styles.field}>رقم الفاتورة: {String(invoiceToPrint.id).replace('inv_','')}</Text>
                                <Text style={styles.field}>الإصدار: {invoiceToPrint.issueDate} • الاستحقاق: {invoiceToPrint.dueDate}</Text>
                                <View style={styles.buttonsRow}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                                        const cur = String(schoolSettings?.defaultCurrency || 'SAR');
                                        const logo = schoolSettings?.schoolLogoUrl ? api.getAssetUrl(String(schoolSettings?.schoolLogoUrl)) : '';
                                        const head = `
                                          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px">
                                            <div style="text-align:right">
                                              <div style="font-size:20px;font-weight:bold">${schoolSettings?.schoolName || 'المدرسة'}</div>
                                              <div style="color:#6b7280;font-size:12px">فاتورة رسوم دراسية</div>
                                            </div>
                                            ${logo ? `<img src="${logo}" alt="Logo" style="height:60px;width:60px;object-fit:contain" onerror="this.style.display='none'"/>` : ''}
                                            <div style="text-align:left;font-family:monospace">
                                              <div style="font-size:12px;color:#6b7280">Invoice</div>
                                              <div>${String(invoiceToPrint.id).replace('inv_','')}</div>
                                            </div>
                                          </div>`;
                                        const totals = `
                                          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
                                            <div style="border:2px solid #111;border-radius:8px;padding:8px;background:#f9fafb"><div style="font-size:12px;color:#6b7280">الإجمالي</div><div style="font-weight:bold">${Number(invoiceToPrint.totalAmount || 0).toFixed(2)} ${cur}</div></div>
                                            <div style="border:2px solid #c53030;border-radius:8px;padding:8px;background:#fff5f5"><div style="font-size:12px;color:#c53030">المتبقي</div><div style="font-weight:bold;color:#c53030">${Number((invoiceToPrint as any).remainingAmount ?? Number(invoiceToPrint.totalAmount || 0)).toFixed(2)} ${cur}</div></div>
                                          </div>`;
                                        const html = `<!doctype html><html><head><meta charset="utf-8"><title>فاتورة</title><style>body{font-family:Tajawal,Arial,sans-serif;padding:20px;direction:rtl}</style></head><body>${head}<div style="margin-bottom:8px"><div>الطالب: ${invoiceToPrint.studentName}</div><div>تاريخ الإصدار: ${invoiceToPrint.issueDate}</div><div>تاريخ الاستحقاق: ${invoiceToPrint.dueDate}</div></div>${totals}<div style="margin-top:12px;color:#9ca3af;font-size:10px;text-align:center">تم توليد الفاتورة إلكترونياً عبر SchoolSaaS CRM</div></body></html>`;
                                        const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
                                        Linking.openURL(url).catch(() => {});
                                    }}><Text style={styles.actionText}>فتح للطباعة</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                                        const cur = String(schoolSettings?.defaultCurrency || 'SAR');
                                        const lines = [
                                          `المدرسة: ${schoolSettings?.schoolName || 'المدرسة'}`,
                                          `رقم الفاتورة: ${invoiceToPrint.id}`,
                                          `الطالب: ${invoiceToPrint.studentName}`,
                                          `تاريخ الإصدار: ${invoiceToPrint.issueDate}`,
                                          `تاريخ الاستحقاق: ${invoiceToPrint.dueDate}`,
                                          `الإجمالي: ${Number(invoiceToPrint.totalAmount || 0).toFixed(2)} ${cur}`,
                                          `تم إنشاء هذه الفاتورة إلكترونياً عبر SchoolSaaS CRM`,
                                        ];
                                        Share.share({ message: lines.join('\n') });
                                    }}><Text style={styles.actionText}>مشاركة</Text></TouchableOpacity>
                                </View>
                                <Text style={styles.footerNote}>تم إصدار هذه الفاتورة إلكترونياً عبر نظام SchoolSaaS CRM</Text>
                            </View>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    studentSelector: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    studentChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    selectedStudentChip: {
        backgroundColor: '#dc2626',
        borderColor: '#dc2626',
    },
    studentChipText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    selectedStudentChipText: {
        color: '#fff',
    },
    profileHeader: {
        backgroundColor: '#fff',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb'
    },
    avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
    studentName: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
    studentGrade: { fontSize: 16, color: '#6b7280' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        margin: 16,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 12, textAlign: 'right' },
    statsContainer: { flexDirection: 'row-reverse', justifyContent: 'space-around' },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#dc2626' },
    statUnit: { fontSize: 14, color: '#6b7280' },
    statLabel: { fontSize: 14, color: '#6b7280', marginTop: 4 },
    printButton: { marginTop: 8, backgroundColor: '#0d9488', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
    printButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    announcementItem: { 
        backgroundColor: '#f9fafb', 
        padding: 12, 
        borderRadius: 8, 
        marginTop: 8 
    },
    announcementText: { fontSize: 14, color: '#374151', textAlign: 'right' },
    announcementTime: { fontSize: 12, color: '#9ca3af', textAlign: 'left', marginTop: 4 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, height: 100, textAlignVertical: 'top', textAlign: 'right' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '100%', maxWidth: 480 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontWeight: 'bold', fontSize: 16 },
    closeText: { fontSize: 18, color: '#6b7280' },
    brandRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12 },
    logo: { width: 40, height: 40, resizeMode: 'contain', marginLeft: 8 },
    schoolName: { fontWeight: 'bold', fontSize: 16, textAlign: 'right' },
    schoolMeta: { color: '#6b7280', fontSize: 12, textAlign: 'right' },
    field: { fontSize: 14, textAlign: 'right' },
    buttonsRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 8 },
    actionBtn: { backgroundColor: '#0d9488', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginLeft: 8 },
    actionText: { color: '#fff', fontWeight: 'bold' },
    footerNote: { color: '#9ca3af', fontSize: 10, textAlign: 'center', marginTop: 8 },
});

export default DashboardScreen;
