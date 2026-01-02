import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { User, ScheduleEntry, Student } from '../types';
import * as api from '../api';

interface ScheduleScreenProps {
  user: User;
}

const timeSlots = ["08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00"];
const days: ('Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday')[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const dayTranslations: { [key: string]: string } = {
    Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس',
};

const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ user }) => {
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user.parentId) {
            setLoading(false);
            return;
        }
        api.getStudentAndScheduleByParentId(user.parentId)
            .then(data => {
                if (data) {
                    setStudent(data.student || null);
                    setSchedule(data.schedule || []);
                }
            })
            .catch(err => console.error("Failed to fetch schedule data", err))
            .finally(() => setLoading(false));
    }, [user.parentId]);
    
    const scheduleGrid = useMemo(() => {
        const grid: { [key: string]: { [key: string]: ScheduleEntry } } = {};
        schedule.forEach(entry => {
            const timeSlotKey = entry.timeSlot.replace(/\s/g, '');
            if (!grid[timeSlotKey]) grid[timeSlotKey] = {};
            grid[timeSlotKey][entry.day] = entry;
        });
        return grid;
    }, [schedule]);

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#dc2626" /></View>;
    }

    if (!student || schedule.length === 0) {
        return <View style={styles.center}><Text>لا يوجد جدول دراسي متاح حاليًا.</Text></View>;
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{alignItems: 'center'}}>
            <ScrollView horizontal>
                <View style={styles.grid}>
                    <View style={styles.row}>
                        <View style={styles.headerCell}><Text style={styles.headerText}>الوقت</Text></View>
                        {days.map(d => <View key={d} style={styles.headerCell}><Text style={styles.headerText}>{dayTranslations[d]}</Text></View>)}
                    </View>
                    {timeSlots.map(ts => (
                        <View key={ts} style={styles.row}>
                            <View style={styles.timeCell}><Text style={styles.timeText}>{ts}</Text></View>
                            {days.map(day => {
                                const entry = scheduleGrid[ts.replace(/\s/g, '')]?.[day];
                                return (
                                    <View key={day} style={styles.cell}>
                                        {entry && (
                                            <>
                                                <Text style={styles.subjectText}>{entry.subject}</Text>
                                                <Text style={styles.teacherText}>{entry.teacherName}</Text>
                                            </>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    grid: { borderWidth: 1, borderColor: '#e5e7eb' },
    row: { flexDirection: 'row-reverse' },
    headerCell: { width: 80, padding: 8, backgroundColor: '#f3f4f6', borderWidth: 0.5, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
    headerText: { fontWeight: 'bold', textAlign: 'center' },
    timeCell: { width: 80, padding: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', borderWidth: 0.5, borderColor: '#e5e7eb' },
    timeText: { fontSize: 10, color: '#6b7280' },
    cell: { width: 80, padding: 8, height: 70, borderWidth: 0.5, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    subjectText: { fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
    teacherText: { fontSize: 10, color: '#6b7280', marginTop: 4, textAlign: 'center' },
});

export default ScheduleScreen;
