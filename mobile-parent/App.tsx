import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { LinkingOptions } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { User } from './src/types';

const prefix = Linking.createURL('/');

const linking: LinkingOptions<any> = {
  prefixes: [prefix],
  config: {
    screens: {
      Login: 'login',
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Grades: 'grades',
          Attendance: 'attendance',
          Assignments: 'assignments',
          Messages: 'messages',
          Finance: 'finance',
          More: 'more',
        },
      },
    },
  },
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  return (
    <NavigationContainer linking={linking}>
      <AppNavigator user={currentUser} setUser={setCurrentUser} />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
