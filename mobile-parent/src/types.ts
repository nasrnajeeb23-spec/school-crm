export enum UserRole {
  SuperAdmin = 'SUPER_ADMIN',
  SchoolAdmin = 'SCHOOL_ADMIN',
  Teacher = 'TEACHER',
  Parent = 'PARENT',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  parentId?: string;
  schoolId?: number;
}

export interface School {
  id: number;
  name: string;
}

export enum StudentStatus {
    Active = 'نشط',
    Suspended = 'موقوف',
}

export interface Student {
    id: string;
    name: string;
    grade: string;
    parentName: string;
    status: StudentStatus;
    profileImageUrl: string;
}

export enum ParentAccountStatus {
    Active = 'نشط',
    Invited = 'مدعو',
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

export enum InvoiceStatus {
    Paid = 'مدفوعة',
    Unpaid = 'غير مدفوعة',
    Overdue = 'متأخرة',
}

export interface Invoice {
    id: string;
    studentName: string;
    status: InvoiceStatus;
    issueDate: string;
    dueDate: string;
    totalAmount: number;
}

export interface Grade {
    homework: number;
    quiz: number;
    midterm: number;
    final: number;
}

export interface StudentGrades {
    classId: string;
    subject: string;
    studentId: string;
    studentName: string;
    grades: Grade;
}

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
    date?: string;
}

export interface ScheduleEntry {
  id: string;
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';
  timeSlot: string;
  subject: string;
  teacherName: string;
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

export interface ParentRequest {
    id: string;
    type: RequestType;
    details: string;
    submissionDate: string;
    status: RequestStatus;
}

export enum BusOperatorStatus {
    Pending = 'قيد المراجعة',
    Approved = 'معتمد',
    Rejected = 'مرفوض',
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

export interface Route {
    id: string;
    name: string;
    busOperatorId: string | null;
    studentIds: string[];
}

// Assignment Types
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