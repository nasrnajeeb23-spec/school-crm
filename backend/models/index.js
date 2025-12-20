const sequelize = require('../config/db');
const User = require('./User');
const School = require('./School');
const Plan = require('./Plan');
const Subscription = require('./Subscription');
const Invoice = require('./Invoice');
const Payment = require('./Payment');
const Student = require('./Student');
const Teacher = require('./Teacher');
const Class = require('./Class');
const Parent = require('./Parent');
const SchoolSettings = require('./SchoolSettings');
const SchoolEvent = require('./SchoolEvent');
const Expense = require('./Expense');
const Grade = require('./Grade');
const Attendance = require('./Attendance');
const Schedule = require('./Schedule');
const StudentNote = require('./StudentNote');
const StudentDocument = require('./StudentDocument');
const Notification = require('./Notification');
const SalaryStructure = require('./SalaryStructure');
const FeeSetup = require('./FeeSetup');
const SalarySlip = require('./SalarySlip');
const BusOperator = require('./BusOperator');
const Route = require('./Route');
const RouteStudent = require('./RouteStudent');
const Conversation = require('./Conversation');
const Message = require('./Message');
const AuditLog = require('./AuditLog');
const StaffAttendance = require('./StaffAttendance');
const TeacherAttendance = require('./TeacherAttendance');
const SecurityPolicy = require('./SecurityPolicy');
const ModuleCatalog = require('./ModuleCatalog');
const PricingConfig = require('./PricingConfig');
const Job = require('./Job');
const ApiKey = require('./ApiKey');
const TrialRequest = require('./TrialRequest');
const BehaviorRecord = require('./BehaviorRecord');
const SchoolStats = require('./SchoolStats');
const Assignment = require('./Assignment');
const Submission = require('./Submission');
const SubscriptionModule = require('./SubscriptionModule');
const CommunicationUsage = require('./CommunicationUsage');
const ContactMessage = require('./ContactMessage');


// Define associations
// School <-> Subscription (One-to-One)
School.hasOne(Subscription, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
Subscription.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// Subscription <-> SubscriptionModule (One-to-Many)
Subscription.hasMany(SubscriptionModule, { foreignKey: 'subscriptionId', onDelete: 'CASCADE', hooks: true });
SubscriptionModule.belongsTo(Subscription, { foreignKey: 'subscriptionId', onDelete: 'CASCADE' });

// SubscriptionModule <-> ModuleCatalog (Many-to-One)
SubscriptionModule.belongsTo(ModuleCatalog, { foreignKey: 'moduleId', targetKey: 'id' });

// Plan <-> Subscription (One-to-Many)
Plan.hasMany(Subscription, { foreignKey: 'planId', onDelete: 'SET NULL' });
Subscription.belongsTo(Plan, { foreignKey: 'planId', onDelete: 'SET NULL' });

// Invoice <-> Payment (One-to-Many, as an invoice can have partial payments)
Invoice.hasMany(Payment, { foreignKey: 'invoiceId', onDelete: 'CASCADE', hooks: true });
Payment.belongsTo(Invoice, { foreignKey: 'invoiceId', onDelete: 'CASCADE' });

// School <-> User (One-to-Many) - For SchoolAdmins
School.hasMany(User, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
User.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// User <-> Teacher (One-to-One)
User.belongsTo(Teacher, { foreignKey: 'teacherId', constraints: false, onDelete: 'SET NULL' });
Teacher.hasOne(User, { foreignKey: 'teacherId', onDelete: 'SET NULL' });

// User <-> Parent (One-to-One)
User.belongsTo(Parent, { foreignKey: 'parentId', constraints: false, onDelete: 'SET NULL' });
Parent.hasOne(User, { foreignKey: 'parentId', onDelete: 'SET NULL' });


// School <-> Student (One-to-Many)
School.hasMany(Student, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
Student.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// School <-> Teacher (One-to-Many)
School.hasMany(Teacher, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
Teacher.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// School <-> Class (One-to-Many)
School.hasMany(Class, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
Class.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// Class <-> homeroomTeacher (One-to-One)
Teacher.hasOne(Class, { as: 'HomeroomClass', foreignKey: 'homeroomTeacherId', onDelete: 'SET NULL' });
Class.belongsTo(Teacher, { as: 'HomeroomTeacher', foreignKey: 'homeroomTeacherId', onDelete: 'SET NULL' });


// School <-> Parent (One-to-Many)
School.hasMany(Parent, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
Parent.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// Parent <-> Student (One-to-Many, a parent can have multiple children)
Parent.hasMany(Student, { foreignKey: 'parentId', onDelete: 'SET NULL' });
Student.belongsTo(Parent, { foreignKey: 'parentId', onDelete: 'SET NULL' });

// Student <-> Invoice (One-to-Many)
Student.hasMany(Invoice, { foreignKey: 'studentId', onDelete: 'CASCADE', hooks: true });
Invoice.belongsTo(Student, { foreignKey: 'studentId', onDelete: 'CASCADE' });

// School <-> SchoolSettings (One-to-One)
School.hasOne(SchoolSettings, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
SchoolSettings.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// School <-> SchoolEvent (One-to-Many)
School.hasMany(SchoolEvent, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
SchoolEvent.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// School <-> Expense (One-to-Many)
School.hasMany(Expense, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
Expense.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// Teacher <-> Notification (One-to-Many)
Teacher.hasMany(Notification, { foreignKey: 'teacherId', onDelete: 'CASCADE', hooks: true });
Notification.belongsTo(Teacher, { foreignKey: 'teacherId', onDelete: 'CASCADE' });

// Parent <-> Notification (One-to-Many)
Parent.hasMany(Notification, { foreignKey: 'parentId', onDelete: 'CASCADE', hooks: true });
Notification.belongsTo(Parent, { foreignKey: 'parentId', onDelete: 'CASCADE' });


// --- Student Profile Associations ---

// Student <-> Grade (One-to-Many)
Student.hasMany(Grade, { foreignKey: 'studentId', onDelete: 'CASCADE', hooks: true });
Grade.belongsTo(Student, { foreignKey: 'studentId', onDelete: 'CASCADE' });
Teacher.hasMany(Grade, { foreignKey: 'teacherId', onDelete: 'SET NULL' });
Grade.belongsTo(Teacher, { foreignKey: 'teacherId', onDelete: 'SET NULL' });
Class.hasMany(Grade, { foreignKey: 'classId', onDelete: 'CASCADE', hooks: true });
Grade.belongsTo(Class, { foreignKey: 'classId', onDelete: 'CASCADE' });

// Student <-> Attendance (One-to-Many)
Student.hasMany(Attendance, { foreignKey: 'studentId', onDelete: 'CASCADE', hooks: true });
Attendance.belongsTo(Student, { foreignKey: 'studentId', onDelete: 'CASCADE' });
Class.hasMany(Attendance, { foreignKey: 'classId', onDelete: 'CASCADE', hooks: true });
Attendance.belongsTo(Class, { foreignKey: 'classId', onDelete: 'CASCADE' });

// Student <-> Note (One-to-Many)
Student.hasMany(StudentNote, { foreignKey: 'studentId', onDelete: 'CASCADE', hooks: true });
StudentNote.belongsTo(Student, { foreignKey: 'studentId', onDelete: 'CASCADE' });

// Student <-> Document (One-to-Many)
Student.hasMany(StudentDocument, { foreignKey: 'studentId', onDelete: 'CASCADE', hooks: true });
StudentDocument.belongsTo(Student, { foreignKey: 'studentId', onDelete: 'CASCADE' });

// Student <-> BehaviorRecord (One-to-Many)
Student.hasMany(BehaviorRecord, { foreignKey: 'studentId', onDelete: 'CASCADE', hooks: true });
BehaviorRecord.belongsTo(Student, { foreignKey: 'studentId', onDelete: 'CASCADE' });
School.hasMany(BehaviorRecord, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
BehaviorRecord.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// Class <-> Student (One-to-Many roster membership)
Class.hasMany(Student, { foreignKey: 'classId', onDelete: 'SET NULL' });
Student.belongsTo(Class, { foreignKey: 'classId', onDelete: 'SET NULL' });

// Class <-> Schedule (One-to-Many)
Class.hasMany(Schedule, { foreignKey: 'classId', onDelete: 'CASCADE', hooks: true });
Schedule.belongsTo(Class, { foreignKey: 'classId', onDelete: 'CASCADE' });
Teacher.hasMany(Schedule, { foreignKey: 'teacherId', onDelete: 'SET NULL' });
Schedule.belongsTo(Teacher, { foreignKey: 'teacherId', onDelete: 'SET NULL' });

// --- Transportation Associations ---
School.hasMany(BusOperator, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
BusOperator.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

User.hasOne(BusOperator, { foreignKey: 'userId', onDelete: 'SET NULL' });
BusOperator.belongsTo(User, { foreignKey: 'userId', onDelete: 'SET NULL' });

School.hasMany(Route, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
Route.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });
BusOperator.hasMany(Route, { foreignKey: 'busOperatorId', onDelete: 'CASCADE', hooks: true });
Route.belongsTo(BusOperator, { foreignKey: 'busOperatorId', onDelete: 'CASCADE' });

Route.hasMany(RouteStudent, { foreignKey: 'routeId', onDelete: 'CASCADE', hooks: true });
RouteStudent.belongsTo(Route, { foreignKey: 'routeId', onDelete: 'CASCADE' });
Student.hasMany(RouteStudent, { foreignKey: 'studentId', onDelete: 'CASCADE', hooks: true });
RouteStudent.belongsTo(Student, { foreignKey: 'studentId', onDelete: 'CASCADE' });

// --- Messaging Associations ---
Conversation.hasMany(Message, { foreignKey: 'conversationId', onDelete: 'CASCADE', hooks: true });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', onDelete: 'CASCADE' });
Teacher.hasMany(Conversation, { foreignKey: 'teacherId', onDelete: 'SET NULL' });
Parent.hasMany(Conversation, { foreignKey: 'parentId', onDelete: 'SET NULL' });
Conversation.belongsTo(Teacher, { foreignKey: 'teacherId', onDelete: 'SET NULL' });
Conversation.belongsTo(Parent, { foreignKey: 'parentId', onDelete: 'SET NULL' });
School.hasMany(Conversation, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
Conversation.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

School.hasMany(CommunicationUsage, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
CommunicationUsage.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

const db = {
  sequelize,
  User,
  School,
  Plan,
  Subscription,
  Invoice,
  Payment,
  Student,
  Teacher,
  Class,
  Parent,
  SchoolSettings,
  SchoolEvent,
  Expense,
  Grade,
  Attendance,
  Schedule,
  StudentNote,
  StudentDocument,
  Notification,
  SalaryStructure,
  SalarySlip,
  BusOperator,
  Route,
  RouteStudent,
  Conversation,
  Message,
  AuditLog,
  StaffAttendance,
  TeacherAttendance,
  FeeSetup,
  Job,
  ApiKey,
  TrialRequest,
  SecurityPolicy,
  ModuleCatalog,
  PricingConfig,
  BehaviorRecord,
  SchoolStats,
  Assignment,
  Submission,
  SubscriptionModule,
  CommunicationUsage,
  ContactMessage,
};

module.exports = db;

// School <-> SchoolStats (One-to-Many)
School.hasMany(SchoolStats, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
SchoolStats.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// School <-> SalaryStructure (One-to-Many)
School.hasMany(SalaryStructure, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
SalaryStructure.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// School <-> FeeSetup (One-to-Many)
School.hasMany(FeeSetup, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
FeeSetup.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// School <-> SalarySlip (One-to-Many)
School.hasMany(SalarySlip, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
SalarySlip.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// User/Teacher <-> SalarySlip (One-to-Many via personId)
// School <-> StaffAttendance (One-to-Many)
School.hasMany(StaffAttendance, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
StaffAttendance.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });
User.hasMany(StaffAttendance, { foreignKey: 'userId', onDelete: 'CASCADE', hooks: true });
StaffAttendance.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

// School <-> TeacherAttendance (One-to-Many)
School.hasMany(TeacherAttendance, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
TeacherAttendance.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });
Teacher.hasMany(TeacherAttendance, { foreignKey: 'teacherId', onDelete: 'CASCADE', hooks: true });
TeacherAttendance.belongsTo(Teacher, { foreignKey: 'teacherId', onDelete: 'CASCADE' });
School.hasMany(Job, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
Job.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// School <-> Assignment
School.hasMany(Assignment, { foreignKey: 'schoolId', onDelete: 'CASCADE', hooks: true });
Assignment.belongsTo(School, { foreignKey: 'schoolId', onDelete: 'CASCADE' });

// Class <-> Assignment
Class.hasMany(Assignment, { foreignKey: 'classId', onDelete: 'CASCADE', hooks: true });
Assignment.belongsTo(Class, { foreignKey: 'classId', onDelete: 'CASCADE' });

// Teacher <-> Assignment
Teacher.hasMany(Assignment, { foreignKey: 'teacherId', onDelete: 'SET NULL' });
Assignment.belongsTo(Teacher, { foreignKey: 'teacherId', onDelete: 'SET NULL' });

// Assignment <-> Submission
Assignment.hasMany(Submission, { foreignKey: 'assignmentId', onDelete: 'CASCADE', hooks: true });
Submission.belongsTo(Assignment, { foreignKey: 'assignmentId', onDelete: 'CASCADE' });

// Student <-> Submission
Student.hasMany(Submission, { foreignKey: 'studentId', onDelete: 'CASCADE', hooks: true });
Submission.belongsTo(Student, { foreignKey: 'studentId', onDelete: 'CASCADE' });
