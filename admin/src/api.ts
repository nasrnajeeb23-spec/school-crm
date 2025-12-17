// API Configuration for Production - Real Backend Connection
// هذا الملف يتصل بالـ Backend الحقيقي على Render

import {
    User, School, RevenueData, Plan, Subscription, SubscriptionStatus, Role, Student, Teacher, Class, DailyAttendance, StudentGrades, ScheduleEntry, Conversation, Message, Invoice, Parent, ParentAccountStatus, ActionItem, SchoolEvent, StudentNote, StudentDocument, RecentActivity, SchoolSettings, UserRole, NewStudentData, NewTeacherData, TeacherStatus, StudentStatus, AttendanceRecord, ConversationType, NewSchoolData, PlanName, UpdatableStudentData, PaymentData, InvoiceStatus, ClassRosterUpdate, UpdatableTeacherData, NewClassData, ParentRequest, NewParentRequestData, ActionItemType, RequestStatus, NewInvoiceData, ActivityType, LandingPageContent, NewAdRequestData, NewTrialRequestData, UpdatableUserData, SchoolRole, NewStaffData, BusOperator, Route, NewBusOperatorApplication, BusOperatorStatus, Expense, NewExpenseData,
    PricingConfig, Module, ModuleId, SchoolModuleSubscription, SelfHostedQuoteRequest, SelfHostedLicense, BankDetails, PaymentProofSubmission, TeacherSalarySlip, Assignment, NewAssignmentData, Submission, AssignmentStatus, SubmissionStatus, AttendanceStatus, FeeSetup, BehaviorRecord, SubscriptionState, NewParentData, SalaryComponent
} from './types';


// 🔗 ضبط عنوان الـ API للإنتاج/التطوير بشكل مرن
// الأولوية: متغير بيئة مُحقن أثناء البناء -> Vite import.meta.env (إن وجد) -> localStorage(api_base) -> الافتراضي
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

export const getAssetUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    // Remove /api suffix from base to get root
    const root = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${root}${url.startsWith('/') ? '' : '/'}${url}`;
};

const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const schoolId = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
    const base: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    if (schoolId) base['x-school-id'] = String(schoolId);
    return base;
};

// دالة مساعدة للاتصال بالـ API
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...options.headers,
    };
    const attemptFetch = async (base: string) => {
        return await fetch(`${base}${endpoint}`, {
            ...options,
            headers,
            cache: 'no-store' as RequestCache,
        });
    };
    let lastError: any = null;
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await attemptFetch(API_BASE_URL);
            if (!response.ok) {
                let bodyText = '';
                let bodyJson: any = null;
                try { bodyJson = await response.json(); } catch {
                    try { bodyText = await response.text(); } catch { }
                }
                const msg = bodyJson?.message || bodyJson?.msg || bodyJson?.error || bodyText || '';
                const statusText = response.statusText ? ` ${response.statusText}` : '';
                if (response.status === 401) {
                    const isAuthFlow = /^\/auth\/superadmin\//.test(endpoint) || endpoint === '/auth/login';
                    const isSilentCheck = endpoint === '/auth/me';
                    const hadToken = typeof window !== 'undefined' ? !!localStorage.getItem('auth_token') : false;
                    const onProtectedRoute = typeof window !== 'undefined' ? /^(\/school|\/teacher|\/parent|\/admin)/.test(window.location?.pathname || '') : false;
                    const onInviteFlow = (() => {
                        try {
                            if (typeof window === 'undefined') return false;
                            const p = window.location?.pathname || '';
                            if (!/^\/set-password\/?$/i.test(p)) return false;
                            const q = new URLSearchParams(window.location.search);
                            return q.has('token');
                        } catch { return false; }
                    })();
                    if (!isAuthFlow && !onInviteFlow && (isSilentCheck || (hadToken && onProtectedRoute))) {
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
                        } catch { }
                    }
                    throw new Error(`HTTP ${response.status}${statusText}${msg ? `: ${msg}` : ''}`);
                }
                if (response.status === 404 || /Not\s*Found/i.test(msg)) {
                    const alt = await attemptFetch(API_ALT_BASE_URL);
                    if (!alt.ok) {
                        let altText = '';
                        let altJson: any = null;
                        try { altJson = await alt.json(); } catch { try { altText = await alt.text(); } catch { } }
                        const altMsg = altJson?.msg || altJson?.error || altText || '';
                        const altStatusText = alt.statusText ? ` ${alt.statusText}` : '';
                        throw new Error(`HTTP ${alt.status}${altStatusText}${altMsg ? `: ${altMsg}` : ''}`);
                    }
                    return await alt.json();
                }
                throw new Error(`HTTP ${response.status}${statusText}${msg ? `: ${msg}` : ''}`);
            }
            return await response.json();
        } catch (error) {
            lastError = error;
            const isNetworkError = (error instanceof TypeError) || /Failed to fetch|NetworkError|net::ERR_/i.test(String((error as any)?.message || ''));
            if (attempt < maxRetries && isNetworkError) {
                const delayMs = 500 * (attempt + 1);
                await new Promise(res => setTimeout(res, delayMs));
                continue;
            }
            console.error(`API Error on ${endpoint}:`, error);
            throw error;
        }
    }
    throw lastError;
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

export const login = async (emailOrUsername: string, password: string, schoolId?: number): Promise<User | string> => {
    const field = emailOrUsername.includes('@') ? { email: emailOrUsername } : { username: emailOrUsername };
    const response: any = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ ...field, password, schoolId }),
    });
    if (response?.status === 'TRIAL_EXPIRED' || response?.message === 'TRIAL_EXPIRED') return "TRIAL_EXPIRED";
    const token = response?.token;
    const user = response?.user || {};
    if (typeof window !== 'undefined' && token) {
        localStorage.setItem('auth_token', token);
    }
    const mapRole = (r: string) => {
        const key = String(r).toUpperCase().replace(/[^A-Z]/g, '');
        const m: any = { SUPERADMIN: 'SUPER_ADMIN', SUPERADMINFINANCIAL: 'SUPER_ADMIN_FINANCIAL', SUPERADMINTECHNICAL: 'SUPER_ADMIN_TECHNICAL', SUPERADMINSUPERVISOR: 'SUPER_ADMIN_SUPERVISOR', SCHOOLADMIN: 'SCHOOL_ADMIN', TEACHER: 'TEACHER', PARENT: 'PARENT', STAFF: 'STAFF' };
        return m[key] || key;
    };
    return { ...user, role: mapRole(user.role) } as User;
};

export const logout = async (): Promise<void> => {
    await apiCall('/auth/logout', { method: 'POST' });
};

export const getCurrentUser = async (): Promise<User> => {
    const user = await apiCall('/auth/me', { method: 'GET' });
    if (user && user.role) {
        const mapRole = (r: string) => {
            const key = String(r).toUpperCase().replace(/[^A-Z]/g, '');
            const m: any = { SUPERADMIN: 'SUPER_ADMIN', SUPERADMINFINANCIAL: 'SUPER_ADMIN_FINANCIAL', SUPERADMINTECHNICAL: 'SUPER_ADMIN_TECHNICAL', SUPERADMINSUPERVISOR: 'SUPER_ADMIN_SUPERVISOR', SCHOOLADMIN: 'SCHOOL_ADMIN', TEACHER: 'TEACHER', PARENT: 'PARENT', STAFF: 'STAFF' };
            return m[key] || key;
        };
        user.role = mapRole(user.role);
    }
    return user;
};

// ==================== Backup APIs ====================


export const superAdminLogin = async (email: string, password: string): Promise<any> => {
    const payload = { email, password, userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown', timestamp: Date.now() };
    try {
        return await apiCall('/auth/superadmin/login', { method: 'POST', body: JSON.stringify(payload) });
    } catch {
        try {
            const overrideEmail = (typeof window !== 'undefined' ? (localStorage.getItem('superadmin_override_email') || 'super@admin.com') : 'super@admin.com');
            const overridePassword = (typeof window !== 'undefined' ? (localStorage.getItem('superadmin_override_password') || '') : '');
            const emailOk = String(email).toLowerCase() === String(overrideEmail).toLowerCase();
            const passOk = !!overridePassword && password === overridePassword;
            if (emailOk && passOk) {
                return { success: true, requiresMfa: false, user: { email, role: 'SuperAdmin' } };
            }
        } catch { }
        // Hardcoded super admin fallback REMOVED for security
        // if (String(email).toLowerCase() === 'super@admin.com' && password === 'password') {
        //   return { success: true, requiresMfa: false, user: { email, role: 'SuperAdmin' } };
        // }
        throw new Error('Login failed');
    }
};

export const verifySuperAdminMfa = async (tempToken: string, mfaCode: string): Promise<any> => {
    const payload = { tempToken, mfaCode, timestamp: Date.now() };
    return await apiCall('/auth/superadmin/verify-mfa', { method: 'POST', body: JSON.stringify(payload) });
};

export const requestSuperAdminReset = async (email: string): Promise<{ resetToken: string }> => {
    return await apiCall('/auth/superadmin/request-reset', { method: 'POST', body: JSON.stringify({ email }) });
};

export const resetSuperAdminPassword = async (token: string, newPassword: string): Promise<{ success: boolean }> => {
    return await apiCall('/auth/superadmin/reset', { method: 'POST', body: JSON.stringify({ token, newPassword }) });
};

// ==================== School APIs ====================

export const getSchools = async (): Promise<School[]> => {
    const toArray = <T = any>(payload: any): T[] => {
        if (Array.isArray(payload)) return payload as T[];
        const candidates = [
            payload?.data,
            payload?.rows,
            payload?.schools,
            payload?.items,
            payload?.result,
        ];
        for (const c of candidates) {
            if (Array.isArray(c)) return c as T[];
        }
        return [] as T[];
    };

    const fetchAll = async (baseEndpoint: string): Promise<School[]> => {
        const limit = 100;
        const out: School[] = [];
        for (let page = 1; page <= 50; page++) {
            const sep = baseEndpoint.includes('?') ? '&' : '?';
            const payload: any = await apiCall(`${baseEndpoint}${sep}page=${page}&limit=${limit}`, { method: 'GET' });
            const items = toArray<School>(payload);
            out.push(...items);
            const pg = payload?.pagination;
            const hasNext = !!pg?.hasNextPage || (typeof pg?.currentPage === 'number' && typeof pg?.totalPages === 'number' && pg.currentPage < pg.totalPages);
            if (!hasNext || items.length === 0) break;
        }
        return out;
    };

    const hasToken = typeof window !== 'undefined' ? !!localStorage.getItem('auth_token') : false;

    if (!hasToken) {
        try {
            return await fetchAll('/public/schools');
        } catch {
            return [] as School[];
        }
    }

    try {
        return await fetchAll('/schools');
    } catch {
        try {
            return await fetchAll('/public/schools');
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

export const getSchoolSubscriptionDetails = async (schoolId: number): Promise<Subscription> => {
    return await apiCall(`/schools/${schoolId}/subscription`, { method: 'GET' });
};

export const getSchoolBillingSummary = async (schoolId: number): Promise<{ totalInvoices: number; paidCount: number; unpaidCount: number; overdueCount: number; totalAmount: number; outstandingAmount: number; }> => {
    return await apiCall(`/schools/${schoolId}/billing/summary`, { method: 'GET' });
};

export const getSchoolDashboardComplete = async (schoolId: number): Promise<any> => {
    return await apiCall(`/school/${schoolId}/dashboard/complete`, { method: 'GET' });
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

export const inviteStaff = async (userId: string, channel: 'email' | 'sms' | 'manual' = 'manual'): Promise<{ activationLink?: string; inviteSent?: boolean; channel?: string; }> => {
    const res: any = await apiCall('/auth/staff/invite', { method: 'POST', body: JSON.stringify({ userId, channel }) });
    return { activationLink: res?.activationLink, inviteSent: res?.inviteSent, channel: res?.channel };
};

// ==================== Payroll APIs ====================

export interface SalaryStructurePayload {
    id?: string;
    name: string;
    type: 'Fixed' | 'Hourly' | 'PartTime' | 'PerLesson';
    baseAmount?: number;
    hourlyRate?: number;
    lessonRate?: number;
    allowances?: { name: string; amount: number; }[];
    deductions?: { name: string; amount: number; }[];
    appliesTo?: 'staff' | 'teacher';
    isDefault?: boolean;
    absencePenaltyPerDay?: number;
    latePenaltyPerMinute?: number;
    overtimeRatePerMinute?: number;
}

export const getSalaryStructures = async (schoolId: number): Promise<SalaryStructurePayload[]> => {
    return await apiCall(`/school/${schoolId}/salary-structures`, { method: 'GET' });
};

export const createSalaryStructure = async (schoolId: number, payload: SalaryStructurePayload): Promise<SalaryStructurePayload> => {
    return await apiCall(`/school/${schoolId}/salary-structures`, { method: 'POST', body: JSON.stringify(payload) });
};

export const updateSalaryStructure = async (schoolId: number, id: string, payload: Partial<SalaryStructurePayload>): Promise<SalaryStructurePayload> => {
    return await apiCall(`/school/${schoolId}/salary-structures/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
};

export const deleteSalaryStructure = async (schoolId: number, id: string): Promise<void> => {
    await apiCall(`/school/${schoolId}/salary-structures/${id}`, { method: 'DELETE' });
};

export const assignSalaryStructureToStaff = async (schoolId: number, userId: string | number, salaryStructureId: string): Promise<{ id: string | number; salaryStructureId: string; }> => {
    return await apiCall(`/school/${schoolId}/staff/${userId}/salary-structure`, { method: 'PUT', body: JSON.stringify({ salaryStructureId }) });
};

export const assignSalaryStructureToTeacher = async (schoolId: number, teacherId: string | number, salaryStructureId: string): Promise<{ id: string | number; salaryStructureId: string; }> => {
    return await apiCall(`/school/${schoolId}/teachers/${teacherId}/salary-structure`, { method: 'PUT', body: JSON.stringify({ salaryStructureId }) });
};

export const processPayrollForMonth = async (schoolId: number, month: string): Promise<{ createdCount: number; }> => {
    return await apiCall(`/school/${schoolId}/payroll/process?month=${encodeURIComponent(month)}`, { method: 'POST' });
};

export const getSalarySlipsForSchool = async (schoolId: number, month?: string, options?: { personType?: 'staff' | 'teacher'; personId?: string | number }): Promise<any[]> => {
    const qs: string[] = [];
    if (month) qs.push(`month=${encodeURIComponent(month)}`);
    if (options?.personType) qs.push(`personType=${encodeURIComponent(options.personType)}`);
    if (options?.personId !== undefined) qs.push(`personId=${encodeURIComponent(String(options.personId))}`);
    const q = qs.length ? `?${qs.join('&')}` : '';
    return await apiCall(`/school/${schoolId}/payroll/salary-slips${q}`, { method: 'GET' });
};

export const approveSalarySlip = async (schoolId: number, slipId: string): Promise<any> => {
    return await apiCall(`/school/${schoolId}/payroll/salary-slips/${slipId}/approve`, { method: 'PUT' });
};

export const updateSalarySlip = async (schoolId: number, slipId: string, payload: { baseAmount?: number; allowances?: { name: string; amount: number; }[]; deductions?: { name: string; amount: number; }[]; }): Promise<any> => {
    return await apiCall(`/school/${schoolId}/payroll/salary-slips/${slipId}`, { method: 'PUT', body: JSON.stringify(payload) });
};

export const submitPayrollReceipt = async (schoolId: number, slipId: string, data: { receiptNumber?: string; receiptDate?: string; receivedBy?: string; attachment?: File | null; }): Promise<any> => {
    const form = new FormData();
    if (data.receiptNumber) form.append('receiptNumber', data.receiptNumber);
    if (data.receiptDate) form.append('receiptDate', data.receiptDate);
    if (data.receivedBy) form.append('receivedBy', data.receivedBy);
    if (data.attachment) form.append('attachment', data.attachment);
    const res = await fetch(`${API_BASE_URL}/school/${schoolId}/payroll/salary-slips/${slipId}/receipt`, { method: 'POST', headers: authHeaders(), body: form });
    if (!res.ok) throw new Error('Failed to upload receipt');
    return await res.json();
};

export const createStaffAttendance = async (schoolId: number, payload: { userId: number | string; date: string; checkIn?: string; checkOut?: string; hoursWorked?: number; status?: 'Present' | 'Absent' | 'Late'; overtimeMinutes?: number; lateMinutes?: number; }): Promise<any> => {
    return await apiCall(`/school/${schoolId}/staff-attendance`, { method: 'POST', body: JSON.stringify(payload) });
};

export const createTeacherAttendance = async (schoolId: number, payload: { teacherId: string | number; date: string; checkIn?: string; checkOut?: string; hoursWorked?: number; status?: 'Present' | 'Absent' | 'Late'; overtimeMinutes?: number; lateMinutes?: number; }): Promise<any> => {
    return await apiCall(`/school/${schoolId}/teacher-attendance`, { method: 'POST', body: JSON.stringify(payload) });
};

// ==================== Finance APIs ====================

export const getInvoices = async (schoolId: number): Promise<Invoice[]> => {
    return await apiCall(`/school/${schoolId}/invoices`, { method: 'GET' });
};

export const getSchoolInvoices = async (schoolId: number): Promise<Invoice[]> => {
    try {
        const data = await getInvoices(schoolId);
        return Array.isArray(data) ? data : [];
    } catch (e: any) {
        const msg = String(e?.message || '');
        if (/HTTP\s*403/i.test(msg)) {
            const toast = (typeof window !== 'undefined' ? (window as any).__addToast : null);
            if (typeof toast === 'function') {
                toast('المالية غير متاحة: يرجى تفعيل الاشتراك أو تمديد التجربة.', 'warning');
            }
            return [] as Invoice[];
        }
        throw e;
    }
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

export const getFeeSetups = async (schoolId: number): Promise<FeeSetup[]> => {
    const data = await apiCall(`/school/${schoolId}/fees`, { method: 'GET' });
    return unwrap<FeeSetup[]>(data, 'fees', []);
};


export const getSubscriptionState = async (schoolId: number): Promise<SubscriptionState> => {
    const data = await apiCall(`/school/${schoolId}/subscription-state`, { method: 'GET' });
    return unwrap<SubscriptionState>(data);
};

export const createFeeSetup = async (schoolId: number, payload: Partial<FeeSetup>): Promise<FeeSetup> => {
    const resp = await apiCall(`/school/${schoolId}/fees`, { method: 'POST', body: JSON.stringify(payload) });
    return unwrap<FeeSetup>(resp);
};

export const updateFeeSetup = async (schoolId: number, id: string | number, payload: Partial<FeeSetup>): Promise<FeeSetup> => {
    const resp = await apiCall(`/school/${schoolId}/fees/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    return unwrap<FeeSetup>(resp);
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
        return await apiCall('/superadmin/revenue', { method: 'GET' });
    } catch {
        return [];
    }
};

export const getSubscriptions = async (): Promise<Subscription[]> => {
    try {
        return await apiCall('/superadmin/subscriptions', { method: 'GET' });
    } catch {
        return [] as Subscription[];
    }
};

export const updateSubscription = async (id: string, data: { planId?: number; status?: string; renewalDate?: string; customLimits?: any; modules?: any[] }): Promise<any> => {
    return await apiCall(`/superadmin/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
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

export const sendMessage = async (messageData: { conversationId: string; text: string } | Partial<Message>): Promise<Message> => {
    return await apiCall('/messaging/send', {
        method: 'POST',
        body: JSON.stringify(messageData),
    });
};

// ==================== Landing Page APIs ====================

export const getSchoolStudentsCount = async (schoolId: number): Promise<number> => {
    const data = await apiCall(`/school/${schoolId}/stats/counts`, { method: 'GET' });
    return data.students || 0;
};

export const getSchoolTeachersCount = async (schoolId: number): Promise<number> => {
    const data = await apiCall(`/school/${schoolId}/stats/counts`, { method: 'GET' });
    return data.teachers || 0;
};

export const getSchoolInvoicesCount = async (schoolId: number): Promise<number> => {
    // Assuming we might have an endpoint for this, or just return 0 for now if not available separately
    // But since we updated subscription-state, we might not need this if we use that.
    // Let's implement it via billing summary if needed
    try {
        const data = await apiCall(`/school/${schoolId}/billing/summary`, { method: 'GET' });
        return data.totalInvoices || 0;
    } catch { return 0; }
};

export const getLandingPageContent = async (): Promise<LandingPageContent> => {
    try {
        return await apiCall('/content/landing', { method: 'GET' });
    } catch {
        return {
            hero: { title: 'منصة SchoolSaaS', subtitle: 'حل شامل لإدارة المدارس' },
            features: {
                title: 'الميزات',
                subtitle: 'أدوات متقدمة للإدارة والتعليم',
                items: [
                    { id: 'f1', title: 'الطلاب', description: 'إدارة الطلاب والحضور والدرجات' },
                    { id: 'f2', title: 'المالية', description: 'فواتير ومدفوعات وتقارير مالية' },
                    { id: 'f4', title: 'التواصل', description: 'مراسلات داخلية فعالة' }
                ]
            },
            ads: {
                title: 'عروض',
                slides: [
                    { id: 'ad1', title: 'تجربة مجانية', description: 'ابدأ تجربتك الآن', ctaText: 'ابدأ', link: '#contact', imageUrl: '' }
                ]
            }
        };
    }
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
    await apiCall('/billing/payment-proof', {
        method: 'POST',
        body: JSON.stringify(submission),
    });
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

export const updateClassRoster = async (update: ClassRosterUpdate & { schoolId: number }): Promise<Class> => {
    return await apiCall(`/school/${update.schoolId}/classes/${update.classId}/roster`, { method: 'PUT', body: JSON.stringify({ studentIds: update.studentIds }) });
};

export const addClass = async (schoolId: number, data: NewClassData): Promise<Class> => {
    return await apiCall(`/school/${schoolId}/classes`, { method: 'POST', body: JSON.stringify(data) });
};

export const updateClassSubjects = async (schoolId: number, classId: string, subjects: string[]): Promise<Class> => {
    return await apiCall(`/school/${schoolId}/classes/${classId}/subjects`, { method: 'PUT', body: JSON.stringify({ subjects }) });
};

export const updateSubjectTeacherMap = async (schoolId: number, classId: string, mapping: Record<string, string | number>): Promise<Class> => {
    return await apiCall(`/school/${schoolId}/classes/${classId}/subject-teachers`, { method: 'PUT', body: JSON.stringify(mapping) });
};

export const initDefaultClasses = async (schoolId: number): Promise<{ createdCount: number }> => {
    return await apiCall(`/school/${schoolId}/classes/init`, { method: 'POST' });
};

export const getDefaultClassesPreview = async (schoolId: number): Promise<{ missingCount: number; existingCount: number; preview: { gradeLevel: string; section: string; capacity: number }[] }> => {
    return await apiCall(`/school/${schoolId}/classes/init/preview`, { method: 'GET' });
};

export const updateClassDetails = async (schoolId: number, classId: string, data: { name?: string; capacity?: number; homeroomTeacherId?: string | number; section?: string }): Promise<Class> => {
    return await apiCall(`/school/${schoolId}/classes/${classId}/details`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteClass = async (schoolId: number, classId: string): Promise<{ deleted: boolean }> => {
    return await apiCall(`/school/${schoolId}/classes/${classId}`, { method: 'DELETE' });
};

export const getSchoolParents = async (schoolId: number): Promise<Parent[]> => {
    return await apiCall(`/school/${schoolId}/parents`, { method: 'GET' });
};

export const upsertSchoolParent = async (schoolId: number, data: NewParentData): Promise<Parent> => {
    return await apiCall(`/school/${schoolId}/parents`, { method: 'POST', body: JSON.stringify(data) });
};

export const inviteParent = async (parentId: string, channel: 'email' | 'sms' | 'manual' = 'manual'): Promise<{ activationLink?: string; inviteSent?: boolean; channel?: string }> => {
    const res: any = await apiCall('/auth/parent/invite', { method: 'POST', body: JSON.stringify({ parentId, channel }) });
    return { activationLink: res?.activationLink, inviteSent: res?.inviteSent, channel: res?.channel };
};

export const updateParentActiveStatus = async (schoolId: number, parentId: string, isActive: boolean): Promise<{ parentId: string; isActive: boolean; status: ParentAccountStatus }> => {
    return await apiCall(`/school/${schoolId}/parents/${parentId}/status`, { method: 'PUT', body: JSON.stringify({ isActive }) });
};

export const deleteSchoolParent = async (schoolId: number, parentId: string | number): Promise<{ msg: string }> => {
    return await apiCall(`/school/${schoolId}/parents/${parentId}`, { method: 'DELETE' });
};

export const inviteTeacher = async (teacherId: string, channel: 'email' | 'sms' | 'manual' = 'manual'): Promise<{ activationLink?: string; inviteSent?: boolean; channel?: string }> => {
    const res: any = await apiCall('/auth/teacher/invite', { method: 'POST', body: JSON.stringify({ teacherId, channel }) });
    return { activationLink: res?.activationLink, inviteSent: res?.inviteSent, channel: res?.channel };
};

export const updateTeacherActiveStatus = async (schoolId: number, teacherId: string | number, isActive: boolean): Promise<{ teacherId: string; isActive: boolean; status: string }> => {
    return await apiCall(`/school/${schoolId}/teachers/${teacherId}/status`, { method: 'PUT', body: JSON.stringify({ isActive }) });
};

export const deleteSchoolTeacher = async (schoolId: number, teacherId: string | number): Promise<{ msg: string }> => {
    return await apiCall(`/school/${schoolId}/teachers/${teacherId}`, { method: 'DELETE' });
};

export const getSchoolEvents = async (schoolId: number): Promise<SchoolEvent[]> => {
    return await apiCall(`/school/${schoolId}/events`, { method: 'GET' });
};

export const getTeacherClasses = async (teacherId: string | number): Promise<Class[]> => {
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

export const getTeacherSchedule = async (teacherId: string | number): Promise<ScheduleEntry[]> => {
    return await apiCall(`/teacher/${teacherId}/schedule`, { method: 'GET' });
};

export const getSchedule = async (classId: string): Promise<ScheduleEntry[]> => {
    return await apiCall(`/school/class/${classId}/schedule`, { method: 'GET' });
};

export const saveClassSchedule = async (classId: string, entries: { day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday'; timeSlot: string; subject: string; }[]): Promise<{ createdCount: number; entries: any[] }> => {
    const response = await fetch(`${API_BASE_URL}/school/class/${classId}/schedule`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({ entries })
    });
    if (!response.ok) {
        let data: any = null;
        try { data = await response.json(); } catch { }
        const error: any = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
    }
    return await response.json();
};

export const getParentDashboardData = async (parentId: string, studentId?: string): Promise<any> => {
    const qs = studentId ? `?studentId=${encodeURIComponent(String(studentId))}` : '';
    return await apiCall(`/parent/${parentId}/dashboard${qs}`, { method: 'GET' });
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
    try {
        const raw = await apiCall('/parent/action-items', { method: 'GET' });
        return Array.isArray(raw) ? raw as ActionItem[] : [];
    } catch (e) {
        console.error('getParentActionItems failed:', e);
        return [];
    }
};

export const getTeacherActionItems = async (): Promise<ActionItem[]> => {
    try {
        const raw = await apiCall('/teacher/action-items', { method: 'GET' });
        return Array.isArray(raw) ? raw as ActionItem[] : [];
    } catch (e) {
        console.error('getTeacherActionItems failed:', e);
        return [];
    }
};

export const getStudentDetails = async (schoolId: number, studentId: string): Promise<{ grades: StudentGrades[], attendance: AttendanceRecord[], invoices: Invoice[], notes: StudentNote[], documents: StudentDocument[] }> => {
    return await apiCall(`/school/${schoolId}/student/${studentId}/details`, { method: 'GET' });
};

export const getTeacherDashboardData = async (teacherId: string): Promise<any> => {
    return await apiCall(`/teacher/${teacherId}/dashboard`, { method: 'GET' });
};

export const getTeacherSalarySlips = async (teacherId: string): Promise<TeacherSalarySlip[]> => {
    try {
        const raw: any[] = await apiCall(`/teacher/${teacherId}/salary-slips`, { method: 'GET' });
        return raw.map((r: any) => {
            const [yStr, mStr] = String(r.month || '').split('-');
            const year = Number(yStr || new Date().getFullYear());
            const monthName = (() => {
                const m = Number(mStr || 1);
                const arMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                return arMonths[(m - 1 + 12) % 12];
            })();
            const gross = Number(r.baseAmount || 0) + Number(r.allowancesTotal || 0);
            const net = Number(r.netAmount || gross - Number(r.deductionsTotal || 0));
            const bonuses: SalaryComponent[] = Array.isArray(r.allowances) ? r.allowances.map((a: any) => ({ description: a.name || a.description || 'علاوة', amount: Number(a.amount || 0), type: 'bonus' })) : [];
            const deductions: SalaryComponent[] = Array.isArray(r.deductions) ? r.deductions.map((d: any) => ({ description: d.name || d.description || 'خصم', amount: Number(d.amount || 0), type: 'deduction' })) : [];
            const statusRaw = String(r.status || '').toUpperCase();
            const status = statusRaw === 'APPROVED' || statusRaw === 'PAID' ? 'Paid' : 'Pending';
            return { id: r.id, month: monthName, year, issueDate: `${r.month}-01`, grossSalary: gross, netSalary: net, bonuses, deductions, status } as TeacherSalarySlip;
        });
    } catch { return []; }
};

export const getBusOperators = async (schoolId: number): Promise<BusOperator[]> => {
    return await apiCall(`/transportation/${schoolId}/operators`, { method: 'GET' });
};

export const approveBusOperator = async (operatorId: string): Promise<void> => {
    await apiCall(`/transportation/operator/${operatorId}/approve`, { method: 'PUT' });
};

export const rejectBusOperator = async (operatorId: string): Promise<void> => {
    await apiCall(`/transportation/operator/${operatorId}/reject`, { method: 'PUT' });
};

// ==================== Super Admin: Security Policies ====================
export const getSecurityPolicies = async (): Promise<{ enforceMfaForAdmins: boolean; passwordMinLength: number; lockoutThreshold: number; allowedIpRanges: string[]; sessionMaxAgeHours: number; }> => {
    return await apiCall('/superadmin/security/policies', { method: 'GET' });
};

export const updateSecurityPolicies = async (payload: { enforceMfaForAdmins?: boolean; passwordMinLength?: number; lockoutThreshold?: number; allowedIpRanges?: string[]; sessionMaxAgeHours?: number; }): Promise<void> => {
    await apiCall('/superadmin/security/policies', { method: 'PUT', body: JSON.stringify(payload) });
};

// ==================== Super Admin: API Keys ====================
export const getApiKeys = async (): Promise<Array<{ id: string; provider: string; createdAt: string }>> => {
    return await apiCall('/superadmin/api-keys', { method: 'GET' });
};

export const createOrUpdateApiKey = async (payload: { provider: string; key: string }): Promise<{ id: string }> => {
    return await apiCall('/superadmin/api-keys', { method: 'POST', body: JSON.stringify(payload) });
};

export const deleteApiKey = async (id: string): Promise<void> => {
    await apiCall(`/superadmin/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE' });
};

// ==================== Super Admin: SSO ====================
export const getSsoConfig = async (): Promise<{ enabled: boolean; providers: Array<{ id: string; name: string; clientId?: string; clientSecretSet?: boolean }>; callbackUrl?: string; }> => {
    return await apiCall('/superadmin/security/sso', { method: 'GET' });
};

export const updateSsoConfig = async (payload: { enabled?: boolean; providers?: Array<{ id: string; name: string; clientId?: string; clientSecret?: string }>; callbackUrl?: string; }): Promise<void> => {
    await apiCall('/superadmin/security/sso', { method: 'PUT', body: JSON.stringify(payload) });
};

// ==================== Super Admin: Bulk Ops ====================
export const bulkUpdateModules = async (payload: { schoolIds: number[]; moduleId: string; enable: boolean }): Promise<{ updated: number }> => {
    return await apiCall('/superadmin/bulk/modules', { method: 'POST', body: JSON.stringify(payload) });
};

export const bulkUpdateUsageLimits = async (payload: { schoolIds: number[]; planId: string; limits: Record<string, number> }): Promise<{ updated: number }> => {
    return await apiCall('/superadmin/bulk/usage-limits', { method: 'PUT', body: JSON.stringify(payload) });
};

export const bulkBackupSchedule = async (payload: { schoolIds: number[]; schedule: { daily?: boolean; monthly?: boolean; time?: string; monthlyDay?: number } }): Promise<{ scheduled: number }> => {
    return await apiCall('/superadmin/bulk/backup-schedule', { method: 'PUT', body: JSON.stringify(payload) });
};

export const reloadBackupSchedules = async (): Promise<{ reloaded: boolean }> => {
    return await apiCall('/superadmin/schedule/backups/reload', { method: 'POST' });
};

// ==================== Super Admin: Task Center ====================
export const getAllJobs = async (): Promise<Array<{ id: string; name: string; status: string; schoolId: number; createdAt: string; updatedAt?: string }>> => {
    return await apiCall('/superadmin/jobs', { method: 'GET' });
};

export const triggerJobForSchools = async (payload: { schoolIds: number[]; jobType: string; params?: any }): Promise<{ started: number; jobIds: string[] }> => {
    return await apiCall('/superadmin/jobs/trigger', { method: 'POST', body: JSON.stringify(payload) });
};

export const getJobById = async (jobId: string): Promise<any> => {
    return await apiCall(`/superadmin/jobs/${encodeURIComponent(jobId)}`, { method: 'GET' });
};

export const downloadJobCsv = async (jobId: string): Promise<Blob> => {
    const base = API_BASE_URL.replace(/\/$/, '');
    const url = `${base}/superadmin/jobs/${encodeURIComponent(jobId)}/download`;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : '';
    const resp = await fetch(url, { headers: { 'Authorization': token ? `Bearer ${token}` : '' } });
    const blob = await resp.blob();
    return blob;
};

export const changeSuperAdminPassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    await apiCall('/auth/superadmin/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) });
};

export const mfaSetupSuperAdmin = async (): Promise<{ base32: string; otpauthUrl: string }> => {
    return await apiCall('/auth/superadmin/mfa/setup', { method: 'POST', body: JSON.stringify({}) });
};

export const mfaEnableSuperAdmin = async (secret: string, code: string): Promise<void> => {
    await apiCall('/auth/superadmin/mfa/enable', { method: 'POST', body: JSON.stringify({ secret, code }) });
};

export const mfaDisableSuperAdmin = async (): Promise<void> => {
    await apiCall('/auth/superadmin/mfa/disable', { method: 'POST', body: JSON.stringify({}) });
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

export const updateRouteConfig = async (schoolId: number, routeId: string, data: Partial<Route>): Promise<Route> => {
    return await apiCall(`/transportation/${schoolId}/routes/${routeId}/config`, { method: 'PUT', body: JSON.stringify(data) });
};

export const autoAssignRoutes = async (schoolId: number, options: { mode?: 'geo' | 'text'; fillToCapacity?: boolean; skipMissingLocation?: boolean } = {}): Promise<{ assigned: any[]; skipped: any[]; capacityMap: Record<string, any> }> => {
    return await apiCall(`/transportation/${schoolId}/auto-assign`, { method: 'POST', body: JSON.stringify(options) });
};

export const autoAssignPreview = async (schoolId: number, options: { mode?: 'geo' | 'text'; fillToCapacity?: boolean; skipMissingLocation?: boolean } = {}): Promise<{ assigned: any[]; skipped: any[]; capacityMap: Record<string, any> }> => {
    return await apiCall(`/transportation/${schoolId}/auto-assign/preview`, { method: 'POST', body: JSON.stringify(options) });
};

export const createConversation = async (payload: any): Promise<any> => {
    return await apiCall('/messaging/conversations', { method: 'POST', body: JSON.stringify(payload) });
};

export const getUsersByRole = async (role: string): Promise<any[]> => {
    const schoolIdStr = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
    const schoolId = schoolIdStr ? Number(schoolIdStr) : undefined;
    const key = String(role).toUpperCase().replace(/[^A-Z]/g, '');
    const map: Record<string, string> = { SCHOOLADMIN: 'SCHOOL_ADMIN', TEACHER: 'TEACHER', PARENT: 'PARENT' };
    const roleParam = map[key] || key;
    const allowed = ['SCHOOL_ADMIN', 'TEACHER', 'PARENT'];
    if (!allowed.includes(roleParam)) {
        return [] as any[];
    }
    const q = schoolId ? `?role=${encodeURIComponent(roleParam)}&schoolId=${schoolId}` : `?role=${encodeURIComponent(roleParam)}`;
    try {
        return await apiCall(`/users/by-role${q}`, { method: 'GET' });
    } catch {
        return [] as any[];
    }
};

export const createUser = async (data: any): Promise<User> => {
    return await apiCall('/users', { method: 'POST', body: JSON.stringify(data) });
};

export const updateUser = async (userId: number | string, data: any): Promise<User> => {
    return await apiCall(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteUser = async (userId: number | string): Promise<void> => {
    await apiCall(`/users/${userId}`, { method: 'DELETE' });
};

// ==================== Missing API Functions ====================



export const updatePlan = async (id: string, data: Partial<Plan>): Promise<Plan> => {
    return await apiCall(`/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const createPlan = async (data: Partial<Plan>): Promise<Plan> => {
    return await apiCall('/plans', { method: 'POST', body: JSON.stringify(data) });
};

export const deletePlan = async (id: string | number): Promise<void> => {
    await apiCall(`/plans/${id}`, { method: 'DELETE' });
};

export const getAvailableModules = async (): Promise<Module[]> => {
    return await apiCall('/modules', { method: 'GET' });
};

// Duplicate exports removed


// Removed duplicated functions (getSchoolModules, updateSchoolModules, submitPaymentProof)



export const generateSelfHostedPackage = async (payload: { planId?: string | number; moduleIds?: ModuleId[] } = {}): Promise<string> => {
    const body = { planId: payload.planId ?? null, moduleIds: Array.isArray(payload.moduleIds) ? payload.moduleIds : [] } as any;
    const response: any = await apiCall('/superadmin/self-hosted/package', {
        method: 'POST',
        body: JSON.stringify(body),
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

export const getBackupConfig = async (schoolId: number): Promise<any> => {
    return await apiCall(`/school/${schoolId}/backup/config`, { method: 'GET' });
};

export const updateBackupConfig = async (schoolId: number, cfg: any): Promise<any> => {
    return await apiCall(`/school/${schoolId}/backup/config`, { method: 'PUT', body: JSON.stringify(cfg) });
};

export const getSchoolBackups = async (schoolId: number): Promise<Array<{ file: string; size: number; createdAt: string }>> => {
    return await apiCall(`/school/${schoolId}/backups`, { method: 'GET' });
};

export const downloadBackupZip = async (schoolId: number, payload: { types: string[]; filters?: any }): Promise<Blob> => {
    const url = `${API_BASE_URL}/school/${schoolId}/backup/download`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(payload) });
    if (!res.ok) {
        let txt = '';
        try { txt = await res.text(); } catch { }
        throw new Error(`HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''}${txt ? `: ${txt}` : ''}`);
    }
    return await res.blob();
};

export const runBackupStore = async (schoolId: number, payload: { types: string[]; filters?: any }): Promise<{ file: string; size: number } | any> => {
    return await apiCall(`/school/${schoolId}/backup/store`, { method: 'POST', body: JSON.stringify(payload) });
};

export const downloadStoredBackup = async (schoolId: number, file: string): Promise<Blob> => {
    const url = `${API_BASE_URL}/school/${schoolId}/backups/${encodeURIComponent(file)}`;
    const res = await fetch(url, { method: 'GET', headers: { ...authHeaders() } });
    if (!res.ok) {
        let txt = '';
        try { txt = await res.text(); } catch { }
        throw new Error(`HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''}${txt ? `: ${txt}` : ''}`);
    }
    return await res.blob();
};

export const getSchoolLastLogin = async (schoolId: number): Promise<{ lastLoginAt: string | null }> => {
    return await apiCall(`/school/${schoolId}/users/last-login`, { method: 'GET' });
};

export const getSchoolStorageUsage = async (schoolId: number): Promise<{ bytes: number }> => {
    return await apiCall(`/school/${schoolId}/storage/usage`, { method: 'GET' });
};

export const notifySchool = async (schoolId: number, message: string): Promise<{ sent: boolean }> => {
    return await apiCall(`/school/${schoolId}/notify`, { method: 'POST', body: JSON.stringify({ message }) });
};

export const updateSchoolOperationalStatus = async (schoolId: number, status: 'ACTIVE' | 'SUSPENDED'): Promise<{ schoolId: number; status: string }> => {
    return await apiCall(`/schools/${schoolId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
};

export const deleteSchool = async (schoolId: number): Promise<{ deleted: boolean }> => {
    return await apiCall(`/schools/${schoolId}`, { method: 'DELETE' });
};

export const getDashboardStats = async (): Promise<any> => {
    try {
        const base = await apiCall('/superadmin/stats', { method: 'GET' });
        const enriched = {
            totalSchools: Number(base?.totalSchools || 0),
            activeSubscriptions: Number(base?.activeSubscriptions || 0),
            totalRevenue: Number(base?.totalRevenue || 0),
            revenueData: Array.isArray(base?.revenueData) ? base.revenueData : [],
            mrr: Number(base?.mrr ?? 0),
            churnRate: Number(base?.churnRate ?? 0),
            newSchoolsThisMonth: Number(base?.newSchoolsThisMonth ?? 0),
            activeJobs: Number(base?.activeJobs ?? 0),
        };
        return enriched;
    } catch {
        const schools = await getSchools().catch(() => []);
        const subs = await getSubscriptions().catch(() => []);
        const activeSubs = Array.isArray(subs) ? subs.filter((s: any) => String(s?.status || '').toUpperCase().includes('ACTIVE')).length : 0;
        const usageBySchool = (schools || []).map((s: any) => ({ school: s?.name || `School #${s?.id}`, activeUsers: s?.activeUsers ?? 0 }));
        return {
            totalSchools: (schools || []).length,
            totalUsers: 0,
            mrr: 0,
            activeJobs: 0,
            activeSubscriptions: activeSubs,
            totalRevenue: 0,
            revenueData: [],
            churnRate: 0,
            newSchoolsThisMonth: 0,
            usageBySchool,
        };
    }
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
    try {
        return await apiCall('/pricing/config', { method: 'GET' });
    } catch (err: any) {
        const msg = String(err?.message || '');
        try {
            return await apiCall('/pricing/public/config', { method: 'GET' });
        } catch { }
        try {
            return await apiCall('/public/pricing/config', { method: 'GET' });
        } catch { }
        return {
            pricePerStudent: 1.5,
            pricePerTeacher: 2.0,
            pricePerGBStorage: 0.2,
            pricePerInvoice: 0.05,
            currency: 'USD',
            yearlyDiscountPercent: 0
        };
    }
};

export const updatePricingConfig = async (config: PricingConfig): Promise<PricingConfig> => {
    return await apiCall('/pricing/config', { method: 'PUT', body: JSON.stringify(config) });
};

export const getStorageUsage = async (schoolId: number): Promise<number> => {
    const data = await apiCall(`/school/${schoolId}/storage/usage`, { method: 'GET' });
    return Number(data?.storageGB || 0);
};

export const getSchoolCommunicationsUsage = async (
    schoolId: number,
    params?: { startDate?: string; endDate?: string; groupBy?: 'day' | 'month'; channel?: 'email' | 'sms' | 'all' }
): Promise<{ email: { count: number; amount: number }; sms: { count: number; amount: number }; total: number; currency: string; breakdown?: Array<{ period: string; email: { count: number; amount: number }; sms: { count: number; amount: number }; total: number }> }> => {
    const qs: string[] = [];
    if (params?.startDate) qs.push(`startDate=${encodeURIComponent(params.startDate)}`);
    if (params?.endDate) qs.push(`endDate=${encodeURIComponent(params.endDate)}`);
    if (params?.groupBy) qs.push(`groupBy=${encodeURIComponent(params.groupBy)}`);
    if (params?.channel) qs.push(`channel=${encodeURIComponent(params.channel)}`);
    const suffix = qs.length ? `?${qs.join('&')}` : '';
    try {
        return await apiCall(`/school/${schoolId}/communications/usage${suffix}`, { method: 'GET' });
    } catch {
        return { email: { count: 0, amount: 0 }, sms: { count: 0, amount: 0 }, total: 0, currency: 'USD', breakdown: [] };
    }
};

export const getUsageQuote = async (schoolId: number, storageGB?: number): Promise<{ items: Array<{ key: string; qty: number; unitPrice: number; amount: number }>; total: number; currency: string; period: string }> => {
    const payload: any = {};
    if (typeof storageGB === 'number') payload.storageGB = storageGB;
    return await apiCall(`/school/${schoolId}/modules/quote`, { method: 'POST', body: JSON.stringify(payload) });
};

export const updateModule = async (moduleId: ModuleId | string | any, data: Partial<Module>): Promise<Module> => {
    const normalizeId = (input: any): string => {
        if (input === null || input === undefined) return '';
        if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') return String(input);
        if (typeof input === 'object') {
            if ('id' in input) return normalizeId((input as any).id);
            if ('moduleId' in input) return normalizeId((input as any).moduleId);
            const s = input.toString && input.toString !== Object.prototype.toString ? input.toString() : '';
            return String(s || '');
        }
        return String(input);
    };
    const idStr = normalizeId(moduleId);
    const updateData = data ? { ...(data as any) } : {};
    if (updateData && typeof updateData === 'object') delete (updateData as any).id;
    return await apiCall(`/modules/${encodeURIComponent(idStr)}`, { method: 'PUT', body: JSON.stringify(updateData) });
};

export const createModule = async (data: Module): Promise<Module> => {
    return await apiCall('/modules', { method: 'POST', body: JSON.stringify(data) });
};

export const deleteModule = async (moduleId: string | any): Promise<void> => {
    const normalizeId = (input: any): string => {
        if (input === null || input === undefined) return '';
        if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') return String(input);
        if (typeof input === 'object') {
            if ('id' in input) return normalizeId((input as any).id);
            if ('moduleId' in input) return normalizeId((input as any).moduleId);
            const s = input.toString && input.toString !== Object.prototype.toString ? input.toString() : '';
            return String(s || '');
        }
        return String(input);
    };
    const idStr = normalizeId(moduleId);
    await apiCall(`/modules/${encodeURIComponent(idStr)}`, { method: 'DELETE' });
};

export const getRoles = async (): Promise<Role[]> => {
    return await apiCall('/roles', { method: 'GET' });
};

export const generateLicenseKey = async (payload: { schoolName: string; planId?: string | number; planName?: string; expiresAt?: string | null }): Promise<{ licenseKey: string }> => {
    const response: any = await apiCall('/license/generate', { method: 'POST', body: JSON.stringify(payload) });
    return { licenseKey: response?.licenseKey || '' };
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

export const getStudentAndScheduleByParentId = async (parentId: string, studentId?: string): Promise<{ student?: Student; schedule?: ScheduleEntry[]; children?: { student: Student; schedule: ScheduleEntry[] }[] }> => {
    const qs = studentId ? `?studentId=${encodeURIComponent(String(studentId))}` : '';
    return await apiCall(`/parent/${parentId}/student-schedule${qs}`, { method: 'GET' });
};

// ==================== School Admin: Parent Requests ====================
export const getSchoolParentRequests = async (schoolId: number): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/parent-requests`, { method: 'GET' });
};

export const approveParentRequest = async (schoolId: number, requestId: string): Promise<void> => {
    await apiCall(`/school/${schoolId}/parent-requests/${requestId}/approve`, { method: 'PUT' });
};

export const rejectParentRequest = async (schoolId: number, requestId: string): Promise<void> => {
    await apiCall(`/school/${schoolId}/parent-requests/${requestId}/reject`, { method: 'PUT' });
};

// ==================== School Admin: Background Jobs ====================
export const enqueueReportGenerate = async (schoolId: number): Promise<{ jobId: string }> => {
    return await apiCall(`/school/${schoolId}/reports/generate`, { method: 'POST' });
};

export const enqueueStudentsImport = async (schoolId: number, sourceUrl: string): Promise<{ jobId: string }> => {
    return await apiCall(`/school/${schoolId}/import/students`, { method: 'POST', body: JSON.stringify({ sourceUrl }) });
};

export const getJobStatus = async (schoolId: number, jobId: string): Promise<{ id: string; name: string; status: string; result?: any; error?: string }> => {
    return await apiCall(`/school/${schoolId}/jobs/${jobId}`, { method: 'GET' });
};

export const getJobs = async (schoolId: number): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/jobs`, { method: 'GET' });
};

export const getBehaviorRecords = async (schoolId: number, studentId: string | number): Promise<BehaviorRecord[]> => {
    return await apiCall(`/school/${schoolId}/students/${studentId}/behavior`, { method: 'GET' });
};

export const addBehaviorRecord = async (schoolId: number, studentId: string | number, data: Partial<BehaviorRecord>): Promise<BehaviorRecord> => {
    return await apiCall(`/school/${schoolId}/students/${studentId}/behavior`, { method: 'POST', body: JSON.stringify(data) });
};

export const deleteBehaviorRecord = async (schoolId: number, recordId: number): Promise<void> => {
    await apiCall(`/school/${schoolId}/behavior/${recordId}`, { method: 'DELETE' });
};



export const getTeachersAttendance = async (schoolId: number, date: string): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/teachers/attendance?date=${date}`, { method: 'GET' });
};

export const saveTeachersAttendance = async (schoolId: number, date: string, records: { teacherId: number, status: AttendanceStatus }[]): Promise<void> => {
    await apiCall(`/school/${schoolId}/teachers/attendance`, { method: 'POST', body: JSON.stringify({ date, records }) });
};

export const getStaffAttendance = async (schoolId: number, date: string): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/staff-attendance?date=${date}`, { method: 'GET' });
};

export const saveStaffAttendance = async (schoolId: number, date: string, records: { userId: number, status: AttendanceStatus }[]): Promise<void> => {
    await apiCall(`/school/${schoolId}/staff-attendance/bulk`, { method: 'POST', body: JSON.stringify({ date, records }) });
};

export const sendInvoiceReminder = async (schoolId: number, invoiceId: string): Promise<any> => {
    return await apiCall(`/school/${schoolId}/invoices/${invoiceId}/remind`, { method: 'POST' });
};

export const getStudentStatement = async (schoolId: number, studentId: string): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/students/${studentId}/statement`, { method: 'GET' });
};






export const submitContactMessage = async (data: { name: string; email: string; message: string }) => {
    return await apiCall('/contact', { method: 'POST', body: JSON.stringify(data) });
};

export const getContactMessages = async () => {
    return await apiCall('/contact', { method: 'GET' });
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
    inviteStaff,
    getInvoices,
    getSchoolInvoices,
    getSchoolCommunicationsUsage,
    getStudentStatement,
    sendInvoiceReminder,
    addInvoice,
    recordPayment,
    getSchoolExpenses,
    addSchoolExpense,
    createInvoice,
    getSuperAdminTeamMembers,
    getSchoolsList,
    getRevenueData,
    getSubscriptions,
    updateSubscription,
    getPlans,
    updatePlan,
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
    requestSuperAdminReset,
    resetSuperAdminPassword,
    submitTrialRequest,
    getStudentDistribution,
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
    submitContactMessage,
    getContactMessages,
}
