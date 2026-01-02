import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigatorScreenParams } from '@react-navigation/native';
import LoginScreen from '../screens/LoginScreen';
import MainTabs from './MainTabs';
import { MainTabParamList } from './MainTabs';
import { User } from '../types';

export type RootStackParamList = {
  Login: { setUser: (user: User) => void };
  Main: NavigatorScreenParams<MainTabParamList> & { user: User; onLogout: () => void };
};

const Stack = createStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  user: User | null;
  setUser: (user: User | null) => void;
}

const AppNavigator: React.FC<AppNavigatorProps> = ({ user, setUser }) => {
  const handleLogout = () => {
    setUser(null);
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen 
          name="Main" 
          component={MainTabs} 
          initialParams={{ user: user, onLogout: handleLogout }}
        />
      ) : (
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          initialParams={{ setUser: (loggedInUser: User) => setUser(loggedInUser) }}
        />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
