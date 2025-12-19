import { 
    User, School, Student, StudentGrades, ScheduleEntry, Invoice, ParentRequest, 
    RequestType, RequestStatus, Assignment, Submission, AttendanceStatus, Conversation, Message,
    BusOperator, Route
} from './types';
import * as SecureStore from 'expo-secure-store';
 
export const API_BASE_URL = (process.env as any)?.REACT_APP_API_URL || (process.env as any)?.EXPO_PUBLIC_API_BASE_URL || 'https://school-crschool-crm-backendm.onrender.com/api';
 
let memoryToken: string | null = null;
 
const authHeaders = () => {
    const token = memoryToken || ((typeof localStorage !== 'undefined') ? localStorage.getItem('auth_token') : null);
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// دالة مساعدة للاتصال بالـ API
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
        const isFormData = typeof FormData !== 'undefined' && (options as any)?.body instanceof FormData;
        const headers: Record<string, string> = {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...authHeaders(),
            ...(options.headers as any || {}),
        };
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

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
    
    if (token) {
        memoryToken = token;
        if (typeof localStorage !== 'undefined') { localStorage.setItem('auth_token', token); }
        try { await SecureStore.setItemAsync('auth_token', token); } catch {}
    }
    
    return user;
};
 
export const logout = async () => {
    memoryToken = null;
    if (typeof localStorage !== 'undefined') { localStorage.removeItem('auth_token'); }
    try { await SecureStore.deleteItemAsync('auth_token'); } catch {}
};

export const getParentDashboardData = async (parentId: string, studentId?: string): Promise<any> => {
    const query = studentId ? `?studentId=${studentId}` : '';
    return await apiCall(`/parent/${parentId}/dashboard${query}`);
};

export const getCurrentUser = async (): Promise<User> => {
    return await apiCall('/users/me');
};

export const getSchools = async (): Promise<School[]> => {
    const urls = [
        `${API_BASE_URL}/schools`,
        `${API_BASE_URL}/schools/public`,
        `${API_BASE_URL}/public/schools`,
        `${API_BASE_URL.replace(/\/api\/?$/, '')}/schools`,
        `${API_BASE_URL.replace(/\/api\/?$/, '')}/public/schools`
    ];

    for (const url of urls) {
        try {
            const resp = await fetch(url);
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data)) return data;
                if (data && Array.isArray(data.data)) return data.data;
            }
        } catch {}
    }
    // Try original apiCall as last resort if authenticated
    try {
        return await apiCall('/schools');
    } catch {
        return [];
    }
};

export const getParentStudents = async (parentId: string): Promise<Student[]> => {
    const response = await apiCall(`/parent/${parentId}/dashboard`);
    if (response && Array.isArray(response.children) && response.children.length > 0) {
        return response.children.map((child: any) => child.student).filter(Boolean);
    }
    if (response && response.student) {
        return [response.student];
    }
    return [];
};

export const getStudentDetails = async (studentId: string): Promise<{
    student: Student;
    grades: StudentGrades[];
    attendance: any[];
    invoices: Invoice[];
}> => {
    return await apiCall(`/students/${studentId}/details`);
};

export const getStudentGrades = async (parentId: string, studentId: string): Promise<StudentGrades[]> => {
    const response = await apiCall(`/parent/${parentId}/grades?studentId=${studentId}`);
    if (response.children && response.children.length > 0) {
        return response.children[0].grades;
    }
    return response.grades || [];
};

export const getStudentAttendance = async (parentId: string, studentId: string): Promise<any[]> => {
    const response = await apiCall(`/parent/${parentId}/attendance?studentId=${studentId}`);
    if (response.children && response.children.length > 0) {
        return response.children[0].attendance;
    }
    return response.attendance || [];
};

export const getStudentSchedule = async (studentId: string): Promise<ScheduleEntry[]> => {
    return await apiCall(`/students/${studentId}/schedule`);
};

export const getStudentAndScheduleByParentId = async (parentId: string, studentId?: string): Promise<{ student: Student | null; schedule: ScheduleEntry[] }> => {
    const query = studentId ? `?studentId=${studentId}` : '';
    const data = await apiCall(`/parent/${parentId}/student-schedule${query}`);
    if (!data) {
        return { student: null, schedule: [] };
    }
    if (data.student && Array.isArray(data.schedule)) {
        return { student: data.student, schedule: data.schedule };
    }
    if (Array.isArray(data.children) && data.children.length > 0) {
        const first = data.children[0];
        return { student: first.student || null, schedule: Array.isArray(first.schedule) ? first.schedule : [] };
    }
    return { student: null, schedule: [] };
};

export const getParentInvoices = async (parentId: string): Promise<Invoice[]> => {
    const response = await apiCall(`/parent/${parentId}/dashboard`);
    if (response && Array.isArray(response.invoices)) {
        return response.invoices;
    }
    if (response && Array.isArray(response.children)) {
        const all: Invoice[] = [];
        response.children.forEach((child: any) => {
            if (Array.isArray(child.invoices)) {
                all.push(...child.invoices);
            }
        });
        return all;
    }
    return [];
};

export const getSchoolSettings = async (schoolId: number): Promise<any> => {
    return await apiCall(`/school/${schoolId}/settings`);
};

export const getAssetUrl = (path: string): string => {
    if (!path) return '';
    const base = API_BASE_URL.replace(/\/api\/?$/, '');
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith('/')) return `${base}${path}`;
    return `${base}/${path}`;
};
export const getParentRequests = async (parentId: string): Promise<ParentRequest[]> => {
    const rows: any[] = await apiCall(`/parent/${parentId}/requests`);
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
    return await apiCall(`/parent/${parentId}/requests`, {
        method: 'POST',
        body: JSON.stringify(request),
    });
};

export const submitParentRequest = async (parentId: string, data: { type: RequestType; details: string }): Promise<ParentRequest> => {
    const payload = { title: `طلب: ${data.type}`, description: data.details };
    return await apiCall(`/parent/${parentId}/requests`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

// ==================== Assignments & Submissions ====================

export const getStudentAssignments = async (parentId: string, studentId: string): Promise<Assignment[]> => {
    const response = await apiCall(`/parent/${parentId}/assignments?studentId=${studentId}`);
    // Response structure is { children: [{ student: {}, assignments: [] }] } or { student: {}, assignments: [] }
    if (response.children && response.children.length > 0) {
        return response.children[0].assignments;
    }
    return response.assignments || [];
};

export const getStudentSubmissions = async (studentId: string): Promise<Submission[]> => {
    return await apiCall(`/students/${studentId}/submissions`);
};

export const getSubmissionForAssignment = async (parentId: string, assignmentId: string, studentId: string): Promise<Submission | null> => {
    return await apiCall(`/parent/${parentId}/assignments/${assignmentId}/submission?studentId=${studentId}`);
};

export const submitAssignment = async (parentId: string, assignmentId: string, studentId: string, content: string): Promise<Submission> => {
    return await apiCall(`/parent/${parentId}/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ studentId, content }),
    });
};

export const submitAssignmentWithAttachments = async (parentId: string, assignmentId: string, studentId: string, content: string, files: Array<{ uri?: string; name?: string; type?: string; file?: File }>): Promise<Submission> => {
    const form = new FormData();
    form.append('studentId', studentId);
    if (content) form.append('content', content);
    (files || []).forEach((f) => {
        if ((globalThis as any).Platform && (globalThis as any).Platform.OS !== 'web') {
            if (f.uri && f.name && f.type) {
                (form as any).append('attachments', { uri: f.uri, name: f.name, type: f.type } as any);
            }
        } else {
            if ((f as any).file instanceof File) {
                form.append('attachments', (f as any).file);
            } else if (f.uri && f.name && f.type) {
                try {
                    form.append('attachments', new File([], f.name, { type: f.type as string }));
                } catch {}
            }
        }
    });
    return await apiCall(`/parent/${parentId}/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: form
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
    return null;
};

export const getParentTransportationDetails = async (parentId: string): Promise<{ route: Route; operator: BusOperator | undefined } | null> => {
    try {
        const resp = await apiCall(`/transportation/parent/${parentId}`);
        if (resp && resp.route && resp.operator) {
            return resp;
        }
    } catch {}
    return null;
};

// ==================== Settings ====================

export const updateParentProfile = async (parentId: string, data: any): Promise<User> => {
    return await apiCall(`/users/${parentId}`, {
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
