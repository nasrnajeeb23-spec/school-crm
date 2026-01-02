import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ConversationsScreen from '../screens/ConversationsScreen';
import ChatScreen from '../screens/ChatScreen';

export type MessagesStackParamList = {
  Conversations: undefined;
  Chat: { conversationId: string; roomId: string; title: string };
};

const Stack = createStackNavigator<MessagesStackParamList>();

const MessagesNavigator: React.FC = () => {
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
        name="Conversations"
        component={ConversationsScreen}
        options={{ title: 'الرسائل' }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
};

export default MessagesNavigator;
