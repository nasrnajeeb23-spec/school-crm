// Test file to check which imports are undefined
import React from 'react';
import { Conversation, Message, ConversationType } from '../types';
import * as api from '../api';
import { AnnouncementIcon, GroupIcon, UsersIcon, ComposeIcon, SparklesIcon } from '../components/icons';
import AiMessageComposerModal from '../components/AiMessageComposerModal';
import { useToast } from '../contexts/ToastContext';

console.log('Testing imports:');
console.log('React:', typeof React);
console.log('Conversation type:', typeof Conversation);
console.log('api:', typeof api);
console.log('AnnouncementIcon:', typeof AnnouncementIcon);
console.log('GroupIcon:', typeof GroupIcon);
console.log('UsersIcon:', typeof UsersIcon);
console.log('ComposeIcon:', typeof ComposeIcon);
console.log('SparklesIcon:', typeof SparklesIcon);
console.log('AiMessageComposerModal:', typeof AiMessageComposerModal);
console.log('useToast:', typeof useToast);