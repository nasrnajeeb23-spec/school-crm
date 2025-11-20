import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User } from '../types';
import { LogoutIcon } from '../components/icons';

interface ProfileScreenProps {
    user: User;
    onLogout: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onLogout }) => {
  return (
    <View style={styles.container}>
        <View style={styles.card}>
            <Text style={styles.label}>الاسم</Text>
            <Text style={styles.value}>{user.name}</Text>
            <Text style={styles.label}>البريد الإلكتروني</Text>
            <Text style={styles.value}>{user.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <LogoutIcon color="#d9534f" size={22} />
            <Text style={styles.logoutButtonText}>تسجيل الخروج</Text>
        </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        elevation: 2,
        width: '100%',
        alignItems: 'flex-end',
    },
    label: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 12,
    },
    value: {
        fontSize: 18,
        color: '#111827',
        fontWeight: '600',
        marginBottom: 8,
    },
    logoutButton: {
        backgroundColor: '#fff',
        padding: 18,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
        borderRadius: 12,
        elevation: 2,
    },
    logoutButtonText: {
        fontSize: 16,
        color: '#d9534f',
        marginRight: 16,
        fontWeight: '600',
    },
});

export default ProfileScreen;
