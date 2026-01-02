

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
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const convs = await api.getConversations();
                if (!mounted) return;
                setConversations(convs as any);
                if (convs.length > 0) {
                    await handleSelectConversation(convs[0].id);
                }
                
                // Initialize Socket.IO connection safely
                try {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
                    
                    // Try to load Socket.IO from a safer source or use a fallback
                    let socket: any;
                    
                    // Check if Socket.IO is available globally first
                    if (typeof (window as any).io !== 'undefined') {
                        socket = (window as any).io('http://localhost:5003', { 
                            transports: ['websocket'], 
                            auth: { token } 
                        });
                    } else {
                        // Fallback: Create a mock socket for demo purposes
                        console.warn('Socket.IO not available, using fallback messaging');
                        socket = {
                            on: (event: string, callback: Function) => {
                                if (event === 'new_message') {
                                    // Mock message receiver for demo
                                    console.log('Mock socket listening for messages');
                                }
                            },
                            emit: (event: string, data: any) => {
                                console.log('Mock socket emit:', event, data);
                            },
                            disconnect: () => {
                                console.log('Mock socket disconnected');
                            }
                        };
                    }
                    
                    socketRef.current = socket;
                    
                    if (socket && typeof socket.on === 'function') {
                        socket.on('new_message', (msg: any) => {
                            setMessages(prev => {
                                const list = prev[msg.conversationId] || [];
                                return { ...prev, [msg.conversationId]: [...list, { 
                                    id: msg.id, 
                                    senderId: msg.senderId, 
                                    text: msg.text, 
                                    timestamp: new Date(msg.timestamp).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}) 
                                }] };
                            });
                        });
                    }
                } catch (socketError) {
                    console.warn('Socket.IO initialization failed:', socketError);
                    // Continue without real-time messaging
                }
                
            } catch (e) {
                console.error('Messaging init failed', e);
            } finally {
                setLoading(false);
            }
        })();
        return () => { 
            mounted = false; 
            try { 
                if (socketRef.current && typeof socketRef.current.disconnect === 'function') {
                    socketRef.current.disconnect(); 
                }
            } catch {} 
        };
    }, [addToast]);

    const selectedConversation = useMemo(() => {
        return conversations.find(c => c.id === selectedConversationId);
    }, [selectedConversationId, conversations]);

    const handleSelectConversation = async (id: string) => {
        setSelectedConversationId(id);
        if (!messages[id]) {
            const convMessages = await api.getMessages(id);
            setMessages(prev => ({...prev, [id]: convMessages}));
        }
        const conv = conversations.find(c => c.id === id) as any;
        if (conv?.roomId && socketRef.current) {
            socketRef.current.emit('join_room', conv.roomId);
        }
        setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
    };
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversationId) return;

        setIsSending(true);

        const newMsg: Message = {
            id: `msg_temp_${Date.now()}`,
            senderId: 'me',
            text: newMessage,
            timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        };

        // Optimistic update
        setMessages(prev => ({
            ...prev,
            [selectedConversationId]: [...(prev[selectedConversationId] || []), newMsg],
        }));
        
        const messageToSend = newMessage;
        setNewMessage('');

        try {
            const conv = conversations.find(c => c.id === selectedConversationId) as any;
            if (!conv?.roomId || !socketRef.current) throw new Error('Socket not ready');
            socketRef.current.emit('send_message', { conversationId: selectedConversationId, roomId: conv.roomId, text: messageToSend, senderId: 'me', senderRole: 'SCHOOL_ADMIN' });
        } catch (error) {
            console.error("Failed to send message:", error);
            addToast("فشل إرسال الرسالة.", 'error');
            // Revert optimistic update
            setMessages(prev => ({
                ...prev,
                [selectedConversationId]: prev[selectedConversationId].filter(m => m.id !== newMsg.id)
            }));
            setNewMessage(messageToSend); // Put message back in input
        } finally {
            setIsSending(false);
        }
    };
    
    if (loading) {
        return <div className="text-center p-8">جاري تحميل الرسائل...</div>;
    }

    return (
        <>
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-md h-[calc(100vh-12rem)] flex overflow-hidden">
                <div className="w-1/3 border-l border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">الرسائل</h2>
                        <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => setIsCreateModalOpen(true)}>
                            <ComposeIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {conversations.map(conv => {
                            const TypeIcon = typeIconMap[conv.type];
                            return (
                            <div
                                key={conv.id}
                                onClick={() => handleSelectConversation(conv.id)}
                                className={`flex items-center p-4 cursor-pointer border-b border-gray-200 dark:border-gray-700 transition-colors duration-200 ${selectedConversationId === conv.id ? 'bg-teal-50 dark:bg-teal-900/40' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                            >
                                <div className="relative flex-shrink-0">
                                    <img src={conv.participantAvatar} alt={conv.participantName} className="w-12 h-12 rounded-full ml-4" />
                                    <div className="absolute bottom-0 left-0 -ml-1 bg-white dark:bg-gray-800 p-0.5 rounded-full">
                                        <TypeIcon className={`h-5 w-5 ${conv.type === ConversationType.Announcement ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`} />
                                    </div>
                                </div>
                                <div className="flex-grow overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-gray-800 dark:text-white truncate">{(conv as any).title || conv.participantName}</h3>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{conv.timestamp || ''}</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conv.lastMessage || ''}</p>
                                        {conv.unreadCount > 0 && (
                                            <span className="bg-teal-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center mr-auto">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )})}
                    </div>
                </div>

                <div className="w-2/3 flex flex-col">
                    {selectedConversation ? (
                        <>
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
                                <img src={selectedConversation.participantAvatar} alt={selectedConversation.participantName} className="w-10 h-10 rounded-full ml-3" />
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{selectedConversation.participantName}</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedConversation.type}</p>
                                </div>
                            </div>
                            <div className="flex-grow p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                                <div className="space-y-4">
                                    {(messages[selectedConversation.id] || []).map(msg => (
                                        <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.senderId === 'me' ? 'bg-teal-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-none'}`}>
                                                { (msg as any).attachmentUrl ? (
                                                    (String((msg as any).attachmentType).includes('.png') || String((msg as any).attachmentType).includes('.jpg') || String((msg as any).attachmentType).includes('.jpeg')) ? (
                                                        <img src={(msg as any).attachmentUrl} alt={(msg as any).attachmentName || ''} className="max-w-[200px] rounded mb-2" />
                                                    ) : (
                                                        <a href={(msg as any).attachmentUrl} target="_blank" rel="noreferrer" className="underline">{(msg as any).attachmentName || 'ملف مرفق'}</a>
                                                    )
                                                ) : (
                                                    <p className="text-sm">{msg.text}</p>
                                                )}
                                                <p className={`text-xs mt-1 ${msg.senderId === 'me' ? 'text-teal-100' : 'text-gray-500 dark:text-gray-400'}`}>{msg.timestamp}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="اكتب رسالتك هنا..."
                                        disabled={isSending}
                                        className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                                    />
                                    <input type="file" id="attachInput" className="hidden" onChange={async (e) => {
                                        const f = e.target.files?.[0] || null;
                                        if (!f || !selectedConversationId) return;
                                        try {
                                            const fd = new FormData();
                                            fd.append('file', f);
                                            const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
                                            const resp = await fetch('http://localhost:5003/api/messaging/upload', { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: fd });
                                            if (!resp.ok) throw new Error('upload failed');
                                            const data = await resp.json();
                                            const conv = conversations.find(c => c.id === selectedConversationId) as any;
                                            if (socketRef.current && conv?.roomId) {
                                                socketRef.current.emit('send_message', { conversationId: selectedConversationId, roomId: conv.roomId, text: data.name, senderId: 'me', senderRole: 'SCHOOL_ADMIN', attachmentUrl: data.url, attachmentType: data.type, attachmentName: data.name });
                                            }
                                        } catch {
                                            addToast('فشل رفع الملف', 'error');
                                        } finally {
                                            try { (document.getElementById('attachInput') as HTMLInputElement).value = ''; } catch {}
                                        }
                                    }} />
                                    <button type="button" className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300" onClick={() => document.getElementById('attachInput')?.click()} title="إرفاق ملف">📎</button>
                                    <button
                                        type="button"
                                        onClick={() => setIsAiModalOpen(true)}
                                        disabled={!selectedConversation || isSending}
                                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="إنشاء رسالة بالذكاء الاصطناعي"
                                    >
                                        <SparklesIcon className="h-6 w-6" />
                                    </button>
                                    <button type="submit" disabled={isSending || !newMessage.trim()} className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors disabled:bg-teal-400 disabled:cursor-not-allowed">
                                        {isSending ? (
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                             <svg className="h-6 w-6 transform rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12h18m-9-9l9 9-9 9"/></svg>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            <p>اختر محادثة لعرض الرسائل</p>
                        </div>
                    )}
                </div>
            </div>
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
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg">
                    <h3 className="text-lg font-semibold mb-4">بدء محادثة جديدة</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <label className="text-sm">الهدف:</label>
                      <select value={targetRole} onChange={async (e) => {
                        const role = e.target.value as 'TEACHER'|'PARENT';
                        setTargetRole(role);
                        const schoolId = (typeof window !== 'undefined' && localStorage.getItem('current_school_id')) ? Number(localStorage.getItem('current_school_id')) : 1;
                        try {
                          if (role === 'TEACHER') {
                            const data = await api.getSchoolTeachers(schoolId);
                            setCandidates(data);
                          } else {
                            const data = await api.getSchoolParents(schoolId);
                            setCandidates(data);
                          }
                        } catch { setCandidates([]); }
                      }} className="border rounded px-3 py-2">
                        <option value="TEACHER">معلم</option>
                        <option value="PARENT">ولي أمر</option>
                      </select>
                    </div>
                    <div className="max-h-56 overflow-y-auto border rounded p-2">
                      {candidates.map((c: any) => (
                        <label key={c.id} className="flex items-center gap-2 py-1">
                          <input type="radio" name="candidate" value={c.id} onChange={e => setSelectedTargetId(e.target.value)} />
                          <span>{c.name}</span>
                        </label>
                      ))}
                      {candidates.length === 0 && <p className="text-sm text-gray-500">اختر الهدف لتحميل القائمة</p>}
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                      <button className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700" onClick={() => { setIsCreateModalOpen(false); setCandidates([]); setSelectedTargetId(''); }}>إلغاء</button>
                      <button className="px-4 py-2 rounded bg-teal-600 text-white" disabled={!selectedTargetId} onClick={async () => {
                        try {
                          const schoolId = (typeof window !== 'undefined' && localStorage.getItem('current_school_id')) ? Number(localStorage.getItem('current_school_id')) : 1;
                          const payload: any = { title: 'محادثة جديدة', schoolId };
                          if (targetRole === 'TEACHER') payload.teacherId = selectedTargetId; else payload.parentId = selectedTargetId;
                          const conv = await api.createConversation(payload);
                          setConversations(prev => [{ id: conv.id, roomId: conv.roomId, title: conv.title } as any, ...prev]);
                          await handleSelectConversation(conv.id);
                          setIsCreateModalOpen(false);
                          setCandidates([]);
                          setSelectedTargetId('');
                        } catch (e) {
                          addToast('فشل إنشاء المحادثة الجديدة', 'error');
                        }
                      }}>بدء المحادثة</button>
                    </div>
                  </div>
                </div>
            )}
        </>
    );
};

export default Messaging;