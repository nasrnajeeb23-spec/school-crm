import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as api from '../api';
import { Assignment, Student } from '../types';
import { AssignmentsStackParamList } from '../navigation/AssignmentsNavigator';
import { AssignmentIcon } from '../components/icons';

type Props = StackScreenProps<AssignmentsStackParamList, 'AssignmentsList'>;

const AssignmentsScreen: React.FC<Props> = ({ route, navigation }) => {
    const { user } = route.params;
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user.parentId) {
            api.getParentStudents(user.parentId).then(data => {
                setStudents(data);
                if (data.length > 0) {
                    setSelectedStudentId(data[0].id);
                } else {
                    setLoading(false);
                }
            }).catch(err => {
                console.error("Failed to fetch students", err);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [user.parentId]);

    useEffect(() => {
        if (user.parentId && selectedStudentId) {
            setLoading(true);
            api.getStudentAssignments(user.parentId, selectedStudentId)
                .then(data => setAssignments(data))
                .catch(err => console.error("Failed to fetch assignments", err))
                .finally(() => setLoading(false));
        }
    }, [user.parentId, selectedStudentId]);
    
    const renderItem = ({ item }: { item: Assignment }) => {
        const isDueSoon = item.dueDate && new Date(item.dueDate) > new Date() && (new Date(item.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24) < 3;
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('AssignmentDetails', { assignment: item, studentId: selectedStudentId!, parentId: user.parentId! })}
            >
                <View style={styles.cardHeader}>
                    <AssignmentIcon color="#dc2626" size={20} />
                    <Text style={styles.cardTitle}>{item.title}</Text>
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardText}>{item.className || 'المادة'}</Text>
                    {item.dueDate && (
                        <Text style={[styles.cardText, isDueSoon && styles.dueDateSoon]}>
                            تاريخ التسليم: {new Date(item.dueDate).toLocaleDateString('ar-SA')}
                        </Text>
                    )}
                </View>
                <Text style={[styles.statusText, { color: item.status === 'Active' ? 'green' : 'gray' }]}>
                     {item.status === 'Active' ? 'نشط' : 'مؤرشف'}
                </Text>
            </TouchableOpacity>
        )
    };

    if (loading && assignments.length === 0) {
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
            <FlatList
                data={assignments}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.container}
                ListEmptyComponent={<View style={styles.center}><Text>لا توجد واجبات لعرضها.</Text></View>}
            />
        </View>
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
        marginTop: 50
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
        textAlign: 'right'
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
    },
    statusText: {
        textAlign: 'right',
        fontSize: 12,
        marginTop: 4
    }
});

export default AssignmentsScreen;
