import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as api from '../api';
import { User, School } from '../types';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ route }) => {
  const { setUser } = route.params;
  const [email, setEmail] = useState('teacher@school.com');
  const [password, setPassword] = useState('password');
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isSchoolSelectorOpen, setIsSchoolSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSchoolsLoading, setIsSchoolsLoading] = useState(true);

  useEffect(() => {
    api.getSchools().then(data => {
      setSchools(data);
      if (data.length > 0) {
        setSelectedSchool(data[0]); // Default to first school
      }
    }).finally(() => setIsSchoolsLoading(false));
  }, []);

  const handleLogin = async () => {
    if (!selectedSchool) {
      Alert.alert('خطأ', 'الرجاء اختيار المدرسة.');
      return;
    }
    if (!email || !password) {
      Alert.alert('خطأ', 'الرجاء إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setIsLoading(true);
    try {
      const user = await api.login(email, password, selectedSchool.id);
      if (user) {
        setUser(user);
      } else {
        Alert.alert('فشل تسجيل الدخول', 'البيانات غير صحيحة أو لا تتطابق مع المدرسة المختارة.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('خطأ', 'حدث خطأ أثناء محاولة تسجيل الدخول.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.title}>بوابة المعلم</Text>
        <Text style={styles.subtitle}>أهلاً بك، الرجاء تسجيل الدخول للمتابعة</Text>

        {isSchoolsLoading ? (
            <ActivityIndicator style={{marginBottom: 15}} />
        ) : (
            <View style={{width: '100%'}}>
                <TouchableOpacity style={styles.input} onPress={() => setIsSchoolSelectorOpen(!isSchoolSelectorOpen)}>
                    <Text style={{color: selectedSchool ? '#000' : '#999'}}>{selectedSchool?.name || 'اختر المدرسة'}</Text>
                </TouchableOpacity>
                {isSchoolSelectorOpen && (
                    <View style={styles.schoolDropdown}>
                        <ScrollView>
                        {schools.map(school => (
                            <TouchableOpacity 
                                key={school.id} 
                                style={styles.schoolItem}
                                onPress={() => {
                                    setSelectedSchool(school);
                                    setIsSchoolSelectorOpen(false);
                                }}
                            >
                                <Text>{school.name}</Text>
                            </TouchableOpacity>
                        ))}
                        </ScrollView>
                    </View>
                )}
            </View>
        )}
        
        <TextInput
          style={styles.input}
          placeholder="البريد الإلكتروني"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          placeholder="كلمة المرور"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#999"
        />

        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={handleLogin} 
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 40,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#d1d5db',
    textAlign: 'right', // For RTL
    fontSize: 16,
    justifyContent: 'center'
  },
  schoolDropdown: {
    width: '100%',
    maxHeight: 150,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    position: 'absolute',
    top: 55,
    zIndex: 10,
  },
  schoolItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'flex-end',
  },
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#1e3a8a',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LoginScreen;