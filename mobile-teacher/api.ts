// Mobile Teacher App - Real API Connection
// هذا الملف يتصل بالـ Backend الحقيقي

import { User, School, Student, Class, Assignment, Submission, AttendanceRecord, AttendanceStatus, DailyAttendance, StudentGrades, Conversation, Message } from './types';
import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL = (((process as any).env as any)['EXPO_PUBLIC_API_BASE_URL'] as string) || 'http://localhost:5000/api';

export const getAssetUrl = (path: string): string => {
  if (!path) return '';
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${base}${path}`;
  return `${base}/${path}`;
};

async function getToken() {
  try {
    return await SecureStore.getItemAsync('auth_token');
  } catch (e) {
    return null;
  }
}

async function setToken(token: string) {
  try {
    if (token) {
        await SecureStore.setItemAsync('auth_token', token);
    } else {
        await SecureStore.deleteItemAsync('auth_token');
    }
  } catch (e) {
    console.error('Error saving token', e);
  }
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
            const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) return data;
            }
        } catch (e) {
            console.log(`Failed to fetch schools from ${url}`);
        }
    }
    return [];
};

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
    return await apiCall(`/teacher/${teacherId}/classes`);
};

export const getClassStudents = async (classId: string): Promise<Student[]> => {
    return await apiCall(`/school/class/${classId}/students`);
};

export const getTeacherSchedule = async (teacherId: string): Promise<any[]> => {
    return await apiCall(`/teacher/${teacherId}/schedule`);
};

export const getTeacherDashboardData = async (teacherId: string): Promise<{ classes: any[]; schedule: any[]; actionItems: any[] }> => {
    return await apiCall(`/teacher/${teacherId}/dashboard`);
};

export const getTeacherAssignments = async (teacherId: string): Promise<Assignment[]> => {
    return await apiCall(`/teacher/${teacherId}/assignments`);
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

export const getAttendance = async (classId: string, date: string): Promise<DailyAttendance> => {
    const rows = (await apiCall(`/school/class/${classId}/attendance?date=${encodeURIComponent(date)}`)) as Array<{ studentId: string; date: string; status: AttendanceStatus }>;
    const records: AttendanceRecord[] = Array.isArray(rows)
        ? rows.map(r => ({ studentId: String(r.studentId), studentName: '', status: r.status }))
        : [];
    return { classId, date, records };
};

export const saveAttendance = async (classId: string, date: string, records: AttendanceRecord[]): Promise<void> => {
    await apiCall(`/school/class/${classId}/attendance`, {
        method: 'POST',
        body: JSON.stringify({
            date,
            records: records.map(r => ({ studentId: r.studentId, status: r.status })),
        }),
    });
};

export const getClassAttendance = async (classId: string, date: string): Promise<AttendanceRecord[]> => {
    const daily = await getAttendance(classId, date);
    return daily.records;
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
    await apiCall(`/school/class/${attendanceData.classId}/attendance`, {
        method: 'POST',
        body: JSON.stringify({
            date: attendanceData.date,
            records: attendanceData.records.map(r => ({ studentId: r.studentId, status: r.status })),
        }),
    });

    return attendanceData.records.map(r => ({
        studentId: r.studentId,
        studentName: '',
        status: r.status as AttendanceStatus,
    }));
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

export const getGrades = async (classId: string, subject: string): Promise<StudentGrades[]> => {
    return await apiCall(`/school/class/${classId}/grades?subject=${encodeURIComponent(subject)}`);
};

export const saveGrades = async (entries: StudentGrades[]): Promise<void> => {
    const me: User = await getCurrentUser();
    const schoolId = me.schoolId;
    if (!schoolId) throw new Error('Missing schoolId');

    await apiCall(`/school/${schoolId}/grades`, {
        method: 'POST',
        body: JSON.stringify({
            entries: entries.map(e => ({
                classId: e.classId,
                subject: e.subject,
                studentId: e.studentId,
                grades: e.grades,
            })),
        }),
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
    return await apiCall(`/teacher/${teacherId}/salary-slips`);
};

export const getTeacherFinanceSummary = async (teacherId: string): Promise<any> => {
    return await apiCall(`/teacher/${teacherId}/finance-summary`);
};

// ==================== Settings ====================

export const getSchoolSettings = async (schoolId: number): Promise<any> => {
    return await apiCall(`/school/${schoolId}/settings`);
};

export const updateTeacherProfile = async (teacherId: string, data: any): Promise<User> => {
    return await apiCall(`/users/${teacherId}`, { // Assuming user endpoint or specific teacher endpoint
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    const me: User = await getCurrentUser();
    await apiCall(`/users/${me.id}`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
    });
};
