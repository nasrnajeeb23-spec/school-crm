import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { User } from '../types';
import * as api from '../api';
import { LogoutIcon } from '../components/icons';

interface ProfileScreenProps {
    user: User;
    onLogout: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onLogout }) => {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            await api.updateParentProfile(user.id.toString(), { name, email }); // Using parent API but compatible for users usually
            Alert.alert('نجاح', 'تم تحديث الملف الشخصي بنجاح');
        } catch (error) {
            Alert.alert('خطأ', 'فشل تحديث الملف الشخصي');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!password || !newPassword) {
            Alert.alert('خطأ', 'الرجاء إدخال كلمة المرور الحالية والجديدة');
            return;
        }
        setLoading(true);
        try {
            await api.changePassword(password, newPassword);
            Alert.alert('نجاح', 'تم تغيير كلمة المرور بنجاح');
            setPassword('');
            setNewPassword('');
        } catch (error) {
            Alert.alert('خطأ', 'فشل تغيير كلمة المرور');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>المعلومات الشخصية</Text>
                
                <Text style={styles.label}>الاسم</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="الاسم"
                />

                <Text style={styles.label}>البريد الإلكتروني</Text>
                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="البريد الإلكتروني"
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <TouchableOpacity style={styles.button} onPress={handleUpdateProfile} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>حفظ التغييرات</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>تغيير كلمة المرور</Text>
                
                <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="كلمة المرور الحالية"
                    secureTextEntry
                />

                <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="كلمة المرور الجديدة"
                    secureTextEntry
                />

                <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleChangePassword} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>تغيير كلمة المرور</Text>}
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                <LogoutIcon color="#d9534f" size={22} />
                <Text style={styles.logoutButtonText}>تسجيل الخروج</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 2 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 16, textAlign: 'right' },
    label: { fontSize: 14, color: '#6b7280', marginBottom: 6, textAlign: 'right' },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, marginBottom: 16, textAlign: 'right', fontSize: 16 },
    button: { backgroundColor: '#dc2626', padding: 12, borderRadius: 8, alignItems: 'center' },
    secondaryButton: { backgroundColor: '#4b5563' },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    logoutButton: { backgroundColor: '#fff', padding: 18, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', borderRadius: 12, elevation: 2, marginBottom: 30 },
    logoutButtonText: { fontSize: 16, color: '#d9534f', marginRight: 16, fontWeight: '600' },
});

export default ProfileScreen;
