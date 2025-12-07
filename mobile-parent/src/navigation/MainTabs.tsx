import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from './AppNavigator';
import DashboardScreen from '../screens/DashboardScreen';
import GradesScreen from '../screens/GradesScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import FinanceScreen from '../screens/FinanceScreen';
import MoreNavigator from './MoreNavigator';
import AssignmentsNavigator from './AssignmentsNavigator';
import MessagesNavigator from './MessagesNavigator';
import { DashboardIcon, GradesIcon, AttendanceIcon, FinanceIcon, MoreIcon, AssignmentIcon, ChatIcon } from '../components/icons';

const Tab = createBottomTabNavigator();

type Props = StackScreenProps<RootStackParamList, 'Main'>;

const MainTabs: React.FC<Props> = ({ route }) => {
  const { user, onLogout } = route.params;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Dashboard') return <DashboardIcon color={color} size={size} />;
          if (route.name === 'Grades') return <GradesIcon color={color} size={size} />;
          if (route.name === 'Attendance') return <AttendanceIcon color={color} size={size} />;
          if (route.name === 'Assignments') return <AssignmentIcon color={color} size={size} />;
          if (route.name === 'Messages') return <ChatIcon color={color} size={size} />;
          if (route.name === 'Finance') return <FinanceIcon color={color} size={size} />;
          if (route.name === 'More') return <MoreIcon color={color} size={size} />;
          return null;
        },
        tabBarActiveTintColor: '#dc2626', // Rose color
        tabBarInactiveTintColor: 'gray',
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarLabelStyle: { fontWeight: '600' }
      })}
    >
      <Tab.Screen name="Dashboard" options={{ title: 'لوحة التحكم' }}>
        {() => <DashboardScreen user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Grades" options={{ title: 'الدرجات' }}>
         {() => <GradesScreen user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Attendance" options={{ title: 'الحضور' }}>
         {() => <AttendanceScreen user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Assignments" options={{ title: 'الواجبات', headerShown: false }}>
        {() => <AssignmentsNavigator user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Messages" options={{ title: 'الرسائل', headerShown: false }}>
        {() => <MessagesNavigator />}
      </Tab.Screen>
      <Tab.Screen name="Finance" options={{ title: 'المالية' }}>
        {() => <FinanceScreen user={user} />}
      </Tab.Screen>
      <Tab.Screen name="More" options={{ title: 'المزيد', headerShown: false }}>
        {() => <MoreNavigator user={user} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default MainTabs;
