import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as api from '../api';
import { Submission, SubmissionStatus } from '../types';
import { AssignmentsStackParamList } from '../navigation/AssignmentsNavigator';
import { useFocusEffect } from '@react-navigation/native';

type Props = StackScreenProps<AssignmentsStackParamList, 'AssignmentDetails'>;

const statusInfo: { [key in SubmissionStatus]: { bg: string, text: string, title: string } } = {
  [SubmissionStatus.Submitted]: { bg: '#dbeafe', text: '#1e40af', title: 'تم التسليم' },
  [SubmissionStatus.Late]: { bg: '#fef3c7', text: '#92400e', title: 'متأخر' },
  [SubmissionStatus.Graded]: { bg: '#dcfce7', text: '#166534', title: 'تم التقييم' },
  [SubmissionStatus.NotSubmitted]: { bg: '#f3f4f6', text: '#4b5563', title: 'لم يتم التسليم' },
};

const AssignmentDetailsScreen: React.FC<Props> = ({ route }) => {
    const { assignment, studentId } = route.params;
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchSubmission = useCallback(() => {
        setLoading(true);
        api.getSubmissionForAssignment(studentId, assignment.id)
            .then(setSubmission)
            .catch(err => console.error("Failed to fetch submission", err))
            .finally(() => setLoading(false));
    }, [studentId, assignment.id]);

    useFocusEffect(fetchSubmission);

    const handleSubmit = async () => {
        if (!submission) return;
        setIsSubmitting(true);
        try {
            await api.submitAssignment(submission.id);
            Alert.alert('نجاح', 'تم رفع الواجب بنجاح.');
            fetchSubmission(); // Refresh data
        } catch (error) {
            Alert.alert('خطأ', 'فشل رفع الواجب.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const renderSubmissionStatus = () => {
        if (!submission) return null;
        const status = statusInfo[submission.status];
        
        return (
            <View style={styles.statusSection}>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.text }]}>{status.title}</Text>
                </View>

                {submission.status === SubmissionStatus.NotSubmitted && (
                    <TouchableOpacity 
                        style={[styles.submitButton, isSubmitting && styles.disabledButton]} 
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>رفع الواجب</Text>}
                    </TouchableOpacity>
                )}

                {submission.submissionDate && (
                    <Text style={styles.submissionDate}>تاريخ التسليم: {submission.submissionDate}</Text>
                )}
                
                {submission.status === SubmissionStatus.Graded && (
                     <View style={styles.gradeBox}>
                        <Text style={styles.gradeLabel}>الدرجة</Text>
                        <Text style={styles.gradeText}>{submission.grade}/10</Text>
                        {submission.feedback && <Text style={styles.feedbackText}>ملاحظات المعلم: {submission.feedback}</Text>}
                    </View>
                )}
            </View>
        );
    }


    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#dc2626" /></View>;
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>{assignment.title}</Text>
                <Text style={styles.dueDate}>تاريخ التسليم: {assignment.dueDate}</Text>
                <Text style={styles.description}>{assignment.description}</Text>
            </View>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>حالة التسليم</Text>
                {renderSubmissionStatus()}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 12, textAlign: 'right' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
    dueDate: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 4, marginBottom: 12 },
    description: { fontSize: 14, color: '#374151', textAlign: 'right', lineHeight: 22 },
    statusSection: { alignItems: 'flex-end' },
    statusBadge: { borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-end' },
    statusText: { fontSize: 14, fontWeight: 'bold' },
    submitButton: { backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginTop: 16 },
    disabledButton: { backgroundColor: '#fca5a5' },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    submissionDate: { fontSize: 12, color: '#6b7280', marginTop: 12 },
    gradeBox: { marginTop: 16, backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, width: '100%', alignItems: 'flex-end' },
    gradeLabel: { fontSize: 14, color: '#6b7280' },
    gradeText: { fontSize: 24, fontWeight: 'bold', color: '#166534', marginVertical: 4 },
    feedbackText: { fontSize: 14, color: '#374151', fontStyle: 'italic', marginTop: 8 }
});

export default AssignmentDetailsScreen;
