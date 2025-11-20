import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { User, StudentGrades, Grade } from '../types';
import * as api from '../api';

interface GradesScreenProps {
  user: User;
}

const calculateTotal = (grades: Grade) => grades.homework + grades.quiz + grades.midterm + grades.final;
const getFinalGrade = (total: number) => {
    if (total >= 90) return 'A';
    if (total >= 80) return 'B';
    if (total >= 70) return 'C';
    if (total >= 60) return 'D';
    return 'F';
};

const GradesScreen: React.FC<GradesScreenProps> = ({ user }) => {
    const [grades, setGrades] = useState<StudentGrades[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user.parentId) { setLoading(false); return; }
        api.getParentDashboardData(user.parentId)
            .then(data => setGrades(data.grades))
            .finally(() => setLoading(false));
    }, [user.parentId]);

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#dc2626" /></View>;
    }

    if (grades.length === 0) {
        return <View style={styles.center}><Text>لا توجد درجات لعرضها.</Text></View>;
    }

    return (
        <ScrollView style={styles.container}>
            {grades.map(grade => {
                const total = calculateTotal(grade.grades);
                const finalGrade = getFinalGrade(total);
                return (
                    <View key={grade.subject} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.subjectTitle}>{grade.subject}</Text>
                            <View style={styles.finalGrade}>
                                <Text style={styles.finalGradeText}>{finalGrade}</Text>
                                <Text style={styles.totalScoreText}>{total}%</Text>
                            </View>
                        </View>
                        <View style={styles.gradesContainer}>
                            <View style={styles.gradeItem}><Text>الواجبات: {grade.grades.homework}/10</Text></View>
                            <View style={styles.gradeItem}><Text>اختبار: {grade.grades.quiz}/15</Text></View>
                            <View style={styles.gradeItem}><Text>منتصف: {grade.grades.midterm}/25</Text></View>
                            <View style={styles.gradeItem}><Text>نهائي: {grade.grades.final}/50</Text></View>
                        </View>
                    </View>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 10, marginBottom: 10 },
    subjectTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
    finalGrade: { alignItems: 'flex-start' },
    finalGradeText: { fontSize: 22, fontWeight: 'bold', color: '#dc2626' },
    totalScoreText: { fontSize: 14, color: '#6b7280' },
    gradesContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-around' },
    gradeItem: { backgroundColor: '#f3f4f6', padding: 8, borderRadius: 6, margin: 4, minWidth: '45%', alignItems: 'center' },
});

export default GradesScreen;
