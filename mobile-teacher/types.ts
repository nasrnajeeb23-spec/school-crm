// This mirrors the UserRole from the main admin types for consistency.
export enum UserRole {
  SuperAdmin = 'SUPER_ADMIN',
  SchoolAdmin = 'SCHOOL_ADMIN',
  Teacher = 'TEACHER',
  Parent = 'PARENT',
  Driver = 'DRIVER',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  teacherId?: string;
  schoolId?: number;
}

export interface School {
  id: number;
  name: string;
}

export interface Class {
  id: string;
  name: string;
  studentCount: number;
  gradeLevel: string;
  subjects: string[];
  homeroomTeacherName: string;
}

export interface ScheduleEntry {
  id: string;
  timeSlot: string;
  subject: string;
  className: string; // For dashboard display
  // More details for api logic
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';
  classId: string;
  teacherName: string;
}


export enum ActionItemType {
    Warning = 'warning',
    Info = 'info',
    Approval = 'approval',
}

export interface ActionItem {
    id: string;
    type: ActionItemType;
    title: string;
    description: string;
}

// NEW additions for Phase 4
export enum StudentStatus {
    Active = 'نشط',
    Suspended = 'موقوف',
}

export interface Student {
    id: string;
    name: string;
    status: StudentStatus;
    profileImageUrl: string;
    parentName: string;
    grade: string;
}

// NEW additions for Phase 5
export enum AttendanceStatus {
    Present = 'حاضر',
    Absent = 'غائب',
    Late = 'متأخر',
    Excused = 'بعذر',
}

export interface AttendanceRecord {
    studentId: string;
    studentName: string;
    status: AttendanceStatus;
}

export interface DailyAttendance {
    classId: string;
    date: string; // YYYY-MM-DD
    records: AttendanceRecord[];
}

// NEW additions for Phase 6
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

// NEW additions for Phase 7
export enum ConversationType {
    Direct = 'مباشرة',
    Group = 'مجموعة',
    Announcement = 'إعلان',
}

export interface Message {
    id: string;
    senderId: 'me' | 'other'; // 'me' for the current user
    text: string;
    timestamp: string;
}

export interface Conversation {
    id: string;
    roomId: string;
    type: ConversationType;
    participantName: string;
    participantAvatar: string;
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
}

// NEW additions for Phase 8
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

// NEW additions for Phase 9 - Assignments
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