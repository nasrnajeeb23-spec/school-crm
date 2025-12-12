import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, Button, StyleSheet } from 'react-native';
import MoreScreen from '../screens/MoreScreen';
import TeacherFinanceScreen from '../screens/TeacherFinanceScreen';
import TeacherProfileScreen from '../screens/TeacherProfileScreen';
import { User } from '../types';

export type MoreStackParamList = {
  MoreList: { user: User; onLogout: () => void; };
  Finance: { user: User };
  Profile: { user: User; onLogout: () => void; };
};

const Stack = createStackNavigator<MoreStackParamList>();

interface MoreNavigatorProps {
    user: User;
    onLogout: () => void;
}

const MoreNavigator: React.FC<MoreNavigatorProps> = ({ user, onLogout }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontWeight: 'bold' },
        headerTintColor: '#1e3a8a',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="MoreList"
        component={MoreScreen}
        initialParams={{ user, onLogout }}
        options={{ title: 'المزيد' }}
      />
      <Stack.Screen
        name="Finance"
        options={{ title: 'المالية' }}
      >
        {() => <TeacherFinanceScreen user={user} />}
      </Stack.Screen>
      <Stack.Screen
        name="Profile"
        options={{ title: 'ملفي الشخصي' }}
      >
        {() => <TeacherProfileScreen user={user} onLogout={onLogout} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
        padding: 20,
    },
    profileTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#1e3a8a',
    },
    profileText: {
        fontSize: 18,
        marginBottom: 10,
        color: '#374151',
    },
    logoutButton: {
        marginTop: 30,
        width: '60%',
    },
});


export default MoreNavigator;