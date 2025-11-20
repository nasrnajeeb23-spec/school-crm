import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Conversation, Message, ConversationType } from '../types';
import * as api from '../api';
import { AnnouncementIcon, GroupIcon, UsersIcon, ComposeIcon, SparklesIcon } from '../components/icons';
import AiMessageComposerModal from '../components/AiMessageComposerModal';
import { useToast } from '../contexts/ToastContext';

const typeIconMap: { [key in ConversationType]: React.ElementType } = {
    [ConversationType.Announcement]: AnnouncementIcon,
    [ConversationType.Group]: GroupIcon,
    [ConversationType.Direct]: UsersIcon,
};

const Messaging: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [targetRole, setTargetRole] = useState<'TEACHER' | 'PARENT'>('TEACHER');
    const [candidates, setCandidates] = useState<any[]>([]);
    const [selectedTargetId, setSelectedTargetId] = useState<string>('');
    const { addToast } = useToast();

    const socketRef = useRef<any>(null);

    // Define handleSelectConversation function BEFORE using it
    const handleSelectConversation = async (conversationId: string) => {
        setSelectedConversationId(conversationId);
        try {
            const msgs = await api.getMessages(conversationId);
            setMessages(prev => ({ ...prev, [conversationId]: msgs }));
        } catch (error) {
            console.error('Failed to load messages:', error);
            addToast('فشل تحميل الرسائل', 'error');
        }
    };

    // Define other functions
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversationId) return;
        
        setIsSending(true);
        try {
            // Simulate sending message
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const newMsg: Message = {
                id: `msg_${Date.now()}`,
                text: newMessage,
                senderId: 'current_user',
                senderRole: 'USER',
                timestamp: new Date().toISOString()
            };

            setMessages(prev => ({
                ...prev,
                [selectedConversationId]: [...(prev[selectedConversationId] || []), newMsg]
            }));
            
            setNewMessage('');
            addToast('تم إرسال الرسالة', 'success');
        } catch (error) {
            console.error('Failed to send message:', error);
            addToast('فشل إرسال الرسالة', 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleCreateConversation = async () => {
        if (!selectedTargetId) return;
        
        try {
            // Simulate creating conversation
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const newConversation: Conversation = {
                id: `conv_${Date.now()}`,
                title: `محادثة جديدة مع ${targetRole === 'TEACHER' ? 'معلم' : 'ولي أمر'}`,
                participantName: 'مستخدم جديد',
                participantId: selectedTargetId,
                participantRole: targetRole,
                lastMessage: '',
                lastMessageAt: new Date().toISOString(),
                unreadCount: 0,
                type: ConversationType.Direct,
                roomId: `room_${Date.now()}`
            };

            setConversations(prev => [newConversation, ...prev]);
            setIsCreateModalOpen(false);
            setSelectedTargetId('');
            addToast('تم إنشاء المحادثة بنجاح', 'success');
        } catch (error) {
            console.error('Failed to create conversation:', error);
            addToast('فشل إنشاء المحادثة', 'error');
        }
    };

    const loadCandidates = async () => {
        try {
            const users = await api.getUsersByRole(targetRole);
            setCandidates(users);
        } catch (error) {
            console.error('Failed to load candidates:', error);
            addToast('فشل تحميل القائمة', 'error');
        }
    };

    // Use useEffect with proper dependencies
    useEffect(() => {
        let mounted = true;
        
        const loadConversations = async () => {
            try {
                setLoading(true);
                const convs = await api.getConversations();
                if (!mounted) return;
                
                setConversations(convs);
                if (convs.length > 0) {
                    await handleSelectConversation(convs[0].id);
                }
            } catch (error) {
                if (!mounted) return;
                console.error('Failed to load conversations:', error);
                addToast('فشل تحميل المحادثات', 'error');
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadConversations();

        return () => {
            mounted = false;
        };
    }, []); // Empty dependency array - run once on mount

    useEffect(() => {
        if (isCreateModalOpen) {
            loadCandidates();
        }
    }, [isCreateModalOpen, targetRole]);

    const selectedConversation = useMemo(() => {
        return conversations.find(c => c.id === selectedConversationId);
    }, [conversations, selectedConversationId]);

    const currentMessages = useMemo(() => {
        return selectedConversationId ? messages[selectedConversationId] || [] : [];
    }, [messages, selectedConversationId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            {/* Sidebar */}
            <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">المحادثات</h2>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-teal-500 text-white p-2 rounded-full hover:bg-teal-600 transition-colors"
                        >
                            <ComposeIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            لا توجد محادثات
                        </div>
                    ) : (
                        conversations.map(conversation => {
                            const IconComponent = typeIconMap[conversation.type];
                            return (
                                <div
                                    key={conversation.id}
                                    onClick={() => handleSelectConversation(conversation.id)}
                                    className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                        selectedConversationId === conversation.id ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800' : ''
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <IconComponent className="h-5 w-5 text-gray-400" />
                                            <div>
                                                <h3 className="font-medium text-gray-800 dark:text-white">
                                                    {conversation.title}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                    {conversation.lastMessage || 'لا توجد رسائل'}
                                                </p>
                                            </div>
                                        </div>
                                        {conversation.unreadCount > 0 && (
                                            <span className="bg-teal-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                {conversation.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                        {selectedConversation.title}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {selectedConversation.participantName}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsAiModalOpen(true)}
                                    className="flex items-center space-x-2 bg-purple-500 text-white px-3 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                                >
                                    <SparklesIcon className="h-4 w-4" />
                                    <span>مساعد AI</span>
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {currentMessages.length === 0 ? (
                                <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                                    لا توجد رسائل في هذه المحادثة
                                </div>
                            ) : (
                                currentMessages.map(message => (
                                    <div
                                        key={message.id}
                                        className={`flex ${
                                            message.senderId === 'current_user' ? 'justify-end' : 'justify-start'
                                        }`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                                message.senderId === 'current_user'
                                                    ? 'bg-teal-500 text-white'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
                                            }`}
                                        >
                                            <p>{message.text}</p>
                                            <p className={`text-xs mt-1 ${
                                                message.senderId === 'current_user'
                                                    ? 'text-teal-100'
                                                    : 'text-gray-500 dark:text-gray-400'
                                            }`}>
                                                {new Date(message.timestamp).toLocaleTimeString('ar-SA')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Message Input */}
                        <div className="bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="اكتب رسالتك..."
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() || isSending}
                                    className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSending ? 'جاري الإرسال...' : 'إرسال'}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                        <div className="text-center text-gray-500 dark:text-gray-400">
                            <p>اختر محادثة لعرض الرسائل</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Conversation Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center modal-fade-in" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 m-4 modal-content-scale-up" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">بدء محادثة جديدة</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع المستلم</label>
                                <div className="flex space-x-4">
                                    <button
                                        onClick={() => setTargetRole('TEACHER')}
                                        className={`px-4 py-2 rounded-lg ${
                                            targetRole === 'TEACHER'
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        معلم
                                    </button>
                                    <button
                                        onClick={() => setTargetRole('PARENT')}
                                        className={`px-4 py-2 rounded-lg ${
                                            targetRole === 'PARENT'
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        ولي أمر
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اختر المستلم</label>
                                <select
                                    value={selectedTargetId}
                                    onChange={(e) => setSelectedTargetId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                >
                                    <option value="">اختر...</option>
                                    {candidates.map(candidate => (
                                        <option key={candidate.id} value={candidate.id}>
                                            {candidate.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleCreateConversation}
                                disabled={!selectedTargetId}
                                className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                بدء المحادثة
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Composer Modal */}
            {isAiModalOpen && selectedConversation && (
                <AiMessageComposerModal
                    onClose={() => setIsAiModalOpen(false)}
                    onUseMessage={(message) => {
                        setNewMessage(message);
                        setIsAiModalOpen(false);
                    }}
                    recipientName={selectedConversation.participantName}
                />
            )}
        </div>
    );
};

export default Messaging;