import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import * as api from '../api';
import { User, ScheduleEntry } from '../types';

interface TeacherScheduleScreenProps {
    user: User;
}

const timeSlots = [
    "08:00 - 09:00",
    "09:00 - 10:00",
    "10:00 - 11:00",
    "11:00 - 12:00",
    "12:00 - 13:00",
];

const days: ('Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday')[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const dayTranslations: { [key: string]: string } = {
    Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس',
};

const subjectColors: { [key: string]: string } = {
    'الرياضيات': '#e0e7ff',
    'العلوم': '#d1fae5',
    'اللغة الإنجليزية': '#fee2e2',
    'الدراسات الاجتماعية': '#fef3c7',
    'اللغة العربية': '#e0f2fe',
    'الفيزياء': '#fae8ff',
    'default': '#f3f4f6',
};
const subjectTextColors: { [key: string]: string } = {
    'الرياضيات': '#3730a3',
    'العلوم': '#065f46',
    'اللغة الإنجليزية': '#991b1b',
    'الدراسات الاجتماعية': '#92400e',
    'اللغة العربية': '#075985',
    'الفيزياء': '#701a75',
    'default': '#374151',
};

const TeacherScheduleScreen: React.FC<TeacherScheduleScreenProps> = ({ user }) => {
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user.teacherId) {
            setLoading(false);
            return;
        }
        api.getTeacherSchedule(user.teacherId)
            .then(setSchedule)
            .catch(err => console.error("Failed to fetch schedule", err))
            .finally(() => setLoading(false));
    }, [user.teacherId]);

    const scheduleGrid = useMemo(() => {
        const grid: { [key: string]: { [key: string]: ScheduleEntry } } = {};
        schedule.forEach(entry => {
            if (!grid[entry.timeSlot]) grid[entry.timeSlot] = {};
            grid[entry.timeSlot][entry.day] = entry;
        });
        return grid;
    }, [schedule]);

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.gridContainer}>
                {/* Header Row */}
                <View style={styles.row}>
                    <View style={styles.timeHeaderCell}><Text style={styles.headerText}></Text></View>
                    {days.map(day => (
                        <View key={day} style={styles.dayHeaderCell}>
                            <Text style={styles.headerText}>{dayTranslations[day]}</Text>
                        </View>
                    ))}
                </View>

                {/* Data Rows */}
                {timeSlots.map(timeSlot => (
                    <View key={timeSlot} style={styles.row}>
                        <View style={styles.timeHeaderCell}>
                            <Text style={styles.timeText}>{timeSlot}</Text>
                        </View>
                        {days.map(day => {
                            const entry = scheduleGrid[timeSlot]?.[day];
                            const bgColor = entry ? (subjectColors[entry.subject] || subjectColors.default) : '#fff';
                            const textColor = entry ? (subjectTextColors[entry.subject] || subjectTextColors.default) : '#000';
                            return (
                                <View key={`${day}-${timeSlot}`} style={[styles.cell, { backgroundColor: bgColor }]}>
                                    {entry && (
                                        <View style={styles.cellContent}>
                                            <Text style={[styles.subjectText, { color: textColor }]}>{entry.subject}</Text>
                                            <Text style={[styles.classText, { color: textColor }]}>{entry.className}</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentContainer: {
        padding: 8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
    },
    gridContainer: {
        flex: 1,
        flexDirection: 'column',
    },
    row: {
        flexDirection: 'row-reverse',
        height: 80,
    },
    dayHeaderCell: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
        borderWidth: 0.5,
        borderColor: '#d1d5db',
    },
    timeHeaderCell: {
        width: 80,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
        borderWidth: 0.5,
        borderColor: '#d1d5db',
    },
    headerText: {
        fontWeight: 'bold',
        fontSize: 12,
        color: '#374151',
    },
    timeText: {
        fontWeight: '600',
        fontSize: 10,
        color: '#4b5563',
        textAlign: 'center'
    },
    cell: {
        flex: 1,
        borderWidth: 0.5,
        borderColor: '#d1d5db',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
    },
    cellContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    subjectText: {
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    classText: {
        fontSize: 10,
        marginTop: 2,
        textAlign: 'center',
    },
});

export default TeacherScheduleScreen;