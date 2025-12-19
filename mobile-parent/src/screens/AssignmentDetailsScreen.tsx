import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as api from '../api';
import { Submission, SubmissionStatus, AttachmentMeta } from '../types';
import { AssignmentsStackParamList } from '../navigation/AssignmentsNavigator';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';

type Props = StackScreenProps<AssignmentsStackParamList, 'AssignmentDetails'>;

const statusInfo: { [key in SubmissionStatus]: { bg: string, text: string, title: string } } = {
  [SubmissionStatus.Submitted]: { bg: '#dbeafe', text: '#1e40af', title: 'تم التسليم' },
  [SubmissionStatus.Late]: { bg: '#fef3c7', text: '#92400e', title: 'متأخر' },
  [SubmissionStatus.Graded]: { bg: '#dcfce7', text: '#166534', title: 'تم التقييم' },
  [SubmissionStatus.NotSubmitted]: { bg: '#f3f4f6', text: '#4b5563', title: 'لم يتم التسليم' },
};

const AssignmentDetailsScreen: React.FC<Props> = ({ route }) => {
    const { assignment, studentId, parentId } = route.params;
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [content, setContent] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<Array<{ uri?: string; name?: string; type?: string; size?: number; file?: File }>>([]);

    const fetchSubmission = useCallback(() => {
        setLoading(true);
        api.getSubmissionForAssignment(parentId, assignment.id, studentId)
            .then(data => {
                setSubmission(data);
                if (data?.content) setContent(data.content);
            })
            .catch(err => console.error("Failed to fetch submission", err))
            .finally(() => setLoading(false));
    }, [parentId, assignment.id, studentId]);

    useFocusEffect(fetchSubmission);

    const pickFiles = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                multiple: true,
                type: ['image/*','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain'],
                copyToCacheDirectory: true
            });
            if (!res.canceled && Array.isArray(res.assets)) {
                const files = res.assets.map(a => ({
                    uri: a.uri,
                    name: a.name,
                    type: a.mimeType || 'application/octet-stream',
                    size: a.size
                }));
                setSelectedFiles(files);
            }
        } catch {
            Alert.alert('خطأ', 'فشل اختيار الملفات.');
        }
    };

    const handleSubmit = async () => {
        if (!content.trim() && selectedFiles.length === 0) {
            Alert.alert('تنبيه', 'الرجاء إدخال محتوى الإجابة أو إرفاق ملفات');
            return;
        }
        setIsSubmitting(true);
        try {
            const filesPayload = selectedFiles.map(f => {
                if (Platform.OS === 'web') return { file: (f as any).file || undefined, uri: f.uri, name: f.name, type: f.type };
                return { uri: f.uri, name: f.name, type: f.type };
            });
            await api.submitAssignmentWithAttachments(parentId, assignment.id, studentId, content, filesPayload);
            Alert.alert('نجاح', 'تم رفع الواجب بنجاح.');
            fetchSubmission(); // Refresh data
            setSelectedFiles([]);
        } catch (error) {
            Alert.alert('خطأ', 'فشل رفع الواجب.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const renderSubmissionStatus = () => {
        const currentStatus = submission?.status || SubmissionStatus.NotSubmitted;
        const status = statusInfo[currentStatus];
        
        return (
            <View style={styles.statusSection}>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.text }]}>{status.title}</Text>
                </View>

                {/* Submission Form */}
                {currentStatus !== SubmissionStatus.Graded && (
                    <View style={styles.formContainer}>
                        <Text style={styles.label}>إجابة الطالب (أو ملاحظات ولي الأمر):</Text>
                        <TextInput 
                            style={styles.input}
                            multiline
                            placeholder="اكتب الإجابة هنا..."
                            value={content}
                            onChangeText={setContent}
                            editable={!isSubmitting}
                        />
                        <View style={{ marginBottom: 12 }}>
                          <TouchableOpacity style={styles.attachButton} onPress={pickFiles} disabled={isSubmitting}>
                            <Text style={styles.attachButtonText}>إضافة مرفقات</Text>
                          </TouchableOpacity>
                          {selectedFiles.length > 0 && (
                            <View style={{ marginTop: 8 }}>
                              <Text style={styles.selectedFilesText}>عدد الملفات المحددة: {selectedFiles.length}</Text>
                              <TouchableOpacity onPress={() => setSelectedFiles([])}>
                                <Text style={styles.clearFilesText}>إزالة الملفات</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity 
                            style={[styles.submitButton, (isSubmitting || !content.trim()) && styles.disabledButton]} 
                            onPress={handleSubmit}
                            disabled={isSubmitting || (!content.trim() && selectedFiles.length === 0)}
                        >
                            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{submission ? 'تحديث الإجابة' : 'تسليم الواجب'}</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                {submission?.submissionDate && (
                    <Text style={styles.submissionDate}>تاريخ التسليم: {new Date(submission.submissionDate).toLocaleDateString('ar-SA')}</Text>
                )}
                
                {currentStatus === SubmissionStatus.Graded && submission && (
                     <View style={styles.gradeBox}>
                        <Text style={styles.gradeLabel}>الدرجة</Text>
                        <Text style={styles.gradeText}>{submission.grade}/10</Text>
                        {submission.feedback && <Text style={styles.feedbackText}>ملاحظات المعلم: {submission.feedback}</Text>}
                        <Text style={styles.contentLabel}>الإجابة المقدمة:</Text>
                        <Text style={styles.contentText}>{submission.content}</Text>
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
                <Text style={styles.dueDate}>تاريخ الاستحقاق: {new Date(assignment.dueDate).toLocaleDateString('ar-SA')}</Text>
                <Text style={styles.description}>{assignment.description}</Text>
                {Array.isArray((assignment as any).attachments) && (assignment as any).attachments.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.cardTitle}>مرفقات المعلم</Text>
                    {(assignment as any).attachments.map((a: AttachmentMeta, idx: number) => (
                      <TouchableOpacity key={`${a.filename}-${idx}`} onPress={() => a.url && Linking.openURL(api.getAssetUrl(a.url))}>
                        <Text style={styles.attachmentLink}>{a.originalName || a.filename}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
            </View>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>حالة التسليم</Text>
                {renderSubmissionStatus()}
                {submission && Array.isArray(submission.attachments) && submission.attachments.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.cardTitle}>مرفقات التسليم</Text>
                    {submission.attachments.map((a: AttachmentMeta, idx: number) => (
                      <TouchableOpacity key={`${a.filename}-${idx}`} onPress={() => a.url && Linking.openURL(api.getAssetUrl(a.url))}>
                        <Text style={styles.attachmentLink}>{a.originalName || a.filename}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
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
    statusSection: { alignItems: 'stretch' },
    statusBadge: { borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-end', marginBottom: 16 },
    statusText: { fontSize: 14, fontWeight: 'bold' },
    formContainer: { width: '100%' },
    label: { textAlign: 'right', marginBottom: 8, color: '#374151', fontWeight: '500' },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, minHeight: 100, textAlign: 'right', textAlignVertical: 'top', marginBottom: 16 },
    attachButton: { backgroundColor: '#6b7280', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    attachButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    submitButton: { backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    disabledButton: { backgroundColor: '#fca5a5' },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    submissionDate: { fontSize: 12, color: '#6b7280', marginTop: 12, textAlign: 'right' },
    gradeBox: { marginTop: 16, backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, width: '100%', alignItems: 'flex-end' },
    gradeLabel: { fontSize: 14, color: '#6b7280' },
    gradeText: { fontSize: 24, fontWeight: 'bold', color: '#166534', marginVertical: 4 },
    feedbackText: { fontSize: 14, color: '#374151', fontStyle: 'italic', marginTop: 8, textAlign: 'right' },
    contentLabel: { fontSize: 12, color: '#6b7280', marginTop: 12 },
    contentText: { fontSize: 14, color: '#374151', marginTop: 4, textAlign: 'right' },
    attachmentLink: { color: '#1d4ed8', textDecorationLine: 'underline', textAlign: 'right', marginTop: 4 },
    selectedFilesText: { fontSize: 12, color: '#374151', textAlign: 'right' },
    clearFilesText: { fontSize: 12, color: '#dc2626', textAlign: 'right', marginTop: 4 }
});

export default AssignmentDetailsScreen;
