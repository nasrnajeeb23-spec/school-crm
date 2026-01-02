import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LinkingOptions, NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import AppNavigator from './navigation/AppNavigator';
import { RootStackParamList } from './navigation/AppNavigator';
import { User } from './types';

const prefix = Linking.createURL('/');

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix],
  config: {
    screens: {
      Login: 'login',
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Classes: 'classes',
          Assignments: 'assignments',
          Schedule: 'schedule',
          Messages: 'messages',
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
