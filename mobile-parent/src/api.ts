// Mobile Parent App - Real API Connection
// هذا الملف يتصل بالـ Backend الحقيقي

import { 
    User, School, Student, StudentGrades, ScheduleEntry, Invoice, ParentRequest, 
    RequestType, RequestStatus, Assignment, Submission, AttendanceStatus, Conversation, Message
} from './types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://school-crm-backend.onrender.com/api';

const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// دالة مساعدة للاتصال بالـ API
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders(),
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        throw error;
    }
};

// ==================== Authentication APIs ====================

export const login = async (email: string, password: string, schoolId: number): Promise<User> => {
    const response: any = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, schoolId }),
    });
    
    const token = response?.token;
    const user = response?.user || {};
    
    if (typeof window !== 'undefined' && token) {
        localStorage.setItem('auth_token', token);
    }
    
    return user;
};

export const logout = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
    }
};

// ==================== Parent Dashboard APIs ====================

export const getCurrentUser = async (): Promise<User> => {
    return await apiCall('/users/me');
};

export const getSchools = async (): Promise<School[]> => {
    return await apiCall('/schools');
};

export const getParentStudents = async (parentId: string): Promise<Student[]> => {
    return await apiCall(`/parents/${parentId}/students`);
};

export const getStudentDetails = async (studentId: string): Promise<{
    student: Student;
    grades: StudentGrades[];
    attendance: any[];
    invoices: Invoice[];
}> => {
    return await apiCall(`/students/${studentId}/details`);
};

export const getStudentSchedule = async (studentId: string): Promise<ScheduleEntry[]> => {
    return await apiCall(`/students/${studentId}/schedule`);
};

export const getParentInvoices = async (parentId: string): Promise<Invoice[]> => {
    return await apiCall(`/parents/${parentId}/invoices`);
};

export const getParentRequests = async (parentId: string): Promise<ParentRequest[]> => {
    const rows: any[] = await apiCall(`/parents/${parentId}/requests`);
    const statusMap: Record<string, RequestStatus> = {
        'قيد الانتظار': RequestStatus.Pending,
        'قيد المراجعة': RequestStatus.Pending,
        'تمت الموافقة': RequestStatus.Approved,
        'موافق عليه': RequestStatus.Approved,
        'مرفوض': RequestStatus.Rejected,
    };
    return rows.map(r => ({
        id: String(r.id),
        type: RequestType.Other,
        details: r.description || r.title || '',
        submissionDate: r.createdAt || new Date().toISOString().split('T')[0],
        status: statusMap[r.status] || RequestStatus.Pending,
    }));
};

export const createParentRequest = async (parentId: string, request: {
    type: RequestType;
    title: string;
    description: string;
    studentId?: string;
}): Promise<ParentRequest> => {
    return await apiCall(`/parents/${parentId}/requests`, {
        method: 'POST',
        body: JSON.stringify(request),
    });
};

export const submitParentRequest = async (parentId: string, data: { type: RequestType; details: string }): Promise<ParentRequest> => {
    const payload = { title: `طلب: ${data.type}`, description: data.details };
    return await apiCall(`/parents/${parentId}/requests`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

// ==================== Assignments & Submissions ====================

export const getStudentAssignments = async (studentId: string): Promise<Assignment[]> => {
    return await apiCall(`/students/${studentId}/assignments`);
};

export const getStudentSubmissions = async (studentId: string): Promise<Submission[]> => {
    return await apiCall(`/students/${studentId}/submissions`);
};

export const submitAssignment = async (submission: {
    assignmentId: string;
    studentId: string;
    content: string;
    attachments?: string[];
}): Promise<Submission> => {
    return await apiCall('/submissions', {
        method: 'POST',
        body: JSON.stringify(submission),
    });
};

// ==================== Messaging ====================

export const getConversations = async (userId: string): Promise<Conversation[]> => {
    return await apiCall(`/conversations/user/${userId}`);
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
    return await apiCall(`/conversations/${conversationId}/messages`);
};

export const sendMessage = async (conversationId: string, message: {
    content: string;
    senderId: string;
}): Promise<Message> => {
    return await apiCall(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(message),
    });
};

export const createConversation = async (conversation: {
    title: string;
    type: string;
    participants: string[];
}): Promise<Conversation> => {
    return await apiCall('/conversations', {
        method: 'POST',
        body: JSON.stringify(conversation),
    });
};

// ==================== Transportation ====================

export const getStudentTransportation = async (studentId: string): Promise<any> => {
    return await apiCall(`/students/${studentId}/transportation`);
};

// ==================== Settings ====================

export const updateParentProfile = async (parentId: string, data: any): Promise<User> => {
    return await apiCall(`/parents/${parentId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiCall('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
    });
};
