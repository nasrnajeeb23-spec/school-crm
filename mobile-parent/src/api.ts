import { User, UserRole, Student, StudentStatus, Parent, ParentAccountStatus, Invoice, InvoiceStatus, StudentGrades, ScheduleEntry, ParentRequest, RequestStatus, RequestType, BusOperator, BusOperatorStatus, Route, AttendanceStatus, Assignment, AssignmentStatus, Submission, SubmissionStatus, School } from './types';

// Simulates a network delay
const networkDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

const API_BASE_URL = 'http://localhost:5000/api';

const MOCK_PARENT_USER: User = {
    id: 'user_004',
    email: 'parent@school.com',
    role: UserRole.Parent,
    name: 'محمد عبدالله',
    parentId: 'par_001',
    // FIX: Added schoolId for login validation.
    schoolId: 1,
};

// FIX: Added MOCK_SCHOOLS to be used by getSchools.
const MOCK_SCHOOLS: School[] = [
  { id: 1, name: 'مدرسة النهضة الحديثة' },
  { id: 2, name: 'أكاديمية المستقبل الدولية' },
  { id: 3, name: 'مدارس الأوائل النموذجية' },
];


const MOCK_STUDENT: Student = { 
    id: 'std_001', 
    name: 'أحمد محمد عبدالله', 
    grade: 'الصف الخامس', 
    parentName: 'محمد عبدالله', 
    status: StudentStatus.Active, 
    profileImageUrl: 'https://picsum.photos/seed/std_001/100/100'
};

const MOCK_GRADES: StudentGrades[] = [
    { classId: 'cls_02', subject: 'الرياضيات', studentId: 'std_001', studentName: 'أحمد محمد عبدالله', grades: { homework: 10, quiz: 14, midterm: 25, final: 49 } },
    { classId: 'cls_02', subject: 'اللغة الإنجليزية', studentId: 'std_001', studentName: 'أحمد محمد عبدالله', grades: { homework: 9, quiz: 13, midterm: 21, final: 42 } },
    { classId: 'cls_02', subject: 'العلوم', studentId: 'std_001', studentName: 'أحمد محمد عبدالله', grades: { homework: 8, quiz: 12, midterm: 22, final: 45 } },
];

const MOCK_ATTENDANCE = [
    { studentId: 'std_001', studentName: '', status: AttendanceStatus.Present, date: '2024-05-19' },
    { studentId: 'std_001', studentName: '', status: AttendanceStatus.Present, date: '2024-05-20' },
    { studentId: 'std_001', studentName: '', status: AttendanceStatus.Late, date: '2024-05-21' },
    { studentId: 'std_001', studentName: '', status: AttendanceStatus.Absent, date: '2024-05-22' },
];

const MOCK_INVOICES: Invoice[] = [
    { id: 'inv_001', studentName: 'أحمد محمد عبدالله', status: InvoiceStatus.Paid, issueDate: '2024-05-01', dueDate: '2024-05-15', totalAmount: 500 },
    { id: 'inv_005', studentName: 'أحمد محمد عبدالله', status: InvoiceStatus.Unpaid, issueDate: '2024-05-05', dueDate: '2024-05-20', totalAmount: 150 },
];

const MOCK_SCHEDULE: ScheduleEntry[] = [
    { id: 'sch_001', day: 'Sunday', timeSlot: '08:00 - 09:00', subject: 'الرياضيات', teacherName: 'أ. محمد الغامدي' },
    { id: 'sch_002', day: 'Sunday', timeSlot: '09:00 - 10:00', subject: 'العلوم', teacherName: 'أ. عبدالله الشهري' },
    { id: 'sch_004', day: 'Monday', timeSlot: '08:00 - 09:00', subject: 'اللغة الإنجليزية', teacherName: 'أ. حصة السبيعي' },
];

let MOCK_PARENT_REQUESTS: ParentRequest[] = [
    { id: 'req_001', type: RequestType.Leave, details: 'طلب إجازة للطالب أحمد محمد عبدالله ليوم غد بسبب ظرف عائلي.', submissionDate: '2024-05-20', status: RequestStatus.Approved },
    { id: 'req_002', type: RequestType.Meeting, details: 'أود تحديد موعد مع معلم الرياضيات لمناقشة مستوى الطالب.', submissionDate: '2024-05-18', status: RequestStatus.Pending },
];

const MOCK_TRANSPORT_DETAILS = {
    route: { id: 'rt_01', name: 'مسار حي الياسمين', busOperatorId: 'op_01', studentIds: ['std_001'] },
    operator: { id: 'op_01', name: 'أحمد علي', phone: '0501112233', busPlateNumber: 'أ ب ج ١٢٣٤', busModel: 'Toyota Coaster 2022', busCapacity: 25, licenseNumber: 'A12345', schoolId: 1, status: BusOperatorStatus.Approved }
};

const MOCK_ASSIGNMENTS: Assignment[] = [
    {
        id: 'asg_001', classId: 'cls_02', className: 'الصف الخامس - ب', title: 'واجب الرياضيات: الفصل الثالث',
        description: 'حل تمارين صفحة 55 و 56 في كتاب التمارين. يجب تسليم الحلول على ورقة خارجية.',
        dueDate: '2024-06-10', creationDate: '2024-06-03', status: AssignmentStatus.Published, submissionCount: 3,
    },
    {
        id: 'asg_002', classId: 'cls_02', className: 'الصف الخامس - ب', title: 'مشروع العلوم: المجموعة الشمسية',
        description: 'إعداد مجسم للمجموعة الشمسية مع ورقة بحثية عن كوكب من اختيار الطالب.',
        dueDate: '2024-06-20', creationDate: '2024-06-05', status: AssignmentStatus.Published, submissionCount: 1,
    },
];

let MOCK_SUBMISSIONS: Submission[] = [
    {
        id: 'sub_001', assignmentId: 'asg_001', studentId: 'std_001', studentName: 'أحمد محمد عبدالله',
        submissionDate: null, status: SubmissionStatus.NotSubmitted,
    },
    {
        id: 'sub_005', assignmentId: 'asg_002', studentId: 'std_001', studentName: 'أحمد محمد عبدالله',
        submissionDate: '2024-06-15', status: SubmissionStatus.Graded, grade: 18, feedback: 'عمل رائع! المجسم متقن والبحث شامل.'
    },
];


// FIX: Updated login function to accept schoolId and validate against it.
export const login = async (email: string, password: string, schoolId: number): Promise<User | null> => {
    await networkDelay(1000);
    if (email.toLowerCase() === MOCK_PARENT_USER.email && password === 'password' && schoolId === MOCK_PARENT_USER.schoolId) {
        return MOCK_PARENT_USER;
    }
    return null;
};

// FIX: Added missing getSchools function.
export const getSchools = async (): Promise<School[]> => {
    try {
        await networkDelay(500);
        const response = await fetch(`${API_BASE_URL}/schools`);
        if (!response.ok) {
            console.warn("Failed to fetch schools from backend. Falling back to mock.");
            return MOCK_SCHOOLS;
        }
        const data: any[] = await response.json();
        return data.map(({ id, name }) => ({ id, name }));
    } catch (error) {
        console.warn("Could not connect to backend for schools. Falling back to mock.", error);
        return MOCK_SCHOOLS;
    }
};

export const getParentDashboardData = async (parentId: string) => {
    await networkDelay(1200);
    if (parentId === 'par_001') {
        return {
            student: MOCK_STUDENT,
            grades: MOCK_GRADES,
            attendance: MOCK_ATTENDANCE,
            invoices: MOCK_INVOICES,
            announcements: [{ id: 'ann_01', lastMessage: 'تذكير: اجتماع أولياء الأمور غدًا الساعة 6 مساءً.', timestamp: '11:00 ص' }],
        };
    }
    return null;
};

export const getStudentAndScheduleByParentId = async (parentId: string) => {
    await networkDelay(800);
    if (parentId === 'par_001') {
        return { student: MOCK_STUDENT, schedule: MOCK_SCHEDULE };
    }
    return { student: null, schedule: [] };
};

export const getParentRequests = async (parentId: string): Promise<ParentRequest[]> => {
    await networkDelay(500);
    if (parentId === 'par_001') {
        return MOCK_PARENT_REQUESTS;
    }
    return [];
};

export const submitParentRequest = async (parentId: string, requestData: Omit<ParentRequest, 'id' | 'submissionDate' | 'status'>): Promise<ParentRequest> => {
    await networkDelay(1000);
    const newRequest: ParentRequest = {
        id: `req_${Date.now()}`,
        ...requestData,
        submissionDate: new Date().toISOString().split('T')[0],
        status: RequestStatus.Pending,
    };
    MOCK_PARENT_REQUESTS.unshift(newRequest);
    return newRequest;
};

export const getParentTransportationDetails = async (parentId: string) => {
    await networkDelay(700);
    if (parentId === 'par_001') {
        return MOCK_TRANSPORT_DETAILS;
    }
    return null;
};

// New Assignment APIs for Parent App
export const getStudentAssignments = async (studentId: string): Promise<Assignment[]> => {
    await networkDelay(800);
    // For this mock, student 'std_001' is in class 'cls_02'.
    if (studentId === 'std_001') {
        return MOCK_ASSIGNMENTS.filter(a => a.classId === 'cls_02');
    }
    return [];
};

export const getSubmissionForAssignment = async (studentId: string, assignmentId: string): Promise<Submission> => {
    await networkDelay(500);
    const submission = MOCK_SUBMISSIONS.find(s => s.studentId === studentId && s.assignmentId === assignmentId);
    if (submission) {
        return submission;
    }
    // If no submission exists, return a placeholder
    return {
        id: `sub_new_${studentId}_${assignmentId}`,
        assignmentId: assignmentId,
        studentId: studentId,
        studentName: MOCK_STUDENT.name,
        submissionDate: null,
        status: SubmissionStatus.NotSubmitted,
    };
};

export const submitAssignment = async (submissionId: string): Promise<Submission> => {
    await networkDelay(1500);
    const submissionIndex = MOCK_SUBMISSIONS.findIndex(s => s.id === submissionId);
    if (submissionIndex !== -1) {
        MOCK_SUBMISSIONS[submissionIndex].status = SubmissionStatus.Submitted;
        MOCK_SUBMISSIONS[submissionIndex].submissionDate = new Date().toISOString().split('T')[0];
        return MOCK_SUBMISSIONS[submissionIndex];
    }
    // This case handles submitting for the first time
    const newSubmission: Submission = {
        id: submissionId,
        assignmentId: submissionId.split('_').pop() || '',
        studentId: 'std_001',
        studentName: 'أحمد محمد عبدالله',
        submissionDate: new Date().toISOString().split('T')[0],
        status: SubmissionStatus.Submitted,
    };
    MOCK_SUBMISSIONS.push(newSubmission);
    return newSubmission;
};
