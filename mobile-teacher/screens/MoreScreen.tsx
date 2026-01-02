import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { MoreStackParamList } from '../navigation/MoreNavigator';
import { FinanceIcon, ProfileIcon, LogoutIcon, ChevronLeftIcon, HelpIcon } from '../components/icons';

type Props = StackScreenProps<MoreStackParamList, 'MoreList'>;

const MoreScreen: React.FC<Props> = ({ navigation, route }) => {
    const { onLogout } = route.params;

    const menuItems = [
        {
            title: 'المالية',
            icon: FinanceIcon,
            onPress: () => navigation.navigate('Finance', { user: route.params.user }),
        },
        {
            title: 'مركز المساعدة',
            icon: HelpIcon,
            onPress: () => Linking.openURL('https://school-crm.example.com/teacher/help-center'),
        },
        {
            title: 'ملفي الشخصي',
            icon: ProfileIcon,
            onPress: () => navigation.navigate('Profile', { user: route.params.user, onLogout: onLogout }),
        },
    ];

    return (
        <ScrollView style={styles.container}>
            {menuItems.map((item, index) => (
                <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
                    <View style={styles.iconContainer}>
                        <item.icon color="#1e3a8a" size={22} />
                        <Text style={styles.menuItemText}>{item.title}</Text>
                    </View>
                    <ChevronLeftIcon color="#6b7280" size={22} />
                </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                <LogoutIcon color="#d9534f" size={22} />
                <Text style={styles.logoutButtonText}>تسجيل الخروج</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f8',
        paddingTop: 20,
    },
    menuItem: {
        backgroundColor: '#fff',
        padding: 18,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    iconContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    menuItemText: {
        fontSize: 16,
        color: '#111827',
        marginRight: 16,
    },
    logoutButton: {
        backgroundColor: '#fff',
        padding: 18,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginTop: 20,
    },
    logoutButtonText: {
        fontSize: 16,
        color: '#d9534f',
        marginRight: 16,
        fontWeight: '600',
    },
});

export default MoreScreen;