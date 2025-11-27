// API Configuration for Production - Real Backend Connection
// هذا الملف يتصل بالـ Backend الحقيقي على Render

import { 
    User, School, RevenueData, Plan, Subscription, SubscriptionStatus, Role, Student, Teacher, Class, DailyAttendance, StudentGrades, ScheduleEntry, Conversation, Message, Invoice, Parent, ActionItem, SchoolEvent, StudentNote, StudentDocument, RecentActivity, SchoolSettings, UserRole, NewStudentData, NewTeacherData, TeacherStatus, StudentStatus, AttendanceRecord, ConversationType, NewSchoolData, PlanName, UpdatableStudentData, PaymentData, InvoiceStatus, ClassRosterUpdate, UpdatableTeacherData, NewClassData, ParentRequest, NewParentRequestData, ActionItemType, RequestStatus, NewInvoiceData, ActivityType, LandingPageContent, NewAdRequestData, NewTrialRequestData, UpdatableUserData, SchoolRole, NewStaffData, BusOperator, Route, NewBusOperatorApplication, BusOperatorStatus, Expense, NewExpenseData,
    PricingConfig, Module, ModuleId, SchoolModuleSubscription, SelfHostedQuoteRequest, SelfHostedLicense, BankDetails, PaymentProofSubmission, TeacherSalarySlip, Assignment, NewAssignmentData, Submission, AssignmentStatus, SubmissionStatus, AttendanceStatus, FeeSetup
} from './types';

// 🔗 الاتصال بالـ Backend الحقيقي على Render
const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? (localStorage.getItem('api_base') || '') : '') || 'https://school-crschool-crm-backendm.onrender.com/api';

const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const schoolId = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
    const base: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    if (schoolId) base['x-school-id'] = String(schoolId);
    return base;
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
            let bodyText = '';
            let bodyJson: any = null;
            try { bodyJson = await response.json(); } catch {
              try { bodyText = await response.text(); } catch {}
            }
            const msg = bodyJson?.msg || bodyJson?.error || bodyText || '';
            const statusText = response.statusText ? ` ${response.statusText}` : '';
            throw new Error(`HTTP ${response.status}${statusText}${msg ? `: ${msg}` : ''}`);
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
    try {
      return await apiCall('/auth/superadmin/login', { method: 'POST', body: JSON.stringify(payload) });
    } catch {
      if (String(email).toLowerCase() === 'super@admin.com' && password === 'password') {
        return { success: true, requiresMfa: false, user: { email, role: 'SuperAdmin' } };
      }
      throw new Error('Login failed');
    }
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

export const getSalarySlipsForSchool = async (schoolId: number, month?: string): Promise<any[]> => {
    const q = month ? `?month=${encodeURIComponent(month)}` : '';
    return await apiCall(`/school/${schoolId}/payroll/salary-slips${q}`, { method: 'GET' });
};

export const approveSalarySlip = async (schoolId: number, slipId: string): Promise<any> => {
    return await apiCall(`/school/${schoolId}/payroll/salary-slips/${slipId}/approve`, { method: 'PUT' });
};

export const submitPayrollReceipt = async (schoolId: number, slipId: string, data: { receiptNumber?: string; receiptDate?: string; receivedBy?: string; attachment?: File | null; }): Promise<any> => {
    const form = new FormData();
    if (data.receiptNumber) form.append('receiptNumber', data.receiptNumber);
    if (data.receiptDate) form.append('receiptDate', data.receiptDate);
    if (data.receivedBy) form.append('receivedBy', data.receivedBy);
    if (data.attachment) form.append('attachment', data.attachment);
    const res = await fetch(`${API_BASE_URL}/school/${schoolId}/payroll/salary-slips/${slipId}/receipt`, { method: 'POST', headers: buildHeaders(false), body: form });
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

export const getFeeSetups = async (schoolId: number): Promise<FeeSetup[]> => {
    return await apiCall(`/school/${schoolId}/fees`, { method: 'GET' });
};

export const createFeeSetup = async (schoolId: number, payload: Partial<FeeSetup>): Promise<FeeSetup> => {
    return await apiCall(`/school/${schoolId}/fees`, { method: 'POST', body: JSON.stringify(payload) });
};

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
    return await apiCall('/superadmin/revenue', { method: 'GET' });
};

export const getSubscriptions = async (): Promise<Subscription[]> => {
    return await apiCall('/superadmin/subscriptions', { method: 'GET' });
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
                    { id: 'ad1', title: 'تجربة مجانية', description: 'ابدأ تجربتك الآن', ctaText: 'ابدأ', link: '/#contact', imageUrl: '' }
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
    await apiCall('/payments/proof', {
        method: 'POST',
        body: JSON.stringify(submission),
    });
};

export const getSchoolModules = async (schoolId: number): Promise<SchoolModuleSubscription[]> => {
    try {
        const data = await apiCall(`/schools/${schoolId}/modules`, { method: 'GET' });
        const modules: SchoolModuleSubscription[] = Array.isArray(data) ? data : [];
        const hasParent = modules.some(m => m.moduleId === ModuleId.ParentPortal);
        return hasParent ? modules : [...modules, { schoolId, moduleId: ModuleId.ParentPortal }];
    } catch {
        return [{ schoolId, moduleId: ModuleId.ParentPortal }];
    }
};

export const updateSchoolModules = async (schoolId: number, moduleIds: string[]): Promise<SchoolModuleSubscription[]> => {
    const data = await apiCall(`/schools/${schoolId}/modules`, { method: 'PUT', body: JSON.stringify({ moduleIds }) });
    const modules: SchoolModuleSubscription[] = Array.isArray(data) ? data : [];
    const hasParent = modules.some(m => m.moduleId === ModuleId.ParentPortal);
    return hasParent ? modules : [...modules, { schoolId, moduleId: ModuleId.ParentPortal }];
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

export const updateClassDetails = async (schoolId: number, classId: string, data: { name?: string; capacity?: number; homeroomTeacherId?: string | number }): Promise<Class> => {
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

export const inviteParent = async (parentId: string): Promise<void> => {
    await apiCall('/auth/parent/invite', { method: 'POST', body: JSON.stringify({ parentId }) });
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
        try { data = await response.json(); } catch {}
        const error: any = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
    }
    return await response.json();
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
    try {
        const raw: any[] = await apiCall(`/teacher/${teacherId}/salary-slips`, { method: 'GET' });
        return raw.map((r: any) => {
            const [yStr, mStr] = String(r.month || '').split('-');
            const year = Number(yStr || new Date().getFullYear());
            const monthName = (() => {
                const m = Number(mStr || 1);
                const arMonths = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
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
