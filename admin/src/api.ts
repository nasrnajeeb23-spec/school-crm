// API Configuration for Production - Real Backend Connection
// هذا الملف يتصل بالـ Backend الحقيقي على Render

import { 
    User, School, RevenueData, Plan, Subscription, SubscriptionStatus, Role, Student, Teacher, Class, DailyAttendance, StudentGrades, ScheduleEntry, Conversation, Message, Invoice, Parent, ActionItem, SchoolEvent, StudentNote, StudentDocument, RecentActivity, SchoolSettings, UserRole, NewStudentData, NewTeacherData, TeacherStatus, StudentStatus, AttendanceRecord, ConversationType, NewSchoolData, PlanName, UpdatableStudentData, PaymentData, InvoiceStatus, ClassRosterUpdate, UpdatableTeacherData, NewClassData, ParentRequest, NewParentRequestData, ActionItemType, RequestStatus, NewInvoiceData, ActivityType, LandingPageContent, NewAdRequestData, NewTrialRequestData, UpdatableUserData, SchoolRole, NewStaffData, BusOperator, Route, NewBusOperatorApplication, BusOperatorStatus, Expense, NewExpenseData,
    PricingConfig, Module, ModuleId, SchoolModuleSubscription, SelfHostedQuoteRequest, SelfHostedLicense, BankDetails, PaymentProofSubmission, TeacherSalarySlip, Assignment, NewAssignmentData, Submission, AssignmentStatus, SubmissionStatus, AttendanceStatus, FeeSetup
} from './types';

// 🔗 ضبط عنوان الـ API للإنتاج/التطوير بشكل مرن
const API_BASE_URL = (
  (typeof process !== 'undefined' && (process as any).env && (process as any).env.REACT_APP_API_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) ||
  (typeof window !== 'undefined' ? (localStorage.getItem('api_base') || '') : '') ||
  'http://localhost:5000/api'
);

const API_ALT_BASE_URL = (() => {
  const base = API_BASE_URL || '';
  const hasApi = /\/api\/?$/.test(base);
  if (hasApi) return base.replace(/\/api\/?$/, '');
  return base.replace(/\/$/, '') + '/api';
})();

export const getApiBase = (): string => API_BASE_URL;
export const getApiAltBase = (): string => API_ALT_BASE_URL;

const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const schoolId = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
    const base: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    if (schoolId) base['x-school-id'] = String(schoolId);
    return base;
};

const isQaMode = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    const search = new URLSearchParams(window.location.search);
    const q = search.get('qa');
    if (q === '1') return true;
    const ls = localStorage.getItem('qa_mode');
    return String(ls || '').toLowerCase() === 'true';
  } catch { return false; }
};

// دالة مساعدة للاتصال بالـ API
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
        const baseHeaders = { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) } as Record<string,string>;
        if (/^\/(superadmin|auth\/superadmin)\b/.test(endpoint)) { delete (baseHeaders as any)['x-school-id']; }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers: baseHeaders });

        if (!response.ok) {
            let bodyText = '';
            let bodyJson: any = null;
            try { bodyJson = await response.json(); } catch {
              try { bodyText = await response.text(); } catch {}
            }
            const msg = bodyJson?.message || bodyJson?.msg || bodyJson?.error || bodyText || '';
            const statusText = response.statusText ? ` ${response.statusText}` : '';
            if (response.status === 401) {
              try {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('current_school_id');
                  const toast = (window as any).__addToast;
                  if (typeof toast === 'function') {
                    toast('انتهت الجلسة. الرجاء تسجيل الدخول مجددًا.', 'warning');
                  }
                  setTimeout(() => { window.location.href = '/login'; }, 0);
                }
              } catch {}
              throw new Error(`HTTP ${response.status}${statusText}${msg ? `: ${msg}` : ''}`);
            }
            if (response.status === 404 || /Not\s*Found/i.test(msg)) {
              const altHeaders = { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) } as Record<string,string>;
              if (/^\/(superadmin|auth\/superadmin)\b/.test(endpoint)) { delete (altHeaders as any)['x-school-id']; }
              const alt = await fetch(`${API_ALT_BASE_URL}${endpoint}`, { ...options, headers: altHeaders });
              if (!alt.ok) {
                let altText = '';
                let altJson: any = null;
                try { altJson = await alt.json(); } catch { try { altText = await alt.text(); } catch {} }
                const altMsg = altJson?.msg || altJson?.error || altText || '';
                const altStatusText = alt.statusText ? ` ${alt.statusText}` : '';
                const err = new Error(`HTTP ${alt.status}${altStatusText}${altMsg ? `: ${altMsg}` : ''}`);
                try { if (isQaMode()) { const t = (window as any).__addToast; if (typeof t === 'function') t(String(err.message || err), 'error'); } } catch {}
                throw err;
              }
              return await alt.json();
            }
            const err = new Error(`HTTP ${response.status}${statusText}${msg ? `: ${msg}` : ''}`);
            try { if (isQaMode()) { const t = (window as any).__addToast; if (typeof t === 'function') t(String(err.message || err), 'error'); } } catch {}
            throw err;
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        try { if (isQaMode()) { const t = (window as any).__addToast; if (typeof t === 'function') t(`API Error on ${endpoint}: ${String((error as any)?.message || error)}`, 'error'); } } catch {}
        throw error;
    }
};

// مساعد لاستخراج البيانات القياسية من استجابات الاستجابة الموحدة
const unwrap = <T = any>(payload: any, key?: string, fallback: T = ([] as unknown as T)): T => {
  try {
    if (payload && typeof payload === 'object' && 'success' in payload) {
      const data = (payload as any).data;
      if (key) {
        const v = data ? data[key] : undefined;
        return (v !== undefined ? v : fallback) as T;
      }
      return (data !== undefined ? data : fallback) as T;
    }
    return (payload !== undefined ? payload : fallback) as T;
  } catch {
    return fallback;
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
    let ip: string | undefined = undefined;
    try { const s = await apiCall('/auth/superadmin/security-status', { method: 'GET' }); ip = s?.ipAddress; } catch {}
    const payload: any = { email, password, userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown', timestamp: Date.now() };
    if (ip) payload.ipAddress = ip;
    try {
      return await apiCall('/auth/superadmin/login', { method: 'POST', body: JSON.stringify(payload) });
    } catch {
      throw new Error('Login failed');
    }
};

export const verifySuperAdminMfa = async (tempToken: string, mfaCode: string): Promise<any> => {
  const payload = { tempToken, mfaCode, timestamp: Date.now() };
  return await apiCall('/auth/superadmin/verify-mfa', { method: 'POST', body: JSON.stringify(payload) });
};

// ==================== School APIs ====================

export const getSchools = async (): Promise<School[]> => {
    try {
      return await apiCall('/schools', { method: 'GET' });
    } catch {
      try {
        return await apiCall('/public/schools', { method: 'GET' });
      } catch {
        return [] as School[];
      }
    }
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
    const data = await apiCall(`/school/${schoolId}/students`, { method: 'GET' });
    return unwrap<Student[]>(data, 'students', []);
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
    const data = await apiCall(`/school/${schoolId}/teachers`, { method: 'GET' });
    return unwrap<Teacher[]>(data, 'teachers', []);
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

export const updateTeacher = async (schoolId: number, id: string | number, teacherData: UpdatableTeacherData): Promise<Teacher> => {
    return await apiCall(`/school/${schoolId}/teachers/${id}`, {
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

// ==================== Payroll APIs ====================

export const updateFeeSetup = async (schoolId: number, id: string | number, payload: Partial<FeeSetup>): Promise<FeeSetup> => {
    return await apiCall(`/school/${schoolId}/fees/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
};

export const deleteFeeSetup = async (schoolId: number, id: string | number): Promise<void> => {
    await apiCall(`/school/${schoolId}/fees/${id}`, { method: 'DELETE' });
};

export const generateInvoicesFromFees = async (schoolId: number, payload: any): Promise<{ createdCount: number; invoices: any[]; }> => {
    return await apiCall(`/school/${schoolId}/fees/invoices/generate`, { method: 'POST', body: JSON.stringify(payload) });
};

// ==================== SuperAdmin APIs ====================

export const getSuperAdminTeamMembers = async (): Promise<any[]> => {
    return await apiCall('/superadmin/team', { method: 'GET' });
};

export const getSchoolsList = async (): Promise<School[]> => {
    return await apiCall('/superadmin/schools', { method: 'GET' });
};

export const getRevenueData = async (): Promise<RevenueData[]> => {
    try {
        const raw = await apiCall('/superadmin/revenue', { method: 'GET' });
        const arr = Array.isArray(raw) ? raw : [];
        return arr.map((r: any) => ({ month: r.month, revenue: Number(r.amount ?? r.revenue ?? 0) }));
    } catch { return []; }
};

export const getSubscriptions = async (): Promise<Subscription[]> => {
    try {
        return await apiCall('/superadmin/subscriptions', { method: 'GET' });
    } catch {
        return [] as Subscription[];
    }
};

export const getPlans = async (): Promise<Plan[]> => {
    try { return await apiCall('/plans', { method: 'GET' }); } catch {
      return [
        { id: 1, name: 'الأساسية', price: 99, pricePeriod: 'شهرياً', features: ['الوظائف الأساسية'], limits: { students: 200, teachers: 15 }, recommended: false } as any,
        { id: 2, name: 'المميزة', price: 249, pricePeriod: 'شهرياً', features: ['كل ميزات الأساسية', 'إدارة مالية متقدمة'], limits: { students: 1000, teachers: 50 }, recommended: true } as any,
        { id: 3, name: 'المؤسسات', price: 899, pricePeriod: 'تواصل معنا', features: ['كل ميزات المميزة', 'تقارير مخصصة'], limits: { students: 'غير محدود', teachers: 'غير محدود' }, recommended: false } as any
      ];
    }
};

export const getDashboardStats = async (): Promise<any> => {
    return await apiCall('/superadmin/stats', { method: 'GET' });
};

export const getMetricsSummary = async (): Promise<{ memory: { rssMB: number; heapUsedMB: number }; uptimeSec: number; totals: { schools: number; activeSubscriptions: number } }> => {
    return await apiCall('/superadmin/metrics/summary', { method: 'GET' });
};

export const getKpis = async (): Promise<{ activeSubscriptions: number; mrr: number; arpu: number; churnRate: number }> => {
    return await apiCall('/superadmin/analytics/kpi', { method: 'GET' });
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

export const uploadSchoolLogo = async (schoolId: number, file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('logo', file);
    const response = await fetch(`${API_BASE_URL}/school/${schoolId}/logo`, {
        method: 'POST',
        headers: {
            ...authHeaders(),
        },
        body: fd,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data?.url as string;
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
        const data = await apiCall(`/messaging/conversations/${userId}`, { method: 'GET' });
        return unwrap<Conversation[]>(data, 'conversations', []);
    }
    const data = await apiCall(`/messaging/conversations${query}`, { method: 'GET' });
    return unwrap<Conversation[]>(data, 'conversations', []);
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
    const data = await apiCall(`/messaging/conversations/${conversationId}/messages`, { method: 'GET' });
    return unwrap<Message[]>(data, 'messages', []);
};

export const sendMessage = async (messageData: Partial<Message>): Promise<Message> => {
    return await apiCall('/messaging/send', {
        method: 'POST',
        body: JSON.stringify(messageData),
    });
};

// ==================== Landing Page APIs ====================

export const getLandingPageContent = async (): Promise<LandingPageContent> => {
    try {
        return await apiCall('/content/landing', { method: 'GET' });
    } catch {
        return {
            hero: { title: 'منصة SchoolSaaS', subtitle: 'حل شامل لإدارة المدارس' },
            features: {
                title: 'الميزات',
                items: []
            },
            testimonials: [],
            pricing: []
        } as any;
    }
};

// ==================== Assignment APIs ====================

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

export const getStudentAndScheduleByParentId = async (parentId: string, studentId?: string): Promise<{ student?: Student; schedule?: ScheduleEntry[]; children?: { student: Student; schedule: ScheduleEntry[] }[] }> => {
    const qs = studentId ? `?studentId=${encodeURIComponent(String(studentId))}` : '';
    return await apiCall(`/parent/${parentId}/student-schedule${qs}`, { method: 'GET' });
};

// ==================== School Admin: Parent Requests ====================
export const getSchoolParentRequests = async (schoolId: number): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/parent-requests`, { method: 'GET' });
};

export const getAuditLogs = async (filters?: {
    startDate?: string;
    endDate?: string;
    action?: string;
    userId?: number;
}): Promise<any[]> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.userId) params.append('userId', String(filters.userId));
    
    return await apiCall(`/superadmin/audit-logs?${params.toString()}`, { method: 'GET' });
};
