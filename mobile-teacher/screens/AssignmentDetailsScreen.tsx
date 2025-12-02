import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as api from '../api';
import { Submission, SubmissionStatus } from '../types';
import { AssignmentsStackParamList } from '../navigation/AssignmentsNavigator';

type Props = StackScreenProps<AssignmentsStackParamList, 'AssignmentDetails'>;

const statusColorMap: { [key in SubmissionStatus]: { bg: string, text: string } } = {
  [SubmissionStatus.Submitted]: { bg: '#dbeafe', text: '#1e40af' },
  [SubmissionStatus.Late]: { bg: '#fef3c7', text: '#92400e' },
  [SubmissionStatus.Graded]: { bg: '#dcfce7', text: '#166534' },
  [SubmissionStatus.NotSubmitted]: { bg: '#f3f4f6', text: '#4b5563' },
};

const AssignmentDetailsScreen: React.FC<Props> = ({ route }) => {
    const { assignment } = route.params;
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.getSubmissionsForAssignment(assignment.id)
            .then((data: Submission[]) => setSubmissions(data))
            .catch((err: any) => console.error("Failed to fetch submissions", err))
            .finally(() => setLoading(false));
    }, [assignment.id]);
    
    const renderItem = ({ item }: { item: Submission }) => (
        <View style={styles.submissionItem}>
            <View style={{flex: 1}}>
                <Text style={styles.studentName}>{item.studentName}</Text>
                {item.submissionDate && <Text style={styles.submissionDate}>تاريخ التسليم: {item.submissionDate}</Text>}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColorMap[item.status].bg }]}>
                <Text style={[styles.statusText, { color: statusColorMap[item.status].text }]}>{item.status}</Text>
            </View>
        </View>
    );

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
    }

    return (
        <FlatList
            data={submissions}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.container}
            ListHeaderComponent={
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>{assignment.title}</Text>
                    <Text style={styles.description}>{assignment.description}</Text>
                    <Text style={styles.dueDate}>تاريخ التسليم: {assignment.dueDate}</Text>
                </View>
            }
            ListEmptyComponent={<View style={styles.center}><Text>لا توجد تسليمات لعرضها.</Text></View>}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#f0f4f8',
        flexGrow: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    headerContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e3a8a',
        textAlign: 'right',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#374151',
        textAlign: 'right',
        lineHeight: 20,
        marginBottom: 12,
    },
    dueDate: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'right',
    },
    submissionItem: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        marginVertical: 6,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    studentName: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'right',
        color: '#111827',
    },
    submissionDate: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'right',
        marginTop: 4,
    },
    statusBadge: {
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default AssignmentDetailsScreen;
