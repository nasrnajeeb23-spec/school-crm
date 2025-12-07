import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import io, { Socket } from 'socket.io-client';
import * as api from '../api';
import { Message } from '../types';
import { MessagesStackParamList } from '../navigation/MessagesNavigator';
import { SendIcon } from '../components/icons';

type Props = StackScreenProps<MessagesStackParamList, 'Chat'>;

const ChatScreen: React.FC<Props> = ({ route }) => {
    const { conversationId, roomId } = route.params;
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Initialize Socket
        const socketUrl = api.API_BASE_URL.replace('/api', '');
        console.log('Connecting to socket:', socketUrl);
        
        socketRef.current = io(socketUrl, {
            transports: ['websocket'],
            forceNew: true,
        });

        socketRef.current.on('connect', () => {
            console.log('Connected to socket server');
            if (roomId) {
                console.log('Joining room:', roomId);
                socketRef.current?.emit('join_conversation', roomId);
            }
        });

        socketRef.current.on('receive_message', (message: Message) => {
            console.log('Received message:', message);
            setMessages(prev => {
                const exists = prev.some(m => m.id === message.id);
                if (exists) return prev;
                return [...prev, message];
            });
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [roomId]);

    useEffect(() => {
        setLoading(true);
        api.getMessages(conversationId)
            .then(data => setMessages(data))
            .catch(err => console.error("Failed to fetch messages", err))
            .finally(() => setLoading(false));
    }, [conversationId]);
    
    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        setIsSending(true);
        const textToSend = newMessage;
        setNewMessage('');
        
        // Optimistic update
        const tempMessage: Message = {
            id: `temp_${Date.now()}`,
            senderId: 'me',
            senderRole: 'TEACHER', // Optimistic role
            text: textToSend,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMessage]);

        try {
            const sentMessage = await api.sendMessage(conversationId, { content: textToSend, senderId: 'me' });
            // Replace temp message with actual message from server
            setMessages(prev => prev.map(msg => msg.id === tempMessage.id ? sentMessage : msg));
        } catch (error) {
            console.error("Failed to send message:", error);
            // Handle error, maybe show an error icon on the message
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id)); // remove optimistic message on fail
        } finally {
            setIsSending(false);
        }
    };

    const renderItem = ({ item }: { item: Message }) => {
        const isMyMessage = item.senderRole === 'TEACHER' || item.senderId === 'me';

        return (
            <View style={[
                styles.messageContainer,
                isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
            ]}>
                <View style={[
                    styles.messageBubble,
                    isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
                ]}>
                    <Text style={isMyMessage ? styles.myMessageText : styles.otherMessageText}>{item.text}</Text>
                </View>
                <Text style={styles.timestamp}>
                    {new Date(item.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={90}
        >
            <FlatList
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messagesList}
                inverted={false} // Keep it this way to scroll from top to bottom
            />
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="اكتب رسالتك..."
                    placeholderTextColor="#999"
                />
                <TouchableOpacity onPress={handleSendMessage} disabled={isSending} style={styles.sendButton}>
                    <SendIcon size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f8',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messagesList: {
        padding: 10,
    },
    messageContainer: {
        marginVertical: 5,
        maxWidth: '80%',
    },
    myMessageContainer: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start'
    },
    otherMessageContainer: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    messageBubble: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    myMessageBubble: {
        backgroundColor: '#1e3a8a',
        borderBottomLeftRadius: 5,
    },
    otherMessageBubble: {
        backgroundColor: '#fff',
        borderBottomRightRadius: 5,
        elevation: 1,
    },
    myMessageText: {
        color: '#fff',
        fontSize: 16,
    },
    otherMessageText: {
        color: '#111827',
        fontSize: 16,
    },
    timestamp: {
        fontSize: 10,
        color: '#6b7280',
        marginTop: 4,
        marginHorizontal: 10,
    },
    inputContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    input: {
        flex: 1,
        height: 40,
        backgroundColor: '#f0f4f8',
        borderRadius: 20,
        paddingHorizontal: 15,
        marginRight: 10,
        textAlign: 'right',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1e3a8a',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ChatScreen;
