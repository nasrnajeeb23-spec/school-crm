import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TextInput, TouchableOpacity } from 'react-native';
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

    useEffect(() => {
        if (!user.parentId) { setLoading(false); return; }
        api.getParentDashboardData(user.parentId).then(setData).finally(() => setLoading(false));
    }, [user.parentId]);

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#dc2626" /></View>;
    }

    if (!data) {
        return <View style={styles.center}><Text>لا توجد بيانات لعرضها.</Text></View>;
    }

    const latestGrade = data.grades.length > 0 ? data.grades[0] : null;
    const unpaidInvoices = data.invoices.filter((inv: Invoice) => inv.status !== InvoiceStatus.Paid);
    const attendanceSummary = data.attendance.reduce((acc: any, record: any) => {
        acc[record.status] = (acc[record.status] || 0) + 1;
        return acc;
    }, {});
    
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
            <View style={styles.profileHeader}>
                <Image source={{ uri: data.student.profileImageUrl }} style={styles.avatar} />
                <Text style={styles.studentName}>{data.student.name}</Text>
                <Text style={styles.studentGrade}>{data.student.grade}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>ملخص الأداء</Text>
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{getGradeInfo(latestGrade).finalGrade}</Text>
                        <Text style={styles.statLabel}>آخر درجة ({latestGrade?.subject || 'N/A'})</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{(attendanceSummary[AttendanceStatus.Present] || 0)} <Text style={styles.statUnit}>/ {data.attendance.length} يوم</Text></Text>
                        <Text style={styles.statLabel}>الحضور</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{unpaidInvoices.length}</Text>
                        <Text style={styles.statLabel}>فاتورة غير مدفوعة</Text>
                    </View>
                </View>
            </View>
            
            <View style={styles.card}>
                <Text style={styles.cardTitle}>إعلانات المدرسة</Text>
                {data.announcements.map((ann: any) => (
                    <View key={ann.id} style={styles.announcementItem}>
                        <Text style={styles.announcementText}>{ann.lastMessage}</Text>
                        <Text style={styles.announcementTime}>{ann.timestamp}</Text>
                    </View>
                ))}
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
                            } catch (e) {
                                // يمكن لاحقًا إضافة تنبيه
                            } finally { setIsSubmitting(false); }
                        }}
                        style={{ backgroundColor: isSubmitting || !quickDetails.trim() ? '#9ca3af' : '#dc2626', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isSubmitting ? 'جاري الإرسال...' : 'إرسال'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    announcementItem: { 
        backgroundColor: '#f9fafb', 
        padding: 12, 
        borderRadius: 8, 
        marginTop: 8 
    },
    announcementText: { fontSize: 14, color: '#374151', textAlign: 'right' },
    announcementTime: { fontSize: 12, color: '#9ca3af', textAlign: 'left', marginTop: 4 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, height: 100, textAlignVertical: 'top', textAlign: 'right' },
});

export default DashboardScreen;
