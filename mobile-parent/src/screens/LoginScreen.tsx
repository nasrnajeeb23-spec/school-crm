import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as api from '../api';
import { User, School } from '../types';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ route }) => {
  const { setUser } = route.params;
  const [email, setEmail] = useState('parent@school.com');
  const [password, setPassword] = useState('password');
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isSchoolSelectorOpen, setIsSchoolSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSchoolsLoading, setIsSchoolsLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isWeb, setIsWeb] = useState(Platform.OS === 'web');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Check if running in standalone mode (PWA installed)
      const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(isRunningStandalone);

      // Listen for the beforeinstallprompt event (Android/Chrome)
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setInstallPrompt(e);
      });
    }

    api.getSchools().then(data => {
      setSchools(data);
      if (data.length > 0) {
        setSelectedSchool(data[0]);
      }
    }).finally(() => setIsSchoolsLoading(false));
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setInstallPrompt(null);
      });
    } else {
      // If no prompt is available (e.g. iOS), show instructions
      setShowIosInstructions(true);
    }
  };

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
        <Text style={styles.title}>بوابة ولي الأمر</Text>
        <Text style={styles.subtitle}>أهلاً بك، تابع مسيرة ابنك التعليمية</Text>

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

        {isWeb && !isStandalone && (
          <View style={styles.installContainer}>
            <TouchableOpacity 
              style={styles.installButton} 
              onPress={handleInstallClick}
            >
              <Text style={styles.installButtonText}>📲 تثبيت التطبيق على جهازك</Text>
            </TouchableOpacity>
            
            {showIosInstructions && (
              <View style={styles.iosInstructions}>
                <Text style={styles.iosText}>لتثبيت التطبيق على آيفون/آيباد:</Text>
                <Text style={styles.iosText}>1. اضغط على زر المشاركة <Text style={{fontWeight: 'bold'}}>Share</Text> في المتصفح</Text>
                <Text style={styles.iosText}>2. اختر <Text style={{fontWeight: 'bold'}}>Add to Home Screen</Text> (إضافة للشاشة الرئيسية)</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  installContainer: {
    marginTop: 30,
    width: '100%',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
  },
  installButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  installButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  iosInstructions: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: '100%',
  },
  iosText: {
    textAlign: 'center',
    color: '#4b5563',
    marginBottom: 5,
    fontSize: 14,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#dc2626',
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
    textAlign: 'right',
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
    backgroundColor: '#dc2626',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LoginScreen;