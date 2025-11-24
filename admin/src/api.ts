// API Configuration for Production - Real Backend Connection
// هذا الملف يتصل بالـ Backend الحقيقي على Render

import { 
    User, School, RevenueData, Plan, Subscription, SubscriptionStatus, Role, Student, Teacher, Class, DailyAttendance, StudentGrades, ScheduleEntry, Conversation, Message, Invoice, Parent, ActionItem, SchoolEvent, StudentNote, StudentDocument, RecentActivity, SchoolSettings, UserRole, NewStudentData, NewTeacherData, TeacherStatus, StudentStatus, AttendanceRecord, ConversationType, NewSchoolData, PlanName, UpdatableStudentData, PaymentData, InvoiceStatus, ClassRosterUpdate, UpdatableTeacherData, NewClassData, ParentRequest, NewParentRequestData, ActionItemType, RequestStatus, NewInvoiceData, ActivityType, LandingPageContent, NewAdRequestData, NewTrialRequestData, UpdatableUserData, SchoolRole, NewStaffData, BusOperator, Route, NewBusOperatorApplication, BusOperatorStatus, Expense, NewExpenseData,
    PricingConfig, Module, ModuleId, SchoolModuleSubscription, SelfHostedQuoteRequest, SelfHostedLicense, BankDetails, PaymentProofSubmission, TeacherSalarySlip, Assignment, NewAssignmentData, Submission, AssignmentStatus, SubmissionStatus, AttendanceStatus
} from './types';

// 🔗 الاتصال بالـ Backend الحقيقي على Render
const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? (localStorage.getItem('api_base') || '') : '') || 'https://school-crm-backend.onrender.com/api';

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
    return await apiCall(`/school/${schoolId}/students`, { method: 'GET' });
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
    return await apiCall(`/school/${schoolId}/teachers`, { method: 'GET' });
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
    return await apiCall(`/school/${schoolId}/classes`, { method: 'GET' });
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
    const schoolIdStr = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
    const schoolId = schoolIdStr ? Number(schoolIdStr) : undefined;
    return await apiCall(`/school/${schoolId}/invoices`, { method: 'POST', body: JSON.stringify(invoiceData) });
};

export const addInvoice = async (schoolId: number, invoiceData: NewInvoiceData): Promise<Invoice> => {
    return await apiCall(`/school/${schoolId}/invoices`, { method: 'POST', body: JSON.stringify(invoiceData) });
};

export const recordPayment = async (invoiceId: string, paymentData: PaymentData): Promise<Invoice> => {
    const schoolIdStr = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
    const schoolId = schoolIdStr ? Number(schoolIdStr) : undefined;
    return await apiCall(`/school/${schoolId}/invoices/${invoiceId}/payments`, { method: 'POST', body: JSON.stringify(paymentData) });
};

export const getSchoolExpenses = async (schoolId: number): Promise<Expense[]> => {
    return await apiCall(`/school/${schoolId}/expenses`, { method: 'GET' });
};

export const addSchoolExpense = async (schoolId: number, expenseData: NewExpenseData): Promise<Expense> => {
    return await apiCall(`/school/${schoolId}/expenses`, { method: 'POST', body: JSON.stringify(expenseData) });
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
    return await apiCall(`/school/${schoolId}/settings`, { method: 'GET' });
};

export const updateSchoolSettings = async (schoolId: number, settings: Partial<SchoolSettings>): Promise<SchoolSettings> => {
    return await apiCall(`/school/${schoolId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
};

// ==================== Reports APIs ====================

export const getReports = async (schoolId: number, type: string): Promise<any> => {
    const reportType = encodeURIComponent(type);
    return await apiCall(`/analytics/reports/generate?schoolId=${schoolId}&reportType=${reportType}`, { method: 'GET' });
};

// ==================== Messaging APIs ====================

export const getConversations = async (userId?: string): Promise<Conversation[]> => {
    const schoolIdStr = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
    const schoolId = schoolIdStr ? Number(schoolIdStr) : undefined;
    const query = schoolId ? `?schoolId=${schoolId}` : '';
    if (userId) {
        return await apiCall(`/messaging/conversations/${userId}`, { method: 'GET' });
    }
    return await apiCall(`/messaging/conversations${query}`, { method: 'GET' });
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
    return await apiCall(`/messaging/conversations/${conversationId}/messages`, { method: 'GET' });
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

export const getSchoolStudents = async (schoolId: number): Promise<Student[]> => {
    return await getStudents(schoolId);
};

export const addSchoolStudent = async (schoolId: number, data: NewStudentData): Promise<Student> => {
    return await apiCall(`/school/${schoolId}/students`, { method: 'POST', body: JSON.stringify(data) });
};

export const getSchoolTeachers = async (schoolId: number): Promise<Teacher[]> => {
    return await getTeachers(schoolId);
};

export const addSchoolTeacher = async (schoolId: number, data: NewTeacherData): Promise<Teacher> => {
    return await apiCall(`/school/${schoolId}/teachers`, { method: 'POST', body: JSON.stringify(data) });
};

export const getSchoolClasses = async (schoolId: number): Promise<Class[]> => {
    return await getClasses(schoolId);
};

export const updateClassRoster = async (update: ClassRosterUpdate): Promise<Class> => {
    return await apiCall(`/school/${update.schoolId}/classes/${update.classId}/roster`, { method: 'PUT', body: JSON.stringify({ studentIds: update.studentIds }) });
};

export const addClass = async (schoolId: number, data: NewClassData): Promise<Class> => {
    return await apiCall(`/school/${schoolId}/classes`, { method: 'POST', body: JSON.stringify(data) });
};

export const getSchoolParents = async (schoolId: number): Promise<Parent[]> => {
    return await apiCall(`/school/${schoolId}/parents`, { method: 'GET' });
};

export const getSchoolEvents = async (schoolId: number): Promise<SchoolEvent[]> => {
    return await apiCall(`/school/${schoolId}/events`, { method: 'GET' });
};

export const getTeacherClasses = async (teacherId: string): Promise<Class[]> => {
    return await apiCall(`/teacher/${teacherId}/classes`, { method: 'GET' });
};

export const getClassStudents = async (classId: string): Promise<Student[]> => {
    return await apiCall(`/school/class/${classId}/students`, { method: 'GET' });
};

export const getAttendance = async (classId: string, date: string): Promise<AttendanceRecord[]> => {
    return await apiCall(`/school/class/${classId}/attendance?date=${encodeURIComponent(date)}`, { method: 'GET' });
};

export const saveAttendance = async (classId: string, date: string, records: AttendanceRecord[]): Promise<{ ok: boolean }> => {
    return await apiCall(`/school/class/${classId}/attendance`, { method: 'POST', body: JSON.stringify({ date, records }) });
};

export const getGrades = async (classId: string, subject: string): Promise<StudentGrades[]> => {
    return await apiCall(`/school/class/${classId}/grades?subject=${encodeURIComponent(subject)}`, { method: 'GET' });
};

export const saveGrades = async (entries: StudentGrades[]): Promise<{ ok: boolean }> => {
    const schoolIdStr = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
    const schoolId = schoolIdStr ? Number(schoolIdStr) : undefined;
    return await apiCall(`/school/${schoolId}/grades`, { method: 'POST', body: JSON.stringify({ entries }) });
};

export const getTeacherSchedule = async (teacherId: string): Promise<ScheduleEntry[]> => {
    return await apiCall(`/teacher/${teacherId}/schedule`, { method: 'GET' });
};

export const getSchedule = async (classId: string): Promise<ScheduleEntry[]> => {
    return await apiCall(`/school/class/${classId}/schedule`, { method: 'GET' });
};

export const getParentDashboardData = async (parentId: string): Promise<any> => {
    return await apiCall(`/parent/${parentId}/dashboard`, { method: 'GET' });
};

export const getParentRequests = async (parentId: string): Promise<any[]> => {
    return await apiCall(`/parent/${parentId}/requests`, { method: 'GET' });
};

export const submitParentRequest = async (parentId: string, data: any): Promise<any> => {
    return await apiCall(`/parent/${parentId}/requests`, { method: 'POST', body: JSON.stringify(data) });
};

export const getParentTransportationDetails = async (parentId: string): Promise<any> => {
    return await apiCall(`/transportation/parent/${parentId}`, { method: 'GET' });
};

export const getParentActionItems = async (): Promise<ActionItem[]> => {
    return await apiCall('/parent/action-items', { method: 'GET' });
};

export const getTeacherActionItems = async (): Promise<ActionItem[]> => {
    return await apiCall('/teacher/action-items', { method: 'GET' });
};

export const getStudentDetails = async (schoolId: number, studentId: string): Promise<{ grades: StudentGrades[], attendance: AttendanceRecord[], invoices: Invoice[], notes: StudentNote[], documents: StudentDocument[] }> => {
    return await apiCall(`/school/${schoolId}/student/${studentId}/details`, { method: 'GET' });
};

export const getTeacherDashboardData = async (teacherId: string): Promise<any> => {
    return await apiCall(`/teacher/${teacherId}/dashboard`, { method: 'GET' });
};

export const getTeacherSalarySlips = async (teacherId: string): Promise<TeacherSalarySlip[]> => {
    try { return await apiCall(`/teacher/${teacherId}/salary-slips`, { method: 'GET' }); } catch { return []; }
};

export const getBusOperators = async (schoolId: number): Promise<BusOperator[]> => {
    return await apiCall(`/transportation/${schoolId}/operators`, { method: 'GET' });
};

export const approveBusOperator = async (operatorId: string): Promise<void> => {
    await apiCall(`/transportation/operator/${operatorId}/approve`, { method: 'PUT' });
};

export const getRoutes = async (schoolId: number): Promise<Route[]> => {
    return await apiCall(`/transportation/${schoolId}/routes`, { method: 'GET' });
};

export const addRoute = async (schoolId: number, data: any): Promise<Route> => {
    return await apiCall(`/transportation/${schoolId}/routes`, { method: 'POST', body: JSON.stringify(data) });
};

export const updateRouteStudents = async (schoolId: number, routeId: string, studentIds: string[]): Promise<Route> => {
    return await apiCall(`/transportation/${schoolId}/routes/${routeId}/students`, { method: 'PUT', body: JSON.stringify({ studentIds }) });
};

export const createConversation = async (payload: any): Promise<any> => {
    return await apiCall('/messaging/conversations', { method: 'POST', body: JSON.stringify(payload) });
};

export const getUsersByRole = async (role: 'TEACHER' | 'PARENT'): Promise<any[]> => {
    const schoolIdStr = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
    const schoolId = schoolIdStr ? Number(schoolIdStr) : undefined;
    const q = schoolId ? `?role=${role}&schoolId=${schoolId}` : `?role=${role}`;
    return await apiCall(`/users/by-role${q}`, { method: 'GET' });
};

// ==================== Missing API Functions ====================

export const getAvailableModules = async (): Promise<Module[]> => {
    return await apiCall('/modules', { method: 'GET' });
};

export const generateSelfHostedPackage = async (moduleIds: ModuleId[]): Promise<string> => {
    const response: any = await apiCall('/superadmin/self-hosted/package', {
        method: 'POST',
        body: JSON.stringify({ moduleIds }),
    });
    return response?.downloadUrl || '';
};

export const submitAdRequest = async (data: NewAdRequestData): Promise<void> => {
    await apiCall('/ads/request', { method: 'POST', body: JSON.stringify(data) });
};

export const submitBusOperatorApplication = async (data: NewBusOperatorApplication): Promise<void> => {
    await apiCall('/transportation/operator/application', { method: 'POST', body: JSON.stringify(data) });
};

export const getTeacherDetails = async (teacherId: string): Promise<Teacher> => {
    return await apiCall(`/teachers/${teacherId}/details`, { method: 'GET' });
};

export const getAllGrades = async (schoolId: number): Promise<StudentGrades[]> => {
    return await apiCall(`/school/${schoolId}/grades/all`, { method: 'GET' });
};

export const getDashboardStats = async (): Promise<any> => {
    const schoolIdStr = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
    const schoolId = schoolIdStr ? Number(schoolIdStr) : undefined;
    return await apiCall(`/dashboard/stats${schoolId ? `?schoolId=${schoolId}` : ''}`, { method: 'GET' });
};

export const addSchool = async (data: NewSchoolData): Promise<School> => {
    return await createSchool(data);
};

export const getPricingConfig = async (): Promise<PricingConfig> => {
    return await apiCall('/pricing/config', { method: 'GET' });
};

export const updatePricingConfig = async (config: PricingConfig): Promise<PricingConfig> => {
    return await apiCall('/pricing/config', { method: 'PUT', body: JSON.stringify(config) });
};

export const updateModule = async (moduleData: Module): Promise<Module> => {
    return await apiCall(`/modules/${moduleData.id}`, { method: 'PUT', body: JSON.stringify(moduleData) });
};

export const getRoles = async (): Promise<Role[]> => {
    return await apiCall('/roles', { method: 'GET' });
};

export const generateLicenseKey = async (payload: { schoolId: number; modules: ModuleId[] }): Promise<string> => {
    const response: any = await apiCall('/superadmin/license/generate', { method: 'POST', body: JSON.stringify(payload) });
    return response?.licenseKey || '';
};

export const deleteUser = async (userId: string | number): Promise<void> => {
    await apiCall(`/users/${userId}`, { method: 'DELETE' });
};

export const createSuperAdminTeamMember = async (memberData: any): Promise<User> => {
    return await apiCall('/superadmin/team', { method: 'POST', body: JSON.stringify(memberData) });
};

export const updateSuperAdminTeamMember = async (memberId: string | number, memberData: any): Promise<User> => {
    return await apiCall(`/superadmin/team/${memberId}`, { method: 'PUT', body: JSON.stringify(memberData) });
};

export const deleteSuperAdminTeamMember = async (memberId: string | number): Promise<void> => {
    await apiCall(`/superadmin/team/${memberId}`, { method: 'DELETE' });
};

export const getAssignmentsForClass = async (classId: string): Promise<Assignment[]> => {
    return await apiCall(`/school/class/${classId}/assignments`, { method: 'GET' });
};

export const getSubmissionsForAssignment = async (assignmentId: string): Promise<Submission[]> => {
    return await apiCall(`/assignments/${assignmentId}/submissions`, { method: 'GET' });
};

export const createAssignment = async (data: NewAssignmentData): Promise<Assignment> => {
    return await apiCall('/assignments', { method: 'POST', body: JSON.stringify(data) });
};

export const gradeSubmission = async (submissionId: string, grade: number, feedback?: string): Promise<Submission> => {
    return await apiCall(`/submissions/${submissionId}/grade`, { 
        method: 'PUT', 
        body: JSON.stringify({ grade, feedback }) 
    });
};

export const getStudentAndScheduleByParentId = async (parentId: string): Promise<{ student: Student; schedule: ScheduleEntry[] }> => {
    return await apiCall(`/parent/${parentId}/student-schedule`, { method: 'GET' });
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
    getSchoolStudents,
    addSchoolStudent,
    getStudent,
    createStudent,
    updateStudent,
    deleteStudent,
    getTeachers,
    getSchoolTeachers,
    addSchoolTeacher,
    getTeacher,
    createTeacher,
    updateTeacher,
    getClasses,
    getSchoolClasses,
    updateClassRoster,
    addClass,
    createClass,
    getSchoolStaff,
    addSchoolStaff,
    updateSchoolStaff,
    deleteSchoolStaff,
    getInvoices,
    getSchoolInvoices,
    addInvoice,
    recordPayment,
    getSchoolExpenses,
    addSchoolExpense,
    createInvoice,
    getSuperAdminTeamMembers,
    getSchoolsList,
    getRevenueData,
    getSubscriptions,
    getPlans,
    getAvailableModules,
    generateSelfHostedPackage,
    submitAdRequest,
    submitBusOperatorApplication,
    getSchoolSettings,
    updateSchoolSettings,
    getReports,
    getConversations,
    createConversation,
    getUsersByRole,
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
    getSchoolParents,
    getSchoolEvents,
    getTeacherClasses,
    getClassStudents,
    getAttendance,
    saveAttendance,
    getGrades,
    saveGrades,
    getTeacherSchedule,
    getSchedule,
    getParentDashboardData,
    getParentRequests,
    submitParentRequest,
    getParentTransportationDetails,
    getParentActionItems,
    getTeacherActionItems,
    getStudentDetails,
    getTeacherDashboardData,
    getTeacherSalarySlips,
    getBusOperators,
    approveBusOperator,
    getRoutes,
    addRoute,
    updateRouteStudents,
}
