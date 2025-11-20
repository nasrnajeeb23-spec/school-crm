import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from './AppNavigator';
import { User } from '../types';
import TeacherDashboardScreen from '../screens/TeacherDashboardScreen';
import MyClassesNavigator from './MyClassesNavigator';
import MessagesNavigator from './MessagesNavigator';
import TeacherScheduleScreen from '../screens/TeacherScheduleScreen';
import MoreNavigator from './MoreNavigator';
import AssignmentsNavigator from './AssignmentsNavigator';
import { DashboardIcon, ClassesIcon, MessagesIcon, ScheduleIcon, MoreIcon, AssignmentIcon } from '../components/icons';

const Tab = createBottomTabNavigator();

type Props = StackScreenProps<RootStackParamList, 'Main'>;

const MainTabs: React.FC<Props> = ({ route }) => {
  const { user, onLogout } = route.params;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Dashboard') {
            return <DashboardIcon color={color} size={size} />;
          } else if (route.name === 'Classes') {
            return <ClassesIcon color={color} size={size} />;
          } else if (route.name === 'Schedule') {
            return <ScheduleIcon color={color} size={size} />;
          } else if (route.name === 'Assignments') {
            return <AssignmentIcon color={color} size={size} />;
          } else if (route.name === 'Messages') {
            return <MessagesIcon color={color} size={size} />;
          } else if (route.name === 'More') {
            return <MoreIcon color={color} size={size} />;
          }
          return null;
        },
        tabBarActiveTintColor: '#1e3a8a',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
            backgroundColor: '#fff',
        },
        headerTitleStyle: {
            fontWeight: 'bold',
        },
        tabBarLabelStyle: {
          fontWeight: '600',
        }
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        options={{ title: 'لوحة التحكم' }} 
      >
        {() => <TeacherDashboardScreen user={user} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Classes" 
        options={{ title: 'فصولي', headerShown: false }} 
      >
        {() => <MyClassesNavigator user={user} />}
      </Tab.Screen>
      <Tab.Screen
        name="Assignments"
        options={{ title: 'الواجبات', headerShown: false }}
      >
        {() => <AssignmentsNavigator user={user} />}
      </Tab.Screen>
      <Tab.Screen
        name="Schedule"
        options={{ title: 'الجدول الدراسي' }}
      >
        {() => <TeacherScheduleScreen user={user} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Messages" 
        component={MessagesNavigator} 
        options={{ title: 'الرسائل', headerShown: false }} 
      />
      <Tab.Screen
        name="More"
        options={{ title: 'المزيد', headerShown: false }}
      >
        {() => <MoreNavigator user={user} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default MainTabs;
