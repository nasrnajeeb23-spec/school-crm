import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { User, StudentGrades, Grade, Student } from '../types';
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
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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
        api.getStudentGrades(user.parentId, selectedStudentId)
            .then(setGrades)
            .finally(() => setLoading(false));
    }, [user.parentId, selectedStudentId]);

    if (loading && grades.length === 0) {
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
                {grades.length === 0 ? (
                     <View style={styles.center}><Text>لا توجد درجات لعرضها.</Text></View>
                ) : (
                    grades.map((grade, index) => {
                        const total = calculateTotal(grade.grades);
                        const finalGrade = getFinalGrade(total);
                        return (
                            <View key={index} style={styles.card}>
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
                    })
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
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

export default GradesScreen;
