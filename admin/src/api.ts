// API Configuration for Production - Real Backend Connection
// هذا الملف يتصل بالـ Backend الحقيقي على Render

import { 
    User, School, RevenueData, Plan, Subscription, SubscriptionStatus, Role, Student, Teacher, Class, DailyAttendance, StudentGrades, ScheduleEntry, Conversation, Message, Invoice, Parent, ActionItem, SchoolEvent, StudentNote, StudentDocument, RecentActivity, SchoolSettings, UserRole, NewStudentData, NewTeacherData, TeacherStatus, StudentStatus, AttendanceRecord, ConversationType, NewSchoolData, PlanName, UpdatableStudentData, PaymentData, InvoiceStatus, ClassRosterUpdate, UpdatableTeacherData, NewClassData, ParentRequest, NewParentRequestData, ActionItemType, RequestStatus, NewInvoiceData, ActivityType, LandingPageContent, NewAdRequestData, NewTrialRequestData, UpdatableUserData, SchoolRole, NewStaffData, BusOperator, Route, NewBusOperatorApplication, BusOperatorStatus, Expense, NewExpenseData,
    PricingConfig, Module, ModuleId, SchoolModuleSubscription, SelfHostedQuoteRequest, SelfHostedLicense, BankDetails, PaymentProofSubmission, TeacherSalarySlip, Assignment, NewAssignmentData, Submission, AssignmentStatus, SubmissionStatus, AttendanceStatus
} from './types';

// 🔗 الاتصال بالـ Backend الحقيقي على Render
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

export const login = async (emailOrUsername: string, password: string, schoolId?: number): Promise<User> => {
    const field = emailOrUsername.includes('@') ? { email: emailOrUsername } : { username: emailOrUsername };
    const response: any = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ ...field, password, schoolId }),
    });
    const token = response?.token;
    const user = response?.user || {};
    if (typeof window !== 'undefined' && token) {
        localStorage.setItem('auth_token', token);
    }
    const mapRole = (r: string) => {
        const key = String(r).toUpperCase().replace(/[^A-Z]/g, '');
        const m: any = { SUPERADMIN: 'SUPER_ADMIN', SUPERADMINFINANCIAL: 'SUPER_ADMIN_FINANCIAL', SUPERADMINTECHNICAL: 'SUPER_ADMIN_TECHNICAL', SUPERADMINSUPERVISOR: 'SUPER_ADMIN_SUPERVISOR', SCHOOLADMIN: 'SCHOOL_ADMIN', TEACHER: 'TEACHER', PARENT: 'PARENT' };
        return m[key] || key;
    };
    return { ...user, role: mapRole(user.role) } as User;
};

export const logout = async (): Promise<void> => {
    await apiCall('/auth/logout', { method: 'POST' });
};

export const getCurrentUser = async (): Promise<User> => {
    return await apiCall('/auth/me', { method: 'GET' });
};

export const superAdminLogin = async (email: string, password: string): Promise<any> => {
    const payload = { email, password, userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown', timestamp: Date.now() };
    return await apiCall('/auth/superadmin/login', { method: 'POST', body: JSON.stringify(payload) });
};

export const verifySuperAdminMfa = async (tempToken: string, mfaCode: string): Promise<any> => {
  const payload = { tempToken, mfaCode, timestamp: Date.now() };
  return await apiCall('/auth/superadmin/verify-mfa', { method: 'POST', body: JSON.stringify(payload) });
};

// ==================== School APIs ====================

export const getSchools = async (): Promise<School[]> => {
    return await apiCall('/schools', { method: 'GET' });
};

export const getSchool = async (id: number): Promise<School> => {
    return await apiCall(`/schools/${id}`, { method: 'GET' });
};

export const getSchoolById = async (id: number): Promise<School> => {
    return await getSchool(id);
};

export const createSchool = async (schoolData: NewSchoolData): Promise<School> => {
    return await apiCall('/schools', {
        method: 'POST',
        body: JSON.stringify(schoolData),
    });
};

export const updateSchool = async (id: number, schoolData: Partial<School>): Promise<School> => {
    return await apiCall(`/schools/${id}`, {
        method: 'PUT',
        body: JSON.stringify(schoolData),
    });
};

// ==================== Student APIs ====================

export const getStudents = async (schoolId: number): Promise<Student[]> => {
    return await apiCall(`/schools/${schoolId}/students`, { method: 'GET' });
};

export const getStudent = async (id: string): Promise<Student> => {
    return await apiCall(`/students/${id}`, { method: 'GET' });
};

export const createStudent = async (studentData: NewStudentData): Promise<Student> => {
    return await apiCall('/students', {
        method: 'POST',
        body: JSON.stringify(studentData),
    });
};

export const updateStudent = async (id: string, studentData: UpdatableStudentData): Promise<Student> => {
    return await apiCall(`/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(studentData),
    });
};

export const deleteStudent = async (id: string): Promise<void> => {
    await apiCall(`/students/${id}`, { method: 'DELETE' });
};

// ==================== Teacher APIs ====================

export const getTeachers = async (schoolId: number): Promise<Teacher[]> => {
    return await apiCall(`/schools/${schoolId}/teachers`, { method: 'GET' });
};

export const getTeacher = async (id: string): Promise<Teacher> => {
    return await apiCall(`/teachers/${id}`, { method: 'GET' });
};

export const createTeacher = async (teacherData: NewTeacherData): Promise<Teacher> => {
    return await apiCall('/teachers', {
        method: 'POST',
        body: JSON.stringify(teacherData),
    });
};

export const updateTeacher = async (id: string, teacherData: UpdatableTeacherData): Promise<Teacher> => {
    return await apiCall(`/teachers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(teacherData),
    });
};

// ==================== Class APIs ====================

export const getClasses = async (schoolId: number): Promise<Class[]> => {
    return await apiCall(`/schools/${schoolId}/classes`, { method: 'GET' });
};

export const createClass = async (classData: NewClassData): Promise<Class> => {
    return await apiCall('/classes', {
        method: 'POST',
        body: JSON.stringify(classData),
    });
};

// ==================== Staff APIs ====================

export const getSchoolStaff = async (schoolId: number): Promise<User[]> => {
    return await apiCall(`/school/${schoolId}/staff`, { method: 'GET' });
};

export const addSchoolStaff = async (schoolId: number, staffData: NewStaffData): Promise<User> => {
    return await apiCall(`/school/${schoolId}/staff`, {
        method: 'POST',
        body: JSON.stringify(staffData),
    });
};

export const updateSchoolStaff = async (schoolId: number, userId: number | string, staffData: Partial<NewStaffData>): Promise<User> => {
    return await apiCall(`/school/${schoolId}/staff/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(staffData),
    });
};

export const deleteSchoolStaff = async (schoolId: number, userId: number | string): Promise<void> => {
    await apiCall(`/school/${schoolId}/staff/${userId}`, { method: 'DELETE' });
};

// ==================== Finance APIs ====================

export const getInvoices = async (schoolId: number): Promise<Invoice[]> => {
    return await apiCall(`/schools/${schoolId}/invoices`, { method: 'GET' });
};

export const getSchoolInvoices = async (schoolId: number): Promise<Invoice[]> => {
    return await getInvoices(schoolId);
};

export const getStudentDistribution = async (schoolId: number): Promise<{ name: string, value: number }[]> => {
    try {
        const data = await apiCall(`/schools/${schoolId}/stats/student-distribution`, { method: 'GET' });
        return data;
    } catch {
        return [];
    }
};

export const createInvoice = async (invoiceData: NewInvoiceData): Promise<Invoice> => {
    return await apiCall('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
    });
};

// ==================== SuperAdmin APIs ====================

export const getSuperAdminTeamMembers = async (): Promise<any[]> => {
    return await apiCall('/superadmin/team', { method: 'GET' });
};

export const getSchoolsList = async (): Promise<School[]> => {
    return await apiCall('/superadmin/schools', { method: 'GET' });
};

export const getRevenueData = async (): Promise<RevenueData[]> => {
    return await apiCall('/superadmin/revenue', { method: 'GET' });
};

export const getSubscriptions = async (): Promise<Subscription[]> => {
    return await apiCall('/superadmin/subscriptions', { method: 'GET' });
};

export const getPlans = async (): Promise<Plan[]> => {
    return await apiCall('/plans', { method: 'GET' });
};

// ==================== Settings APIs ====================

export const getSchoolSettings = async (schoolId: number): Promise<SchoolSettings> => {
    return await apiCall(`/schools/${schoolId}/settings`, { method: 'GET' });
};

export const updateSchoolSettings = async (schoolId: number, settings: Partial<SchoolSettings>): Promise<SchoolSettings> => {
    return await apiCall(`/schools/${schoolId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
};

// ==================== Reports APIs ====================

export const getReports = async (schoolId: number, type: string): Promise<any> => {
    return await apiCall(`/schools/${schoolId}/reports?type=${type}`, { method: 'GET' });
};

// ==================== Messaging APIs ====================

export const getConversations = async (userId: string): Promise<Conversation[]> => {
    return await apiCall(`/messaging/conversations/${userId}`, { method: 'GET' });
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
    return await apiCall(`/messaging/messages/${conversationId}`, { method: 'GET' });
};

export const sendMessage = async (messageData: Partial<Message>): Promise<Message> => {
    return await apiCall('/messaging/send', {
        method: 'POST',
        body: JSON.stringify(messageData),
    });
};

// ==================== Landing Page APIs ====================

export const getLandingPageContent = async (): Promise<LandingPageContent> => {
    return await apiCall('/content/landing', { method: 'GET' });
};

export const updateLandingPageContent = async (content: Partial<LandingPageContent>): Promise<LandingPageContent> => {
    return await apiCall('/content/landing', {
        method: 'PUT',
        body: JSON.stringify(content),
    });
};

// ==================== Bank Accounts APIs ====================

export const getBankAccounts = async (): Promise<BankDetails[]> => {
    return await apiCall('/superadmin/bank-accounts', { method: 'GET' });
};

export const submitPaymentProof = async (submission: Omit<PaymentProofSubmission, 'proofImage'>): Promise<void> => {
    await apiCall('/payments/proof', {
        method: 'POST',
        body: JSON.stringify(submission),
    });
};

export const getSchoolModules = async (schoolId: number): Promise<SchoolModuleSubscription[]> => {
    try {
        const data = await apiCall(`/schools/${schoolId}/modules`, { method: 'GET' });
        return data;
    } catch {
        return [];
    }
};

export const getActionItems = async (): Promise<ActionItem[]> => {
    try {
        const data = await apiCall('/superadmin/action-items', { method: 'GET' });
        return data;
    } catch {
        return [];
    }
};

// ==================== Trial Signup APIs ====================

export const submitTrialRequest = async (data: NewTrialRequestData): Promise<User | null> => {
    const response: any = await apiCall('/auth/trial-signup', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    const token = response?.token;
    if (typeof window !== 'undefined' && token) {
        localStorage.setItem('auth_token', token);
    }
    return response?.user || null;
};

// ==================== User Profile APIs ====================

export const updateCurrentUser = async (userId: string, data: UpdatableUserData): Promise<User | null> => {
    const response: any = await apiCall(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return response?.user || null;
};

// تصدير جميع الدوال
export default {
    login,
    logout,
    getCurrentUser,
    getSchools,
    getSchool,
    getSchoolById,
    createSchool,
    updateSchool,
    getStudents,
    getStudent,
    createStudent,
    updateStudent,
    deleteStudent,
    getTeachers,
    getTeacher,
    createTeacher,
    updateTeacher,
    getClasses,
    createClass,
    getSchoolStaff,
    addSchoolStaff,
    updateSchoolStaff,
    deleteSchoolStaff,
    getInvoices,
    getSchoolInvoices,
    createInvoice,
    getSuperAdminTeamMembers,
    getSchoolsList,
    getRevenueData,
    getSubscriptions,
    getPlans,
    getSchoolSettings,
    updateSchoolSettings,
    getReports,
    getConversations,
    getMessages,
    sendMessage,
    getLandingPageContent,
    updateLandingPageContent,
    getBankAccounts,
    submitPaymentProof,
    superAdminLogin,
    verifySuperAdminMfa,
    submitTrialRequest,
    getStudentDistribution,
    getSchoolModules,
    getActionItems,
}