import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MoreScreen from '../screens/MoreScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import RequestsScreen from '../screens/RequestsScreen';
import TransportationScreen from '../screens/TransportationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { User } from '../types';

export type MoreStackParamList = {
  MoreList: { user: User; onLogout: () => void; };
  Schedule: { user: User };
  Requests: { user: User };
  Transportation: { user: User };
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
        headerTintColor: '#dc2626',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="MoreList" component={MoreScreen} initialParams={{ user, onLogout }} options={{ title: 'المزيد' }} />
      <Stack.Screen name="Schedule" options={{ title: 'الجدول الدراسي' }}>
        {() => <ScheduleScreen user={user} />}
      </Stack.Screen>
      <Stack.Screen name="Requests" options={{ title: 'الطلبات' }}>
        {() => <RequestsScreen user={user} />}
      </Stack.Screen>
      <Stack.Screen name="Transportation" options={{ title: 'النقل المدرسي' }}>
        {() => <TransportationScreen user={user} />}
      </Stack.Screen>
      <Stack.Screen name="Profile" options={{ title: 'الملف الشخصي' }}>
        {() => <ProfileScreen user={user} onLogout={onLogout} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default MoreNavigator;
