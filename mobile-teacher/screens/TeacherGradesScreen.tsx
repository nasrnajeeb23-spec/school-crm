import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, FlatList } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as api from '../api';
import { StudentGrades, Grade, Class, User } from '../types';
import { MyClassesStackParamList } from '../navigation/MyClassesNavigator';

type Props = StackScreenProps<MyClassesStackParamList, 'Grades'>;

const TeacherGradesScreen: React.FC<Props> = ({ route }) => {
    const { classId, className } = route.params;
    const [classInfo, setClassInfo] = useState<Class | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [gradesData, setGradesData] = useState<StudentGrades[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        api.getCurrentUser().then((me: User) => {
            if (!me.teacherId) {
                setLoading(false);
                return;
            }
            return api.getTeacherClasses(me.teacherId);
        }).then(classes => {
            if (!classes) return;
            const currentClass = classes.find(c => c.id === classId);
            if (currentClass) {
                setClassInfo(currentClass);
                if (currentClass.subjects.length > 0) {
                    setSelectedSubject(currentClass.subjects[0]);
                } else {
                     setLoading(false);
                }
            } else {
                 setLoading(false);
            }
        }).catch(() => {
            setLoading(false);
        });
    }, [classId]);

    useEffect(() => {
        if (!classId || !selectedSubject) return;
        
        setLoading(true);
        Promise.all([
            api.getClassStudents(classId),
            api.getGrades(classId, selectedSubject)
        ]).then(([classStudents, subjectGrades]) => {
            const gradesMap = new Map(subjectGrades.map((g: StudentGrades) => [g.studentId, g.grades]));
            
            const fullGradesData = classStudents.map(student => ({
                classId: classId,
                subject: selectedSubject,
                studentId: student.id,
                studentName: student.name,
                grades: gradesMap.get(student.id) || { homework: 0, quiz: 0, midterm: 0, final: 0 }
            }));

            setGradesData(fullGradesData);
        }).catch(err => {
            console.error("Failed to load grades data", err);
            Alert.alert('خطأ', 'فشل تحميل بيانات الدرجات.');
        }).finally(() => {
            setLoading(false);
        });
    }, [classId, selectedSubject]);

    const handleGradeChange = (studentId: string, gradeType: keyof Grade, value: string) => {
        const numericValue = Math.max(0, parseInt(value, 10) || 0);
        setGradesData(prevData =>
            prevData.map(studentGrade =>
                studentGrade.studentId === studentId
                    ? { ...studentGrade, grades: { ...studentGrade.grades, [gradeType]: numericValue } }
                    : studentGrade
            )
        );
    };

    const handleSaveGrades = async () => {
        setIsSaving(true);
        try {
            await api.saveGrades(gradesData);
            Alert.alert('نجاح', 'تم حفظ الدرجات بنجاح!');
        } catch (error) {
            console.error("Failed to save grades:", error);
            Alert.alert('خطأ', 'حدث خطأ أثناء حفظ الدرجات.');
        } finally {
            setIsSaving(false);
        }
    };

    const calculateTotal = (grades: Grade) => grades.homework + grades.quiz + grades.midterm + grades.final;
    
    const getFinalGrade = (total: number) => {
        if (total >= 95) return 'A+'; if (total >= 90) return 'A'; if (total >= 85) return 'B+';
        if (total >= 80) return 'B'; if (total >= 75) return 'C+'; if (total >= 70) return 'C';
        if (total >= 65) return 'D+'; if (total >= 60) return 'D'; return 'F';
    };

    const gradeHeaders = [
        { key: 'homework', label: 'واجبات', max: 10 },
        { key: 'quiz', label: 'اختبار', max: 15 },
        { key: 'midterm', label: 'منتصف', max: 25 },
        { key: 'final', label: 'نهائي', max: 50 },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>المادة:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row-reverse' }}>
                    {classInfo?.subjects.map(subject => (
                        <TouchableOpacity 
                            key={subject} 
                            style={[styles.subjectChip, selectedSubject === subject && styles.selectedSubjectChip]}
                            onPress={() => setSelectedSubject(subject)}
                        >
                            <Text style={[styles.subjectChipText, selectedSubject === subject && styles.selectedSubjectChipText]}>{subject}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            
            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>
            ) : (
                <FlatList
                    data={gradesData}
                    keyExtractor={item => item.studentId}
                    ListHeaderComponent={() => (
                         <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderText, {flex: 2, textAlign: 'right'}]}>الطالب</Text>
                            {gradeHeaders.map(h => <Text key={h.key} style={styles.tableHeaderText}>{h.label}({h.max})</Text>)}
                            <Text style={styles.tableHeaderText}>المجموع</Text>
                            <Text style={styles.tableHeaderText}>التقدير</Text>
                        </View>
                    )}
                    renderItem={({ item }) => {
                        const total = calculateTotal(item.grades);
                        const finalGrade = getFinalGrade(total);
                        return (
                            <View style={styles.studentRow}>
                                <Text style={styles.studentName}>{item.studentName}</Text>
                                {gradeHeaders.map(header => (
                                    <TextInput
                                        key={header.key}
                                        style={styles.gradeInput}
                                        value={String(item.grades[header.key as keyof Grade])}
                                        onChangeText={text => handleGradeChange(item.studentId, header.key as keyof Grade, text)}
                                        keyboardType="number-pad"
                                        maxLength={header.max > 9 ? 2 : 1}
                                    />
                                ))}
                                <Text style={styles.totalText}>{total}</Text>
                                <Text style={styles.finalGradeText}>{finalGrade}</Text>
                            </View>
                        );
                    }}
                />
            )}

            <View style={styles.footer}>
                <TouchableOpacity onPress={handleSaveGrades} disabled={isSaving || loading} style={styles.saveButton}>
                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>حفظ الدرجات</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f8' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: 'row-reverse',
        alignItems: 'center'
    },
    headerText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e3a8a',
        marginLeft: 10,
    },
    subjectChip: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#e0e7ff',
        marginLeft: 8,
    },
    selectedSubjectChip: {
        backgroundColor: '#1e3a8a',
    },
    subjectChipText: {
        color: '#312e81',
        fontWeight: '600',
    },
    selectedSubjectChipText: {
        color: '#fff',
    },
    tableHeader: {
        flexDirection: 'row-reverse',
        paddingHorizontal: 10,
        paddingVertical: 12,
        backgroundColor: '#e5e7eb',
    },
    tableHeaderText: {
        flex: 1,
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 12,
        color: '#374151',
    },
    studentRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    studentName: {
        flex: 2,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'right',
    },
    gradeInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 6,
        textAlign: 'center',
        paddingVertical: 6,
        paddingHorizontal: 4,
        marginHorizontal: 2,
    },
    totalText: {
        flex: 1,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    finalGradeText: {
        flex: 1,
        textAlign: 'center',
        fontWeight: 'bold',
        color: '#1e3a8a',
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

export default TeacherGradesScreen;
