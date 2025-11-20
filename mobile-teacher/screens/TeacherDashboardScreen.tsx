import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import * as api from '../api';
import { User, Class, ScheduleEntry, ActionItem } from '../types';
import { ClassesIcon, ScheduleIcon, BellIcon, ActionItemIcon } from '../components/icons';

interface TeacherDashboardScreenProps {
    user: User;
}

const TeacherDashboardScreen: React.FC<TeacherDashboardScreenProps> = ({ user }) => {
    const [data, setData] = useState<{
        classes: Class[],
        schedule: ScheduleEntry[],
        actionItems: ActionItem[]
    } | null>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (!user.teacherId) {
            setLoading(false);
            return;
        };
        api.getTeacherDashboardData(user.teacherId).then(dashboardData => {
            setData(dashboardData);
        }).catch(err => {
            console.error("Failed to fetch teacher dashboard data:", err);
        }).finally(() => {
            setLoading(false);
        });
    }, [user.teacherId]);

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#1e3a8a" />
                <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
            </View>
        );
    }

    if (!data) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text>لا توجد بيانات لعرضها.</Text>
            </View>
        );
    }
    
    const Card: React.FC<{ title: string, icon: React.ElementType, children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Icon color="#1e3a8a" size={22} />
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <View style={styles.cardContent}>
                {children}
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Today's Schedule Card */}
            <Card title={`جدولك لليوم (${new Date().toLocaleDateString('ar-EG', { weekday: 'long' })})`} icon={ScheduleIcon}>
                {data.schedule.length > 0 ? data.schedule.map(s => (
                    <View key={s.id} style={styles.scheduleItem}>
                        <Text style={styles.scheduleTime}>{s.timeSlot}</Text>
                        <View style={styles.scheduleDetails}>
                            <Text style={styles.scheduleSubject}>{s.subject}</Text>
                            <Text style={styles.scheduleClass}>{s.className}</Text>
                        </View>
                    </View>
                )) : <Text style={styles.emptyText}>لا توجد حصص مجدولة لك اليوم.</Text>}
            </Card>

            {/* Action Items Card */}
            <Card title="إجراءات مطلوبة" icon={BellIcon}>
                {data.actionItems.length > 0 ? data.actionItems.map(item => (
                    <View key={item.id} style={styles.actionItem}>
                        <ActionItemIcon type={item.type} size={24} color="#4b5563" />
                        <View style={styles.actionItemDetails}>
                            <Text style={styles.actionItemTitle}>{item.title}</Text>
                            <Text style={styles.actionItemDesc}>{item.description}</Text>
                        </View>
                    </View>
                )) : <Text style={styles.emptyText}>لا توجد إجراءات مطلوبة حاليًا.</Text>}
            </Card>

            {/* My Classes Card */}
            <Card title="فصولك الدراسية" icon={ClassesIcon}>
                <View style={styles.classesContainer}>
                    {data.classes.length > 0 ? data.classes.map(c => (
                        <View key={c.id} style={styles.classChip}>
                            <Text style={styles.classChipName}>{c.name}</Text>
                            <Text style={styles.classChipCount}>{c.studentCount} طالب</Text>
                        </View>
                    )) : <Text style={styles.emptyText}>أنت غير مسجل كمعلم أساسي لأي فصل.</Text>}
                </View>
            </Card>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f8',
    },
    contentContainer: {
        padding: 16,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#1e3a8a',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 12,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e3a8a',
        marginRight: 8,
    },
    cardContent: {},
    scheduleItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    scheduleTime: {
        width: 100,
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '600',
    },
    scheduleDetails: {
        flex: 1,
    },
    scheduleSubject: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    scheduleClass: {
        fontSize: 14,
        color: '#6b7280',
    },
    actionItem: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        paddingVertical: 8,
    },
    actionItemDetails: {
        flex: 1,
        marginRight: 12,
    },
    actionItemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    actionItemDesc: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    classesContainer: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
    },
    classChip: {
        backgroundColor: '#e0e7ff',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        margin: 4,
    },
    classChipName: {
        color: '#312e81',
        fontWeight: 'bold',
    },
    classChipCount: {
        color: '#4338ca',
        fontSize: 12,
        textAlign: 'right',
    },
    emptyText: {
        textAlign: 'center',
        color: '#6b7280',
        paddingVertical: 16,
    },
});

export default TeacherDashboardScreen;
