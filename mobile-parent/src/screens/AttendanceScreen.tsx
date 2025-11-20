import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { User, AttendanceRecord, AttendanceStatus } from '../types';
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
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (!user.parentId) { setLoading(false); return; }
        api.getParentDashboardData(user.parentId)
            .then(data => setAttendance(data.attendance))
            .finally(() => setLoading(false));
    }, [user.parentId]);

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

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#dc2626" /></View>;
    }

    return (
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
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
});

export default AttendanceScreen;
