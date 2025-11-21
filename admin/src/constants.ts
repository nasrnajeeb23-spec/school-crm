import { School, PlanName, SubscriptionStatus, RevenueData, Plan, Subscription, Role, Student, StudentStatus, Teacher, TeacherStatus, User, UserRole, Class, DailyAttendance, AttendanceStatus, StudentGrades, ScheduleEntry, Conversation, Message, Invoice, InvoiceStatus, Parent, ParentAccountStatus, ActionItem, ActionItemType, SchoolEvent, StudentNote, ConversationType, StudentDocument, RecentActivity, ActivityType, SchoolSettings, SchoolEventType, ParentRequest, RequestType, RequestStatus, LandingPageContent, SchoolRole, Permission, BusOperator, BusOperatorStatus, Route, Expense, ExpenseCategory, Module, ModuleId, PricingConfig, SchoolModuleSubscription, BankDetails, TeacherSalarySlip, Assignment, AssignmentStatus, Submission, SubmissionStatus } from './types';

// سعر الطالب بالريال اليمني
export const MOCK_PRICING_CONFIG: PricingConfig = {
    pricePerStudent: 3750, // 3750 ريال يمني لكل طالب شهرياً
};

export let MOCK_MODULES: Module[] = [
    { 
        id: ModuleId.StudentManagement, 
        name: "إدارة الطلاب والمعلمين", 
        description: "النظام الأساسي لإدارة بيانات الطلاب والمعلمين وملفاتهم الشخصية.", 
        monthlyPrice: 0, 
        oneTimePrice: 12500000, // 12.5 مليون ريال يمني
        isEnabled: true,
        isCore: true,
    },
    { 
        id: ModuleId.AcademicManagement, 
        name: "الإدارة الأكاديمية", 
        description: "إدارة الفصول، الحضور والغياب، الدرجات، والجداول الدراسية.", 
        monthlyPrice: 0, 
        oneTimePrice: 10000000, // 10 ملايين ريال يمني
        isEnabled: true,
        isCore: true,
    },
    { id: ModuleId.Finance, name: "الوحدة المالية المتقدمة", description: "إدارة شاملة للفواتير والمصروفات والتقارير المالية.", monthlyPrice: 125000, oneTimePrice: 3750000, isEnabled: true },
    { id: ModuleId.Transportation, name: "إدارة النقل المدرسي", description: "تتبع الحافلات وإدارة المسارات والسائقين.", monthlyPrice: 100000, oneTimePrice: 3000000, isEnabled: true },
    { id: ModuleId.AdvancedReports, name: "التقارير المتقدمة", description: "تحليلات وتقارير مخصصة لدعم اتخاذ القرار.", monthlyPrice: 75000, oneTimePrice: 2000000, isEnabled: true },
    { id: ModuleId.ParentPortal, name: "بوابة أولياء الأمور الكاملة", description: "تواصل متقدم وميزات إضافية لأولياء الأمور.", monthlyPrice: 62500, oneTimePrice: 1750000, isEnabled: false },
];

export const MOCK_SCHOOL_MODULES: SchoolModuleSubscription[] = [
    { schoolId: 1, moduleId: ModuleId.Finance },
    { schoolId: 1, moduleId: ModuleId.Transportation },
    { schoolId: 2, moduleId: ModuleId.Finance },
];

export const MOCK_USERS: User[] = [
  { id: 'user_001', email: 'super@admin.com', username: 'superadmin', password: 'password', role: UserRole.SuperAdmin, name: 'المدير العام', phone: '0510000001' },
  { id: 'user_002', email: 'admin@school.com', username: 'schooladmin', password: 'password', role: UserRole.SchoolAdmin, schoolId: 1, name: 'مدير مدرسة النهضة', schoolRole: SchoolRole.Admin, phone: '0510000002' },
  { id: 'user_003', email: 'teacher@school.com', username: 'teacher', password: 'password', role: UserRole.Teacher, schoolId: 1, name: 'أ. محمد الغامدي', teacherId: 'tech_001', phone: '0510000003' },
  { id: 'user_004', email: 'parent@school.com', username: 'parent', password: 'password', role: UserRole.Parent, schoolId: 1, name: 'محمد عبدالله', parentId: 'par_001', phone: '0510000004' },
  { id: 'user_005', email: 'registrar@school.com', username: 'registrar', password: 'password', role: UserRole.SchoolAdmin, schoolId: 1, name: 'فهد عبدالعزيز', schoolRole: SchoolRole.Registrar },
  { id: 'user_006', email: 'accountant@school.com', username: 'accountant', password: 'password', role: UserRole.SchoolAdmin, schoolId: 1, name: 'سارة الحسن', schoolRole: SchoolRole.Accountant },
  { id: 'user_007', email: 'expired@school.com', username: 'expired', password: 'password', role: UserRole.SchoolAdmin, schoolId: 5, name: 'مدير تجريبي منتهي', schoolRole: SchoolRole.Admin },
  // SuperAdmin Team Members
  { id: 'user_008', email: 'financial@admin.com', username: 'financialadmin', password: 'password', role: UserRole.SuperAdminFinancial, name: 'مسؤول مالي', phone: '0510000008', permissions: ['view_financial_reports', 'manage_billing', 'view_subscriptions', 'manage_invoices'] },
  { id: 'user_009', email: 'technical@admin.com', username: 'technicaladmin', password: 'password', role: UserRole.SuperAdminTechnical, name: 'مسؤول فني', phone: '0510000009', permissions: ['manage_system_settings', 'view_logs', 'manage_features', 'monitor_performance', 'manage_api_keys'] },
  { id: 'user_010', email: 'supervisor@admin.com', username: 'supervisoradmin', password: 'password', role: UserRole.SuperAdminSupervisor, name: 'مشرف عام', phone: '0510000010', permissions: ['view_all_schools', 'manage_school_admins', 'view_reports', 'manage_content', 'view_user_analytics'] },
];

export const MOCK_SCHOOLS: School[] = [
  { id: 1, name: 'مدرسة النهضة الحديثة', plan: PlanName.Premium, status: SubscriptionStatus.Active, students: 450, teachers: 30, balance: 0, joinDate: '2023-09-01' },
  { id: 2, name: 'أكاديمية المستقبل الدولية', plan: PlanName.Enterprise, status: SubscriptionStatus.Active, students: 1200, teachers: 85, balance: 0, joinDate: '2022-08-15' },
  { id: 3, name: 'مدارس الأوائل النموذجية', plan: PlanName.Basic, status: SubscriptionStatus.PastDue, students: 200, teachers: 15, balance: 150, joinDate: '2023-10-05' },
  { id: 4, name: 'مدرسة النور الخاصة', plan: PlanName.Premium, status: SubscriptionStatus.Active, students: 600, teachers: 42, balance: 0, joinDate: '2023-01-20' },
  { id: 5, name: 'مدرسة الإبداع التربوي', plan: PlanName.Basic, status: SubscriptionStatus.Trial, students: 150, teachers: 10, balance: 0, joinDate: '2024-03-01' },
  { id: 6, name: 'مجمع الفلاح التعليمي', plan: PlanName.Enterprise, status: SubscriptionStatus.Active, students: 2500, teachers: 150, balance: 0, joinDate: '2021-09-01' },
  { id: 7, name: 'روضة البراعم الصغار', plan: PlanName.Basic, status: SubscriptionStatus.Canceled, students: 80, teachers: 7, balance: 0, joinDate: '2023-05-10' },
  { id: 8, name: 'مدرسة الحكمة الثانوية', plan: PlanName.Premium, status: SubscriptionStatus.Active, students: 850, teachers: 55, balance: 0, joinDate: '2022-11-11' },
];

export const MOCK_REVENUE_DATA: RevenueData[] = [
  { month: 'يناير', revenue: 55000000 }, // 55 مليون ريال يمني
  { month: 'فبراير', revenue: 62500000 }, // 62.5 مليون ريال يمني
  { month: 'مارس', revenue: 70000000 }, // 70 مليون ريال يمني
  { month: 'أبريل', revenue: 67500000 }, // 67.5 مليون ريال يمني
  { month: 'مايو', revenue: 77500000 }, // 77.5 مليون ريال يمني
  { month: 'يونيو', revenue: 87500000 }, // 87.5 مليون ريال يمني
];

export const MOCK_PLANS: Plan[] = [
    {
        id: 'basic',
        name: PlanName.Basic,
        price: 247500, // 247.5 ألف ريال يمني شهرياً
        pricePeriod: 'شهرياً',
        features: [
            'الوظائف الأساسية (الطلاب، الصفوف)',
            'تطبيق ولي الأمر (محدود)',
            'دعم عبر البريد الإلكتروني'
        ],
        limits: {
            students: 200,
            teachers: 15,
            storageGB: 5,
            branches: 1,
        }
    },
    {
        id: 'premium',
        name: PlanName.Premium,
        price: 622500, // 622.5 ألف ريال يمني شهرياً
        pricePeriod: 'شهرياً',
        features: [
            'كل ميزات الخطة الأساسية',
            'إدارة مالية متقدمة',
            'تطبيقات أولياء الأمور والمعلمين',
            'دعم فني متميز'
        ],
        limits: {
            students: 1000,
            teachers: 50,
            storageGB: 20,
            branches: 5,
        },
        recommended: true,
    },
    {
        id: 'enterprise',
        name: PlanName.Enterprise,
        price: 0, // سعر مخصص
        pricePeriod: 'تواصل معنا',
        features: [
            'كل ميزات الخطة المميزة',
            'تقارير مخصصة ومتقدمة',
            'مدير حساب مخصص',
            'استضافة خاصة وتكاملات API'
        ],
        limits: {
            students: 'غير محدود',
            teachers: 'غير محدود',
            storageGB: 'غير محدود',
            branches: 'غير محدود',
        }
    }
];

export const MOCK_SUBSCRIPTIONS: Subscription[] = [
    { id: 'sub_1', schoolId: 1, schoolName: 'مدرسة النهضة الحديثة', plan: PlanName.Premium, status: SubscriptionStatus.Active, startDate: '2023-09-01', renewalDate: '2024-09-01', amount: 622500 },
    { id: 'sub_2', schoolId: 2, schoolName: 'أكاديمية المستقبل الدولية', plan: PlanName.Enterprise, status: SubscriptionStatus.Active, startDate: '2022-08-15', renewalDate: '2024-08-15', amount: 2247750 },
    { id: 'sub_3', schoolId: 3, schoolName: 'مدارس الأوائل النموذجية', plan: PlanName.Basic, status: SubscriptionStatus.PastDue, startDate: '2023-10-05', renewalDate: '2024-07-05', amount: 247500 },
    { id: 'sub_4', schoolId: 4, schoolName: 'مدرسة النور الخاصة', plan: PlanName.Premium, status: SubscriptionStatus.Active, startDate: '2023-01-20', renewalDate: '2025-01-20', amount: 622500 },
    { id: 'sub_5', schoolId: 5, schoolName: 'مدرسة الإبداع التربوي', plan: PlanName.Basic, status: SubscriptionStatus.Trial, startDate: '2024-03-01', renewalDate: '2024-03-08', amount: 0, trialEndDate: '2024-03-08' },
    { id: 'sub_6', schoolId: 7, schoolName: 'روضة البراعم الصغار', plan: PlanName.Basic, status: SubscriptionStatus.Canceled, startDate: '2023-05-10', renewalDate: '2024-05-10', amount: 247500 },
    { id: 'sub_8', schoolId: 8, schoolName: 'مدرسة الحكمة الثانوية', plan: PlanName.Premium, status: SubscriptionStatus.Active, startDate: '2022-11-11', renewalDate: '2024-11-11', amount: 622500 },
];

export const MOCK_ROLES: Role[] = [
    { id: 'super_admin', name: 'مدير عام (Super Admin)', description: 'يمتلك صلاحيات كاملة على النظام، بما في ذلك إدارة المدارس والاشتراكات والخطط.', userCount: 1 },
    { id: 'school_admin', name: 'مدير مدرسة', description: 'يدير مدرسة واحدة بشكل كامل، بما في ذلك الطلاب والمعلمين والصفوف والمالية.', userCount: 8 },
    { id: 'teacher', name: 'معلم', description: 'يدير صفوفه، ويسجل الحضور والدرجات، ويتواصل مع أولياء الأمور.', userCount: 294 },
    { id: 'parent', name: 'ولي أمر', description: 'يتابع تقدم أبنائه، ويطلع على الدرجات والغياب، ويتواصل مع المدرسة.', userCount: 4250 },
    { id: 'student', name: 'طالب', description: 'يطلع على جدوله ودرجاته والمواد الدراسية الخاصة به.', userCount: 5200 },
];

export const MOCK_STUDENTS: Student[] = [
    { id: 'std_001', name: 'أحمد محمد عبدالله', grade: 'الصف الخامس', parentName: 'محمد عبدالله', status: StudentStatus.Active, registrationDate: '2022-09-01', profileImageUrl: 'https://picsum.photos/seed/std_001/100/100', dateOfBirth: '2014-05-10' },
    { id: 'std_002', name: 'فاطمة خالد حسين', grade: 'الصف الثالث', parentName: 'خالد حسين', status: StudentStatus.Active, registrationDate: '2023-09-05', profileImageUrl: 'https://picsum.photos/seed/std_002/100/100', dateOfBirth: '2016-08-22' },
    { id: 'std_003', name: 'يوسف علي إبراهيم', grade: 'الصف العاشر', parentName: 'علي إبراهيم', status: StudentStatus.Suspended, registrationDate: '2020-08-20', profileImageUrl: 'https://picsum.photos/seed/std_003/100/100', dateOfBirth: '2009-01-15' },
];

export const MOCK_TEACHERS: Teacher[] = [
    { id: 'tech_001', name: 'أحمد محمد', email: 'ahmed@school.com', phone: '0512345678', subject: 'رياضيات', status: TeacherStatus.Active, hireDate: '2020-08-15', profileImageUrl: 'https://picsum.photos/seed/tech_001/100/100' },
    { id: 'tech_002', name: 'فاطمة خالد', email: 'fatima@school.com', phone: '0512345679', subject: 'علوم', status: TeacherStatus.Active, hireDate: '2021-09-01', profileImageUrl: 'https://picsum.photos/seed/tech_002/100/100' },
    { id: 'tech_003', name: 'محمد علي', email: 'mohammed@school.com', phone: '0512345680', subject: 'لغة عربية', status: TeacherStatus.OnLeave, hireDate: '2019-01-10', profileImageUrl: 'https://picsum.photos/seed/tech_003/100/100' },
];

export const MOCK_CLASSES: Class[] = [
    { id: 'cls_001', name: 'الصف الخامس أ', grade: 'الصف الخامس', teacherId: 'tech_001', teacherName: 'أحمد محمد', studentCount: 25, room: '101' },
    { id: 'cls_002', name: 'الصف الثالث ب', grade: 'الصف الثالث', teacherId: 'tech_002', teacherName: 'فاطمة خالد', studentCount: 28, room: '102' },
    { id: 'cls_003', name: 'الصف العاشر أ', grade: 'الصف العاشر', teacherId: 'tech_003', teacherName: 'محمد علي', studentCount: 30, room: '201' },
];

export const MOCK_INVOICES: Invoice[] = [
    { id: 'inv_001', schoolId: 1, schoolName: 'مدرسة النهضة الحديثة', amount: 1245000, dueDate: '2024-01-31', status: InvoiceStatus.Paid, description: 'رسوم شهر يناير 2024' },
    { id: 'inv_002', schoolId: 1, schoolName: 'مدرسة النهضة الحديثة', amount: 1245000, dueDate: '2024-02-29', status: InvoiceStatus.Unpaid, description: 'رسوم شهر فبراير 2024' },
    { id: 'inv_003', schoolId: 2, schoolName: 'أكاديمية المستقبل الدولية', amount: 4495500, dueDate: '2024-01-31', status: InvoiceStatus.Paid, description: 'رسوم شهر يناير 2024' },
];

export const MOCK_PARENTS: Parent[] = [
    { id: 'par_001', name: 'محمد عبدالله', email: 'mohammed@parent.com', phone: '0511111111', childrenCount: 2, accountStatus: ParentAccountStatus.Active },
    { id: 'par_002', name: 'خالد حسين', email: 'khaled@parent.com', phone: '0511111112', childrenCount: 1, accountStatus: ParentAccountStatus.Active },
    { id: 'par_003', name: 'علي إبراهيم', email: 'ali@parent.com', phone: '0511111113', childrenCount: 3, accountStatus: ParentAccountStatus.Invited },
];

export const MOCK_SCHOOL_SETTINGS: SchoolSettings = {
    schoolId: 1,
    schoolName: 'مدرسة النهضة الحديثة',
    address: 'شارع الملك عبدالعزيز، حي النهضة، صنعاء',
    phone: '0123456789',
    email: 'info@nahda-school.com',
    website: 'www.nahda-school.com',
    logo: 'https://via.placeholder.com/150',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    language: 'ar',
    timezone: 'Asia/Aden',
    currency: 'YER',
    gradingSystem: 'percentage',
    attendanceRequired: true,
    notificationsEnabled: true,
    parentPortalEnabled: true,
    teacherPortalEnabled: true,
    studentPortalEnabled: true,
    financeModuleEnabled: true,
    transportationModuleEnabled: true,
    advancedReportsEnabled: true,
    apiEnabled: false,
    maxStorageGB: 20,
    maxUsers: 1000,
    maxStudents: 1000,
    maxTeachers: 50,
    maxBranches: 5,
};

export const MOCK_EVENTS: SchoolEvent[] = [
    { id: 'evt_001', title: 'اجتماع أولياء الأمور', description: 'اجتماع ربع سنوي مع أولياء الأمور', date: '2024-01-15', time: '18:00', location: 'قاعة المدرسة', type: SchoolEventType.Meeting },
    { id: 'evt_002', title: 'امتحانات منتصف الفصل', description: 'امتحانات منتصف الفصل الدراسي', date: '2024-02-01', time: '08:00', location: 'الصفوف', type: SchoolEventType.Exam },
    { id: 'evt_003', title: 'عطلة منتصف الفصل', description: 'عطلة منتصف الفصل الدراسي', date: '2024-02-15', time: '00:00', location: 'المدرسة', type: SchoolEventType.Holiday },
];

export const MOCK_GRADES: StudentGrades[] = [
    { studentId: 'std_001', studentName: 'أحمد محمد عبدالله', classId: 'cls_001', className: 'الصف الخامس أ', grades: [{ subject: 'رياضيات', grade: 85, maxGrade: 100 }, { subject: 'علوم', grade: 92, maxGrade: 100 }, { subject: 'لغة عربية', grade: 78, maxGrade: 100 }], average: 85 },
    { studentId: 'std_002', studentName: 'فاطمة خالد حسين', classId: 'cls_002', className: 'الصف الثالث ب', grades: [{ subject: 'رياضيات', grade: 95, maxGrade: 100 }, { subject: 'علوم', grade: 88, maxGrade: 100 }, { subject: 'لغة عربية', grade: 90, maxGrade: 100 }], average: 91 },
    { studentId: 'std_003', studentName: 'يوسف علي إبراهيم', classId: 'cls_003', className: 'الصف العاشر أ', grades: [{ subject: 'رياضيات', grade: 72, maxGrade: 100 }, { subject: 'علوم', grade: 65, maxGrade: 100 }, { subject: 'لغة عربية', grade: 80, maxGrade: 100 }], average: 72 },
];

export const MOCK_ATTENDANCE: DailyAttendance[] = [
    { date: '2024-01-08', classId: 'cls_001', className: 'الصف الخامس أ', present: 22, absent: 3, late: 0 },
    { date: '2024-01-08', classId: 'cls_002', className: 'الصف الثالث ب', present: 25, absent: 3, late: 0 },
    { date: '2024-01-08', classId: 'cls_003', className: 'الصف العاشر أ', present: 28, absent: 2, late: 0 },
];

export const MOCK_STUDENT_NOTES: StudentNote[] = [
    { id: 'note_001', studentId: 'std_001', studentName: 'أحمد محمد عبدالله', note: 'طالب مجتهد ومتفاعل في الصف', date: '2024-01-05', author: 'أحمد محمد', type: 'positive' },
    { id: 'note_002', studentId: 'std_002', studentName: 'فاطمة خالد حسين', note: 'تحتاج لمزيد من التركيز في الرياضيات', date: '2024-01-06', author: 'فاطمة خالد', type: 'improvement' },
    { id: 'note_003', studentId: 'std_003', studentName: 'يوسف علي إبراهيم', note: 'غياب متكرر بدون عذر', date: '2024-01-07', author: 'محمد علي', type: 'negative' },
];

export const MOCK_STUDENT_DOCUMENTS: StudentDocument[] = [
    { id: 'doc_001', studentId: 'std_001', studentName: 'أحمد محمد عبدالله', fileName: 'شهادة الميلاد.pdf', fileUrl: 'https://via.placeholder.com/100', uploadDate: '2022-09-01', fileSize: 1024 },
    { id: 'doc_002', studentId: 'std_001', studentName: 'أحمد محمد عبدالله', fileName: 'صورة الهوية.pdf', fileUrl: 'https://via.placeholder.com/100', uploadDate: '2022-09-01', fileSize: 512 },
    { id: 'doc_003', studentId: 'std_002', studentName: 'فاطمة خالد حسين', fileName: 'شهادة الميلاد.pdf', fileUrl: 'https://via.placeholder.com/100', uploadDate: '2023-09-05', fileSize: 768 },
];

export const MOCK_ACTION_ITEMS: ActionItem[] = [
    { id: 'action_001', title: 'مراجعة درجات الطلاب', description: 'مراجعة واعتماد درجات الطلاب للفصل الدراسي', type: ActionItemType.GradeReview, dueDate: '2024-01-15', assignedTo: 'مدير المدرسة', status: 'pending', priority: 'high' },
    { id: 'action_002', title: 'تحديث بيانات أولياء الأمور', description: 'تحديث أرقام هواتف أولياء الأمور', type: ActionItemType.ParentUpdate, dueDate: '2024-01-20', assignedTo: 'مسجل', status: 'in-progress', priority: 'medium' },
    { id: 'action_003', title: 'صيانة معدات الحاسوب', description: 'صيانة أجهزة الحاسوب في المختبر', type: ActionItemType.Maintenance, dueDate: '2024-01-25', assignedTo: 'مسؤول التقنية', status: 'completed', priority: 'low' },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
    { id: 'conv_001', participant1: 'مدير المدرسة', participant2: 'ولي الأمر محمد عبدالله', lastMessage: 'شكراً لتعاونكم', lastMessageDate: '2024-01-08', unreadCount: 0, type: ConversationType.ParentSchool },
    { id: 'conv_002', participant1: 'المعلم أحمد محمد', participant2: 'ولي الأمر خالد حسين', lastMessage: 'سأرسل لك تقرير التقدم قريباً', lastMessageDate: '2024-01-07', unreadCount: 2, type: ConversationType.ParentTeacher },
    { id: 'conv_003', participant1: 'المعلم فاطمة خالد', participant2: 'ولي الأمر علي إبراهيم', lastMessage: 'ابنك يحتاج لمزيد من التركيز', lastMessageDate: '2024-01-06', unreadCount: 1, type: ConversationType.ParentTeacher },
];

export const MOCK_RECENT_ACTIVITIES: RecentActivity[] = [
    { id: 'activity_001', user: 'مدير المدرسة', action: 'أضاف طالب جديد', target: 'أحمد محمد عبدالله', timestamp: '2024-01-08T10:30:00', type: ActivityType.StudentAdded },
    { id: 'activity_002', user: 'المعلم أحمد محمد', action: 'سجل درجات الطلاب', target: 'الصف الخامس أ', timestamp: '2024-01-08T09:15:00', type: ActivityType.GradesSubmitted },
    { id: 'activity_003', user: 'ولي الأمر خالد حسين', action: 'دفع رسوم شهر يناير', target: 'فاطمة خالد حسين', timestamp: '2024-01-07T14:20:00', type: ActivityType.PaymentMade },
];

export const MOCK_SCHEDULE: ScheduleEntry[] = [
    { id: 'sched_001', classId: 'cls_001', className: 'الصف الخامس أ', day: 'Sunday', startTime: '08:00', endTime: '08:45', subject: 'رياضيات', teacher: 'أحمد محمد' },
    { id: 'sched_002', classId: 'cls_001', className: 'الصف الخامس أ', day: 'Sunday', startTime: '08:45', endTime: '09:30', subject: 'علوم', teacher: 'فاطمة خالد' },
    { id: 'sched_003', classId: 'cls_002', className: 'الصف الثالث ب', day: 'Sunday', startTime: '08:00', endTime: '08:45', subject: 'لغة عربية', teacher: 'محمد علي' },
];

export const MOCK_MESSAGES: Message[] = [
    { id: 'msg_001', conversationId: 'conv_001', sender: 'مدير المدرسة', content: 'مرحباً، أود إعلامكم بتقدم ابنكم أحمد', timestamp: '2024-01-08T10:30:00', isRead: true },
    { id: 'msg_002', conversationId: 'conv_001', sender: 'ولي الأمر محمد عبدالله', content: 'شكراً جزيلاً، نقدر جهودكم', timestamp: '2024-01-08T10:35:00', isRead: true },
    { id: 'msg_003', conversationId: 'conv_002', sender: 'المعلم أحمد محمد', content: 'ابنتكم فاطمة مجتهدة جداً', timestamp: '2024-01-07T09:15:00', isRead: false },
];

export const MOCK_CLASS_ROSTERS: { classId: string; studentIds: string[] }[] = [
    { classId: 'cls_001', studentIds: ['std_001', 'std_004', 'std_005'] },
    { classId: 'cls_002', studentIds: ['std_002', 'std_006'] },
    { classId: 'cls_003', studentIds: ['std_003', 'std_007'] },
];

export const MOCK_PARENT_REQUESTS: ParentRequest[] = [
    { id: 'req_001', parentId: 'par_001', parentName: 'محمد عبدالله', studentId: 'std_001', studentName: 'أحمد محمد عبدالله', type: RequestType.Leave, status: RequestStatus.Approved, reason: 'سفر عائلي', startDate: '2024-01-15', endDate: '2024-01-20', submittedAt: '2024-01-10T08:30:00', approvedBy: 'مدير المدرسة' },
    { id: 'req_002', parentId: 'par_002', parentName: 'خالد حسين', studentId: 'std_002', studentName: 'فاطمة خالد حسين', type: RequestType.MakeupExam, status: RequestStatus.Pending, reason: 'مرض الطفلة', examDate: '2024-01-20', submittedAt: '2024-01-12T14:15:00' },
    { id: 'req_003', parentId: 'par_003', parentName: 'علي إبراهيم', studentId: 'std_003', studentName: 'يوسف علي إبراهيم', type: RequestType.Transfer, status: RequestStatus.Rejected, reason: 'نقل إلى مدرسة أخرى', submittedAt: '2024-01-05T09:45:00', rejectedBy: 'مدير المدرسة', rejectionReason: 'لم يتم استيفاء الشروط المطلوبة' },
];

export const MOCK_LANDING_PAGE_CONTENT: LandingPageContent = {
    heroTitle: 'نظام إدارة المدارس الشامل',
    heroSubtitle: 'حلول ذكية لإدارة مدارسك بكفاءة وفعالية',
    features: [
        { title: 'إدارة الطلاب والمعلمين', description: 'نظام شامل لإدارة بيانات الطلاب والمعلمين' },
        { title: 'الحضور والغياب', description: 'تتبع الحضور والغياب بسهولة وفعالية' },
        { title: 'الدرجات والتقارير', description: 'إدارة الدرجات وتوليد التقارير التحليلية' },
        { title: 'التواصل الفعال', description: 'تواصل فعال بين المدرسة وأولياء الأمور' },
    ],
    testimonials: [
        { name: 'مدير مدرسة النهضة', role: 'مدير مدرسة', comment: 'نظام رائع سهل علينا إدارة المدرسة بشكل احترافي' },
        { name: 'أحد أولياء الأمور', role: 'ولي أمر', comment: 'أستطيع متابعة تقدم أبنائي بسهولة من خلال التطبيق' },
    ],
};

export const MOCK_BANK_ACCOUNTS: BankDetails[] = [
    { bankName: 'بنك الكريمي', accountName: 'مؤسسة SchoolSaaS للتقنية', accountNumber: '123-456-789', iban: 'YE81KREB000000123456789012' },
    { bankName: 'الشرق للحوالات', accountName: 'مؤسسة SchoolSaaS للتقنية', accountNumber: '987-654-321', iban: 'غير متاح' },
    { bankName: 'بنك التضامن', accountName: 'مؤسسة SchoolSaaS للتقنية', accountNumber: '555-444-333', iban: 'YE25TIBY000000555444333222' },
];

export const MOCK_TEACHER_SALARY_SLIPS: TeacherSalarySlip[] = [
    { id: 'sal_001', teacherId: 'tech_001', teacherName: 'أحمد محمد', month: 'يناير 2024', basicSalary: 150000, allowances: 50000, deductions: 10000, netSalary: 190000, paymentDate: '2024-01-31' },
    { id: 'sal_002', teacherId: 'tech_002', teacherName: 'فاطمة خالد', month: 'يناير 2024', basicSalary: 140000, allowances: 45000, deductions: 8000, netSalary: 177000, paymentDate: '2024-01-31' },
    { id: 'sal_003', teacherId: 'tech_003', teacherName: 'محمد علي', month: 'يناير 2024', basicSalary: 160000, allowances: 55000, deductions: 12000, netSalary: 203000, paymentDate: '2024-01-31' },
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
    { id: 'assign_001', title: 'واجب رياضيات', description: 'حل تمارين الضرب والقسمة', subject: 'رياضيات', classId: 'cls_001', className: 'الصف الخامس أ', teacherId: 'tech_001', teacherName: 'أحمد محمد', dueDate: '2024-01-15', maxScore: 100, status: AssignmentStatus.Active },
    { id: 'assign_002', title: 'بحث علوم', description: 'بحث عن النظام الشمسي', subject: 'علوم', classId: 'cls_002', className: 'الصف الثالث ب', teacherId: 'tech_002', teacherName: 'فاطمة خالد', dueDate: '2024-01-20', maxScore: 100, status: AssignmentStatus.Active },
    { id: 'assign_003', title: 'مقالة لغوية', description: 'كتابة مقالة عن العطلة', subject: 'لغة عربية', classId: 'cls_003', className: 'الصف العاشر أ', teacherId: 'tech_003', teacherName: 'محمد علي', dueDate: '2024-01-18', maxScore: 100, status: AssignmentStatus.Closed },
];

export const MOCK_SUBMISSIONS: Submission[] = [
    { id: 'sub_001', assignmentId: 'assign_001', assignmentTitle: 'واجب رياضيات', studentId: 'std_001', studentName: 'أحمد محمد عبدالله', submittedAt: '2024-01-12T15:30:00', score: 85, maxScore: 100, status: SubmissionStatus.Graded, gradedBy: 'أحمد محمد', feedback: 'عمل رائع!' },
    { id: 'sub_002', assignmentId: 'assign_001', assignmentTitle: 'واجب رياضيات', studentId: 'std_004', studentName: 'سارة أحمد', submittedAt: '2024-01-13T09:15:00', score: 0, maxScore: 100, status: SubmissionStatus.Submitted },
    { id: 'sub_003', assignmentId: 'assign_002', assignmentTitle: 'بحث علوم', studentId: 'std_002', studentName: 'فاطمة خالد حسين', submittedAt: '2024-01-19T14:20:00', score: 92, maxScore: 100, status: SubmissionStatus.Graded, gradedBy: 'فاطمة خالد', feedback: 'بحث ممتاز!' },
];

export const MOCK_BUS_OPERATORS: BusOperator[] = [
    { id: 'bus_001', name: 'شركة النقل المدرسي', email: 'info@schoolbus.com', phone: '0512345678', address: 'صنعاء', status: BusOperatorStatus.Approved, contractStart: '2023-09-01', contractEnd: '2024-08-31', vehicleCount: 5, driverCount: 5 },
    { id: 'bus_002', name: 'مؤسسة الأمانة للنقل', email: 'amana@transport.com', phone: '0512345679', address: 'صنعاء', status: BusOperatorStatus.Pending, contractStart: '2024-02-01', contractEnd: '2025-01-31', vehicleCount: 3, driverCount: 3 },
];

export const MOCK_ROUTES: Route[] = [
    { id: 'route_001', name: 'الخط الأول - حي النهضة', operatorId: 'bus_001', operatorName: 'شركة النقل المدرسي', driverName: 'علي أحمد', vehicleNumber: '1234', stops: ['جامعة صنعاء', 'حي النهضة', 'المدرسة'], capacity: 25, currentPassengers: 20, status: 'active' },
    { id: 'route_002', name: 'الخط الثاني - حي السبعين', operatorId: 'bus_001', operatorName: 'شركة النقل المدرسي', driverName: 'محمد علي', vehicleNumber: '1235', stops: ['حي السبعين', 'شارع الزبيري', 'المدرسة'], capacity: 30, currentPassengers: 25, status: 'active' },
];

export const MOCK_EXPENSES: Expense[] = [
    { id: 'exp_001', schoolId: 1, category: ExpenseCategory.Utilities, description: 'فاتورة كهرباء شهر يناير', amount: 125000, date: '2024-01-31', approvedBy: 'مدير المدرسة', status: 'approved' },
    { id: 'exp_002', schoolId: 1, category: ExpenseCategory.Maintenance, description: 'صيانة مكيفات', amount: 375000, date: '2024-01-15', approvedBy: 'مدير المدرسة', status: 'approved' },
    { id: 'exp_003', schoolId: 1, category: ExpenseCategory.Supplies, description: 'قرطاسية ومستلزمات مكتبية', amount: 250000, date: '2024-01-10', approvedBy: 'مدير المدرسة', status: 'pending' },
];

export const SCHOOL_ROLE_PERMISSIONS: { [key in SchoolRole]: Permission[] } = {
    [SchoolRole.Admin]: Object.values(Permission), // Admin has all permissions
    [SchoolRole.Registrar]: [
        Permission.VIEW_DASHBOARD,
        Permission.MANAGE_STUDENTS,
        Permission.MANAGE_PARENTS,
        Permission.MANAGE_ATTENDANCE,
    ],
    [SchoolRole.Accountant]: [
        Permission.VIEW_DASHBOARD,
        Permission.MANAGE_FINANCE,
        Permission.MANAGE_REPORTS,
    ],
    [SchoolRole.AcademicCoordinator]: [
        Permission.VIEW_DASHBOARD,
        Permission.MANAGE_TEACHERS,
        Permission.MANAGE_CLASSES,
        Permission.MANAGE_SCHEDULE,
        Permission.MANAGE_GRADES,
    ],
};