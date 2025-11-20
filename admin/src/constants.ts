import { School, PlanName, SubscriptionStatus, RevenueData, Plan, Subscription, Role, Student, StudentStatus, Teacher, TeacherStatus, User, UserRole, Class, DailyAttendance, AttendanceStatus, StudentGrades, ScheduleEntry, Conversation, Message, Invoice, InvoiceStatus, Parent, ParentAccountStatus, ActionItem, ActionItemType, SchoolEvent, StudentNote, ConversationType, StudentDocument, RecentActivity, ActivityType, SchoolSettings, SchoolEventType, ParentRequest, RequestType, RequestStatus, LandingPageContent, SchoolRole, Permission, BusOperator, BusOperatorStatus, Route, Expense, ExpenseCategory, Module, ModuleId, PricingConfig, SchoolModuleSubscription, BankDetails, TeacherSalarySlip, Assignment, AssignmentStatus, Submission, SubmissionStatus } from './types';

export const MOCK_BANK_ACCOUNTS: BankDetails[] = [
    { bankName: 'بنك الكريمي', accountName: 'مؤسسة SchoolSaaS للتقنية', accountNumber: '123-456-789', iban: 'YE81KREB000000123456789012' },
    { bankName: 'الشرق للحوالات', accountName: 'مؤسسة SchoolSaaS للتقنية', accountNumber: '987-654-321', iban: 'غير متاح' },
    { bankName: 'بنك التضامن', accountName: 'مؤسسة SchoolSaaS للتقنية', accountNumber: '555-444-333', iban: 'YE25TIBY000000555444333222' },
];

export const MOCK_PRICING_CONFIG: PricingConfig = {
    pricePerStudent: 1.5, // $1.5 per student per month
};

export let MOCK_MODULES: Module[] = [
    { 
        id: ModuleId.StudentManagement, 
        name: "إدارة الطلاب والمعلمين", 
        description: "النظام الأساسي لإدارة بيانات الطلاب والمعلمين وملفاتهم الشخصية.", 
        monthlyPrice: 0, 
        oneTimePrice: 5000, 
        isEnabled: true,
        isCore: true,
    },
    { 
        id: ModuleId.AcademicManagement, 
        name: "الإدارة الأكاديمية", 
        description: "إدارة الفصول، الحضور والغياب، الدرجات، والجداول الدراسية.", 
        monthlyPrice: 0, 
        oneTimePrice: 4000, 
        isEnabled: true,
        isCore: true,
    },
    { id: ModuleId.Finance, name: "الوحدة المالية المتقدمة", description: "إدارة شاملة للفواتير والمصروفات والتقارير المالية.", monthlyPrice: 50, oneTimePrice: 1500, isEnabled: true },
    { id: ModuleId.Transportation, name: "إدارة النقل المدرسي", description: "تتبع الحافلات وإدارة المسارات والسائقين.", monthlyPrice: 40, oneTimePrice: 1200, isEnabled: true },
    { id: ModuleId.AdvancedReports, name: "التقارير المتقدمة", description: "تحليلات وتقارير مخصصة لدعم اتخاذ القرار.", monthlyPrice: 30, oneTimePrice: 800, isEnabled: true },
    { id: ModuleId.ParentPortal, name: "بوابة أولياء الأمور الكاملة", description: "تواصل متقدم وميزات إضافية لأولياء الأمور.", monthlyPrice: 25, oneTimePrice: 700, isEnabled: false },
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
  { month: 'يناير', revenue: 22000 },
  { month: 'فبراير', revenue: 25000 },
  { month: 'مارس', revenue: 28000 },
  { month: 'أبريل', revenue: 27000 },
  { month: 'مايو', revenue: 31000 },
  { month: 'يونيو', revenue: 35000 },
];

export const MOCK_PLANS: Plan[] = [
    {
        id: 'basic',
        name: PlanName.Basic,
        price: 99,
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
        price: 249,
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
        price: 0, // Custom price
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
    { id: 'sub_1', schoolId: 1, schoolName: 'مدرسة النهضة الحديثة', plan: PlanName.Premium, status: SubscriptionStatus.Active, startDate: '2023-09-01', renewalDate: '2024-09-01', amount: 249 },
    { id: 'sub_2', schoolId: 2, schoolName: 'أكاديمية المستقبل الدولية', plan: PlanName.Enterprise, status: SubscriptionStatus.Active, startDate: '2022-08-15', renewalDate: '2024-08-15', amount: 899 },
    { id: 'sub_3', schoolId: 3, schoolName: 'مدارس الأوائل النموذجية', plan: PlanName.Basic, status: SubscriptionStatus.PastDue, startDate: '2023-10-05', renewalDate: '2024-07-05', amount: 99 },
    { id: 'sub_4', schoolId: 4, schoolName: 'مدرسة النور الخاصة', plan: PlanName.Premium, status: SubscriptionStatus.Active, startDate: '2023-01-20', renewalDate: '2025-01-20', amount: 249 },
    { id: 'sub_5', schoolId: 5, schoolName: 'مدرسة الإبداع التربوي', plan: PlanName.Basic, status: SubscriptionStatus.Trial, startDate: '2024-03-01', renewalDate: '2024-03-08', amount: 0, trialEndDate: '2024-03-08' },
    { id: 'sub_6', schoolId: 7, schoolName: 'روضة البراعم الصغار', plan: PlanName.Basic, status: SubscriptionStatus.Canceled, startDate: '2023-05-10', renewalDate: '2024-05-10', amount: 99 },
    { id: 'sub_8', schoolId: 8, schoolName: 'مدرسة الحكمة الثانوية', plan: PlanName.Premium, status: SubscriptionStatus.Active, startDate: '2022-11-11', renewalDate: '2024-11-11', amount: 249 },
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
    { id: 'std_004', name: 'سارة وليد محمود', grade: 'الصف الأول', parentName: 'وليد محمود', status: StudentStatus.Active, registrationDate: '2024-01-15', profileImageUrl: 'https://picsum.photos/seed/std_004/100/100', dateOfBirth: '2018-03-30' },
    { id: 'std_005', name: 'عمر مصطفى حسن', grade: 'الصف الثاني عشر', parentName: 'مصطفى حسن', status: StudentStatus.Active, registrationDate: '2018-09-01', profileImageUrl: 'https://picsum.photos/seed/std_005/100/100', dateOfBirth: '2007-11-05' },
    { id: 'std_006', name: 'نور ياسر سعيد', grade: 'الصف السابع', parentName: 'ياسر سعيد', status: StudentStatus.Active, registrationDate: '2021-09-03', profileImageUrl: 'https://picsum.photos/seed/std_006/100/100', dateOfBirth: '2012-09-12' },
    { id: 'std_007', name: 'خالد عبدالله عمر', grade: 'الصف التاسع', parentName: 'عبدالله عمر', status: StudentStatus.Active, registrationDate: '2019-08-28', profileImageUrl: 'https://picsum.photos/seed/std_007/100/100', dateOfBirth: '2010-07-20' },
];

export const MOCK_STUDENT_NOTES: StudentNote[] = [
    { id: 'note_001', studentId: 'std_001', author: 'أ. محمد الغامدي', content: 'أظهر أحمد تقدماً ملحوظاً في مادة الرياضيات هذا الشهر. يحتاج إلى التركيز أكثر أثناء حل الواجبات.', date: '2024-05-15' },
    { id: 'note_002', studentId: 'std_003', author: 'الإدارة', content: 'تم إيقاف الطالب بسبب مشاجرة في فناء المدرسة. تم التواصل مع ولي الأمر.', date: '2024-05-12' },
    { id: 'note_003', studentId: 'std_001', author: 'أ. حصة السبيعي', content: 'مشاركته في فصل اللغة الإنجليزية ممتازة ويساعد زملائه.', date: '2024-04-28' },
];

export const MOCK_STUDENT_DOCUMENTS: StudentDocument[] = [
    { id: 'doc_001', studentId: 'std_001', fileName: 'شهادة الميلاد.pdf', fileType: 'pdf', uploadDate: '2022-08-20', fileSize: '1.2 MB' },
    { id: 'doc_002', studentId: 'std_001', fileName: 'صورة شخصية.jpg', fileType: 'jpg', uploadDate: '2022-08-20', fileSize: '800 KB' },
    { id: 'doc_003', studentId: 'std_001', fileName: 'التقرير الدراسي السابق.pdf', fileType: 'pdf', uploadDate: '2022-09-01', fileSize: '3.5 MB' },
    { id: 'doc_004', studentId: 'std_002', fileName: 'شهادة الميلاد.pdf', fileType: 'pdf', uploadDate: '2023-09-01', fileSize: '1.1 MB' },
];


export const MOCK_TEACHERS: Teacher[] = [
    { id: 'tech_001', name: 'أ. محمد الغامدي', subject: 'الرياضيات', phone: '0501234567', status: TeacherStatus.Active, joinDate: '2020-08-15' },
    { id: 'tech_002', name: 'أ. حصة السبيعي', subject: 'اللغة الإنجليزية', phone: '0557654321', status: TeacherStatus.Active, joinDate: '2019-09-01' },
    { id: 'tech_003', name: 'أ. عبدالله الشهري', subject: 'العلوم', phone: '0533445566', status: TeacherStatus.OnLeave, joinDate: '2021-03-10' },
    { id: 'tech_004', name: 'أ. نورة المطيري', subject: 'اللغة العربية', phone: '0544556677', status: TeacherStatus.Active, joinDate: '2022-09-01' },
    { id: 'tech_005', name: 'أ. سامي الأحمد', subject: 'التربية البدنية', phone: '0566778899', status: TeacherStatus.Active, joinDate: '2018-07-20' },
];

export const MOCK_CLASSES: Class[] = [
  { id: 'cls_01', name: 'الصف الأول - أ', gradeLevel: 'الصف الأول', homeroomTeacherName: 'أ. نورة المطيري', studentCount: 25, subjects: ['اللغة العربية', 'الرياضيات', 'التربية الفنية'] },
  { id: 'cls_02', name: 'الصف الخامس - ب', gradeLevel: 'الصف الخامس', homeroomTeacherName: 'أ. محمد الغامدي', studentCount: 28, subjects: ['الرياضيات', 'العلوم', 'الدراسات الاجتماعية', 'اللغة الإنجليزية'] },
  { id: 'cls_03', name: 'الصف السابع - ج', gradeLevel: 'الصف السابع', homeroomTeacherName: 'أ. حصة السبيعي', studentCount: 30, subjects: ['اللغة الإنجليزية', 'العلوم', 'الحاسب الآلي'] },
  { id: 'cls_04', name: 'الصف العاشر - أ', gradeLevel: 'الصف العاشر', homeroomTeacherName: 'أ. عبدالله الشهري', studentCount: 22, subjects: ['الفيزياء', 'الكيمياء', 'الأحياء'] },
  { id: 'cls_05', name: 'الصف الثاني عشر - علمي', gradeLevel: 'الصف الثاني عشر', homeroomTeacherName: 'أ. سامي الأحمد', studentCount: 18, subjects: ['الرياضيات المتقدمة', 'الفيزياء', 'الكيمياء'] },
];

export const MOCK_CLASS_ROSTERS: { [classId: string]: string[] } = {
    'cls_01': ['std_002', 'std_004'],
    'cls_02': ['std_001', 'std_006', 'std_007', 'std_003'],
    'cls_04': ['std_005'],
};

// Mocking attendance for a specific class on a specific day
export const MOCK_ATTENDANCE: DailyAttendance[] = [
    {
        classId: 'cls_02',
        date: new Date().toISOString().split('T')[0], // Today's date
        records: [
            // Let's assume some students from MOCK_STUDENTS are in this class
            { studentId: 'std_001', studentName: 'أحمد محمد عبدالله', status: AttendanceStatus.Present },
            { studentId: 'std_006', studentName: 'نور ياسر سعيد', status: AttendanceStatus.Present },
            { studentId: 'std_007', studentName: 'خالد عبدالله عمر', status: AttendanceStatus.Absent },
            { studentId: 'std_002', studentName: 'فاطمة خالد حسين', status: AttendanceStatus.Late },
            { studentId: 'std_003', studentName: 'يوسف علي إبراهيم', status: AttendanceStatus.Present },
            { studentId: 'std_004', studentName: 'سارة وليد محمود', status: AttendanceStatus.Excused },
            { studentId: 'std_005', studentName: 'عمر مصطفى حسن', status: AttendanceStatus.Present },
        ]
    }
];

export const MOCK_GRADES: StudentGrades[] = [
    { 
        classId: 'cls_02', 
        subject: 'العلوم',
        studentId: 'std_001',
        studentName: 'أحمد محمد عبدالله',
        grades: { homework: 8, quiz: 12, midterm: 22, final: 45 }
    },
     { 
        classId: 'cls_02', 
        subject: 'الرياضيات',
        studentId: 'std_001',
        studentName: 'أحمد محمد عبدالله',
        grades: { homework: 10, quiz: 14, midterm: 25, final: 49 }
    },
    { 
        classId: 'cls_02', 
        subject: 'اللغة الإنجليزية',
        studentId: 'std_001',
        studentName: 'أحمد محمد عبدالله',
        grades: { homework: 9, quiz: 13, midterm: 21, final: 42 }
    },
    { 
        classId: 'cls_02', 
        subject: 'العلوم',
        studentId: 'std_006',
        studentName: 'نور ياسر سعيد',
        grades: { homework: 10, quiz: 15, midterm: 24, final: 48 }
    },
    { 
        classId: 'cls_02', 
        subject: 'العلوم',
        studentId: 'std_007',
        studentName: 'خالد عبدالله عمر',
        grades: { homework: 7, quiz: 10, midterm: 18, final: 35 }
    },
    { 
        classId: 'cls_02', 
        subject: 'العلوم',
        studentId: 'std_003',
        studentName: 'يوسف علي إبراهيم',
        grades: { homework: 9, quiz: 13, midterm: 20, final: 40 }
    },
];

export const MOCK_SCHEDULE: ScheduleEntry[] = [
    // Class 'cls_02'
    { id: 'sch_001', classId: 'cls_02', day: 'Sunday', timeSlot: '08:00 - 09:00', subject: 'الرياضيات', teacherName: 'أ. محمد الغامدي' },
    { id: 'sch_002', classId: 'cls_02', day: 'Sunday', timeSlot: '09:00 - 10:00', subject: 'العلوم', teacherName: 'أ. عبدالله الشهري' },
    { id: 'sch_003', classId: 'cls_02', day: 'Sunday', timeSlot: '10:00 - 11:00', subject: 'اللغة الإنجليزية', teacherName: 'أ. حصة السبيعي' },
    { id: 'sch_004', classId: 'cls_02', day: 'Monday', timeSlot: '08:00 - 09:00', subject: 'اللغة الإنجليزية', teacherName: 'أ. حصة السبيعي' },
    { id: 'sch_005', classId: 'cls_02', day: 'Monday', timeSlot: '09:00 - 10:00', subject: 'الرياضيات', teacherName: 'أ. محمد الغامدي' },
    { id: 'sch_006', classId: 'cls_02', day: 'Monday', timeSlot: '11:00 - 12:00', subject: 'الدراسات الاجتماعية', teacherName: 'أ. نورة المطيري' },
    { id: 'sch_007', classId: 'cls_02', day: 'Tuesday', timeSlot: '08:00 - 09:00', subject: 'العلوم', teacherName: 'أ. عبدالله الشهري' },
    { id: 'sch_008', classId: 'cls_02', day: 'Tuesday', timeSlot: '10:00 - 11:00', subject: 'الرياضيات', teacherName: 'أ. محمد الغامدي' },
    { id: 'sch_009', classId: 'cls_02', day: 'Wednesday', timeSlot: '09:00 - 10:00', subject: 'اللغة الإنجليزية', teacherName: 'أ. حصة السبيعي' },
    { id: 'sch_010', classId: 'cls_02', day: 'Wednesday', timeSlot: '11:00 - 12:00', subject: 'العلوم', teacherName: 'أ. عبدالله الشهري' },
    { id: 'sch_011', classId: 'cls_02', day: 'Thursday', timeSlot: '08:00 - 09:00', subject: 'الرياضيات', teacherName: 'أ. محمد الغامدي' },
    { id: 'sch_012', classId: 'cls_02', day: 'Thursday', timeSlot: '09:00 - 10:00', subject: 'الدراسات الاجتماعية', teacherName: 'أ. نورة المطيري' },
    
    // Class 'cls_01'
    { id: 'sch_013', classId: 'cls_01', day: 'Sunday', timeSlot: '08:00 - 09:00', subject: 'اللغة العربية', teacherName: 'أ. نورة المطيري' },
    { id: 'sch_014', classId: 'cls_01', day: 'Monday', timeSlot: '09:00 - 10:00', subject: 'الرياضيات', teacherName: 'أ. محمد الغامدي' },
    { id: 'sch_015', classId: 'cls_01', day: 'Tuesday', timeSlot: '10:00 - 11:00', subject: 'التربية الفنية', teacherName: 'أ. سامي الأحمد' },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
    { id: 'conv_05', type: ConversationType.Announcement, participantName: 'إعلانات عامة للمدرسة', participantAvatar: 'https://picsum.photos/seed/announce/40/40', lastMessage: 'تذكير: اجتماع أولياء الأمور غدًا.', timestamp: '11:00 ص', unreadCount: 1 },
    { id: 'conv_02', type: ConversationType.Group, participantName: 'معلمو وأولياء أمور الصف الخامس', participantAvatar: 'https://picsum.photos/seed/group1/40/40', lastMessage: 'بالتأكيد، سأقوم بإرسال قائمة المواد المطلوبة.', timestamp: '9:30 ص', unreadCount: 2 },
    { id: 'conv_01', type: ConversationType.Direct, participantName: 'محمد عبدالله (ولي أمر)', participantAvatar: 'https://picsum.photos/seed/parent1/40/40', lastMessage: 'شكرًا لكم على المتابعة، تم استلام التقرير.', timestamp: '10:45 ص', unreadCount: 0 },
    { id: 'conv_03', type: ConversationType.Direct, participantName: 'خالد حسين (ولي أمر)', participantAvatar: 'https://picsum.photos/seed/parent2/40/40', lastMessage: 'هل يمكن تزويدي بجدول الاختبارات؟', timestamp: 'أمس', unreadCount: 0 },
    { id: 'conv_04', type: ConversationType.Direct, participantName: 'أ. عبدالله الشهري (معلم)', participantAvatar: 'https://picsum.photos/seed/teacher3/40/40', lastMessage: 'تم استلام طلب الإجازة، شكرًا.', timestamp: 'أمس', unreadCount: 0 },
];

export const MOCK_MESSAGES: { [key: string]: Message[] } = {
    'conv_01': [
        { id: 'msg_01_01', senderId: 'other', text: 'السلام عليكم، أود الاستفسار عن مستوى الطالب أحمد الدراسي.', timestamp: '10:30 ص' },
        { id: 'msg_01_02', senderId: 'me', text: 'وعليكم السلام، أهلاً بك. مستوى الطالب أحمد ممتاز ومستقر، سيتم إرسال تقرير مفصل لكم اليوم.', timestamp: '10:35 ص' },
        { id: 'msg_01_03', senderId: 'other', text: 'شكرًا لكم على المتابعة، تم استلام التقرير.', timestamp: '10:45 ص' },
    ],
    'conv_02': [
        { id: 'msg_02_01', senderId: 'me', text: 'أستاذة حصة، الرجاء تزويدنا بقائمة المواد المطلوبة للصف السابع.', timestamp: '9:25 ص' },
        { id: 'msg_02_02', senderId: 'other', text: 'أهلاً، سيتم تجهيزها الآن.', timestamp: '9:28 ص' },
        { id: 'msg_02_03', senderId: 'other', text: 'بالتأكيد، سأقوم بإرسال قائمة المواد المطلوبة.', timestamp: '9:30 ص' },
    ],
    'conv_03': [
         { id: 'msg_03_01', senderId: 'other', text: 'هل يمكن تزويدي بجدول الاختبارات؟', timestamp: 'أمس' },
    ],
    'conv_04': [
         { id: 'msg_04_01', senderId: 'other', text: 'تم استلام طلب الإجازة، شكرًا.', timestamp: 'أمس' },
    ],
    'conv_05': [
        { id: 'msg_05_01', senderId: 'me', text: 'تذكير: اجتماع أولياء الأمور غدًا الساعة 6 مساءً في قاعة المدرسة الرئيسية.', timestamp: '11:00 ص' },
    ]
};

export const MOCK_INVOICES: Invoice[] = [
    {
        id: 'inv_001',
        studentId: 'std_001',
        studentName: 'أحمد محمد عبدالله',
        status: InvoiceStatus.Paid,
        issueDate: '2024-05-01',
        dueDate: '2024-05-15',
        items: [{ description: 'القسط الدراسي لشهر مايو', amount: 500 }],
        totalAmount: 500,
    },
    {
        id: 'inv_002',
        studentId: 'std_002',
        studentName: 'فاطمة خالد حسين',
        status: InvoiceStatus.Unpaid,
        issueDate: '2024-05-01',
        dueDate: '2024-05-15',
        items: [{ description: 'القسط الدراسي لشهر مايو', amount: 450 }],
        totalAmount: 450,
    },
    {
        id: 'inv_003',
        studentId: 'std_004',
        studentName: 'سارة وليد محمود',
        status: InvoiceStatus.Overdue,
        issueDate: '2024-04-01',
        dueDate: '2024-04-15',
        items: [{ description: 'القسط الدراسي لشهر أبريل', amount: 600 }],
        totalAmount: 600,
    },
    {
        id: 'inv_004',
        studentId: 'std_005',
        studentName: 'عمر مصطفى حسن',
        status: InvoiceStatus.Paid,
        issueDate: '2024-05-01',
        dueDate: '2024-05-15',
        items: [
            { description: 'القسط الدراسي لشهر مايو', amount: 750 },
            { description: 'رسوم حافلة', amount: 100 }
        ],
        totalAmount: 850,
    },
    {
        id: 'inv_005',
        studentId: 'std_001',
        studentName: 'أحمد محمد عبدالله',
        status: InvoiceStatus.Unpaid,
        issueDate: '2024-05-05',
        dueDate: '2024-05-20',
        items: [{ description: 'رسوم أنشطة', amount: 150 }],
        totalAmount: 150,
    }
];

export const MOCK_EXPENSES: Expense[] = [
    { id: 'exp_001', description: 'راتب أ. محمد الغامدي - مايو', amount: 6000, date: '2024-05-25', category: ExpenseCategory.Salaries, recipient: 'أ. محمد الغامدي' },
    { id: 'exp_002', description: 'فاتورة الكهرباء', amount: 1250, date: '2024-05-20', category: ExpenseCategory.Utilities, recipient: 'شركة الكهرباء' },
    { id: 'exp_003', description: 'شراء مستلزمات مكتبية', amount: 350, date: '2024-05-18', category: ExpenseCategory.Supplies },
    { id: 'exp_004', description: 'صيانة مكيفات الفصول', amount: 800, date: '2024-05-15', category: ExpenseCategory.Maintenance, recipient: 'شركة الصيانة' },
];

export const MOCK_PARENTS: Parent[] = [
    { id: 'par_001', name: 'محمد عبدالله', studentName: 'أحمد محمد عبدالله', studentId: 'std_001', email: 'm.abdullah@email.com', phone: '0501112222', status: ParentAccountStatus.Active },
    { id: 'par_002', name: 'خالد حسين', studentName: 'فاطمة خالد حسين', studentId: 'std_002', email: 'k.hussain@email.com', phone: '0503334444', status: ParentAccountStatus.Active },
    { id: 'par_003', name: 'علي إبراهيم', studentName: 'يوسف علي إبراهيم', studentId: 'std_003', email: 'a.ibrahim@email.com', phone: '0505556666', status: ParentAccountStatus.Invited },
    { id: 'par_004', name: 'وليد محمود', studentName: 'سارة وليد محمود', studentId: 'std_004', email: 'w.mahmoud@email.com', phone: '0507778888', status: ParentAccountStatus.Active },
    { id: 'par_005', name: 'مصطفى حسن', studentName: 'عمر مصطفى حسن', studentId: 'std_005', email: 'm.hassan@email.com', phone: '0509990000', status: ParentAccountStatus.Active },
    { id: 'par_006', name: 'ياسر سعيد', studentName: 'نور ياسر سعيد', studentId: 'std_006', email: 'y.saeed@email.com', phone: '0501231234', status: ParentAccountStatus.Invited },
];

export let MOCK_ACTION_ITEMS: ActionItem[] = [
    { id: 'act_01', type: ActionItemType.Approval, title: 'طلب إجازة للمعلمة حصة السبيعي', description: 'طلب إجازة مرضية لمدة يومين.', date: 'اليوم', isRead: false},
    { id: 'act_02', type: ActionItemType.Warning, title: 'غياب متكرر للطالب يوسف علي', description: 'تغيب الطالب 3 مرات خلال هذا الأسبوع.', date: 'اليوم', isRead: false },
    { id: 'act_03', type: ActionItemType.Info, title: 'فاتورة مستحقة لمدرسة الأوائل', description: 'فاتورة اشتراك بقيمة 150$ متأخرة.', date: 'أمس', isRead: true},
    { id: 'act_04', type: ActionItemType.Approval, title: 'طلب تفعيل حساب ولي أمر', description: 'ولي الأمر "علي إبراهيم" ينتظر التفعيل.', date: 'منذ يومين', isRead: true},
];

export const MOCK_TEACHER_ACTION_ITEMS: ActionItem[] = [
    { id: 'tact_01', type: ActionItemType.Info, title: 'تسليم درجات الرياضيات', description: 'آخر موعد لتسليم درجات اختبار منتصف الفصل للصف الخامس-ب هو غدًا.', date: 'اليوم', isRead: false},
    { id: 'tact_02', type: ActionItemType.Approval, title: 'رسالة جديدة من ولي أمر', description: 'لديك رسالة جديدة من "محمد عبدالله" بخصوص الطالب أحمد.', date: 'اليوم', isRead: false },
    { id: 'tact_03', type: ActionItemType.Warning, title: 'تأخر حضور الطالب خالد', description: 'تأخر الطالب خالد عبدالله عمر 3 مرات هذا الأسبوع.', date: 'أمس', isRead: true},
];

export const MOCK_PARENT_ACTION_ITEMS: ActionItem[] = [
    { id: 'pact_01', type: ActionItemType.Warning, title: 'فاتورة مستحقة', description: 'فاتورة الرسوم الدراسية لشهر مايو مستحقة الدفع.', date: 'اليوم', isRead: false},
    { id: 'pact_02', type: ActionItemType.Info, title: 'درجات جديدة', description: 'تم رصد درجات جديدة في مادة العلوم.', date: 'أمس', isRead: true },
    { id: 'pact_03', type: ActionItemType.Info, title: 'إعلان من المدرسة', description: 'تذكير: اجتماع أولياء الأمور غدًا الساعة 6 مساءً.', date: 'أمس', isRead: true},
];

export let MOCK_PARENT_REQUESTS: ParentRequest[] = [
    { id: 'req_001', type: RequestType.Leave, details: 'طلب إجازة للطالب أحمد محمد عبدالله ليوم غد بسبب ظرف عائلي.', submissionDate: '2024-05-20', status: RequestStatus.Approved },
    { id: 'req_002', type: RequestType.Meeting, details: 'أود تحديد موعد مع معلم الرياضيات لمناقشة مستوى الطالب.', submissionDate: '2024-05-18', status: RequestStatus.Pending },
];

export const MOCK_EVENTS: SchoolEvent[] = [
    { id: 'evt_01', title: 'اجتماع أولياء الأمور للصف الخامس', date: '2024-05-25', time: '06:00 م', eventType: SchoolEventType.Meeting },
    { id: 'evt_02', title: 'بداية اختبارات منتصف الفصل', date: '2024-06-02', time: '08:00 ص', eventType: SchoolEventType.Exam },
    { id: 'evt_03', title: 'رحلة ترفيهية إلى حديقة الحيوان', date: '2024-06-10', time: '09:00 ص', eventType: SchoolEventType.Activity },
    { id: 'evt_04', title: 'اليوم الرياضي السنوي', date: '2024-06-15', time: '10:00 ص', eventType: SchoolEventType.Activity },
    { id: 'evt_05', title: 'عطلة عيد الأضحى', date: '2024-06-16', time: 'طوال اليوم', eventType: SchoolEventType.Holiday },
    { id: 'evt_06', title: 'عطلة عيد الأضحى', date: '2024-06-17', time: 'طوال اليوم', eventType: SchoolEventType.Holiday },
    { id: 'evt_07', title: 'نهاية اختبارات منتصف الفصل', date: '2024-06-20', time: '12:00 م', eventType: SchoolEventType.Exam },
    { id: 'evt_08', title: 'ورشة عمل للمعلمين', date: '2024-05-30', time: '01:00 م', eventType: SchoolEventType.Meeting },
];

export let MOCK_RECENT_ACTIVITIES: RecentActivity[] = [
    { id: 'act_1', type: ActivityType.NewStudent, description: 'تسجيل الطالب الجديد: "علي أحمد"', timestamp: 'منذ 5 دقائق' },
    { id: 'act_2', type: ActivityType.GradeSubmission, description: 'أ. محمد الغامدي قام بتحديث درجات الرياضيات للصف الخامس - ب', timestamp: 'منذ 25 دقيقة' },
    { id: 'act_3', type: ActivityType.NewInvoice, description: 'تم إنشاء فاتورة جديدة للطالب "سارة وليد محمود"', timestamp: 'منذ ساعة' },
    { id: 'act_4', type: ActivityType.TeacherOnLeave, description: 'أ. عبدالله الشهري بدأ إجازة رسمية', timestamp: 'اليوم' },
];

export const MOCK_SCHOOL_SETTINGS: SchoolSettings = {
    schoolName: 'مدرسة النهضة الحديثة',
    schoolAddress: '123 شارع المعرفة، مدينة التعليم، المملكة العربية السعودية',
    academicYearStart: '2024-09-01',
    academicYearEnd: '2025-06-20',
    schoolLogoUrl: undefined,
    notifications: {
        email: true,
        sms: false,
        push: true,
    }
};

export let MOCK_LANDING_PAGE_CONTENT: LandingPageContent = {
    hero: {
        title: "النظام المتكامل لإدارة المدارس الحديثة CRM",
        subtitle: "SchoolSaaS يقدم لك كل ما تحتاجه لإدارة الطلاب، المعلمين، الفصول، والمالية بكفاءة وسهولة، مع تطبيقات مخصصة لأولياء الأمور والمعلمين."
    },
    features: {
        title: "منصة واحدة تغطي جميع احتياجات مدرستك",
        subtitle: "نقدم مجموعة متكاملة من الأدوات لمساعدتك على إدارة مدرستك بكفاءة ونجاح.",
        items: [
            { id: 'f1', title: "إدارة الطلاب", description: "نظام متكامل لتسجيل الطلاب، وإدارة ملفاتهم الشخصية والأكاديمية، مع سهولة الوصول لبيانات أولياء الأمور والتواصل معهم." },
            { id: 'f2', title: "المالية والرسوم", description: "أتمتة عملية الفوترة وإصدار فواتير الرسوم الدراسية، تتبع المدفوعات بدقة، وإرسال تذكيرات آلية لأولياء الأمور لضمان التحصيل في الوقت المحدد." },
            { id: 'f3', title: "الدرجات والتقارير", description: "تمكين المعلمين من رصد الدرجات بسهولة، وإصدار شهادات وتقارير أداء شاملة للطلاب بضغطة زر، مع رسوم بيانية توضيحية." },
            { id: 'f4', title: "التواصل الفعال", description: "منصة تواصل آمنة ومباشرة تربط بين إدارة المدرسة، المعلمين، وأولياء الأمور من خلال نظام رسائل متكامل وتطبيقات جوال مخصصة." },
            { id: 'f5', title: "تحليلات وتقارير ذكية", description: "احصل على رؤى قيمة من خلال لوحات تحكم تفاعلية وتقارير مخصصة حول أداء الطلاب، معدلات الحضور، والبيانات المالية لدعم اتخاذ قرارات مستنيرة." },
            { id: 'f6', title: "آمن وموثوق", description: "نضمن حماية بيانات مدرستك بأعلى معايير الأمان، مع نظام صلاحيات وصول متقدم واستضافة سحابية موثوقة تضمن استمرارية الخدمة." },
        ]
    },
    ads: {
        title: "أحدث الإعلانات والميزات",
        slides: [
            {
                id: 'ad1',
                title: "تطبيقات الجوال الجديدة متاحة الآن!",
                description: "قم بتنزيل تطبيق ولي الأمر وتطبيق المعلم للبقاء على تواصل دائم مع المدرسة.",
                ctaText: "اعرف المزيد",
                link: "#",
                imageUrl: "https://images.unsplash.com/photo-1581093450021-4a7360e9a1c8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"
            },
            {
                id: 'ad2',
                title: "اكتشف قوة خطة المؤسسات",
                description: "حلول مخصصة للمدارس الكبيرة والمجمعات التعليمية مع دعم فني متقدم وتقارير مخصصة.",
                ctaText: "استكشف خطة المؤسسات",
                link: "#pricing",
                imageUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"
            },
            {
                id: 'ad3',
                title: "تقارير وتحليلات ذكية",
                description: "اتخذ قرارات مستنيرة بناءً على بيانات دقيقة حول أداء الطلاب والحضور والوضع المالي.",
                ctaText: "شاهد الميزات",
                link: "#features",
                imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"
            }
        ]
    }
};

// --- Transportation Mocks ---
export let MOCK_BUS_OPERATORS: BusOperator[] = [
    { id: 'op_01', name: 'أحمد علي', phone: '0501112233', licenseNumber: 'A12345', busPlateNumber: 'أ ب ج ١٢٣٤', busCapacity: 25, busModel: 'Toyota Coaster 2022', status: BusOperatorStatus.Approved, schoolId: 1 },
    { id: 'op_02', name: 'ياسر محمود', phone: '0504445566', licenseNumber: 'B67890', busPlateNumber: 'ح ك ل ٥٦٧٨', busCapacity: 20, busModel: 'Mitsubishi Rosa 2021', status: BusOperatorStatus.Approved, schoolId: 1 },
    { id: 'op_03', name: 'سالم عبدالله', phone: '0559876543', licenseNumber: 'C54321', busPlateNumber: 'د س ص ٩٨٧٦', busCapacity: 30, busModel: 'Mercedes-Benz Sprinter 2023', status: BusOperatorStatus.Pending, schoolId: 1 },
];

export const MOCK_ROUTES: Route[] = [
    { id: 'rt_01', name: 'مسار حي الياسمين', busOperatorId: 'op_01', studentIds: ['std_001', 'std_004'] },
    { id: 'rt_02', name: 'مسار حي النرجس', busOperatorId: 'op_02', studentIds: ['std_002', 'std_006'] },
];

export const MOCK_TEACHER_SALARY_SLIPS: TeacherSalarySlip[] = [
    {
        id: 'slip_01', month: 'مايو', year: 2024, issueDate: '2024-05-28',
        grossSalary: 8000, netSalary: 7350, status: 'Paid',
        bonuses: [{ description: 'علاوة أداء', amount: 200, type: 'bonus' }],
        deductions: [
            { description: 'تأمينات اجتماعية', amount: 600, type: 'deduction' },
            { description: 'خصم غياب', amount: 250, type: 'deduction' }
        ]
    },
    {
        id: 'slip_02', month: 'أبريل', year: 2024, issueDate: '2024-04-28',
        grossSalary: 8000, netSalary: 7400, status: 'Paid',
        bonuses: [],
        deductions: [{ description: 'تأمينات اجتماعية', amount: 600, type: 'deduction' }]
    },
    {
        id: 'slip_03', month: 'مارس', year: 2024, issueDate: '2024-03-28',
        grossSalary: 8000, netSalary: 7900, status: 'Paid',
        bonuses: [{ description: 'مكافأة نشاط', amount: 500, type: 'bonus' }],
        deductions: [{ description: 'تأمينات اجتماعية', amount: 600, type: 'deduction' }]
    },
];

export let MOCK_ASSIGNMENTS: Assignment[] = [
    {
        id: 'asg_001',
        classId: 'cls_02',
        className: 'الصف الخامس - ب',
        title: 'واجب الرياضيات: الفصل الثالث',
        description: 'حل تمارين صفحة 55 و 56 في كتاب التمارين. يجب تسليم الحلول على ورقة خارجية.',
        dueDate: '2024-06-10',
        creationDate: '2024-06-03',
        status: AssignmentStatus.Published,
        submissionCount: 3,
    },
    {
        id: 'asg_002',
        classId: 'cls_02',
        className: 'الصف الخامس - ب',
        title: 'مشروع العلوم: المجموعة الشمسية',
        description: 'إعداد مجسم للمجموعة الشمسية مع ورقة بحثية عن كوكب من اختيار الطالب.',
        dueDate: '2024-06-20',
        creationDate: '2024-06-05',
        status: AssignmentStatus.Published,
        submissionCount: 1,
    },
    {
        id: 'asg_003',
        classId: 'cls_04',
        className: 'الصف العاشر - أ',
        title: 'واجب الفيزياء: قوانين نيوتن',
        description: 'شرح القانون الأول والثاني لنيوتن مع مثال عملي لكل منهما.',
        dueDate: '2024-06-12',
        creationDate: '2024-06-07',
        status: AssignmentStatus.Published,
        submissionCount: 0,
    },
];

export let MOCK_SUBMISSIONS: Submission[] = [
    {
        id: 'sub_001',
        assignmentId: 'asg_001',
        studentId: 'std_001',
        studentName: 'أحمد محمد عبدالله',
        submissionDate: '2024-06-09',
        status: SubmissionStatus.Submitted,
    },
    {
        id: 'sub_002',
        assignmentId: 'asg_001',
        studentId: 'std_006',
        studentName: 'نور ياسر سعيد',
        submissionDate: '2024-06-11',
        status: SubmissionStatus.Late,
        grade: 8,
        feedback: 'الحل صحيح ولكن التسليم كان متأخراً.'
    },
    {
        id: 'sub_004',
        assignmentId: 'asg_001',
        studentId: 'std_003',
        studentName: 'يوسف علي إبراهيم',
        submissionDate: '2024-06-08',
        status: SubmissionStatus.Graded,
        grade: 10,
        feedback: 'عمل ممتاز! حلول واضحة ومنظمة.',
    },
    {
        id: 'sub_005',
        assignmentId: 'asg_002',
        studentId: 'std_001',
        studentName: 'أحمد محمد عبدالله',
        submissionDate: '2024-06-15',
        status: SubmissionStatus.Submitted,
    },
];
