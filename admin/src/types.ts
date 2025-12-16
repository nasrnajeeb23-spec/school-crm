export enum SubscriptionStatus {
  Active = 'نشط',
  Inactive = 'غير نشط',
  Trial = 'فترة تجريبية',
  Canceled = 'ملغي',
  PastDue = 'متأخر الدفع',
}

export enum PlanName {
  Basic = 'الأساسية',
  Premium = 'المميزة',
  Enterprise = 'المؤسسات',
}

export enum StudentStatus {
    Active = 'نشط',
    Suspended = 'موقوف',
}

export enum TeacherStatus {
    Active = 'نشط',
    OnLeave = 'في إجازة',
}

export enum AttendanceStatus {
    Present = 'حاضر',
    Absent = 'غائب',
    Late = 'متأخر',
    Excused = 'بعذر',
}

export enum InvoiceStatus {
    Paid = 'مدفوعة',
    Unpaid = 'غير مدفوعة',
    Overdue = 'متأخرة',
}

export enum ParentAccountStatus {
    Active = 'نشط',
    Invited = 'مدعو',
}

export enum UserRole {
  SuperAdmin = 'SUPER_ADMIN',
  SuperAdminFinancial = 'SUPER_ADMIN_FINANCIAL',
  SuperAdminTechnical = 'SUPER_ADMIN_TECHNICAL',
  SuperAdminSupervisor = 'SUPER_ADMIN_SUPERVISOR',
  SchoolAdmin = 'SCHOOL_ADMIN',
  Teacher = 'TEACHER',
  Parent = 'PARENT',
  Driver = 'DRIVER', // New role for bus drivers
  Staff = 'STAFF',
}

export enum SchoolRole {
    Admin = 'مدير',
    Registrar = 'مسؤول تسجيل',
    Accountant = 'مسؤول مالي',
    AcademicCoordinator = 'منسق أكاديمي',
    Secretary = 'سكرتير',
    Supervisor = 'مشرف',
}

export enum Permission {
    VIEW_DASHBOARD = 'VIEW_DASHBOARD',
    MANAGE_STUDENTS = 'MANAGE_STUDENTS',
    MANAGE_TEACHERS = 'MANAGE_TEACHERS',
    MANAGE_PARENTS = 'MANAGE_PARENTS',
    MANAGE_CLASSES = 'MANAGE_CLASSES',
    MANAGE_ATTENDANCE = 'MANAGE_ATTENDANCE',
    MANAGE_SCHEDULE = 'MANAGE_SCHEDULE',
    MANAGE_CALENDAR = 'MANAGE_CALENDAR',
    MANAGE_GRADES = 'MANAGE_GRADES',
    MANAGE_MESSAGING = 'MANAGE_MESSAGING',
    MANAGE_FINANCE = 'MANAGE_FINANCE',
    MANAGE_REPORTS = 'MANAGE_REPORTS',
    MANAGE_SETTINGS = 'MANAGE_SETTINGS',
    MANAGE_STAFF = 'MANAGE_STAFF',
    MANAGE_TRANSPORTATION = 'MANAGE_TRANSPORTATION',
    MANAGE_MODULES = 'MANAGE_MODULES', // New permission for school admin
}

export enum ModuleId {
    StudentManagement = 'student_management',
    AcademicManagement = 'academic_management',
    Finance = 'finance',
    FinanceFees = 'finance_fees',
    FinanceSalaries = 'finance_salaries',
    FinanceExpenses = 'finance_expenses',
    Transportation = 'transportation',
    AdvancedReports = 'advanced_reports',
    ParentPortal = 'parent_portal',
    TeacherPortal = 'teacher_portal',
    TeacherApp = 'teacher_app',
}


export enum ActionItemType {
    Warning = 'warning',
    Info = 'info',
    Approval = 'approval',
    DriverApplication = 'driver_application',
    PaymentVerification = 'payment_verification',
}

export enum ConversationType {
    Direct = 'مباشرة',
    Group = 'مجموعة',
    Announcement = 'إعلان',
}

export enum ActivityType {
    NewStudent = 'طالب جديد',
    GradeSubmission = 'تسليم درجات',
    NewInvoice = 'فاتورة جديدة',
    TeacherOnLeave = 'معلم في إجازة',
}

export enum SchoolEventType {
    Meeting = 'اجتماع',
    Activity = 'نشاط',
    Exam = 'اختبار',
    Holiday = 'عطلة',
}

export enum RequestType {
    Leave = 'طلب إجازة',
    Meeting = 'طلب اجتماع',
    InfoUpdate = 'طلب تحديث بيانات',
    Other = 'أخرى',
}

export enum RequestStatus {
    Pending = 'قيد المراجعة',
    Approved = 'تمت الموافقة',
    Rejected = 'مرفوض',
}

export enum BusOperatorStatus {
    Pending = 'قيد المراجعة',
    Approved = 'معتمد',
    Rejected = 'مرفوض',
}

export enum ExpenseCategory {
    Salaries = 'رواتب',
    Utilities = 'فواتير خدمات',
    Supplies = 'مستلزمات',
    Maintenance = 'صيانة',
    PettyCash = 'نثريات',
    Other = 'أخرى',
}

export enum PaymentMethod {
    BankDeposit = 'إيداع بنكي',
    WireTransfer = 'حوالة شبكية',
}

export enum AssignmentStatus {
    Published = 'منشور',
    Draft = 'مسودة',
}

export enum SubmissionStatus {
    Submitted = 'تم التسليم',
    NotSubmitted = 'لم يسلم',
    Late = 'متأخر',
    Graded = 'تم التقييم',
}

export interface BankDetails {
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban: string;
}

export interface PaymentProofSubmission {
    method: PaymentMethod;
    amount: number;
    reference: string;
    proofImage?: File; 
    relatedService: string; 
    schoolName: string;
}

export interface Module {
    id: ModuleId;
    name: string;
    description: string;
    monthlyPrice: number;
    oneTimePrice?: number;
    annualPrice?: number;
    isEnabled: boolean;
    isCore?: boolean;
    isSystem?: boolean;
    currency?: string;
}

export interface SchoolModuleSubscription {
    schoolId: number;
    moduleId: ModuleId;
}

export interface PricingConfig {
  pricePerStudent: number;
  pricePerTeacher: number;
  pricePerGBStorage: number;
  pricePerInvoice: number;
  pricePerEmail?: number;
  pricePerSMS?: number;
  currency?: string;
  yearlyDiscountPercent?: number;
}

export interface SubscriptionState {
  subscription: { status: string; startDate: string | null; endDate: string | null; renewalDate: string | null; trialExpired: boolean; daysLeft?: number };
  modules?: { allowed: string[]; active: string[] };
  plan?: { id?: string | number; name?: string; price?: number; limits?: any } | any;
  limits?: { students: number | 'غير محدود'; teachers: number | 'غير محدود'; invoices?: number | 'غير محدود'; storageGB?: number | 'غير محدود'; source: string };
  usage?: { students: number; teachers: number; invoices?: number; storageGB?: number };
  packs?: Array<{ type: 'students' | 'teachers' | 'invoices' | 'storageGB'; qty: number; price?: number }>;
  billing?: { mode: 'hard_cap' | 'overage'; planPrice?: number; packTotal?: number; overageEstimate?: { students: number; teachers: number; invoices: number; storageGB: number; total: number; currency: string }; totalEstimated?: number };
}

export interface Expense {
    id: string;
    description: string;
    amount: number;
    date: string;
    category: ExpenseCategory;
    recipient?: string;
}

export interface NewExpenseData {
    description: string;
    amount: number;
    date: string;
    category: ExpenseCategory;
    recipient?: string;
}

export interface ParentRequest {
    id: string;
    type: RequestType;
    details: string;
    submissionDate: string;
    status: RequestStatus;
}

export interface NewParentRequestData {
    type: RequestType;
    details: string;
}


export interface RecentActivity {
    id: string;
    type: ActivityType;
    description: string;
    timestamp: string; // e.g., "منذ 5 دقائق"
}

export interface SchoolSettings {
    schoolName: string;
    schoolAddress: string;
    schoolLogoUrl?: string | File;
    contactPhone?: string;
    contactEmail?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    currency?: string;
    geoLocation?: string;
    genderType?: string; // بنين/بنات/مختلط
    levelType?: string; // أساسي/ثانوي
    ownershipType?: string; // أهلي/حكومي
    availableStages?: string[];
    workingHoursStart?: string; // HH:MM
    workingHoursEnd?: string; // HH:MM
    workingDays?: string[]; // e.g. ['Sunday','Monday','Tuesday','Wednesday','Thursday']
    academicYearStart: string; // YYYY-MM-DD
    academicYearEnd: string; // YYYY-MM-DD
    lessonStartTime?: string;
    lateThresholdMinutes?: number;
    departureTime?: string;
    attendanceMethods?: ('QR'|'RFID'|'Manual')[];
    terms?: { name: string; start: string; end: string; }[];
    holidays?: { date: string; title: string; }[];
    defaultCurrency?: string;
    allowedCurrencies?: string[];
    notifications: {
        email: boolean;
        sms: boolean;
        push: boolean;
    };
    emailConfig?: {
        usePlatformProvider?: boolean;
        host?: string;
        port?: number;
        secure?: boolean;
        user?: string;
        pass?: string;
        from?: string;
    };
    smsConfig?: {
        usePlatformProvider?: boolean;
        provider?: 'twilio' | string;
        accountSid?: string;
        authToken?: string;
        from?: string;
    };
    scheduleConfig?: {
        periodCount: number;
        periodDurationMinutes: number;
        startTime: string;
        gapMinutes?: number;
    };
    admissionForm?: {
        studentFields?: string[];
        parentFields?: string[];
        requiredDocuments?: string[];
        registrationFee?: number;
        consentFormRequired?: boolean;
        consentFormText?: string;
        autoGenerateRegistrationInvoice?: boolean;
        registrationFeeDueDays?: number;
    };
}


export interface ActionItem {
    id: string;
    type: ActionItemType;
    title: string;
    description: string;
    date: string;
    isRead?: boolean;
}

export interface SchoolEvent {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    time: string;
    eventType: SchoolEventType;
}

export interface BehaviorRecord {
  id: number;
  schoolId: number;
  studentId: string;
  type: 'Positive' | 'Negative';
  title: string;
  description?: string;
  date: string;
  recordedBy?: string;
  actionTaken?: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  password?: string; // In a real app, this would be a hash, but for mock data it's fine.
  role: UserRole | string;
  schoolId?: number | null; // Optional, only for SchoolAdmins, Teachers, Parents
  teacherId?: string; // Optional, only for Teachers
  parentId?: string; // Optional, only for Parents
  name: string;
  schoolRole?: SchoolRole; // For staff members
  phone?: string;
  username?: string;
  passwordMustChange?: boolean;
  tokenVersion?: number;
  isActive?: boolean;
  department?: string;
  bankAccount?: string;
  createdAt?: string;
  avatar?: string;
  permissions?: string[];
}

export interface NewStaffData {
    name: string;
    email: string;
    role: SchoolRole;
    phone?: string;
    department?: string;
    bankAccount?: string;
    isActive?: boolean;
}


export interface UsageLimit {
  students: number | 'غير محدود';
  teachers: number | 'غير محدود';
  storageGB: number | 'غير محدود';
  branches: number | 'غير محدود';
  invoices: number | 'غير محدود';
  packs?: Array<{ type: 'students' | 'teachers' | 'invoices' | 'storageGB'; qty: number; price?: number }>;
  hardCap?: boolean;
  allowOverage?: boolean;
}

export interface Plan {
  id: string;
  name: PlanName;
  price: number;
  pricePeriod: string;
  features: string[];
  limits: UsageLimit;
  recommended?: boolean;
}

export interface School {
  id: number;
  name: string;
  plan?: PlanName | string | null;
  status: SubscriptionStatus;
  students: number;
  teachers: number;
  balance: number; // in USD
  joinDate: string;
  logoUrl?: string | null;
}

export interface Subscription {
  id: string;
  schoolId: number;
  schoolName: string;
  plan?: PlanName | string | null;
  planName?: string | null;
  status: SubscriptionStatus;
  startDate: string;
  renewalDate: string;
  endDate?: string | null;
  amount: number;
  trialEndDate?: string;
  customLimits?: UsageLimit;
  modules?: SchoolModuleSubscription[];
}

export interface RevenueData {
  month: string;
  revenue: number;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
}

export interface Student {
    id: string;
    name: string;
    grade: string;
    classId?: string;
    parentName: string;
    status: StudentStatus;
    registrationDate: string;
    profileImageUrl: string;
    dateOfBirth: string;
    homeLocation?: { address?: string; city?: string; lat?: number; lng?: number } | null;
}

export interface NewStudentData {
    name: string;
    grade: string;
    parentName: string;
    dateOfBirth: string;
    gender: 'ذكر' | 'أنثى';
    nationalId?: string;
    parentPhone: string;
    parentEmail: string;
    address: string;
    city: string;
    lat?: number;
    lng?: number;
    admissionDate: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    medicalNotes?: string;
}

export interface UpdatableStudentData {
    name: string;
    grade: string;
    parentName: string;
    dateOfBirth: string;
    status: StudentStatus;
}

export interface StudentNote {
    id: string;
    studentId: string;
    author: string;
    content: string;
    date: string;
}

export interface Teacher {
    id: string;
    name: string;
    subject: string;
    phone: string;
    status: TeacherStatus;
    joinDate: string;
    department?: string;
    bankAccount?: string;
    lastInviteAt?: string;
    lastInviteChannel?: 'email' | 'sms' | 'manual' | string;
}

export interface NewTeacherData {
    name: string;
    subject: string;
    phone: string;
    department?: string;
    bankAccount?: string;
    email?: string;
}

export interface UpdatableTeacherData {
    name: string;
    subject: string;
    phone: string;
    status: TeacherStatus;
    department?: string;
    bankAccount?: string;
}

export interface Class {
  id: string;
  name: string;
  gradeLevel: string;
  homeroomTeacherName: string;
  homeroomTeacherId?: string | number;
  studentCount: number;
  capacity?: number;
  subjects: string[];
  subjectTeacherMap?: Record<string, string | number>;
  section?: string;
}

export interface NewClassData {
  name: string;
  gradeLevel: string;
  homeroomTeacherId: string;
  capacity?: number;
  subjects: string[];
  section?: string;
}

export interface ClassRosterUpdate {
    classId: string;
    studentIds: string[];
    schoolId?: number;
}

export interface AttendanceRecord {
    studentId: string;
    studentName: string;
    status: AttendanceStatus;
    // FIX: Added optional date property to support historical attendance data.
    date?: string;
}

export interface DailyAttendance {
    classId: string;
    date: string; // YYYY-MM-DD
    records: AttendanceRecord[];
}

export interface Grade {
    homework: number; // out of 10
    quiz: number; // out of 15
    midterm: number; // out of 25
    final: number; // out of 50
}

export interface StudentGrades {
    classId: string;
    subject: string;
    studentId: string;
    studentName: string;
    grades: Grade;
}

export interface ScheduleEntry {
  id: string;
  classId: string;
  className?: string;
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';
  timeSlot: string; // e.g., "08:00 - 09:00"
  subject: string;
  teacherName: string;
}

export interface Message {
    id: string;
    senderId: 'me' | 'other'; // 'me' for the school admin, 'other' for the parent/teacher
    text: string;
    timestamp: string;
}

export interface Conversation {
    id: string;
    roomId: string;
    type: ConversationType;
    title?: string;
    participantName: string;
    participantAvatar: string;
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
}

export interface InvoiceItem {
    description: string;
    amount: number;
}

export interface Invoice {
    id: string;
    studentId: string;
    studentName: string;
    status: InvoiceStatus;
    issueDate: string;
    dueDate: string;
    items: InvoiceItem[];
    totalAmount: number;
    paidAmount?: number;
    remainingAmount?: number;
}

export interface NewInvoiceData {
    studentId: string;
    dueDate: string;
    items: InvoiceItem[];
}

export interface PaymentData {
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    notes?: string;
}

export interface Parent {
    id: string;
    name: string;
    studentName: string;
    email: string;
    phone: string;
    status: ParentAccountStatus;
    studentId: string;
}

export interface NewParentData {
    name: string;
    email: string;
    phone: string;
    studentId: string;
}

export interface StudentDocument {
    id: string;
    studentId: string;
    fileName: string;
    fileType: 'pdf' | 'docx' | 'jpg' | 'png';
    uploadDate: string;
    fileSize: string; // e.g., "2.5 MB"
}

export interface NewSchoolData {
    school: {
        name: string;
        contactEmail: string;
    };
    admin: {
        name: string;
        email: string;
        password: string;
    };
    subscription: {
        planId: string;
    };
}

export interface NewTrialRequestData {
    schoolName: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    planId?: string;
}

// --- Content Management Types ---

export interface FeatureContent {
    id: string;
    title: string;
    description: string;
}

export interface AdSlideContent {
    id: string;
    title: string;
    description: string;
    ctaText: string;
    link: string;
    imageUrl: string;
}

export interface LandingPageContent {
    hero: {
        title: string;
        subtitle: string;
    };
    features: {
        title: string;
        subtitle: string;
        items: FeatureContent[];
    };
    ads: {
        title: string;
        slides: AdSlideContent[];
    }
}

export interface NewAdRequestData {
    advertiserName: string;
    advertiserEmail: string;
    title: string;
    description: string;
    imageUrl: string;
    link: string;
}

export interface UpdatableUserData {
    name?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
    mobilePushToken?: string;
    appPlatform?: 'ios' | 'android';
    appVersion?: string;
    deviceId?: string;
}

// --- Transportation Types ---
// FIX: Added Bus and Driver types to resolve import errors.
export interface Bus {
    id: string;
    plateNumber: string;
    capacity: number;
    model: string;
    owner: string;
}

export interface Driver {
    id: string;
    name: string;
    phone: string;
    licenseNumber: string;
    busId: string | null;
}

export interface BusOperator {
    id: string;
    name: string;
    phone: string;
    licenseNumber: string;
    busPlateNumber: string;
    busCapacity: number;
    busModel: string;
    status: BusOperatorStatus;
    schoolId: number;
}

export interface NewBusOperatorApplication {
    name: string;
    phone: string;
    licenseNumber: string;
    busPlateNumber: string;
    busCapacity: number;
    busModel: string;
    schoolId: number;
}

export interface Route {
    id: string;
    name: string;
    busOperatorId: string | null;
    departureTime?: string | null;
    stops?: { name: string; time?: string; lat?: number; lng?: number }[];
    studentIds: string[];
}

// --- Self-Hosted Purchase Types ---
export interface SelfHostedQuoteRequest {
    schoolName: string;
    contactName: string;
    contactEmail: string;
    moduleIds: ModuleId[];
}

export interface SelfHostedLicense {
    licenseKey: string;
    downloadUrl: string;
    schoolName: string;
    modules: ModuleId[];
    totalPrice: number;
}

// Teacher Finance Types
export interface SalaryComponent {
    description: string;
    amount: number;
    type: 'bonus' | 'deduction';
}

export interface TeacherSalarySlip {
    id: string;
    month: string;
    year: number;
    issueDate: string;
    grossSalary: number;
    netSalary: number;
    deductions: SalaryComponent[];
    bonuses: SalaryComponent[];
    status: 'Paid' | 'Pending';
}

// Assignment Types
export interface Assignment {
    id: string;
    classId: string;
    className: string;
    title: string;
    description: string;
    dueDate: string;
    creationDate: string;
    status: AssignmentStatus;
    submissionCount: number;
}

export interface NewAssignmentData {
    classId: string;
    title: string;
    description: string;
    dueDate: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submissionDate: string | null;
  status: SubmissionStatus;
  grade?: number;
  feedback?: string;
}

export type PaymentPlanType = 'Monthly' | 'Termly' | 'Installments';

export interface DiscountRule {
  type: 'Sibling' | 'TopAchiever' | 'Orphan';
  percentage: number;
}

export interface FeeSetup {
  id: string;
  stage: string;
  tuitionFee: number;
  bookFees: number;
  uniformFees: number;
  activityFees: number;
  paymentPlanType: PaymentPlanType;
  paymentPlanDetails?: any;
  discounts: DiscountRule[];
}
