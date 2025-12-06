
import { 
    User, School, RevenueData, Plan, Subscription, SubscriptionStatus, Role, Student, Teacher, Class, DailyAttendance, StudentGrades, ScheduleEntry, Conversation, Message, Invoice, Parent, ActionItem, SchoolEvent, StudentNote, StudentDocument, RecentActivity, SchoolSettings, UserRole, NewStudentData, NewTeacherData, TeacherStatus, StudentStatus, AttendanceRecord, ConversationType, NewSchoolData, PlanName, UpdatableStudentData, PaymentData, InvoiceStatus, ClassRosterUpdate, UpdatableTeacherData, NewClassData, ParentRequest, NewParentRequestData, ActionItemType, RequestStatus, NewInvoiceData, ActivityType, LandingPageContent, NewAdRequestData, NewTrialRequestData, UpdatableUserData, SchoolRole, NewStaffData, BusOperator, Route, NewBusOperatorApplication, BusOperatorStatus, Expense, NewExpenseData,
    PricingConfig, Module, ModuleId, SchoolModuleSubscription, SelfHostedQuoteRequest, SelfHostedLicense, BankDetails, PaymentProofSubmission, TeacherSalarySlip, Assignment, NewAssignmentData, Submission, AssignmentStatus, SubmissionStatus, AttendanceStatus, FeeSetup, BehaviorRecord
} from './types';
import { superAdminLogin, verifySuperAdminMfa, requestSuperAdminReset, resetSuperAdminPassword } from './api/superAdminAuth';

// API Configuration
const API_BASE_URL = (
  (typeof process !== 'undefined' && (process as any).env && (process as any).env.REACT_APP_API_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) ||
  (typeof window !== 'undefined' ? (localStorage.getItem('api_base') || '') : '') ||
  'http://localhost:5000/api'
);

export const getApiBase = (): string => API_BASE_URL;

const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const schoolId = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
    const base: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    if (schoolId) base['x-school-id'] = String(schoolId);
    return base;
};

// Generic wrapper
const unwrap = <T>(response: any, key: string, fallback: T): T => {
    if (response && response[key]) return response[key] as T;
    if (response && Array.isArray(response) && Array.isArray(fallback)) return response as unknown as T;
    return fallback;
};

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
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
            try { bodyText = await response.text(); } catch {}
            throw new Error(`HTTP ${response.status}: ${bodyText}`);
        }
        
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        throw error;
    }
};

// ==================== Authentication APIs ====================

export const login = async (emailOrUsername: string, password: string, schoolId?: number): Promise<User | "TRIAL_EXPIRED" | null> => {
    try {
        const res = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ email: emailOrUsername, password, schoolId }) });
        if (res.token) {
            localStorage.setItem('auth_token', res.token);
            return res.user;
        }
        if (res.error === 'TRIAL_EXPIRED') return "TRIAL_EXPIRED";
        return null;
    } catch {
        return null;
    }
};

export const submitTrialRequest = async (data: NewTrialRequestData): Promise<User | null> => {
    try {
        const res = await apiCall('/superadmin/public/onboard', { method: 'POST', body: JSON.stringify(data) });
        if (res.token) {
            localStorage.setItem('auth_token', res.token);
            return res.user;
        }
        return null;
    } catch {
        return null;
    }
};

// ==================== User Management APIs ====================

export const getUsersByRole = async (role: string): Promise<User[]> => {
    const schoolId = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : null;
    const q = schoolId ? `?role=${role}&schoolId=${schoolId}` : `?role=${role}`;
    const data = await apiCall(`/users${q}`, { method: 'GET' });
    return Array.isArray(data) ? data : [];
};

export const createUser = async (userData: any): Promise<User> => {
    return await apiCall('/users', { method: 'POST', body: JSON.stringify(userData) });
};

export const updateUser = async (id: string, userData: UpdatableUserData): Promise<User> => {
    return await apiCall(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });
};

export const deleteUser = async (id: string): Promise<void> => {
    await apiCall(`/users/${id}`, { method: 'DELETE' });
};

// ==================== School Management APIs ====================

export const getSchools = async (): Promise<School[]> => {
    return await apiCall('/schools', { method: 'GET' });
};

export const getSchoolById = async (id: number): Promise<School> => {
    return await apiCall(`/schools/${id}`, { method: 'GET' });
};

export const addSchool = async (schoolData: NewSchoolData): Promise<School> => {
    return await apiCall('/schools', { method: 'POST', body: JSON.stringify(schoolData) });
};

export const getSchoolSettings = async (schoolId: number): Promise<SchoolSettings> => {
    return await apiCall(`/school/${schoolId}/settings`, { method: 'GET' });
};

export const updateSchoolSettings = async (schoolId: number, settings: Partial<SchoolSettings>): Promise<SchoolSettings> => {
    return await apiCall(`/school/${schoolId}/settings`, { method: 'PUT', body: JSON.stringify(settings) });
};

// ==================== Student Management APIs ====================

export const getSchoolStudents = async (schoolId: number): Promise<Student[]> => {
    return await apiCall(`/school/${schoolId}/students`, { method: 'GET' });
};

export const getStudentDetails = async (schoolId: number, studentId: string): Promise<Student> => {
    return await apiCall(`/school/${schoolId}/students/${studentId}`, { method: 'GET' });
};

export const createStudent = async (studentData: NewStudentData): Promise<Student> => {
    return await apiCall('/students', { method: 'POST', body: JSON.stringify(studentData) });
};

export const updateStudent = async (id: string, studentData: UpdatableStudentData): Promise<Student> => {
    return await apiCall(`/students/${id}`, { method: 'PUT', body: JSON.stringify(studentData) });
};

export const deleteStudent = async (id: string): Promise<void> => {
    await apiCall(`/students/${id}`, { method: 'DELETE' });
};

// ==================== Teacher Management APIs ====================

export const getSchoolTeachers = async (schoolId: number): Promise<Teacher[]> => {
    return await apiCall(`/school/${schoolId}/teachers`, { method: 'GET' });
};

export const createTeacher = async (teacherData: NewTeacherData): Promise<Teacher> => {
    return await apiCall('/teachers', { method: 'POST', body: JSON.stringify(teacherData) });
};

export const updateTeacher = async (schoolId: number, id: string | number, teacherData: UpdatableTeacherData): Promise<Teacher> => {
    return await apiCall(`/school/${schoolId}/teachers/${id}`, { method: 'PUT', body: JSON.stringify(teacherData) });
};

export const getTeacherClasses = async (teacherId: string): Promise<Class[]> => {
    return await apiCall(`/teacher/${teacherId}/classes`, { method: 'GET' });
};

export const getTeacherSchedule = async (teacherId: string | number): Promise<ScheduleEntry[]> => {
    return await apiCall(`/teacher/${teacherId}/schedule`, { method: 'GET' });
};

export const getTeacherDashboardData = async (teacherId: string): Promise<any> => {
    return await apiCall(`/teacher/${teacherId}/dashboard`, { method: 'GET' });
};

export const getTeacherSalarySlips = async (teacherId: string): Promise<TeacherSalarySlip[]> => {
    return await apiCall(`/teacher/${teacherId}/salary-slips`, { method: 'GET' });
};

// ==================== Class Management APIs ====================

export const getSchoolClasses = async (schoolId: number): Promise<Class[]> => {
    return await apiCall(`/school/${schoolId}/classes`, { method: 'GET' });
};

export const createClass = async (classData: NewClassData): Promise<Class> => {
    return await apiCall('/classes', { method: 'POST', body: JSON.stringify(classData) });
};

export const getClassStudents = async (classId: string): Promise<Student[]> => {
    return await apiCall(`/school/class/${classId}/students`, { method: 'GET' });
};

export const updateClassRoster = async (update: ClassRosterUpdate): Promise<void> => {
    await apiCall(`/school/class/${update.classId}/roster`, { method: 'PUT', body: JSON.stringify({ studentIds: update.studentIds }) });
};

export const getSchedule = async (classId: string): Promise<ScheduleEntry[]> => {
    return await apiCall(`/school/class/${classId}/schedule`, { method: 'GET' });
};

// ==================== Attendance APIs ====================

export const getAttendance = async (classId: string, date: string): Promise<AttendanceRecord[]> => {
    return await apiCall(`/school/class/${classId}/attendance?date=${encodeURIComponent(date)}`, { method: 'GET' });
};

export const saveAttendance = async (classId: string, date: string, records: AttendanceRecord[]): Promise<{ ok: boolean }> => {
    return await apiCall(`/school/class/${classId}/attendance`, { method: 'POST', body: JSON.stringify({ date, records }) });
};

export const getStaffAttendance = async (schoolId: number, date: string): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/staff/attendance?date=${date}`, { method: 'GET' });
};

export const saveStaffAttendance = async (schoolId: number, date: string, records: any[]): Promise<void> => {
    await apiCall(`/school/${schoolId}/staff/attendance`, { method: 'POST', body: JSON.stringify({ date, records }) });
};

export const createStaffAttendance = async (schoolId: number, data: any): Promise<void> => {
    await apiCall(`/school/${schoolId}/staff/attendance/single`, { method: 'POST', body: JSON.stringify(data) });
};

export const getTeachersAttendance = async (schoolId: number, date: string): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/teachers/attendance?date=${date}`, { method: 'GET' });
};

export const saveTeachersAttendance = async (schoolId: number, date: string, records: any[]): Promise<void> => {
    await apiCall(`/school/${schoolId}/teachers/attendance`, { method: 'POST', body: JSON.stringify({ date, records }) });
};

export const createTeacherAttendance = async (schoolId: number, data: any): Promise<void> => {
    await apiCall(`/school/${schoolId}/teachers/attendance/single`, { method: 'POST', body: JSON.stringify(data) });
};

// ==================== Grades APIs ====================

export const getGrades = async (classId: string, subject: string): Promise<StudentGrades[]> => {
    return await apiCall(`/school/class/${classId}/grades?subject=${encodeURIComponent(subject)}`, { method: 'GET' });
};

export const saveGrades = async (entries: StudentGrades[]): Promise<{ ok: boolean }> => {
    const schoolId = typeof window !== 'undefined' ? localStorage.getItem('current_school_id') : undefined;
    return await apiCall(`/school/${schoolId}/grades`, { method: 'POST', body: JSON.stringify({ entries }) });
};

export const getAllGrades = async (schoolId: number): Promise<StudentGrades[]> => {
    return await apiCall(`/school/${schoolId}/grades/all`, { method: 'GET' });
};

// ==================== Finance APIs ====================

export const getSchoolInvoices = async (schoolId: number): Promise<Invoice[]> => {
    return await apiCall(`/school/${schoolId}/invoices`, { method: 'GET' });
};

export const addInvoice = async (schoolId: number, data: NewInvoiceData): Promise<Invoice> => {
    return await apiCall(`/school/${schoolId}/invoices`, { method: 'POST', body: JSON.stringify(data) });
};

export const recordPayment = async (invoiceId: string, paymentData: PaymentData): Promise<Invoice> => {
    return await apiCall(`/invoices/${invoiceId}/pay`, { method: 'POST', body: JSON.stringify(paymentData) });
};

export const sendInvoiceReminder = async (schoolId: number, invoiceId: string): Promise<void> => {
    await apiCall(`/school/${schoolId}/invoices/${invoiceId}/remind`, { method: 'POST' });
};

export const getSchoolExpenses = async (schoolId: number): Promise<Expense[]> => {
    return await apiCall(`/school/${schoolId}/expenses`, { method: 'GET' });
};

export const addSchoolExpense = async (schoolId: number, data: NewExpenseData): Promise<Expense> => {
    return await apiCall(`/school/${schoolId}/expenses`, { method: 'POST', body: JSON.stringify(data) });
};

export const getSalaryStructures = async (schoolId: number): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/payroll/structures`, { method: 'GET' });
};

export const createSalaryStructure = async (schoolId: number, data: any): Promise<any> => {
    return await apiCall(`/school/${schoolId}/payroll/structures`, { method: 'POST', body: JSON.stringify(data) });
};

export const deleteSalaryStructure = async (schoolId: number, id: string): Promise<void> => {
    await apiCall(`/school/${schoolId}/payroll/structures/${id}`, { method: 'DELETE' });
};

export const assignSalaryStructureToStaff = async (schoolId: number, userId: string, structureId: string): Promise<void> => {
    await apiCall(`/school/${schoolId}/staff/${userId}/salary-structure`, { method: 'PUT', body: JSON.stringify({ structureId }) });
};

export const assignSalaryStructureToTeacher = async (schoolId: number, teacherId: string, structureId: string): Promise<void> => {
    await apiCall(`/school/${schoolId}/teachers/${teacherId}/salary-structure`, { method: 'PUT', body: JSON.stringify({ structureId }) });
};

export const getSalarySlipsForSchool = async (schoolId: number, month: string): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/payroll/slips?month=${month}`, { method: 'GET' });
};

export const processPayrollForMonth = async (schoolId: number, month: string): Promise<any> => {
    return await apiCall(`/school/${schoolId}/payroll/generate?month=${month}`, { method: 'POST' });
};

export const approveSalarySlip = async (schoolId: number, id: string): Promise<any> => {
    return await apiCall(`/school/${schoolId}/payroll/slips/${id}/approve`, { method: 'POST' });
};

export const submitPayrollReceipt = async (schoolId: number, slipId: string, data: { receiptNumber: string, receiptDate: string, attachment: File | null }): Promise<any> => {
    const fd = new FormData();
    fd.append('receiptNumber', data.receiptNumber);
    fd.append('receiptDate', data.receiptDate);
    if (data.attachment) fd.append('attachment', data.attachment);
    const headers = authHeaders();
    const res = await fetch(`${API_BASE_URL}/school/${schoolId}/payroll/slips/${slipId}/pay`, {
        method: 'POST',
        headers: { Authorization: headers.Authorization || '', 'x-school-id': headers['x-school-id'] || '' },
        body: fd
    });
    if (!res.ok) throw new Error('Failed');
    return await res.json();
};

export const getFeeSetups = async (schoolId: number): Promise<FeeSetup[]> => {
    return await apiCall(`/school/${schoolId}/fees`, { method: 'GET' });
};

export const createFeeSetup = async (schoolId: number, data: any): Promise<FeeSetup> => {
    return await apiCall(`/school/${schoolId}/fees`, { method: 'POST', body: JSON.stringify(data) });
};

export const updateFeeSetup = async (schoolId: number, id: string, data: any): Promise<FeeSetup> => {
    return await apiCall(`/school/${schoolId}/fees/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteFeeSetup = async (schoolId: number, id: string): Promise<void> => {
    await apiCall(`/school/${schoolId}/fees/${id}`, { method: 'DELETE' });
};

export const generateInvoicesFromFees = async (schoolId: number, options: any): Promise<any> => {
    return await apiCall(`/school/${schoolId}/fees/generate-invoices`, { method: 'POST', body: JSON.stringify(options) });
};

// ==================== Module & Subscription APIs ====================

export const getAvailableModules = async (): Promise<Module[]> => {
    return await apiCall('/modules', { method: 'GET' });
};

export const getSchoolModules = async (schoolId: number): Promise<SchoolModuleSubscription[]> => {
    const ids = await apiCall(`/modules/school/${schoolId}`, { method: 'GET' });
    if (Array.isArray(ids)) {
        return ids.map((id: any) => typeof id === 'string' ? { moduleId: id, status: 'ACTIVE' } : id);
    }
    return [];
};

export const getPricingConfig = async (): Promise<PricingConfig> => {
    try {
        return await apiCall('/pricing/config', { method: 'GET' });
    } catch {
        return { pricePerStudent: 1.5, currency: 'USD' } as any;
    }
};

export const updatePricingConfig = async (config: PricingConfig): Promise<void> => {
    await apiCall('/pricing/config', { method: 'PUT', body: JSON.stringify(config) });
};

export const createModule = async (module: Module): Promise<Module> => {
    return await apiCall('/modules', { method: 'POST', body: JSON.stringify(module) });
};

export const updateModule = async (module: Module): Promise<Module> => {
    return await apiCall(`/modules/${module.id}`, { method: 'PUT', body: JSON.stringify(module) });
};

export const deleteModule = async (id: string): Promise<void> => {
    await apiCall(`/modules/${id}`, { method: 'DELETE' });
};

export const requestModuleActivation = async (schoolId: number, moduleId: string, paymentMethod: string, transactionReference: string, proofImage?: File): Promise<any> => {
    const fd = new FormData();
    fd.append('moduleId', moduleId);
    if (paymentMethod) fd.append('paymentMethod', paymentMethod);
    if (transactionReference) fd.append('transactionReference', transactionReference);
    if (proofImage) fd.append('proofImage', proofImage);

    const headers = authHeaders();
    const response = await fetch(`${API_BASE_URL}/modules/school/${schoolId}/activate`, {
        method: 'POST',
        headers: { Authorization: headers.Authorization || '', 'x-school-id': headers['x-school-id'] || '' },
        body: fd,
    });

    if (!response.ok) {
        let errorMsg = 'Activation failed';
        try { const err = await response.json(); errorMsg = err.message || errorMsg; } catch {}
        throw new Error(errorMsg);
    }
    return await response.json();
};

export const updateSchoolModules = async (schoolId: number, moduleIds: string[]): Promise<SchoolModuleSubscription[]> => {
    // Legacy support, mostly unused now in favor of requestModuleActivation
    return [];
};

export const getPendingRequests = async (): Promise<any[]> => {
    return await apiCall('/modules/requests/pending', { method: 'GET' });
};

export const approveRequest = async (id: number): Promise<void> => {
    await apiCall(`/modules/requests/${id}/approve`, { method: 'POST' });
};

export const rejectRequest = async (id: number): Promise<void> => {
    await apiCall(`/modules/requests/${id}/reject`, { method: 'POST' });
};

export const submitPaymentProof = async (submission: Omit<PaymentProofSubmission, 'proofImage'>): Promise<void> => {
    await apiCall('/payments/proof', { method: 'POST', body: JSON.stringify(submission) });
};

export const getBankAccounts = async (): Promise<BankDetails[]> => {
    try { return await apiCall('/finance/bank-accounts', { method: 'GET' }); } catch { return []; }
};

export const getSchoolSubscriptionDetails = async (schoolId: number): Promise<Subscription> => {
    return await apiCall(`/subscriptions/${schoolId}`, { method: 'GET' });
};

export const activateSchoolSubscription = async (schoolId: number, moduleIds: string[], renewalDate: string): Promise<void> => {
    await apiCall(`/subscriptions/${schoolId}/activate`, { method: 'POST', body: JSON.stringify({ moduleIds, renewalDate }) });
};

export const getSchoolBillingSummary = async (schoolId: number): Promise<any> => {
    return await apiCall(`/schools/${schoolId}/billing/summary`, { method: 'GET' });
};

export const getPlans = async (): Promise<Plan[]> => {
    return await apiCall('/plans', { method: 'GET' });
};

// ==================== Parent Portal APIs ====================

export const getSchoolParents = async (schoolId: number): Promise<Parent[]> => {
    return await apiCall(`/school/${schoolId}/parents`, { method: 'GET' });
};

export const getParentDashboardData = async (parentId: string, studentId?: string): Promise<any> => {
    const q = studentId ? `?studentId=${studentId}` : '';
    return await apiCall(`/parent/${parentId}/dashboard${q}`, { method: 'GET' });
};

export const getParentRequests = async (parentId: string): Promise<ParentRequest[]> => {
    return await apiCall(`/parent/${parentId}/requests`, { method: 'GET' });
};

export const submitParentRequest = async (parentId: string, data: NewParentRequestData): Promise<ParentRequest> => {
    return await apiCall(`/parent/${parentId}/requests`, { method: 'POST', body: JSON.stringify(data) });
};

export const getParentTransportationDetails = async (parentId: string): Promise<any> => {
    return await apiCall(`/parent/${parentId}/transportation`, { method: 'GET' });
};

// ==================== Misc APIs ====================

export const getSchoolEvents = async (schoolId: number): Promise<SchoolEvent[]> => {
    return await apiCall(`/school/${schoolId}/events`, { method: 'GET' });
};

export const getSchoolStaff = async (schoolId: number): Promise<User[]> => {
    return await apiCall(`/school/${schoolId}/staff`, { method: 'GET' });
};

export const getBehaviorRecords = async (schoolId: number, studentId: string): Promise<BehaviorRecord[]> => {
    return await apiCall(`/school/${schoolId}/students/${studentId}/behavior`, { method: 'GET' });
};

export const addBehaviorRecord = async (schoolId: number, studentId: string, data: any): Promise<BehaviorRecord> => {
    return await apiCall(`/school/${schoolId}/students/${studentId}/behavior`, { method: 'POST', body: JSON.stringify(data) });
};

export const deleteBehaviorRecord = async (schoolId: number, recordId: number): Promise<void> => {
    return await apiCall(`/school/${schoolId}/behavior/${recordId}`, { method: 'DELETE' });
};

export const getStudentStatement = async (schoolId: number, studentId: string): Promise<any> => {
    return await apiCall(`/school/${schoolId}/students/${studentId}/statement`, { method: 'GET' });
};

export const generateSelfHostedPackage = async (moduleIds: string[]): Promise<string> => {
    const res = await apiCall('/license/generate-package', { method: 'POST', body: JSON.stringify({ moduleIds }) });
    return res.downloadUrl;
};

// ==================== Background Jobs & Backups ====================

export const getJobs = async (schoolId: number): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/jobs`, { method: 'GET' });
};

export const getJobStatus = async (schoolId: number, jobId: string): Promise<any> => {
    return await apiCall(`/school/${schoolId}/jobs/${jobId}`, { method: 'GET' });
};

export const enqueueReportGenerate = async (schoolId: number): Promise<{ jobId: string }> => {
    return await apiCall(`/school/${schoolId}/reports/enqueue`, { method: 'POST' });
};

export const enqueueStudentsImport = async (schoolId: number, fileUrl: string): Promise<{ jobId: string }> => {
    return await apiCall(`/school/${schoolId}/students/import`, { method: 'POST', body: JSON.stringify({ fileUrl }) });
};

export const getSchoolBackups = async (schoolId: number): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/backups`, { method: 'GET' });
};

export const getSchoolStorageUsage = async (schoolId: number): Promise<any> => {
    return await apiCall(`/school/${schoolId}/storage`, { method: 'GET' });
};

export const getSchoolLastLogin = async (schoolId: number): Promise<string> => {
    const res = await apiCall(`/school/${schoolId}/last-login`, { method: 'GET' });
    return res.lastLogin;
};

export const getStudentDistribution = async (schoolId: number): Promise<any> => {
    return await apiCall(`/school/${schoolId}/stats/distribution`, { method: 'GET' });
};

// ==================== Transportation ====================

export const getBusOperators = async (schoolId: number): Promise<BusOperator[]> => {
    return await apiCall(`/transportation/${schoolId}/operators`, { method: 'GET' });
};

export const approveBusOperator = async (id: string): Promise<void> => {
    await apiCall(`/transportation/operators/${id}/approve`, { method: 'POST' });
};

export const getRoutes = async (schoolId: number): Promise<Route[]> => {
    return await apiCall(`/transportation/${schoolId}/routes`, { method: 'GET' });
};

export const addRoute = async (schoolId: number, data: any): Promise<Route> => {
    return await apiCall(`/transportation/${schoolId}/routes`, { method: 'POST', body: JSON.stringify(data) });
};

export const updateRouteStudents = async (schoolId: number, routeId: string, studentIds: string[]): Promise<void> => {
    await apiCall(`/transportation/${schoolId}/routes/${routeId}/students`, { method: 'PUT', body: JSON.stringify({ studentIds }) });
};

// ==================== Action Items ====================

export const getActionItems = async (role: string): Promise<ActionItem[]> => {
    return await apiCall(`/action-items?role=${role}`, { method: 'GET' });
};

export const getParentActionItems = async (parentId: string): Promise<ActionItem[]> => {
    return await apiCall(`/parent/${parentId}/action-items`, { method: 'GET' });
};

export const getTeacherActionItems = async (teacherId: string): Promise<ActionItem[]> => {
    return await apiCall(`/teacher/${teacherId}/action-items`, { method: 'GET' });
};

// ==================== Assignments ====================

export const getAssignmentsForClass = async (classId: string): Promise<Assignment[]> => {
    return await apiCall(`/classes/${classId}/assignments`, { method: 'GET' });
};

export const createAssignment = async (data: NewAssignmentData): Promise<Assignment> => {
    return await apiCall('/assignments', { method: 'POST', body: JSON.stringify(data) });
};

export const getSubmissionsForAssignment = async (assignmentId: string): Promise<Submission[]> => {
    return await apiCall(`/assignments/${assignmentId}/submissions`, { method: 'GET' });
};

// Export all auth functions
export { superAdminLogin, verifySuperAdminMfa, requestSuperAdminReset, resetSuperAdminPassword };
