import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as api from '../api';
import { User, Class } from '../types';
import { MyClassesStackParamList } from '../navigation/MyClassesNavigator';
import { ClassesIcon, UsersIcon } from '../components/icons';

type Props = StackScreenProps<MyClassesStackParamList, 'MyClassesList'>;

const TeacherMyClassesScreen: React.FC<Props> = ({ route, navigation }) => {
    const { user } = route.params;
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user.teacherId) {
            setLoading(false);
            return;
        }
        api.getTeacherClasses(user.teacherId)
            .then(data => setClasses(data))
            .catch(err => console.error("Failed to fetch classes", err))
            .finally(() => setLoading(false));
    }, [user.teacherId]);
    
    const renderItem = ({ item }: { item: Class }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ClassDetails', { classId: item.id, className: item.name })}
        >
            <View style={styles.cardHeader}>
                <ClassesIcon color="#1e3a8a" size={20} />
                <Text style={styles.cardTitle}>{item.name}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardText}>{item.gradeLevel}</Text>
                 <View style={styles.studentCount}>
                    <UsersIcon color="#4b5563" size={16} />
                    <Text style={styles.cardText}>{item.studentCount} طالب</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
    }
    
    return (
        <FlatList
            data={classes}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.container}
            ListEmptyComponent={<View style={styles.center}><Text>لا توجد فصول مسندة إليك.</Text></View>}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#f0f4f8',
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
    studentCount: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    }
});

export default TeacherMyClassesScreen;
