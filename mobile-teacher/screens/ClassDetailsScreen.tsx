import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as api from '../api';
import { Student, StudentStatus } from '../types';
import { MyClassesStackParamList } from '../navigation/MyClassesNavigator';
import { AttendanceIcon, GradesIcon } from '../components/icons';

type Props = StackScreenProps<MyClassesStackParamList, 'ClassDetails'>;

const statusColorMap: { [key in StudentStatus]: string } = {
  [StudentStatus.Active]: '#10B981',
  [StudentStatus.Suspended]: '#F59E0B',
};

const ClassDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
    const { classId, className } = route.params;
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row-reverse' }}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Grades', { classId, className })}
                        style={{ marginRight: 15 }}
                    >
                        <GradesIcon size={28} color="#1e3a8a" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Attendance', { classId, className })}
                        style={{ marginRight: 15 }}
                    >
                        <AttendanceIcon size={28} color="#1e3a8a" />
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [navigation, classId, className]);

    useEffect(() => {
        setLoading(true);
        api.getClassStudents(classId)
            .then(data => setStudents(data))
            .catch(err => console.error("Failed to fetch students", err))
            .finally(() => setLoading(false));
    }, [classId]);
    
    const renderItem = ({ item }: { item: Student }) => (
        <View style={styles.studentItem}>
            <View style={styles.studentInfo}>
                <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
                <View>
                    <Text style={styles.studentName}>{item.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColorMap[item.status] }]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
    }

    return (
        <FlatList
            data={students}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.container}
            ListEmptyComponent={<View style={styles.center}><Text>لا يوجد طلاب في هذا الفصل.</Text></View>}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 8,
        paddingBottom: 8,
        backgroundColor: '#f0f4f8',
        flexGrow: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
    },
    studentItem: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        marginVertical: 6,
        marginHorizontal: 16,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 3,
    },
    studentInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    studentName: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'right',
        color: '#111827',
    },
    statusBadge: {
        borderRadius: 12,
        paddingVertical: 2,
        paddingHorizontal: 8,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default ClassDetailsScreen;
