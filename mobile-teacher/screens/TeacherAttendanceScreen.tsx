import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as api from '../api';
import { AttendanceRecord, AttendanceStatus, Student } from '../types';
import { MyClassesStackParamList } from '../navigation/MyClassesNavigator';
import { CheckCircleIcon, XCircleIcon, ClockIcon, InfoCircleIcon } from '../components/icons';

type Props = StackScreenProps<MyClassesStackParamList, 'Attendance'>;

const statusInfo: { [key in AttendanceStatus]: { text: string; bg: string; border: string; icon: React.ElementType } } = {
  [AttendanceStatus.Present]: { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: CheckCircleIcon },
  [AttendanceStatus.Absent]: { text: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: XCircleIcon },
  [AttendanceStatus.Late]: { text: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: ClockIcon },
  [AttendanceStatus.Excused]: { text: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: InfoCircleIcon },
};

const TeacherAttendanceScreen: React.FC<Props> = ({ route }) => {
    const { classId, className } = route.params;
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.getClassStudents(classId),
            api.getAttendance(classId, selectedDate)
        ]).then(([students, attendanceData]) => {
            const recordsMap = attendanceData ? new Map(attendanceData.records.map(r => [r.studentId, r.status])) : new Map();
            const fullRosterWithStatus = students.map(student => ({
                studentId: student.id,
                studentName: student.name,
                status: recordsMap.get(student.id) || AttendanceStatus.Present
            }));
            setAttendanceRecords(fullRosterWithStatus);
        }).catch(err => {
            console.error("Failed to load attendance data:", err);
        }).finally(() => {
            setLoading(false);
        });
    }, [classId, selectedDate]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendanceRecords(prev =>
            prev.map(record =>
                record.studentId === studentId ? { ...record, status } : record
            )
        );
    };

    const handleSaveAttendance = async () => {
        setIsSaving(true);
        try {
            await api.saveAttendance(classId, selectedDate, attendanceRecords);
            alert('تم حفظ سجل الحضور بنجاح!');
        } catch (error) {
            console.error("Failed to save attendance:", error);
            alert('حدث خطأ أثناء حفظ سجل الحضور.');
        } finally {
            setIsSaving(false);
        }
    };

    const summary = useMemo(() => {
        return attendanceRecords.reduce((acc, record) => {
            acc[record.status] = (acc[record.status] || 0) + 1;
            return acc;
        }, {} as { [key in AttendanceStatus]?: number });
    }, [attendanceRecords]);

    const renderItem = ({ item }: { item: AttendanceRecord }) => (
        <View style={styles.studentItem}>
            <Text style={styles.studentName}>{item.studentName}</Text>
            <View style={styles.statusButtonsContainer}>
                {(Object.values(AttendanceStatus) as AttendanceStatus[]).map(status => (
                    <TouchableOpacity
                        key={status}
                        onPress={() => handleStatusChange(item.studentId, status)}
                        style={[
                            styles.statusButton,
                            item.status === status && { backgroundColor: statusInfo[status].bg, borderColor: statusInfo[status].border }
                        ]}
                    >
                        <Text style={[styles.statusButtonText, item.status === status && { color: statusInfo[status].text }]}>
                            {status}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
    }

    return (
        <View style={{flex: 1}}>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.dateText}>
                        التاريخ: {new Date(selectedDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                </View>
                
                <View style={styles.summaryContainer}>
                    {Object.entries(statusInfo).map(([status, info]) => (
                        <View key={status} style={styles.summaryItem}>
                            <info.icon color={info.text} size={20}/>
                            <Text style={[styles.summaryText, {color: info.text}]}>{status}: {summary[status as AttendanceStatus] || 0}</Text>
                        </View>
                    ))}
                </View>
                
                {attendanceRecords.length > 0 ? (
                    <FlatList
                        data={attendanceRecords}
                        renderItem={renderItem}
                        keyExtractor={item => item.studentId}
                        scrollEnabled={false} // Disable inner scrolling, as parent is ScrollView
                    />
                ) : (
                    <View style={styles.center}><Text>لا يوجد طلاب في هذا الفصل.</Text></View>
                )}
            </ScrollView>
            <View style={styles.footer}>
                <TouchableOpacity onPress={handleSaveAttendance} disabled={isSaving} style={styles.saveButton}>
                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>حفظ سجل الحضور</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f8',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    dateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e3a8a',
        textAlign: 'center',
    },
    summaryContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
        padding: 12,
        backgroundColor: '#fff',
        margin: 16,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryText: {
        marginTop: 4,
        fontSize: 14,
        fontWeight: 'bold',
    },
    studentItem: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        marginVertical: 6,
        marginHorizontal: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    studentName: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'right',
        color: '#111827',
        marginBottom: 10,
    },
    statusButtonsContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
    },
    statusButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#f9fafb',
        minWidth: 70,
        alignItems: 'center',
    },
    statusButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4b5563',
    },
    footer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    saveButton: {
        backgroundColor: '#1e3a8a',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default TeacherAttendanceScreen;
