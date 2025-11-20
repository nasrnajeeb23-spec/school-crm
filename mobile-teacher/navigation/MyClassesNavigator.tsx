import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TeacherMyClassesScreen from '../screens/TeacherMyClassesScreen';
import ClassDetailsScreen from '../screens/ClassDetailsScreen';
import TeacherAttendanceScreen from '../screens/TeacherAttendanceScreen';
import TeacherGradesScreen from '../screens/TeacherGradesScreen';
import { User } from '../types';

export type MyClassesStackParamList = {
  MyClassesList: { user: User };
  ClassDetails: { classId: string; className: string; };
  Attendance: { classId: string; className: string; };
  Grades: { classId: string; className: string; };
};

const Stack = createStackNavigator<MyClassesStackParamList>();

interface MyClassesNavigatorProps {
    user: User;
}

const MyClassesNavigator: React.FC<MyClassesNavigatorProps> = ({ user }) => {
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
        name="MyClassesList"
        component={TeacherMyClassesScreen}
        initialParams={{ user }}
        options={{ title: 'فصولي الدراسية' }}
      />
      <Stack.Screen
        name="ClassDetails"
        component={ClassDetailsScreen}
        options={({ route }) => ({ title: `${route.params.className}` })}
      />
       <Stack.Screen
        name="Attendance"
        component={TeacherAttendanceScreen}
        options={{ title: 'تسجيل الحضور' }}
      />
      <Stack.Screen
        name="Grades"
        component={TeacherGradesScreen}
        options={{ title: 'رصد الدرجات' }}
      />
    </Stack.Navigator>
  );
};

export default MyClassesNavigator;
