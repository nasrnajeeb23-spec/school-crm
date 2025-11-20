import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { User } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  return (
    <NavigationContainer>
      <AppNavigator user={currentUser} setUser={setCurrentUser} />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
