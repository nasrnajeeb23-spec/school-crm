import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AssignmentsScreen from '../screens/AssignmentsScreen';
import AssignmentDetailsScreen from '../screens/AssignmentDetailsScreen';
import { User, Assignment } from '../types';

export type AssignmentsStackParamList = {
  AssignmentsList: { user: User };
  AssignmentDetails: { assignment: Assignment; studentId: string; };
};

const Stack = createStackNavigator<AssignmentsStackParamList>();

interface AssignmentsNavigatorProps {
    user: User;
}

const AssignmentsNavigator: React.FC<AssignmentsNavigatorProps> = ({ user }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontWeight: 'bold' },
        headerTintColor: '#dc2626',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="AssignmentsList"
        component={AssignmentsScreen}
        initialParams={{ user }}
        options={{ title: 'الواجبات المدرسية' }}
      />
      <Stack.Screen
        name="AssignmentDetails"
        component={AssignmentDetailsScreen}
        options={({ route }) => ({ title: route.params.assignment.title })}
      />
    </Stack.Navigator>
  );
};

export default AssignmentsNavigator;
