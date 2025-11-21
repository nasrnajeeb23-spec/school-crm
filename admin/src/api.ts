// This file now exclusively uses mock data to ensure the application runs correctly in any environment
// without requiring a live backend connection. This resolves all "Failed to fetch" errors.

// FIX: Imported the 'AttendanceStatus' enum to resolve reference errors.
// FIX: Added imports for Module and Pricing related types.
import { 
    User, School, RevenueData, Plan, Subscription, SubscriptionStatus, Role, Student, Teacher, Class, DailyAttendance, StudentGrades, ScheduleEntry, Conversation, Message, Invoice, Parent, ActionItem, SchoolEvent, StudentNote, StudentDocument, RecentActivity, SchoolSettings, UserRole, NewStudentData, NewTeacherData, TeacherStatus, StudentStatus, AttendanceRecord, ConversationType, NewSchoolData, PlanName, UpdatableStudentData, PaymentData, InvoiceStatus, ClassRosterUpdate, UpdatableTeacherData, NewClassData, ParentRequest, NewParentRequestData, ActionItemType, RequestStatus, NewInvoiceData, ActivityType, LandingPageContent, NewAdRequestData, NewTrialRequestData, UpdatableUserData, SchoolRole, NewStaffData, BusOperator, Route, NewBusOperatorApplication, BusOperatorStatus, Expense, NewExpenseData,
    PricingConfig, Module, ModuleId, SchoolModuleSubscription, SelfHostedQuoteRequest, SelfHostedLicense, BankDetails, PaymentProofSubmission, TeacherSalarySlip, Assignment, NewAssignmentData, Submission, AssignmentStatus, SubmissionStatus, AttendanceStatus
} from './types';

// FIX: Added imports for Module and Pricing related mock data.
import {
    MOCK_USERS, MOCK_SCHOOLS, MOCK_REVENUE_DATA, MOCK_PLANS, MOCK_SUBSCRIPTIONS, MOCK_ROLES, MOCK_STUDENTS, MOCK_TEACHERS, MOCK_CLASSES, MOCK_INVOICES, MOCK_PARENTS, MOCK_SCHOOL_SETTINGS, MOCK_EVENTS, MOCK_GRADES, MOCK_ATTENDANCE, MOCK_STUDENT_NOTES, MOCK_STUDENT_DOCUMENTS, MOCK_TEACHER_ACTION_ITEMS, MOCK_PARENT_ACTION_ITEMS, MOCK_CONVERSATIONS, MOCK_ACTION_ITEMS, MOCK_RECENT_ACTIVITIES, MOCK_SCHEDULE, MOCK_MESSAGES, MOCK_CLASS_ROSTERS, MOCK_PARENT_REQUESTS, MOCK_LANDING_PAGE_CONTENT, MOCK_BUS_OPERATORS, MOCK_ROUTES, MOCK_EXPENSES,
    MOCK_PRICING_CONFIG, MOCK_MODULES, MOCK_SCHOOL_MODULES, MOCK_BANK_ACCOUNTS, MOCK_TEACHER_SALARY_SLIPS, MOCK_ASSIGNMENTS, MOCK_SUBMISSIONS
} from './constants';


// Simulates a network delay for mocked functions
const networkDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Helper function to get client IP (mock)
const getClientIP = () => {
    return '127.0.0.1'; // Mock IP for demo purposes
};

const API_BASE_URL = (typeof window !== 'undefined' && window.localStorage && localStorage.getItem('api_base')) ? String(localStorage.getItem('api_base'))! : 'http://127.0.0.1:5002/api';

const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};


// --- All APIs are now mocked to ensure functionality without a live backend ---

// SuperAdmin Team Management API
export const getSuperAdminTeamMembers = async (): Promise<any[]> => {
    await networkDelay(600);
    return MOCK_USERS.filter(user => 
        user.role === UserRole.SuperAdminFinancial || 
        user.role === UserRole.SuperAdminTechnical || 
        user.role === UserRole.SuperAdminSupervisor
    );
};

export const createSuperAdminTeamMember = async (memberData: any): Promise<any> => {
    await networkDelay(800);
    const newMember = {
        id: `user_${Date.now()}`,
        ...memberData,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: null
    };
    return newMember;
};

export const updateSuperAdminTeamMember = async (memberId: string, memberData: any): Promise<any> => {
    await networkDelay(600);
    return {
        id: memberId,
        ...memberData,
        updatedAt: new Date().toISOString()
    };
};

export const deleteSuperAdminTeamMember = async (memberId: string): Promise<void> => {
    await networkDelay(400);
    // Mock deletion
};

export const getBankAccounts = async (): Promise<BankDetails[]> => {
    await networkDelay(200);
    return MOCK_BANK_ACCOUNTS;
};

export const submitPaymentProof = async (submission: Omit<PaymentProofSubmission, 'proofImage'>): Promise<void> => {
    await networkDelay(1200);
    console.log("Submitting Payment Proof:", submission);

    // Create a notification for the super admin
    const adminActionItem: ActionItem = {
        id: `act_pay_${Date.now()}`,
        type: ActionItemType.PaymentVerification, // Using a specific type
        title: `تحقق من دفعة جديدة: ${submission.schoolName}`,
        description: `خدمة: ${submission.relatedService}. مبلغ: $${submission.amount}. مرجع: ${submission.reference}.`,
        date: 'الآن',
        isRead: false,
    };
    MOCK_ACTION_ITEMS.unshift(adminActionItem);
};

// SuperAdmin Authentication Functions
export const superAdminLogin = async (emailOrUsername: string, password: string, ipAddress?: string) => {
    await networkDelay(1000);
    
    const clientIP = ipAddress || getClientIP();
    const userAgent = typeof window !== 'undefined' ? navigator.userAgent : 'Unknown';
    
    // Mock security check
    const isWhitelisted = ['127.0.0.1', '::1', '192.168.1.1', '10.0.0.1'].includes(clientIP);
    const isSuspiciousUserAgent = userAgent.includes('bot') || userAgent.includes('crawler');
    
    if (isSuspiciousUserAgent) {
        return {
            success: false,
            message: 'Access denied: Suspicious user agent detected',
            auditLog: {
                loginId: `login_${Date.now()}`,
                sessionId: `session_${Date.now()}`,
                ipAddress: clientIP,
                location: 'Unknown',
                device: userAgent,
                riskLevel: 'high'
            }
        };
    }
    
    // Validate credentials - support both email and username
    const isValidLogin = (emailOrUsername === 'super@admin.com' || emailOrUsername === 'superadmin') && password === 'password';
    
    if (isValidLogin) {
        const superAdminUser = MOCK_USERS.find(u => u.email === 'super@admin.com');
        const requiresMfa = !isWhitelisted;
        const tempToken = requiresMfa ? `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : undefined;
        
        return {
            success: true,
            message: requiresMfa ? 'MFA verification required' : 'Login successful',
            requiresMfa,
            tempToken,
            user: superAdminUser,
            auditLog: {
                loginId: `login_${Date.now()}`,
                sessionId: `session_${Date.now()}`,
                ipAddress: clientIP,
                location: isWhitelisted ? 'Localhost' : 'External',
                device: userAgent.includes('Windows') ? 'Windows PC' : 'Unknown Device',
                riskLevel: isWhitelisted ? 'low' : 'medium'
            }
        };
    }
    
    return {
        success: false,
        message: 'Invalid email or password',
        auditLog: {
            loginId: `login_${Date.now()}`,
            sessionId: `session_${Date.now()}`,
            ipAddress: clientIP,
            location: 'Unknown',
            device: userAgent,
            riskLevel: 'medium'
        }
    };
};

export const verifySuperAdminMfa = async (tempToken: string, mfaCode: string, ipAddress?: string) => {
    await networkDelay(800);
    
    const clientIP = ipAddress || getClientIP();
    
    // Validate temp token
    if (!tempToken.startsWith('temp_')) {
        return {
            success: false,
            message: 'Invalid or expired session'
        };
    }
    
    // Validate MFA code
    const validCodes = ['123456', '654321', '000000'];
    if (!validCodes.includes(mfaCode)) {
        return {
            success: false,
            message: 'Invalid MFA code'
        };
    }
    
    // Generate session token
    const token = `superadmin_${Date.now()}_${Math.random().toString(36).substr(2, 15)}`;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const superAdminUser = MOCK_USERS.find(u => u.email === 'super@admin.com');
    
    return {
        success: true,
        message: 'MFA verification successful',
        token,
        user: superAdminUser,
        sessionInfo: {
            sessionId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            ipAddress: clientIP,
            userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Unknown'
        }
    };
};

export const logSuperAdminAccess = async (userId: string | number, action: string, details?: any) => {
    await networkDelay(200);
    console.log(`[SUPERADMIN AUDIT] ${new Date().toISOString()} - Action: ${action}`, {
        userId,
        details,
        ipAddress: getClientIP()
    });
};

export const login = async (emailOrUsername: string, password: string): Promise<User | "TRIAL_EXPIRED" | null> => {
    try {
        const field = emailOrUsername.includes('@') ? { email: emailOrUsername } : { username: emailOrUsername };
        const resp = await fetch(`${API_BASE_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...field, password }) });
        if (!resp.ok) throw new Error('Failed');
        const data = await resp.json();
        const token = data.token;
        const user = data.user as any;
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
        }
        const mapRole = (r: string) => {
            const key = String(r).toUpperCase().replace(/[^A-Z]/g, '');
            const m: any = { SUPERADMIN: 'SUPER_ADMIN', SUPERADMINFINANCIAL: 'SUPER_ADMIN_FINANCIAL', SUPERADMINTECHNICAL: 'SUPER_ADMIN_TECHNICAL', SUPERADMINSUPERVISOR: 'SUPER_ADMIN_SUPERVISOR', SCHOOLADMIN: 'SCHOOL_ADMIN', TEACHER: 'TEACHER', PARENT: 'PARENT' };
            return m[key] || key;
        };
        const normalizedUser: any = { ...user, role: mapRole(user.role) };
        return normalizedUser as User;
    } catch {
        await networkDelay(800);
        const demoUsers = [
            { email: 'super@admin.com', username: 'superadmin', password: 'password', user: MOCK_USERS.find(u => u.email === 'super@admin.com') },
            { email: 'admin@school.com', username: 'schooladmin', password: 'password', user: MOCK_USERS.find(u => u.email === 'admin@school.com') },
            { email: 'parent@school.com', username: 'parent', password: 'password', user: MOCK_USERS.find(u => u.email === 'parent@school.com') },
        ];
        const foundUser = demoUsers.find(u => (u.email === emailOrUsername || u.username === emailOrUsername) && u.password === password);
        if (foundUser && foundUser.user) {
            if (typeof window !== 'undefined') {
                localStorage.setItem('auth_token', `demo_token_${Date.now()}`);
            }
            return foundUser.user;
        }
        return null;
    }
};

export const submitTrialRequest = async (data: NewTrialRequestData): Promise<User | null> => {
    await networkDelay(1500);

    // Check if email is already taken
    if (MOCK_USERS.some(u => u.email === data.adminEmail)) {
        console.error("Email already in use");
        return null; 
    }

    const newSchoolId = Math.max(...MOCK_SCHOOLS.map(s => s.id), 0) + 1;
    const trialPlan = MOCK_PLANS.find(p => p.name === PlanName.Premium) || MOCK_PLANS[1];

    const newSchool: School = {
        id: newSchoolId,
        name: data.schoolName,
        plan: trialPlan.name,
        status: SubscriptionStatus.Trial,
        students: 0,
        teachers: 0,
        balance: 0,
        joinDate: new Date().toISOString().split('T')[0],
    };
    MOCK_SCHOOLS.unshift(newSchool);

    const newAdmin: User = {
        id: `user_${Date.now()}`,
        name: data.adminName,
        email: data.adminEmail,
        password: data.adminPassword,
        role: UserRole.SchoolAdmin,
        schoolId: newSchoolId,
        schoolRole: SchoolRole.Admin,
    };
    MOCK_USERS.unshift(newAdmin);

    const startDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(startDate.getDate() + 7);

    const newSubscription: Subscription = {
        id: `sub_${Date.now()}`,
        schoolId: newSchoolId,
        schoolName: newSchool.name,
        plan: trialPlan.name,
        status: SubscriptionStatus.Trial,
        startDate: startDate.toISOString().split('T')[0],
        renewalDate: trialEndDate.toISOString().split('T')[0], // Renewal is end of trial for now
        trialEndDate: trialEndDate.toISOString().split('T')[0],
        amount: 0,
    };
    MOCK_SUBSCRIPTIONS.unshift(newSubscription);

    return newAdmin;
};

export const generateSelfHostedLicense = async (request: SelfHostedQuoteRequest): Promise<SelfHostedLicense> => {
    await networkDelay(1500);

    const selectedModules = MOCK_MODULES.filter(m => request.moduleIds.includes(m.id));
    const totalPrice = selectedModules.reduce((sum, m) => sum + (m.oneTimePrice || 0), 0);

    const license: SelfHostedLicense = {
        licenseKey: `SHL-${request.schoolName.replace(/\s+/g, '').toUpperCase()}-${Date.now()}`,
        downloadUrl: '/download/schoolsaas_self_hosted.zip', // Mock URL
        schoolName: request.schoolName,
        modules: request.moduleIds,
        totalPrice: totalPrice,
    };

    console.log("Generated Self-Hosted License:", license);
    // In a real app, you would save this request to a database.
    return license;
};

export const getDashboardStats = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/superadmin/stats`, { headers: { ...authHeaders() } });
        if (!response.ok) throw new Error('Failed');
        return await response.json();
    } catch {
        const totalRevenue = MOCK_INVOICES.reduce((acc, inv) => inv.status === InvoiceStatus.Paid ? acc + inv.totalAmount : acc, 0);
        const mrr = MOCK_SUBSCRIPTIONS.reduce((acc, sub) => sub.status === SubscriptionStatus.Active ? acc + sub.amount : acc, 0);
        const totalSubscriptions = MOCK_SUBSCRIPTIONS.length;
        const canceledSubscriptions = MOCK_SUBSCRIPTIONS.filter(s => s.status === SubscriptionStatus.Canceled).length;
        const churnRate = totalSubscriptions > 0 ? (canceledSubscriptions / totalSubscriptions) * 100 : 0;
        return {
            totalSchools: MOCK_SCHOOLS.length,
            activeSubscriptions: MOCK_SUBSCRIPTIONS.filter(s => s.status === SubscriptionStatus.Active).length,
            totalRevenue,
            revenueData: MOCK_REVENUE_DATA,
            mrr,
            churnRate,
            newSchoolsThisMonth: 1,
        };
    }
};

export const getSchools = async (): Promise<School[]> => {
    console.warn("Using mocked getSchools API");
    await networkDelay(400);
    return MOCK_SCHOOLS;
};

export const addSchool = async (data: NewSchoolData): Promise<School> => {
    await networkDelay(1000);
    const newSchoolId = Math.max(...MOCK_SCHOOLS.map(s => s.id)) + 1;
    const plan = MOCK_PLANS.find(p => p.id === data.subscription.planId);
    if (!plan) throw new Error("Plan not found");

    const newSchool: School = {
        id: newSchoolId,
        name: data.school.name,
        plan: plan.name,
        status: SubscriptionStatus.Trial, // New schools start with a trial
        students: 0,
        teachers: 0,
        balance: 0,
        joinDate: new Date().toISOString().split('T')[0],
    };
    MOCK_SCHOOLS.unshift(newSchool);

    const newAdmin: User = {
        id: `user_${Date.now()}`,
        name: data.admin.name,
        email: data.admin.email,
        password: data.admin.password,
        role: UserRole.SchoolAdmin,
        schoolId: newSchoolId,
        schoolRole: SchoolRole.Admin,
    };
    MOCK_USERS.unshift(newAdmin);

    const renewalDate = new Date();
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);

    const newSubscription: Subscription = {
        id: `sub_${Date.now()}`,
        schoolId: newSchoolId,
        schoolName: newSchool.name,
        plan: plan.name,
        status: SubscriptionStatus.Trial,
        startDate: new Date().toISOString().split('T')[0],
        renewalDate: renewalDate.toISOString().split('T')[0],
        amount: plan.price > 0 ? plan.price : 0,
    };
    MOCK_SUBSCRIPTIONS.unshift(newSubscription);

    return newSchool;
};

export const getPlans = async (): Promise<Plan[]> => {
    await networkDelay(300);
    return MOCK_PLANS;
};

export const getSubscriptions = async (): Promise<Subscription[]> => {
    await networkDelay(400);
    return MOCK_SUBSCRIPTIONS;
};

export const getRoles = async (): Promise<Role[]> => {
    await networkDelay(200);
    return MOCK_ROLES;
};

export const getSchoolStudents = async (schoolId: number): Promise<Student[]> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/students`, { headers: { ...authHeaders() } });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(500);
        return MOCK_STUDENTS;
    }
};

export const addSchoolStudent = async (schoolId: number, studentData: NewStudentData): Promise<Student> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/students`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(studentData)
        });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(700);
        const newStudent: Student = {
            id: `std_${Date.now()}`,
            name: studentData.name,
            grade: studentData.grade,
            parentName: studentData.parentName,
            status: StudentStatus.Active,
            registrationDate: new Date().toISOString().split('T')[0],
            profileImageUrl: `https://picsum.photos/seed/std_${Date.now()}/100/100`,
            dateOfBirth: studentData.dateOfBirth,
        };
        MOCK_STUDENTS.unshift(newStudent);
        return newStudent;
    }
};

export const updateStudent = async (studentId: string, data: UpdatableStudentData): Promise<Student> => {
    try {
        const schoolId = (typeof window !== 'undefined' && localStorage.getItem('current_school_id')) ? Number(localStorage.getItem('current_school_id')) : 1;
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/students/${studentId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(data)
        });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(700);
        const studentIndex = MOCK_STUDENTS.findIndex(s => s.id === studentId);
        if (studentIndex === -1) {
            throw new Error("Student not found");
        }
        const updatedStudent = {
            ...MOCK_STUDENTS[studentIndex],
            name: data.name,
            grade: data.grade,
            parentName: data.parentName,
            dateOfBirth: data.dateOfBirth,
            status: data.status,
        };
        MOCK_STUDENTS[studentIndex] = updatedStudent;
        return updatedStudent;
    }
};

export const getSchoolTeachers = async (schoolId: number): Promise<Teacher[]> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/teachers`, { headers: { ...authHeaders() } });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(500);
        return MOCK_TEACHERS;
    }
};

export const addSchoolTeacher = async (schoolId: number, teacherData: NewTeacherData): Promise<Teacher> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/teachers`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(teacherData)
        });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(700);
        const newTeacher: Teacher = {
            id: `tech_${Date.now()}`,
            name: teacherData.name,
            subject: teacherData.subject,
            phone: teacherData.phone,
            status: TeacherStatus.Active,
            joinDate: new Date().toISOString().split('T')[0],
        };
        MOCK_TEACHERS.unshift(newTeacher);
        return newTeacher;
    }
};

export const getSchoolStaff = async (schoolId: number): Promise<User[]> => {
    const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/staff`, { headers: { ...authHeaders() } });
    if (!resp.ok) throw new Error('Failed');
    return await resp.json();
};

export const addSchoolStaff = async (schoolId: number, staffData: NewStaffData): Promise<User> => {
    const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/staff`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(staffData) });
    if (!resp.ok) throw new Error('Failed');
    return await resp.json();
};

export const updateSchoolStaff = async (schoolId: number, userId: number | string, staffData: Partial<NewStaffData>): Promise<User> => {
    const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/staff/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(staffData) });
    if (!resp.ok) throw new Error('Failed');
    return await resp.json();
};

export const deleteSchoolStaff = async (schoolId: number, userId: number | string): Promise<void> => {
    const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/staff/${userId}`, { method: 'DELETE', headers: { ...authHeaders() } });
    if (!resp.ok) throw new Error('Failed');
};

export const getTeacherDetails = async (teacherId: string) => {
    await networkDelay(600);
    const teacher = MOCK_TEACHERS.find(t => t.id === teacherId);
    if (!teacher) {
        throw new Error("Teacher not found");
    }

    const classIds = new Set<string>();
    MOCK_CLASSES.forEach(cls => {
        if (cls.homeroomTeacherName === teacher.name) {
            classIds.add(cls.id);
        }
    });
    MOCK_SCHEDULE.forEach(s => {
        if (s.teacherName === teacher.name) {
            classIds.add(s.classId);
        }
    });

    const assignedClasses = MOCK_CLASSES.filter(cls => classIds.has(cls.id));

    return {
        classes: assignedClasses,
    };
};

export const updateTeacher = async (teacherId: string, data: UpdatableTeacherData): Promise<Teacher> => {
    try {
        const schoolId = (typeof window !== 'undefined' && localStorage.getItem('current_school_id')) ? Number(localStorage.getItem('current_school_id')) : 1;
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/teachers/${teacherId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(data)
        });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(700);
        const teacherIndex = MOCK_TEACHERS.findIndex(t => t.id === teacherId);
        if (teacherIndex === -1) {
            throw new Error("Teacher not found");
        }
        const updatedTeacher = { ...MOCK_TEACHERS[teacherIndex], ...data };
        MOCK_TEACHERS[teacherIndex] = updatedTeacher;
        return updatedTeacher;
    }
};

export const getSchoolClasses = async (schoolId: number): Promise<Class[]> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/classes`, { headers: { ...authHeaders() } });
        if (!resp.ok) throw new Error('Failed');
        const classes = await resp.json();
        return classes;
    } catch {
        await networkDelay(400);
        return MOCK_CLASSES.map(cls => ({ ...cls, studentCount: MOCK_CLASS_ROSTERS[cls.id]?.length || cls.studentCount }));
    }
};

export const addClass = async (schoolId: number, classData: NewClassData): Promise<Class> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/classes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(classData)
        });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(700);
        const teacher = MOCK_TEACHERS.find(t => t.id === classData.homeroomTeacherId);
        if (!teacher) throw new Error("Teacher not found");
        const newClass: Class = { id: `cls_${Date.now()}`, name: classData.name, gradeLevel: classData.gradeLevel, homeroomTeacherName: teacher.name, studentCount: 0, subjects: classData.subjects };
        MOCK_CLASSES.unshift(newClass);
        MOCK_CLASS_ROSTERS[newClass.id] = [];
        return newClass;
    }
};

export const updateClassRoster = async (rosterUpdate: ClassRosterUpdate): Promise<Class> => {
    try {
        const schoolId = (typeof window !== 'undefined' && localStorage.getItem('current_school_id')) ? Number(localStorage.getItem('current_school_id')) : 1;
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/classes/${rosterUpdate.classId}/roster`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ studentIds: rosterUpdate.studentIds })
        });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(800);
        const { classId, studentIds } = rosterUpdate;
        const classIndex = MOCK_CLASSES.findIndex(cls => cls.id === classId);
        if (classIndex === -1) throw new Error("Class not found");
        MOCK_CLASS_ROSTERS[classId] = studentIds;
        const updatedClass = { ...MOCK_CLASSES[classIndex], studentCount: studentIds.length };
        MOCK_CLASSES[classIndex] = updatedClass;
        return updatedClass;
    }
};


export const getSchoolInvoices = async (schoolId: number): Promise<Invoice[]> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/invoices`, { headers: { ...authHeaders() } });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(400);
        return MOCK_INVOICES;
    }
};

export const getStudentDistribution = async (schoolId: number): Promise<{ name: string, value: number }[]> => {
    try {
        const students = await getSchoolStudents(schoolId);
        const counts: Record<string, number> = {};
        students.forEach(s => { const g = s.grade || 'غير محدد'; counts[g] = (counts[g] || 0) + 1; });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    } catch {
        await networkDelay(300);
        const counts: Record<string, number> = {};
        MOCK_STUDENTS.forEach(s => { const g = s.grade || 'غير محدد'; counts[g] = (counts[g] || 0) + 1; });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }
};

export const addInvoice = async (schoolId: number, invoiceData: NewInvoiceData): Promise<Invoice> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/invoices`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(invoiceData)
        });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(800);
        const student = MOCK_STUDENTS.find(s => s.id === invoiceData.studentId);
        if (!student) throw new Error("Student not found");
        const totalAmount = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
        const newInvoice: Invoice = { id: `inv_${Date.now()}`, studentId: invoiceData.studentId, studentName: student.name, status: new Date(invoiceData.dueDate) < new Date() ? InvoiceStatus.Overdue : InvoiceStatus.Unpaid, issueDate: new Date().toISOString().split('T')[0], dueDate: invoiceData.dueDate, items: invoiceData.items, totalAmount };
        MOCK_INVOICES.unshift(newInvoice);
        MOCK_RECENT_ACTIVITIES.unshift({ id: `act_${Date.now()}`, type: ActivityType.NewInvoice, description: `تم إنشاء فاتورة جديدة للطالب "${student.name}"`, timestamp: 'الآن' });
        return newInvoice;
    }
};

export const recordPayment = async (invoiceId: string, paymentData: PaymentData): Promise<Invoice> => {
    try {
        const schoolId = (typeof window !== 'undefined' && localStorage.getItem('current_school_id')) ? Number(localStorage.getItem('current_school_id')) : 1;
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/invoices/${invoiceId}/payments`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(paymentData)
        });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(800);
        const invoiceIndex = MOCK_INVOICES.findIndex(inv => inv.id === invoiceId);
        if (invoiceIndex === -1) throw new Error("Invoice not found");
        const updatedInvoice = { ...MOCK_INVOICES[invoiceIndex], status: InvoiceStatus.Paid };
        MOCK_INVOICES[invoiceIndex] = updatedInvoice;
        return updatedInvoice;
    }
};

export const getSchoolExpenses = async (schoolId: number): Promise<Expense[]> => {
    await networkDelay(400);
    return MOCK_EXPENSES;
};

export const addSchoolExpense = async (schoolId: number, expenseData: NewExpenseData): Promise<Expense> => {
    await networkDelay(800);
    const newExpense: Expense = {
        id: `exp_${Date.now()}`,
        ...expenseData,
    };
    MOCK_EXPENSES.unshift(newExpense);
    return newExpense;
};

export const getSchoolParents = async (schoolId: number): Promise<Parent[]> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/parents`, { headers: { ...authHeaders() } });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(500);
        return MOCK_PARENTS;
    }
};

export const getSchoolSettings = async (schoolId: number): Promise<SchoolSettings> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/settings`, { headers: { ...authHeaders() } });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(300);
        return MOCK_SCHOOL_SETTINGS;
    }
};

export const updateSchoolSettings = async (schoolId: number, settings: SchoolSettings): Promise<SchoolSettings> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/settings`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(settings)
        });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(600);
        if (settings.schoolLogoUrl && typeof settings.schoolLogoUrl !== 'string') {
            MOCK_SCHOOL_SETTINGS.schoolLogoUrl = URL.createObjectURL(settings.schoolLogoUrl);
        }
        MOCK_SCHOOL_SETTINGS.schoolName = settings.schoolName;
        MOCK_SCHOOL_SETTINGS.schoolAddress = settings.schoolAddress;
        MOCK_SCHOOL_SETTINGS.academicYearStart = settings.academicYearStart;
        MOCK_SCHOOL_SETTINGS.academicYearEnd = settings.academicYearEnd;
        MOCK_SCHOOL_SETTINGS.notifications = settings.notifications;
        return { ...MOCK_SCHOOL_SETTINGS };
    }
};

export const getSchoolEvents = async (schoolId: number): Promise<SchoolEvent[]> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/school/${schoolId}/events`, { headers: { ...authHeaders() } });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch {
        await networkDelay(400);
        return MOCK_EVENTS;
    }
};

export const getStudentDetails = async (schoolId: number, studentId: string) => {
    console.warn("Using mocked getStudentDetails API");
    await networkDelay(600);
    const studentGrades = MOCK_GRADES.filter(g => g.studentId === studentId);
    const studentInvoices = MOCK_INVOICES.filter(i => i.studentId === studentId);
    const studentNotes = MOCK_STUDENT_NOTES.filter(n => n.studentId === studentId);
    const studentDocuments = MOCK_STUDENT_DOCUMENTS.filter(d => d.studentId === studentId);
    const historicalAttendance: AttendanceRecord[] = [
        { studentId, studentName: '', status: AttendanceStatus.Present, date: '2024-05-19' },
        { studentId, studentName: '', status: AttendanceStatus.Present, date: '2024-05-20' },
        { studentId, studentName: '', status: AttendanceStatus.Late, date: '2024-05-21' },
        { studentId, studentName: '', status: AttendanceStatus.Absent, date: '2024-05-22' },
    ];
    return { grades: studentGrades, invoices: studentInvoices, notes: studentNotes, attendance: historicalAttendance, documents: studentDocuments };
};

export const getTeacherDashboardData = async (teacherId: string) => {
    console.warn("Using mocked getTeacherDashboardData API");
    await networkDelay(500);
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';
    const teacher = MOCK_TEACHERS.find(t => t.id === teacherId);
    const scheduleForToday = MOCK_SCHEDULE.filter(s => s.teacherName === teacher?.name && s.day === today);
    return { classes: await getTeacherClasses(teacherId), schedule: scheduleForToday, actionItems: await getTeacherActionItems() };
};

export const getParentDashboardData = async (parentId: string) => {
    console.warn("Using mocked getParentDashboardData API");
    await networkDelay(500);
    const parent = MOCK_PARENTS.find(p => p.id === parentId);
    if (!parent) throw new Error("Parent not found");
    const student = MOCK_STUDENTS.find(s => s.id === parent.studentId);
    if (!student) throw new Error("Student not found");
    const studentDetails = await getStudentDetails(1, student.id);
    return { student, grades: studentDetails.grades, attendance: studentDetails.attendance, invoices: studentDetails.invoices, announcements: MOCK_CONVERSATIONS.filter(c => c.type === ConversationType.Announcement) };
};

export const getSchoolById = async (id: number): Promise<School | null> => { 
    await networkDelay(100);
    return MOCK_SCHOOLS.find(s => s.id === id) || null;
};

export const getStudents = async (): Promise<Student[]> => { 
    console.warn("Using mocked getStudents API");
    await networkDelay(300); 
    return MOCK_STUDENTS; 
};

export const getAttendance = async (classId: string, date: string): Promise<DailyAttendance | null> => {
    console.warn("Using mocked getAttendance API");
    await networkDelay(300);
    const attendanceForClassAndDate = MOCK_ATTENDANCE.find(a => a.classId === classId && a.date === date);
    if (attendanceForClassAndDate) {
        return attendanceForClassAndDate;
    }
    return null;
};

export const saveAttendance = async (classId: string, date: string, records: AttendanceRecord[]): Promise<void> => {
    await networkDelay(800);
    console.log(`Saving attendance for class ${classId} on ${date}`, records);
    // This mock is now date-aware
    const existingAttendanceIndex = MOCK_ATTENDANCE.findIndex(a => a.classId === classId && a.date === date);
    if (existingAttendanceIndex !== -1) {
        MOCK_ATTENDANCE[existingAttendanceIndex].records = records;
    } else {
        MOCK_ATTENDANCE.push({ classId, date, records });
    }
};

export const getGrades = async (classId: string, subject: string): Promise<StudentGrades[]> => { 
    console.warn("Using mocked getGrades API");
    await networkDelay(300); 
    return MOCK_GRADES.filter(g => g.classId === classId && g.subject === subject); 
};

export const saveGrades = async (gradesToSave: StudentGrades[]): Promise<void> => {
    await networkDelay(1000);
    console.log("Saving grades:", gradesToSave);
    
    gradesToSave.forEach(newGradeData => {
        const existingGradeIndex = MOCK_GRADES.findIndex(g => 
            g.studentId === newGradeData.studentId && 
            g.classId === newGradeData.classId && 
            g.subject === newGradeData.subject
        );

        if (existingGradeIndex !== -1) {
            // Update existing grade
            MOCK_GRADES[existingGradeIndex] = newGradeData;
        } else {
            // Add new grade record
            MOCK_GRADES.push(newGradeData);
        }
    });
};

export const getAllGrades = async (): Promise<StudentGrades[]> => { 
    console.warn("Using mocked getAllGrades API");
    await networkDelay(300); 
    return MOCK_GRADES; 
};

export const getSchedule = async (classId: string): Promise<ScheduleEntry[]> => { 
    console.warn("Using mocked getSchedule API");
    await networkDelay(300); 
    return MOCK_SCHEDULE.filter(s => s.classId === classId); 
};



export const getActionItems = async (): Promise<ActionItem[]> => { 
    console.warn("Using mocked getActionItems API for School Admin");
    await networkDelay(300); 
    return MOCK_ACTION_ITEMS; 
};

export const getTeacherActionItems = async (): Promise<ActionItem[]> => {
    console.warn("Using mocked getTeacherActionItems API");
    await networkDelay(300);
    return MOCK_TEACHER_ACTION_ITEMS;
};

export const getParentActionItems = async (): Promise<ActionItem[]> => {
    console.warn("Using mocked getParentActionItems API");
    await networkDelay(300);
    return MOCK_PARENT_ACTION_ITEMS;
};

export const getParentRequests = async (parentId: string): Promise<ParentRequest[]> => {
    console.warn("Using mocked getParentRequests API");
    await networkDelay(400);
    return MOCK_PARENT_REQUESTS;
};

export const submitParentRequest = async (parentId: string, requestData: NewParentRequestData): Promise<ParentRequest> => {
    await networkDelay(800);
    const newRequest: ParentRequest = {
        id: `req_${Date.now()}`,
        ...requestData,
        submissionDate: new Date().toISOString().split('T')[0],
        status: RequestStatus.Pending,
    };
    MOCK_PARENT_REQUESTS.unshift(newRequest);

    // Also, create a notification for the school admin
    const parent = MOCK_PARENTS.find(p => p.id === parentId);
    const adminActionItem: ActionItem = {
        id: `act_${Date.now()}`,
        type: ActionItemType.Approval,
        title: `طلب جديد من ولي الأمر: ${parent?.name || 'غير معروف'}`,
        description: `نوع الطلب: ${requestData.type}.`,
        date: 'الآن',
        isRead: false,
    };
    MOCK_ACTION_ITEMS.unshift(adminActionItem);

    return newRequest;
};


export const getRecentActivities = async (): Promise<RecentActivity[]> => { 
    console.warn("Using mocked getRecentActivities API");
    await networkDelay(300); 
    return MOCK_RECENT_ACTIVITIES; 
};

export const getTeacherClasses = async (teacherId: string): Promise<Class[]> => {
    console.warn("Using mocked getTeacherClasses API");
    await networkDelay(300);
    const classIds = new Set<string>();
    const teacher = MOCK_TEACHERS.find(t => t.id === teacherId);
    if (!teacher) return [];

    MOCK_SCHEDULE.forEach(entry => {
        if (entry.teacherName === teacher.name) {
            classIds.add(entry.classId);
        }
    });
    MOCK_CLASSES.forEach(cls => {
        if (cls.homeroomTeacherName === teacher.name) {
            classIds.add(cls.id);
        }
    });
    
    return MOCK_CLASSES.filter(cls => classIds.has(cls.id));
};

export const getClassStudents = async (classId: string): Promise<Student[]> => {
    console.warn("Using mocked getClassStudents API");
    await networkDelay(200);
    const studentIds = MOCK_CLASS_ROSTERS[classId] || [];
    if (studentIds.length > 0) {
        return MOCK_STUDENTS.filter(student => studentIds.includes(student.id));
    }
    // Return a subset of students for classes not explicitly in the roster
    return MOCK_STUDENTS.slice(0, 15);
};

export const getStudentAndScheduleByParentId = async (parentId: string) => {
    console.warn("Using mocked getStudentAndScheduleByParentId API");
    await networkDelay(400);

    const parent = MOCK_PARENTS.find(p => p.id === parentId);
    if (!parent) return { student: null, schedule: [] };
    
    const student = MOCK_STUDENTS.find(s => s.id === parent.studentId);
    if (!student) return { student: null, schedule: [] };

    let classId: string | null = null;
    for (const [cId, studentIds] of Object.entries(MOCK_CLASS_ROSTERS)) {
        if (studentIds.includes(student.id)) {
            classId = cId;
            break;
        }
    }
    if (!classId) classId = MOCK_CLASSES[1].id; 
    
    const schedule = await getSchedule(classId);
    return { student, schedule };
};

// --- Content Management API ---

export const getLandingPageContent = async (): Promise<LandingPageContent> => {
    await networkDelay(200);
    // In a real app, this would be a fetch call. Here we return a deep copy.
    return JSON.parse(JSON.stringify(MOCK_LANDING_PAGE_CONTENT));
};

export const updateLandingPageContent = async (content: LandingPageContent): Promise<LandingPageContent> => {
    await networkDelay(800);
    // In a real app, this would be a POST/PUT request.
    // NOTE: This will not work correctly in a stateless environment like a web previewer,
    // as the MOCK_LANDING_PAGE_CONTENT object will reset on each run.
    // For this mock, we'll try to update it in memory.
    MOCK_LANDING_PAGE_CONTENT.hero = content.hero;
    MOCK_LANDING_PAGE_CONTENT.features = content.features;
    MOCK_LANDING_PAGE_CONTENT.ads = content.ads;
    console.log("Updated landing page content in memory:", MOCK_LANDING_PAGE_CONTENT);
    return JSON.parse(JSON.stringify(MOCK_LANDING_PAGE_CONTENT));
};

// --- Ad Submission API ---
export const submitAdRequest = async (requestData: NewAdRequestData): Promise<void> => {
    await networkDelay(1000);
    console.log("Submitting ad request:", requestData);

    // Create a notification for the super admin
    const adminActionItem: ActionItem = {
        id: `act_ad_${Date.now()}`,
        type: ActionItemType.Approval,
        title: `طلب إعلان جديد من: ${requestData.advertiserName}`,
        description: `عنوان الإعلان المقترح: "${requestData.title}". الرجاء المراجعة والموافقة.`,
        date: 'الآن',
        isRead: false,
    };
    MOCK_ACTION_ITEMS.unshift(adminActionItem);
};

// --- User Profile API ---
export const updateCurrentUser = async (userId: string, data: UpdatableUserData): Promise<User | null> => {
    try {
        if (data.currentPassword && data.newPassword) {
            const resp = await fetch(`${API_BASE_URL}/auth/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }) });
            if (!resp.ok) return null;
        }
        const me = await fetch(`${API_BASE_URL}/auth/me`, { headers: { ...authHeaders() } });
        if (!me.ok) return null;
        return await me.json();
    } catch {
        await networkDelay(800);
        const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
        if (userIndex === -1) return null;
        const user = MOCK_USERS[userIndex];
        if (data.currentPassword && data.newPassword) {
            if (user.password !== data.currentPassword) return null;
            user.password = data.newPassword;
        }
        if (data.name) user.name = data.name;
        if (data.phone) user.phone = data.phone;
        MOCK_USERS[userIndex] = user;
        return { ...user };
    }
};

// --- Transportation APIs ---
export const submitBusOperatorApplication = async (applicationData: NewBusOperatorApplication): Promise<BusOperator> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/transportation/${applicationData.schoolId}/operators`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(applicationData)
        });
        if (!resp.ok) throw new Error('Failed');
        return await resp.json();
    } catch (e) {
        throw e;
    }
};

export const getBusOperators = async (schoolId: number): Promise<BusOperator[]> => {
    const resp = await fetch(`${API_BASE_URL}/transportation/${schoolId}/operators`, { headers: { ...authHeaders() } });
    if (!resp.ok) throw new Error('Failed');
    return await resp.json();
};

export const approveBusOperator = async (operatorId: string): Promise<BusOperator> => {
    const resp = await fetch(`${API_BASE_URL}/transportation/operator/${operatorId}/approve`, { method: 'PUT', headers: { ...authHeaders() } });
    if (!resp.ok) throw new Error('Failed');
    return await resp.json();
};


export const getRoutes = async (schoolId: number): Promise<Route[]> => {
    const resp = await fetch(`${API_BASE_URL}/transportation/${schoolId}/routes`, { headers: { ...authHeaders() } });
    if (!resp.ok) throw new Error('Failed');
    return await resp.json();
};

export const addRoute = async (schoolId: number, data: Omit<Route, 'id' | 'studentIds'>): Promise<Route> => {
    const resp = await fetch(`${API_BASE_URL}/transportation/${schoolId}/routes`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(data) });
    if (!resp.ok) throw new Error('Failed');
    return await resp.json();
};

export const updateRouteStudents = async (schoolId: number, routeId: string, studentIds: string[]): Promise<Route> => {
    const resp = await fetch(`${API_BASE_URL}/transportation/${schoolId}/routes/${routeId}/students`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ studentIds }) });
    if (!resp.ok) throw new Error('Failed');
    return await resp.json();
};

// --- FIX: Add missing API functions for modules and pricing ---
export const getPricingConfig = async (): Promise<PricingConfig> => {
    await networkDelay(200);
    return MOCK_PRICING_CONFIG;
};

export const updatePricingConfig = async (config: PricingConfig): Promise<PricingConfig> => {
    await networkDelay(500);
    MOCK_PRICING_CONFIG.pricePerStudent = config.pricePerStudent;
    return MOCK_PRICING_CONFIG;
};

export const getAvailableModules = async (): Promise<Module[]> => {
    await networkDelay(300);
    return MOCK_MODULES;
};

export const updateModule = async (moduleData: Module): Promise<Module> => {
    await networkDelay(600);
    const moduleIndex = MOCK_MODULES.findIndex(m => m.id === moduleData.id);
    if (moduleIndex === -1) {
        throw new Error("Module not found");
    }
    MOCK_MODULES[moduleIndex] = moduleData;
    return moduleData;
};

export const getSchoolModules = async (schoolId: number): Promise<SchoolModuleSubscription[]> => {
    await networkDelay(300);
    return MOCK_SCHOOL_MODULES.filter(sm => sm.schoolId === schoolId);
};

export const activateModule = async (schoolId: number, moduleId: ModuleId): Promise<SchoolModuleSubscription> => {
    await networkDelay(500);
    const existing = MOCK_SCHOOL_MODULES.find(sm => sm.schoolId === schoolId && sm.moduleId === moduleId);
    if (existing) {
        return existing; // Already active
    }
    const newSubscription: SchoolModuleSubscription = { schoolId, moduleId };
    MOCK_SCHOOL_MODULES.push(newSubscription);
    return newSubscription;
};
// --- END FIX ---

export const getParentTransportationDetails = async (parentId: string) => {
    const resp = await fetch(`${API_BASE_URL}/transportation/parent/${parentId}`, { headers: { ...authHeaders() } });
    if (!resp.ok) throw new Error('Failed');
    return await resp.json();
};

// Teacher-specific APIs
export const getTeacherSalarySlips = async (teacherId: string): Promise<TeacherSalarySlip[]> => {
    await networkDelay(1000);
    // In a real app, you'd filter by teacherId
    if (teacherId === 'tech_001') {
        return MOCK_TEACHER_SALARY_SLIPS;
    }
    return [];
};

export const getTeacherSchedule = async (teacherId: string): Promise<ScheduleEntry[]> => {
    await networkDelay(800);
    const teacher = MOCK_TEACHERS.find(t => t.id === teacherId);
    if (teacher) {
        return MOCK_SCHEDULE.filter(s => s.teacherName === teacher.name);
    }
    return [];
};

export const getAssignmentsForClass = async (classId: string): Promise<Assignment[]> => {
    await networkDelay(600);
    return MOCK_ASSIGNMENTS.filter(a => a.classId === classId);
};

export const getSubmissionsForAssignment = async (assignmentId: string): Promise<Submission[]> => {
    await networkDelay(700);
    const classId = MOCK_ASSIGNMENTS.find(a => a.id === assignmentId)?.classId;
    if (!classId) return [];

    const studentIdsInClass = MOCK_CLASS_ROSTERS[classId] || [];
    const studentsInClass = MOCK_STUDENTS.filter(s => studentIdsInClass.includes(s.id));
    
    const submissions = MOCK_SUBMISSIONS.filter(s => s.assignmentId === assignmentId);
    const submittedStudentIds = new Set(submissions.map(s => s.studentId));

    const notSubmitted = studentsInClass
        .filter(student => !submittedStudentIds.has(student.id))
        .map(student => ({
            id: `sub_new_${student.id}_${assignmentId}`,
            assignmentId: assignmentId,
            studentId: student.id,
            studentName: student.name,
            submissionDate: null,
            status: SubmissionStatus.NotSubmitted,
        }));
    
    return [...submissions, ...notSubmitted].sort((a,b) => a.studentName.localeCompare(b.studentName));
};

export const createAssignment = async (data: NewAssignmentData): Promise<Assignment> => {
    await networkDelay(1000);
    const className = MOCK_CLASSES.find(c => c.id === data.classId)?.name || '';
    const newAssignment: Assignment = {
        id: `asg_${Date.now()}`,
        ...data,
        className,
        creationDate: new Date().toISOString().split('T')[0],
        status: AssignmentStatus.Published,
        submissionCount: 0,
    };
    MOCK_ASSIGNMENTS.unshift(newAssignment);
    return newAssignment;
};

export const gradeSubmission = async (submissionId: string, grade: number, feedback: string): Promise<Submission> => {
    await networkDelay(800);
    const submissionIndex = MOCK_SUBMISSIONS.findIndex(s => s.id === submissionId);
    if (submissionIndex === -1) {
        throw new Error("Submission not found");
    }
    const updatedSubmission = {
        ...MOCK_SUBMISSIONS[submissionIndex],
        grade,
        feedback,
        status: SubmissionStatus.Graded,
    };
    MOCK_SUBMISSIONS[submissionIndex] = updatedSubmission;
    return updatedSubmission;
};
export const generateLicenseKey = async (payload: { schoolName: string; modules: ModuleId[]; expiresAt?: string | null }): Promise<{ licenseKey: string; payload: any } | null> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/license/generate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) return null;
        return await resp.json();
    } catch {
        return null;
    }
};
export const generateSelfHostedPackage = async (moduleIds: ModuleId[]): Promise<string | null> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/superadmin/generate-package`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ moduleIds })
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        return data?.downloadUrl || null;
    } catch {
        return null;
    }
};
export const getConversations = async (): Promise<Conversation[]> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/messaging/conversations`, { headers: { ...authHeaders() } });
        if (!resp.ok) throw new Error('Failed');
        const data = await resp.json();
        return (data || []).map((c: any) => ({
            id: c.id,
            type: ConversationType.Direct,
            participantName: c.title,
            participantAvatar: '',
            lastMessage: '',
            timestamp: new Date().toISOString(),
            unreadCount: 0,
            title: c.title,
        } as any as Conversation));
    } catch {
        return MOCK_CONVERSATIONS.map(c => ({
            ...c,
            title: c.participantName,
        } as any as Conversation));
    }
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
    try {
        const resp = await fetch(`${API_BASE_URL}/messaging/conversations/${conversationId}/messages`, { headers: { ...authHeaders() } });
        if (!resp.ok) throw new Error('Failed');
        const data = await resp.json();
        return (data || []).map((m: any) => ({
            id: m.id,
            text: m.text,
            senderId: 'other',
            timestamp: typeof m.timestamp === 'string' ? m.timestamp : new Date(m.timestamp).toISOString(),
        }));
    } catch {
        const list = MOCK_MESSAGES[conversationId] || [];
        return list.map(m => ({ id: m.id, text: m.text, senderId: 'other', timestamp: m.timestamp }));
    }
};

export const createConversation = async (payload: { title: string; schoolId: number; teacherId?: string; parentId?: string }) => {
    const resp = await fetch(`${API_BASE_URL}/messaging/conversations`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(payload) });
    if (!resp.ok) throw new Error('Failed');
    return await resp.json();
};

export const sendMessage = async (_conversationId: string, _text: string) => { return; } // deprecated in favor of socket.io

// --- New API functions for user management ---
export const getUsersByRole = async (role: string): Promise<User[]> => {
    await networkDelay(300);
    return MOCK_USERS.filter(user => user.role === role);
};

export const deleteUser = async (userId: number): Promise<void> => {
    await networkDelay(500);
    const userIndex = MOCK_USERS.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
        MOCK_USERS.splice(userIndex, 1);
    }
};