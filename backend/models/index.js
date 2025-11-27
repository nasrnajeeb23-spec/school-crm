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


// Define associations
// School <-> Subscription (One-to-One)
School.hasOne(Subscription, { foreignKey: 'schoolId' });
Subscription.belongsTo(School, { foreignKey: 'schoolId' });

// Plan <-> Subscription (One-to-Many)
Plan.hasMany(Subscription, { foreignKey: 'planId' });
Subscription.belongsTo(Plan, { foreignKey: 'planId' });

// Invoice <-> Payment (One-to-Many, as an invoice can have partial payments)
Invoice.hasMany(Payment, { foreignKey: 'invoiceId' });
Payment.belongsTo(Invoice, { foreignKey: 'invoiceId' });

// School <-> User (One-to-Many) - For SchoolAdmins
School.hasMany(User, { foreignKey: 'schoolId' });
User.belongsTo(School, { foreignKey: 'schoolId' });

// User <-> Teacher (One-to-One)
User.belongsTo(Teacher, { foreignKey: 'teacherId', constraints: false });
Teacher.hasOne(User, { foreignKey: 'teacherId' });

// User <-> Parent (One-to-One)
User.belongsTo(Parent, { foreignKey: 'parentId', constraints: false });
Parent.hasOne(User, { foreignKey: 'parentId' });


// School <-> Student (One-to-Many)
School.hasMany(Student, { foreignKey: 'schoolId' });
Student.belongsTo(School, { foreignKey: 'schoolId' });

// School <-> Teacher (One-to-Many)
School.hasMany(Teacher, { foreignKey: 'schoolId' });
Teacher.belongsTo(School, { foreignKey: 'schoolId' });

// School <-> Class (One-to-Many)
School.hasMany(Class, { foreignKey: 'schoolId' });
Class.belongsTo(School, { foreignKey: 'schoolId' });

// Class <-> homeroomTeacher (One-to-One)
Teacher.hasOne(Class, { as: 'HomeroomClass', foreignKey: 'homeroomTeacherId' });
Class.belongsTo(Teacher, { as: 'HomeroomTeacher', foreignKey: 'homeroomTeacherId' });


// School <-> Parent (One-to-Many)
School.hasMany(Parent, { foreignKey: 'schoolId' });
Parent.belongsTo(School, { foreignKey: 'schoolId' });

// Parent <-> Student (One-to-Many, a parent can have multiple children)
Parent.hasMany(Student, { foreignKey: 'parentId' });
Student.belongsTo(Parent, { foreignKey: 'parentId' });

// Student <-> Invoice (One-to-Many)
Student.hasMany(Invoice, { foreignKey: 'studentId' });
Invoice.belongsTo(Student, { foreignKey: 'studentId' });

// School <-> SchoolSettings (One-to-One)
School.hasOne(SchoolSettings, { foreignKey: 'schoolId' });
SchoolSettings.belongsTo(School, { foreignKey: 'schoolId' });

// School <-> SchoolEvent (One-to-Many)
School.hasMany(SchoolEvent, { foreignKey: 'schoolId' });
SchoolEvent.belongsTo(School, { foreignKey: 'schoolId' });

// School <-> Expense (One-to-Many)
School.hasMany(Expense, { foreignKey: 'schoolId' });
Expense.belongsTo(School, { foreignKey: 'schoolId' });

// Teacher <-> Notification (One-to-Many)
Teacher.hasMany(Notification, { foreignKey: 'teacherId' });
Notification.belongsTo(Teacher, { foreignKey: 'teacherId' });

// Parent <-> Notification (One-to-Many)
Parent.hasMany(Notification, { foreignKey: 'parentId' });
Notification.belongsTo(Parent, { foreignKey: 'parentId' });


// --- Student Profile Associations ---

// Student <-> Grade (One-to-Many)
Student.hasMany(Grade, { foreignKey: 'studentId' });
Grade.belongsTo(Student, { foreignKey: 'studentId' });
Teacher.hasMany(Grade, { foreignKey: 'teacherId' });
Grade.belongsTo(Teacher, { foreignKey: 'teacherId' });
Class.hasMany(Grade, { foreignKey: 'classId' });
Grade.belongsTo(Class, { foreignKey: 'classId' });

// Student <-> Attendance (One-to-Many)
Student.hasMany(Attendance, { foreignKey: 'studentId' });
Attendance.belongsTo(Student, { foreignKey: 'studentId' });
Class.hasMany(Attendance, { foreignKey: 'classId' });
Attendance.belongsTo(Class, { foreignKey: 'classId' });

// Student <-> Note (One-to-Many)
Student.hasMany(StudentNote, { foreignKey: 'studentId' });
StudentNote.belongsTo(Student, { foreignKey: 'studentId' });

// Student <-> Document (One-to-Many)
Student.hasMany(StudentDocument, { foreignKey: 'studentId' });
StudentDocument.belongsTo(Student, { foreignKey: 'studentId' });

// Class <-> Student (One-to-Many roster membership)
Class.hasMany(Student, { foreignKey: 'classId' });
Student.belongsTo(Class, { foreignKey: 'classId' });

// Class <-> Schedule (One-to-Many)
Class.hasMany(Schedule, { foreignKey: 'classId' });
Schedule.belongsTo(Class, { foreignKey: 'classId' });
Teacher.hasMany(Schedule, { foreignKey: 'teacherId' });
Schedule.belongsTo(Teacher, { foreignKey: 'teacherId' });

// --- Transportation Associations ---
School.hasMany(BusOperator, { foreignKey: 'schoolId' });
BusOperator.belongsTo(School, { foreignKey: 'schoolId' });

School.hasMany(Route, { foreignKey: 'schoolId' });
Route.belongsTo(School, { foreignKey: 'schoolId' });
BusOperator.hasMany(Route, { foreignKey: 'busOperatorId' });
Route.belongsTo(BusOperator, { foreignKey: 'busOperatorId' });

Route.hasMany(RouteStudent, { foreignKey: 'routeId' });
RouteStudent.belongsTo(Route, { foreignKey: 'routeId' });
Student.hasMany(RouteStudent, { foreignKey: 'studentId' });
RouteStudent.belongsTo(Student, { foreignKey: 'studentId' });

// --- Messaging Associations ---
Conversation.hasMany(Message, { foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });
Teacher.hasMany(Conversation, { foreignKey: 'teacherId' });
Parent.hasMany(Conversation, { foreignKey: 'parentId' });
Conversation.belongsTo(Teacher, { foreignKey: 'teacherId' });
Conversation.belongsTo(Parent, { foreignKey: 'parentId' });
School.hasMany(Conversation, { foreignKey: 'schoolId' });
Conversation.belongsTo(School, { foreignKey: 'schoolId' });


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
};

module.exports = db;
// School <-> SalaryStructure (One-to-Many)
School.hasMany(SalaryStructure, { foreignKey: 'schoolId' });
SalaryStructure.belongsTo(School, { foreignKey: 'schoolId' });

// School <-> FeeSetup (One-to-Many)
School.hasMany(FeeSetup, { foreignKey: 'schoolId' });
FeeSetup.belongsTo(School, { foreignKey: 'schoolId' });

// School <-> SalarySlip (One-to-Many)
School.hasMany(SalarySlip, { foreignKey: 'schoolId' });
SalarySlip.belongsTo(School, { foreignKey: 'schoolId' });

// User/Teacher <-> SalarySlip (One-to-Many via personId)
// School <-> StaffAttendance (One-to-Many)
School.hasMany(StaffAttendance, { foreignKey: 'schoolId' });
StaffAttendance.belongsTo(School, { foreignKey: 'schoolId' });
User.hasMany(StaffAttendance, { foreignKey: 'userId' });
StaffAttendance.belongsTo(User, { foreignKey: 'userId' });

// School <-> TeacherAttendance (One-to-Many)
School.hasMany(TeacherAttendance, { foreignKey: 'schoolId' });
TeacherAttendance.belongsTo(School, { foreignKey: 'schoolId' });
Teacher.hasMany(TeacherAttendance, { foreignKey: 'teacherId' });
TeacherAttendance.belongsTo(Teacher, { foreignKey: 'teacherId' });
