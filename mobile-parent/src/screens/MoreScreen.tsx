import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { MoreStackParamList } from '../navigation/MoreNavigator';
import { ScheduleIcon, RequestIcon, BusIcon, ProfileIcon, ChevronLeftIcon, HelpIcon } from '../components/icons';

type Props = StackScreenProps<MoreStackParamList, 'MoreList'>;

const MoreScreen: React.FC<Props> = ({ navigation, route }) => {
    const { user, onLogout } = route.params;

    const menuItems = [
        { title: 'الجدول الدراسي', icon: ScheduleIcon, onPress: () => navigation.navigate('Schedule', { user }) },
        { title: 'الطلبات', icon: RequestIcon, onPress: () => navigation.navigate('Requests', { user }) },
        { title: 'النقل المدرسي', icon: BusIcon, onPress: () => navigation.navigate('Transportation', { user }) },
        { title: 'مركز المساعدة', icon: HelpIcon, onPress: () => Linking.openURL('https://school-crm.example.com/parent/help-center') },
        { title: 'الملف الشخصي', icon: ProfileIcon, onPress: () => navigation.navigate('Profile', { user, onLogout }) },
    ];

    return (
        <ScrollView style={styles.container}>
            {menuItems.map((item, index) => (
                <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
                    <View style={styles.iconContainer}>
                        <item.icon color="#dc2626" size={22} />
                        <Text style={styles.menuItemText}>{item.title}</Text>
                    </View>
                    <ChevronLeftIcon color="#6b7280" size={22} />
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 20 },
    menuItem: {
        backgroundColor: '#fff',
        padding: 18,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    iconContainer: { flexDirection: 'row-reverse', alignItems: 'center' },
    menuItemText: { fontSize: 16, color: '#111827', marginRight: 16 },
});

export default MoreScreen;
