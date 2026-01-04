const { sequelize, Plan, School, Subscription, Invoice, Payment, Student, Teacher, Class, Parent, SchoolSettings, SchoolEvent, Grade, Attendance, Schedule, StudentNote, StudentDocument, Notification, User } = require('./models');

const seedDatabase = async () => {
  try {
    // Disable foreign keys to allow dropping tables
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    
    // Sync all models with the database, forcing table recreation
    await sequelize.sync({ force: true });
    
    // Re-enable foreign keys
    await sequelize.query('PRAGMA foreign_keys = ON;');
    
    console.log('Database synced!');

// 1. Create Plans
    const plans = await Plan.bulkCreate([
       { id: 1, name: 'الأساسية', price: 99, pricePeriod: 'شهرياً', features: ['إدارة الطلاب', 'الحضور والغياب', 'بوابة ولي الأمر', 'بوابة المعلم', 'الرسوم والفواتير'], limits: { students: 200, teachers: 15, invoices: 200, storageGB: 5 }, recommended: false },
        { id: 2, name: 'المميزة', price: 249, pricePeriod: 'شهرياً', features: ['كل ميزات الأساسية', 'التقارير المتقدمة', 'المالية المتقدمة', 'النقل المدرسي', 'دعم أولوية'], limits: { students: 1000, teachers: 50, invoices: 2000, storageGB: 50 }, recommended: true },
        { id: 3, name: 'المؤسسات', price: 899, pricePeriod: 'تواصل معنا', features: ['كل ميزات المميزة', 'تقارير مخصصة', 'دعم مخصص', 'تكاملات API', 'SLA للمؤسسات'], limits: { students: 'غير محدود', teachers: 'غير محدود', invoices: 'غير محدود', storageGB: 'غير محدود' }, recommended: false },
    ]);
    console.log('Plans seeded!');

    // 2. Create Schools
    const schools = await School.bulkCreate([
      { id: 1, name: 'مدرسة النهضة الحديثة', email: 'info@nahda.com', studentCount: 7, teacherCount: 5, balance: 0 },
      { id: 2, name: 'أكاديمية المستقبل الدولية', email: 'info@future.com', studentCount: 1200, teacherCount: 85, balance: 0 },
      { id: 3, name: 'مدارس الأوائل النموذجية', email: 'info@awael.com', studentCount: 200, teacherCount: 15, balance: 150 },
    ]);
    console.log('Schools seeded!');

    // 3. Create School Settings & Events
    await SchoolSettings.bulkCreate([
      { schoolId: 1, schoolName: 'مدرسة النهضة الحديثة', schoolAddress: '123 شارع المعرفة، مدينة التعليم', academicYearStart: '2024-09-01', academicYearEnd: '2025-06-20', notifications: JSON.stringify({ email: true, sms: false, push: true }) },
    ]);
    await SchoolEvent.bulkCreate([
        { schoolId: 1, title: 'اجتماع أولياء الأمور للصف الخامس', date: '2024-05-25', time: '06:00 م', eventType: 'Meeting' },
    ]);
    console.log('School Settings & Events seeded!');

    // 4. Create Subscriptions
    await Subscription.bulkCreate([
        { schoolId: 1, planId: 2, status: 'ACTIVE', renewalDate: new Date('2024-09-01') },
        { schoolId: 2, planId: 3, status: 'ACTIVE', renewalDate: new Date('2024-08-15') },
        { schoolId: 3, planId: 1, status: 'PAST_DUE', renewalDate: new Date('2024-07-05') },
    ]);

    console.log('Subscriptions seeded!');

    // 5. Create Teachers
    const teachers = await Teacher.bulkCreate([
      { id: 1, name: 'أ. محمد الغامدي', subject: 'الرياضيات', phone: '0501234567', status: 'Active', joinDate: '2020-08-15', schoolId: 1 },
      { id: 2, name: 'أ. حصة السبيعي', subject: 'اللغة الإنجليزية', phone: '0557654321', status: 'Active', joinDate: '2019-09-01', schoolId: 1 },
      { id: 3, name: 'أ. عبدالله الشهري', subject: 'العلوم', phone: '0533445566', status: 'OnLeave', joinDate: '2021-03-10', schoolId: 1 },
    ]);
    console.log('Teachers seeded!');

    // 6. Create Parents
    const parents = await Parent.bulkCreate([
      { id: 1, name: 'محمد عبدالله', email: 'm.abdullah@email.com', phone: '0501112222', status: 'Active', schoolId: 1 },
      { id: 2, name: 'خالد حسين', email: 'k.hussain@email.com', phone: '0503334444', status: 'Active', schoolId: 1 },
    ]);
    console.log('Parents seeded!');

    // 7. Create Users (Now references are valid)
    await User.bulkCreate([
      { id: 1, name: 'المدير العام', email: 'super@admin.com', password: 'password', role: 'SUPER_ADMIN' },
      { id: 2, name: 'مدير مدرسة النهضة', email: 'admin@school.com', password: 'password', role: 'SCHOOL_ADMIN', schoolId: 1 },
      { id: 3, name: 'أ. محمد الغامدي', email: 'teacher@school.com', password: 'password', role: 'TEACHER', schoolId: 1, teacherId: 1 },
      { id: 4, name: 'محمد عبدالله', email: 'parent@school.com', password: 'password', role: 'PARENT', schoolId: 1, parentId: 1 },
    ]);
    console.log('Users seeded!');

    // 8. Create Students
    const students = await Student.bulkCreate([
{ id: 'std_001', name: 'أحمد محمد عبدالله', grade: 'الصف الخامس', status: 'Active', registrationDate: '2022-09-01', profileImageUrl: 'https://picsum.photos/seed/std_001/100/100', dateOfBirth: '2014-05-10', schoolId: 1, parentId: 1, parentName: 'محمد عبدالله' },
      { id: 'std_002', name: 'فاطمة خالد حسين', grade: 'الصف الثالث', status: 'Active', registrationDate: '2023-09-05', profileImageUrl: 'https://picsum.photos/seed/std_002/100/100', dateOfBirth: '2016-08-22', schoolId: 1, parentId: 2, parentName: 'خالد حسين' },

    ]);
    console.log('Students seeded!');

    // 9. Create Classes
    const classes = await Class.bulkCreate([
{ id: 'cls_02', name: 'الصف الخامس - ب', gradeLevel: 'الصف الخامس', homeroomTeacherName: 'أ. محمد الغامدي', studentCount: 28, schoolId: 1, homeroomTeacherId: 1 },
      { id: 'cls_03', name: 'الصف السابع - ج', gradeLevel: 'الصف السابع', homeroomTeacherName: 'أ. حصة السبيعي', studentCount: 30, schoolId: 1, homeroomTeacherId: 2 },
    ]);
    console.log('Classes seeded!');

    
    // 10. Create Invoices for students
    await Invoice.bulkCreate([
        { studentId: 1, amount: 500.00, dueDate: new Date('2024-05-15'), status: 'PAID', schoolId: 1 },
        { studentId: 1, amount: 150.00, dueDate: new Date('2024-05-20'), status: 'UNPAID', schoolId: 1 },
    ]);
    console.log('Invoices seeded!');

    // 11. Create detailed student data for Student Profile
    await Grade.bulkCreate([
{ subject: 'الرياضيات', homework: 10, quiz: 14, midterm: 25, final: 49, studentId: 'std_001', teacherId: 1, classId: 'cls_02' },
        { subject: 'اللغة الإنجليزية', homework: 9, quiz: 13, midterm: 21, final: 42, studentId: 'std_001', teacherId: 2, classId: 'cls_02' },
        { subject: 'العلوم', homework: 8, quiz: 12, midterm: 22, final: 45, studentId: 'std_001', teacherId: 3, classId: 'cls_02' },

    ]);
    console.log('Grades seeded!');

    await Attendance.bulkCreate([
        { date: '2024-05-19', status: 'Present', studentId: 1, classId: 2, schoolId: 1 },
        { date: '2024-05-20', status: 'Present', studentId: 1, classId: 2, schoolId: 1 },
        { date: '2024-05-21', status: 'Late', studentId: 1, classId: 2, schoolId: 1 },
        { date: '2024-05-22', status: 'Absent', studentId: 1, classId: 2, schoolId: 1 },
    ]);
    console.log('Attendance seeded!');
    
    await Schedule.bulkCreate([
{ day: 'Sunday', timeSlot: '08:00 - 09:00', subject: 'الرياضيات', classId: 'cls_02', teacherId: 1 },
       { day: 'Sunday', timeSlot: '09:00 - 10:00', subject: 'العلوم', classId: 'cls_02', teacherId: 3 },

    ]);
    console.log('Schedules seeded!');

    await StudentNote.bulkCreate([
        { content: 'أظهر أحمد تقدماً ملحوظاً في مادة الرياضيات هذا الشهر.', author: 'أ. محمد الغامدي', date: '2024-05-15', studentId: 1, schoolId: 1 },
        { content: 'مشاركته في فصل اللغة الإنجليزية ممتازة ويساعد زملائه.', author: 'أ. حصة السبيعي', date: '2024-04-28', studentId: 1, schoolId: 1 },
    ]);
    console.log('Student Notes seeded!');
    
    await StudentDocument.bulkCreate([
        { fileName: 'شهادة الميلاد.pdf', fileType: 'pdf', uploadDate: '2022-08-20', fileSize: '1.2 MB', studentId: 1, schoolId: 1 },
        { fileName: 'صورة شخصية.jpg', fileType: 'jpg', uploadDate: '2022-08-20', fileSize: '800 KB', studentId: 1, schoolId: 1 },
    ]);
    console.log('Student Documents seeded!');
    
    // 12. Create notifications for teacher
    await Notification.bulkCreate([
{ type: 'Info', title: 'تسليم درجات الرياضيات', description: 'آخر موعد لتسليم درجات اختبار منتصف الفصل للصف الخامس-ب هو غدًا.', date: new Date(), teacherId: 1 },
        { type: 'Approval', title: 'رسالة جديدة من ولي أمر', description: 'لديك رسالة جديدة من "محمد عبدالله" بخصوص الطالب أحمد.', date: new Date(), teacherId: 1 },
    ]);
    console.log('Teacher Notifications seeded!');

    // 13. Create notifications for parent
    await Notification.bulkCreate([
        { type: 'Warning', title: 'فاتورة مستحقة', description: 'فاتورة الرسوم الدراسية لشهر مايو مستحقة الدفع.', date: new Date(), parentId: 1 },
        { type: 'Info', title: 'درجات جديدة', description: 'تم رصد درجات جديدة في مادة العلوم.', date: new Date(), parentId: 1 },

    ]);
    console.log('Parent Notifications seeded!');


    console.log('Database seeding completed successfully.');
  } catch (error)
 {
    console.error('Failed to seed database:', error);
  } finally {
    await sequelize.close();
  }
};

seedDatabase();
