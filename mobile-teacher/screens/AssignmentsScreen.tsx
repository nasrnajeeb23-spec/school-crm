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

    useEffect(() => {
        if (!user.teacherId) {
            setLoading(false);
            return;
        }
        api.getTeacherAssignments(user.teacherId)
            .then(data => setAssignments(data))
            .catch(err => console.error("Failed to fetch assignments", err))
            .finally(() => setLoading(false));
    }, [user.teacherId]);
    
    const renderItem = ({ item }: { item: Assignment }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('AssignmentDetails', { assignment: item })}
        >
            <View style={styles.cardHeader}>
                <AssignmentIcon color="#1e3a8a" size={20} />
                <Text style={styles.cardTitle}>{item.title}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardText}>{item.className}</Text>
                <Text style={styles.cardText}>تاريخ التسليم: {item.dueDate}</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
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
        backgroundColor: '#f0f4f8',
        flexGrow: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
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
        color: '#1e3a8a',
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
        marginLeft: 4,
    },
});

export default AssignmentsScreen;
