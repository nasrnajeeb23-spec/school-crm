// Mobile Teacher App - Real API Connection
// هذا الملف يتصل بالـ Backend الحقيقي

import { User, School, Student, Class, Assignment, Submission, AttendanceRecord, Conversation, Message } from './types';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL as string) || 'https://school-crschool-crm-backendm.onrender.com/api';

let memoryToken: string | null = null;

async function getToken() {
  return memoryToken;
}

async function setToken(token: string) {
  memoryToken = token;
}

const authHeaders = async () => {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// دالة مساعدة للاتصال بالـ API
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
        const hdrs: Record<string, string> = { 'Content-Type': 'application/json', ...(await authHeaders()) as any };
        if (options.headers) {
            const h: any = options.headers as any;
            if (h && typeof h === 'object') Object.assign(hdrs, h);
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers: hdrs });

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
        await setToken(token);
    }
    
    return user;
};

export const logout = async () => {
    await setToken('');
};

export const getCurrentUser = async (): Promise<User> => {
    return await apiCall('/users/me');
};

// ==================== Teacher Dashboard APIs ====================

export const getTeacherClasses = async (teacherId: string): Promise<Class[]> => {
    return await apiCall(`/teachers/${teacherId}/classes`);
};

export const getClassStudents = async (classId: string): Promise<Student[]> => {
    return await apiCall(`/classes/${classId}/students`);
};

export const getTeacherSchedule = async (teacherId: string): Promise<any[]> => {
    return await apiCall(`/teachers/${teacherId}/schedule`);
};

export const getTeacherDashboardData = async (teacherId: string): Promise<{ classes: any[]; schedule: any[]; actionItems: any[] }> => {
    return await apiCall(`/teachers/${teacherId}/dashboard`);
};

export const getTeacherAssignments = async (teacherId: string): Promise<Assignment[]> => {
    return await apiCall(`/teachers/${teacherId}/assignments`);
};

// ==================== Assignments Management ====================

export const createAssignment = async (assignment: {
    title: string;
    description: string;
    classId: string;
    teacherId: string;
    dueDate: string;
    maxScore: number;
}): Promise<Assignment> => {
    return await apiCall('/assignments', {
        method: 'POST',
        body: JSON.stringify(assignment),
    });
};

export const getAssignmentSubmissions = async (assignmentId: string): Promise<Submission[]> => {
    return await apiCall(`/assignments/${assignmentId}/submissions`);
};

export const getSubmissionsForAssignment = async (assignmentId: string): Promise<Submission[]> => {
    return await getAssignmentSubmissions(assignmentId);
};

export const gradeSubmission = async (submissionId: string, grade: number, feedback: string): Promise<Submission> => {
    return await apiCall(`/submissions/${submissionId}/grade`, {
        method: 'PUT',
        body: JSON.stringify({ grade, feedback }),
    });
};

// ==================== Attendance ====================

export const getClassAttendance = async (classId: string, date: string): Promise<AttendanceRecord[]> => {
    return await apiCall(`/classes/${classId}/attendance?date=${date}`);
};

export const markAttendance = async (attendanceData: {
    classId: string;
    date: string;
    records: Array<{
        studentId: string;
        status: string;
        notes?: string;
    }>;
}): Promise<AttendanceRecord[]> => {
    return await apiCall('/attendance', {
        method: 'POST',
        body: JSON.stringify(attendanceData),
    });
};

// ==================== Grades ====================

export const getStudentGrades = async (studentId: string): Promise<any[]> => {
    return await apiCall(`/students/${studentId}/grades`);
};

export const addGrade = async (grade: {
    studentId: string;
    assignmentId: string;
    score: number;
    maxScore: number;
    notes?: string;
}): Promise<any> => {
    return await apiCall('/grades', {
        method: 'POST',
        body: JSON.stringify(grade),
    });
};

// ==================== Messaging ====================

export const getConversations = async (userId?: string): Promise<Conversation[]> => {
    if (!userId) {
        const me: User = await getCurrentUser();
        userId = String(me.id);
    }
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

// ==================== Finance ====================

export const getTeacherSalarySlips = async (teacherId: string): Promise<any[]> => {
    return await apiCall(`/teachers/${teacherId}/salary-slips`);
};

export const getTeacherFinanceSummary = async (teacherId: string): Promise<any> => {
    return await apiCall(`/teachers/${teacherId}/finance-summary`);
};
