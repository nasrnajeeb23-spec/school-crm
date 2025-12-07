import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as api from '../api';
import { Conversation } from '../types';
import { MessagesStackParamList } from '../navigation/MessagesNavigator';

type Props = StackScreenProps<MessagesStackParamList, 'Conversations'>;

const ConversationsScreen: React.FC<Props> = ({ navigation }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getConversations()
            .then((data: any) => {
                 setConversations(data);
            })
            .catch((err: any) => console.error("Failed to fetch conversations", err))
            .finally(() => setLoading(false));
    }, []);

    const renderItem = ({ item }: { item: Conversation }) => (
        <TouchableOpacity 
            style={styles.itemContainer}
            onPress={() => navigation.navigate('Chat', { 
                conversationId: item.id, 
                roomId: item.roomId,
                title: item.title || 'محادثة',
            })}
        >
            <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{(item.title || '?')[0]}</Text></View>
            <View style={styles.textContainer}>
                <View style={styles.itemHeader}>
                    <Text style={styles.name}>{item.title}</Text>
                    {item.timestamp && <Text style={styles.timestamp}>{item.timestamp}</Text>}
                </View>
                <View style={styles.itemFooter}>
                    <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage || 'لا توجد رسائل بعد'}</Text>
                    {item.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{item.unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#dc2626" /></View>;
    }

    return (
        <FlatList
            data={conversations}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            style={styles.container}
            ListEmptyComponent={<View style={styles.center}><Text>لا توجد محادثات.</Text></View>}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
    },
    itemContainer: {
        flexDirection: 'row-reverse',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f4f8',
        alignItems: 'center',
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#dc2626',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16, 
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    textContainer: {
        flex: 1,
        marginRight: 16, 
    },
    itemHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    timestamp: {
        fontSize: 12,
        color: '#6b7280',
    },
    itemFooter: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    lastMessage: {
        fontSize: 14,
        color: '#6b7280',
        flex: 1,
        textAlign: 'right',
    },
    unreadBadge: {
        backgroundColor: '#dc2626',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 8,
    },
    unreadText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});

export default ConversationsScreen;
