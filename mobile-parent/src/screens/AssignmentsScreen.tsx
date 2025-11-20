import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as api from '../api';
import { Assignment } from '../types';
import { AssignmentsStackParamList } from '../navigation/AssignmentsNavigator';
import { AssignmentIcon } from '../components/icons';

type Props = StackScreenProps<AssignmentsStackParamList, 'AssignmentsList'>;

const AssignmentsScreen: React.FC<Props> = ({ route, navigation }) => {
    const { user } = route.params;
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const studentId = 'std_001'; // Mock student ID for parent

    useEffect(() => {
        api.getStudentAssignments(studentId)
            .then(data => setAssignments(data))
            .catch(err => console.error("Failed to fetch assignments", err))
            .finally(() => setLoading(false));
    }, [studentId]);
    
    const renderItem = ({ item }: { item: Assignment }) => {
        const isDueSoon = new Date(item.dueDate) > new Date() && (new Date(item.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24) < 3;
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('AssignmentDetails', { assignment: item, studentId: studentId })}
            >
                <View style={styles.cardHeader}>
                    <AssignmentIcon color="#dc2626" size={20} />
                    <Text style={styles.cardTitle}>{item.title}</Text>
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardText}>{item.className}</Text>
                    <Text style={[styles.cardText, isDueSoon && styles.dueDateSoon]}>
                        تاريخ التسليم: {item.dueDate}
                    </Text>
                </View>
            </TouchableOpacity>
        )
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#dc2626" /></View>;
    }
    
    return (
        <FlatList
            data={assignments}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.container}
            ListEmptyComponent={<View style={styles.center}><Text>لا توجد واجبات لعرضها.</Text></View>}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#f9fafb',
        flexGrow: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 8,
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginRight: 8,
    },
    cardContent: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardText: {
        fontSize: 14,
        color: '#4b5563',
    },
    dueDateSoon: {
        color: '#f59e0b',
        fontWeight: 'bold',
    },
});

export default AssignmentsScreen;
