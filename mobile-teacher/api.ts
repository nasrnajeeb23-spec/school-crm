import { User, School } from './types';

const API_BASE_URL = 'http://localhost:5000/api';

let memoryToken: string | null = null;

async function getToken() {
  try {
    const SecureStore = (await import('expo-secure-store')).default;
    const t = await SecureStore.getItemAsync('auth_token');
    return t || memoryToken;
  } catch {
    return memoryToken;
  }
}

async function setToken(token: string) {
  memoryToken = token;
  try { const SecureStore = (await import('expo-secure-store')).default; await SecureStore.setItemAsync('auth_token', token); } catch {}
}

const authHeaders = async () => {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// DATA FROM WEB CONSTANTS
const MOCK_STUDENTS: Student[] = [
    { id: 'std_001', name: 'أحمد محمد عبدالله', grade: 'الصف الخامس', parentName: 'محمد عبدالله', status: StudentStatus.Active, profileImageUrl: 'https://picsum.photos/seed/std_001/100/100' },
    { id: 'std_002', name: 'فاطمة خالد حسين', grade: 'الصف الثالث', parentName: 'خالد حسين', status: StudentStatus.Active, profileImageUrl: 'https://picsum.photos/seed/std_002/100/100' },
    { id: 'std_003', name: 'يوسف علي إبراهيم', grade: 'الصف العاشر', parentName: 'علي إبراهيم', status: StudentStatus.Suspended, profileImageUrl: 'https://picsum.photos/seed/std_003/100/100' },
    { id: 'std_004', name: 'سارة وليد محمود', grade: 'الصف الأول', parentName: 'وليد محمود', status: StudentStatus.Active, profileImageUrl: 'https://picsum.photos/seed/std_004/100/100' },
    { id: 'std_005', name: 'عمر مصطفى حسن', grade: 'الصف الثاني عشر', parentName: 'مصطفى حسن', status: StudentStatus.Active, profileImageUrl: 'https://picsum.photos/seed/std_005/100/100' },
    { id: 'std_006', name: 'نور ياسر سعيد', grade: 'الصف السابع', parentName: 'ياسر سعيد', status: StudentStatus.Active, profileImageUrl: 'https://picsum.photos/seed/std_006/100/100' },
    { id: 'std_007', name: 'خالد عبدالله عمر', grade: 'الصف التاسع', parentName: 'عبدالله عمر', status: StudentStatus.Active, profileImageUrl: 'https://picsum.photos/seed/std_007/100/100' },
];

const MOCK_TEACHER_SCHEDULE: ScheduleEntry[] = [
    // Sunday for Teacher Mohamed
    { id: 'sch_001', classId: 'cls_02', day: 'Sunday', timeSlot: '08:00 - 09:00', subject: 'الرياضيات', teacherName: 'أ. محمد الغامدي', className: 'الصف الخامس - ب' },
    { id: 'sch_002', classId: 'cls_03', day: 'Sunday', timeSlot: '10:00 - 11:00', subject: 'الرياضيات', teacherName: 'أ. محمد الغامدي', className: 'الصف السادس - أ' },
    // Monday
    { id: 'sch_003', classId: 'cls_04', day: 'Monday', timeSlot: '09:00 - 10:00', subject: 'الفيزياء', teacherName: 'أ. محمد الغامدي', className: 'الصف العاشر - أ' },
    { id: 'sch_004', classId: 'cls_02', day: 'Monday', timeSlot: '11:00 - 12:00', subject: 'الرياضيات', teacherName: 'أ. محمد الغامدي', className: 'الصف الخامس - ب' },
    // Tuesday
    { id: 'sch_005', classId: 'cls_03', day: 'Tuesday', timeSlot: '08:00 - 09:00', subject: 'الرياضيات', teacherName: 'أ. محمد الغامدي', className: 'الصف السادس - أ' },
    { id: 'sch_006', classId: 'cls_02', day: 'Tuesday', timeSlot: '09:00 - 10:00', subject: 'الرياضيات', teacherName: 'أ. محمد الغامدي', className: 'الصف الخامس - ب' },
    // Wednesday
    { id: 'sch_007', classId: 'cls_04', day: 'Wednesday', timeSlot: '11:00 - 12:00', subject: 'الفيزياء', teacherName: 'أ. محمد الغامدي', className: 'الصف العاشر - أ' },
    // Thursday
    { id: 'sch_008', classId: 'cls_02', day: 'Thursday', timeSlot: '08:00 - 09:00', subject: 'الرياضيات', teacherName: 'أ. محمد الغامدي', className: 'الصف الخامس - ب' },
    { id: 'sch_009', classId: 'cls_03', day: 'Thursday', timeSlot: '10:00 - 11:00', subject: 'الرياضيات', teacherName: 'أ. محمد الغامدي', className: 'الصف السادس - أ' },
    // Other teachers for context
    { id: 'sch_010', classId: 'cls_02', day: 'Sunday', timeSlot: '09:00 - 10:00', subject: 'العلوم', teacherName: 'أ. عبدالله الشهري', className: 'الصف الخامس - ب' },
    { id: 'sch_011', classId: 'cls_02', day: 'Sunday', timeSlot: '10:00 - 11:00', subject: 'اللغة الإنجليزية', teacherName: 'أ. حصة السبيعي', className: 'الصف الخامس - ب' },

];

const MOCK_FULL_CLASSES: Class[] = [
  { id: 'cls_02', name: 'الصف الخامس - ب', gradeLevel: 'الصف الخامس', homeroomTeacherName: 'أ. محمد الغامدي', studentCount: 28, subjects: ['الرياضيات', 'العلوم', 'الدراسات الاجتماعية', 'اللغة الإنجليزية'] },
  { id: 'cls_03', name: 'الصف السادس - أ', gradeLevel: 'الصف السادس', homeroomTeacherName: 'أ. حصة السبيعي', studentCount: 30, subjects: ['اللغة الإنجليزية', 'الرياضيات', 'العلوم', 'الحاسب الآلي'] },
  { id: 'cls_04', name: 'الصف العاشر - أ', gradeLevel: 'الصف العاشر', homeroomTeacherName: 'أ. عبدالله الشهري', studentCount: 22, subjects: ['الفيزياء', 'الكيمياء', 'الأحياء'] },
];

const MOCK_CLASS_ROSTERS: { [classId: string]: string[] } = {
    'cls_02': ['std_001', 'std_006', 'std_007', 'std_003'],
    'cls_03': ['std_002', 'std_004'],
    'cls_04': ['std_005'],
};

// Dashboard Mock Data (simplified)
const MOCK_SCHEDULE_DASHBOARD: ScheduleEntry[] = [
    { id: 'sch_001', timeSlot: '08:00 - 09:00', subject: 'الرياضيات', className: 'الصف الخامس - ب', day: 'Sunday', classId: 'cls_02', teacherName: 'أ. محمد الغامدي' },
    { id: 'sch_002', timeSlot: '10:00 - 11:00', subject: 'الرياضيات', className: 'الصف السادس - أ', day: 'Sunday', classId: 'cls_03', teacherName: 'أ. محمد الغامدي' },
];
const MOCK_ACTION_ITEMS: ActionItem[] = [
    { id: 'tact_01', type: ActionItemType.Info, title: 'تسليم درجات الرياضيات', description: 'آخر موعد لتسليم درجات اختبار منتصف الفصل للصف الخامس-ب هو غدًا.'},
    { id: 'tact_02', type: ActionItemType.Approval, title: 'رسالة جديدة من ولي أمر', description: 'لديك رسالة جديدة من "محمد عبدالله" بخصوص الطالب أحمد.'},
];

let MOCK_ATTENDANCE: DailyAttendance[] = [
    {
        classId: 'cls_02',
        date: '2024-05-20', // an old date
        records: [
            { studentId: 'std_001', studentName: 'أحمد محمد عبدالله', status: AttendanceStatus.Present },
            { studentId: 'std_006', studentName: 'نور ياسر سعيد', status: AttendanceStatus.Present },
            { studentId: 'std_007', studentName: 'خالد عبدالله عمر', status: AttendanceStatus.Absent },
            { studentId: 'std_003', studentName: 'يوسف علي إبراهيم', status: AttendanceStatus.Late },
        ]
    }
];

let MOCK_GRADES: StudentGrades[] = [
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
];

let MOCK_CONVERSATIONS: Conversation[] = [
    { id: 'conv_05', type: ConversationType.Announcement, participantName: 'إعلانات عامة للمدرسة', participantAvatar: 'https://picsum.photos/seed/announce/40/40', lastMessage: 'تذكير: اجتماع أولياء الأمور غدًا.', timestamp: '11:00 ص', unreadCount: 1 },
    { id: 'conv_02', type: ConversationType.Group, participantName: 'معلمو وأولياء أمور الصف الخامس', participantAvatar: 'https://picsum.photos/seed/group1/40/40', lastMessage: 'بالتأكيد، سأقوم بإرسال قائمة المواد المطلوبة.', timestamp: '9:30 ص', unreadCount: 2 },
    { id: 'conv_01', type: ConversationType.Direct, participantName: 'محمد عبدالله (ولي أمر)', participantAvatar: 'https://picsum.photos/seed/parent1/40/40', lastMessage: 'شكرًا لكم على المتابعة، تم استلام التقرير.', timestamp: '10:45 ص', unreadCount: 0 },
    { id: 'conv_03', type: ConversationType.Direct, participantName: 'خالد حسين (ولي أمر)', participantAvatar: 'https://picsum.photos/seed/parent2/40/40', lastMessage: 'هل يمكن تزويدي بجدول الاختبارات؟', timestamp: 'أمس', unreadCount: 0 },
    { id: 'conv_04', type: ConversationType.Direct, participantName: 'أ. عبدالله الشهري (زميل)', participantAvatar: 'https://picsum.photos/seed/teacher3/40/40', lastMessage: 'تم استلام طلب الإجازة، شكرًا.', timestamp: 'أمس', unreadCount: 0 },
];

let MOCK_MESSAGES: { [key: string]: Message[] } = {
    'conv_01': [
        { id: 'msg_01_01', senderId: 'other', text: 'السلام عليكم، أود الاستفسار عن مستوى الطالب أحمد الدراسي.', timestamp: '10:30 ص' },
        { id: 'msg_01_02', senderId: 'me', text: 'وعليكم السلام، أهلاً بك. مستوى الطالب أحمد ممتاز ومستقر، سيتم إرسال تقرير مفصل لكم اليوم.', timestamp: '10:35 ص' },
        { id: 'msg_01_03', senderId: 'other', text: 'شكرًا لكم على المتابعة، تم استلام التقرير.', timestamp: '10:45 ص' },
    ],
    'conv_02': [
        { id: 'msg_02_01', senderId: 'other', text: 'أستاذ محمد، الرجاء تزويدنا بواجبات الرياضيات لهذا الأسبوع.', timestamp: '9:25 ص' },
        { id: 'msg_02_02', senderId: 'me', text: 'أهلاً، سيتم إرسالها في المجموعة خلال ساعة.', timestamp: '9:28 ص' },
        { id: 'msg_02_03', senderId: 'other', text: 'بالتأكيد، سأقوم بإرسال قائمة المواد المطلوبة.', timestamp: '9:30 ص' },
    ],
    'conv_03': [
         { id: 'msg_03_01', senderId: 'other', text: 'هل يمكن تزويدي بجدول الاختبارات؟', timestamp: 'أمس' },
    ],
    'conv_04': [
         { id: 'msg_04_01', senderId: 'other', text: 'تم استلام طلب الإجازة، شكرًا.', timestamp: 'أمس' },
    ],
    'conv_05': [
        { id: 'msg_05_01', senderId: 'other', text: 'تذكير: اجتماع أولياء الأمور غدًا الساعة 6 مساءً في قاعة المدرسة الرئيسية.', timestamp: '11:00 ص' },
    ]
};

const MOCK_TEACHER_SALARY_SLIPS: TeacherSalarySlip[] = [
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

export const MOCK_ASSIGNMENTS: Assignment[] = [
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

export const MOCK_SUBMISSIONS: Submission[] = [
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


export const login = async (email: string, password: string, _schoolId: number): Promise<User | null> => {
  try {
    const resp = await fetch(`${API_BASE_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.token) await setToken(data.token);
    return data?.user || null;
  } catch {
    return null;
  }
};

export const getSchools = async (): Promise<School[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/schools`);
    if (!response.ok) throw new Error('failed');
    const data: any[] = await response.json();
    return data.map(({ id, name }) => ({ id, name }));
  } catch {
    return [];
  }
};

export const getTeacherDashboardData = async (teacherId: string) => {
  try {
    const headers = await authHeaders();
    const resp = await fetch(`${API_BASE_URL}/teacher/${teacherId}/dashboard`, { headers });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
};

export const getTeacherClasses = async (_teacherId: string) => {
  const data = await getTeacherDashboardData(_teacherId);
  return data?.classes || [];
};

export const getClassStudents = async (_classId: string) => {
  return [];
};

export const getAttendance = async (_classId: string, _date: string) => { return null; };

export const saveAttendance = async (_classId: string, _date: string, _records: any[]) => { return; };

export const getGrades = async (_classId: string, _subject: string) => { return []; };

export const saveGrades = async (_gradesToSave: any[]) => { return; };

export const getConversations = async () => { return []; };

export const getMessages = async (_conversationId: string) => { return []; };

export const sendMessage = async (_conversationId: string, _text: string) => { return { id: '', senderId: 'me' as any, text: '', timestamp: '' }; };

export const getTeacherSalarySlips = async (_teacherId: string) => { return []; };

export const getTeacherSchedule = async (teacherId: string) => {
  const data = await getTeacherDashboardData(teacherId);
  return data?.schedule || [];
};

export const getTeacherAssignments = async (_teacherId: string) => { return []; };

export const getSubmissionsForAssignment = async (_assignmentId: string) => { return []; };
