import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { User, AttendanceRecord, AttendanceStatus, Student } from '../types';
import * as api from '../api';

interface AttendanceScreenProps {
  user: User;
}

const statusInfo: { [key in AttendanceStatus]: { bg: string; text: string; } } = {
  [AttendanceStatus.Present]: { bg: '#dcfce7', text: '#166534' },
  [AttendanceStatus.Absent]: { bg: '#fee2e2', text: '#991b1b' },
  [AttendanceStatus.Late]: { bg: '#fef3c7', text: '#92400e' },
  [AttendanceStatus.Excused]: { bg: '#dbeafe', text: '#1e40af' },
};

const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ user }) => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (!user.parentId) { setLoading(false); return; }
        api.getParentStudents(user.parentId).then(data => {
            setStudents(data);
            if (data.length > 0) setSelectedStudentId(data[0].id);
            else setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [user.parentId]);

    useEffect(() => {
        if (!user.parentId || !selectedStudentId) return;
        setLoading(true);
        api.getStudentAttendance(user.parentId, selectedStudentId)
            .then(setAttendance)
            .finally(() => setLoading(false));
    }, [user.parentId, selectedStudentId]);

    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday

        let days = Array(startDayOfWeek).fill(null);
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateString = date.toISOString().split('T')[0];
            const record = attendance.find(r => r.date === dateString);
            days.push({
                day: i,
                date: dateString,
                status: record?.status,
            });
        }
        return days;
    }, [currentDate, attendance]);

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    if (loading && attendance.length === 0) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#dc2626" /></View>;
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            {students.length > 1 && (
                <View style={styles.studentSelector}>
                    {students.map(student => (
                        <TouchableOpacity 
                            key={student.id} 
                            onPress={() => setSelectedStudentId(student.id)}
                            style={[styles.studentTab, selectedStudentId === student.id && styles.activeStudentTab]}
                        >
                            <Text style={[styles.studentTabText, selectedStudentId === student.id && styles.activeStudentTabText]}>
                                {student.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
            <ScrollView style={styles.container}>
                <View style={styles.card}>
                    <View style={styles.monthHeader}>
                        <TouchableOpacity onPress={() => changeMonth(1)}><Text style={styles.arrow}>{'>'}</Text></TouchableOpacity>
                        <Text style={styles.monthTitle}>{currentDate.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</Text>
                        <TouchableOpacity onPress={() => changeMonth(-1)}><Text style={styles.arrow}>{'<'}</Text></TouchableOpacity>
                    </View>
                    <View style={styles.weekHeader}>
                        {['س', 'ج', 'خ', 'ر', 'ث', 'ن', 'ح'].map(d => <Text key={d} style={styles.weekDay}>{d}</Text>)}
                    </View>
                    <View style={styles.calendarGrid}>
                        {calendarData.map((day, index) => (
                            <View key={index} style={[styles.dayCell, day?.status && { backgroundColor: statusInfo[day.status].bg }]}>
                                {day && <Text style={[styles.dayText, day?.status && { color: statusInfo[day.status].text, fontWeight: 'bold' }]}>{day.day}</Text>}
                            </View>
                        ))}
                    </View>
                     <View style={styles.legendContainer}>
                        {Object.entries(statusInfo).map(([status, info]) => (
                            <View key={status} style={styles.legendItem}>
                                <Text style={styles.legendText}>{status}</Text>
                                 <View style={[styles.legendColor, { backgroundColor: info.bg }]} />
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    card: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, padding: 16, elevation: 2 },
    monthHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
    monthTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
    arrow: { fontSize: 24, color: '#dc2626' },
    weekHeader: { flexDirection: 'row-reverse', marginTop: 10 },
    weekDay: { flex: 1, textAlign: 'center', color: '#6b7280', fontWeight: 'bold' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    dayCell: { width: `${100/7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
    dayText: { fontSize: 14, color: '#374151' },
    legendContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10 },
    legendItem: { flexDirection: 'row-reverse', alignItems: 'center', margin: 4 },
    legendColor: { width: 14, height: 14, borderRadius: 7, marginRight: 6 },
    legendText: { fontSize: 12, color: '#4b5563' },
    studentSelector: {
        flexDirection: 'row-reverse',
        backgroundColor: '#fff',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb'
    },
    studentTab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginHorizontal: 4,
        backgroundColor: '#f3f4f6'
    },
    activeStudentTab: {
        backgroundColor: '#dc2626'
    },
    studentTabText: {
        color: '#374151',
        fontWeight: '600'
    },
    activeStudentTabText: {
        color: '#fff'
    }
});

export default AttendanceScreen;
