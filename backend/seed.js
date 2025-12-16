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

    // Create Schools
    const school = await School.create({
      id: 1,
      name: 'مدرسة النهضة',
      domain: 'alnahda',
      type: 'K12',
      phone: '0112223333',
      email: 'info@alnahda.edu.sa',
      address: 'الرياض، المملكة العربية السعودية',
      city: 'Riyadh',
      country: 'Saudi Arabia',
      subscriptionStatus: 'Active'
    });
    console.log('Schools seeded!');

    // Create Plans
    const plans = await Plan.bulkCreate([
       { id: 1, name: 'الأساسية', price: 99, pricePeriod: 'شهرياً', features: JSON.stringify(['الوظائف الأساسية', 'تطبيق ولي الأمر (محدود)']), limits: JSON.stringify({ students: 200, teachers: 15 }), recommended: false },
       { id: 2, name: 'المتقدمة', price: 199, pricePeriod: 'شهرياً', features: JSON.stringify(['تطبيق المعلم', 'إدارة الحافلات', 'الرسائل القصيرة']), limits: JSON.stringify({ students: 500, teachers: 40 }), recommended: true },
       { id: 3, name: 'الاحترافية', price: 399, pricePeriod: 'شهرياً', features: JSON.stringify(['دعم فني مخصص', 'تقارير متقدمة', 'ربط API']), limits: JSON.stringify({ students: 2000, teachers: 150 }), recommended: false },
    ]);
    console.log('Plans seeded!');

    // Create Subscription
    await Subscription.create({
        schoolId: 1,
        planId: 2,
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        renewalDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        autoRenew: true
    });
    console.log('Subscriptions seeded!');

    // Create Teachers, Parents, Students, Classes for School 1
    const teachers = await Teacher.bulkCreate([
      { id: 1, name: 'أ. محمد الغامدي', subject: 'الرياضيات', phone: '0501234567', status: 'Active', joinDate: '2020-08-15', schoolId: 1 },
      { id: 2, name: 'أ. حصة السبيعي', subject: 'اللغة الإنجليزية', phone: '0557654321', status: 'Active', joinDate: '2019-09-01', schoolId: 1 },
      { id: 3, name: 'أ. عبدالله الشهري', subject: 'العلوم', phone: '0533445566', status: 'OnLeave', joinDate: '2021-03-10', schoolId: 1 },
    ]);
    const parents = await Parent.bulkCreate([
      { id: 1, name: 'محمد عبدالله', email: 'm.abdullah@email.com', phone: '0501112222', status: 'Active', schoolId: 1 },
      { id: 2, name: 'خالد حسين', email: 'k.hussain@email.com', phone: '0503334444', status: 'Active', schoolId: 1 },
    ]);
    const students = await Student.bulkCreate([
      { id: 1, name: 'أحمد محمد عبدالله', grade: 'الصف الخامس', status: 'Active', registrationDate: '2022-09-01', profileImageUrl: 'https://picsum.photos/seed/std_001/100/100', dateOfBirth: '2014-05-10', schoolId: 1, parentId: 1, parentName: 'محمد عبدالله' },
      { id: 2, name: 'فاطمة خالد حسين', grade: 'الصف الثالث', status: 'Active', registrationDate: '2023-09-05', profileImageUrl: 'https://picsum.photos/seed/std_002/100/100', dateOfBirth: '2016-08-22', schoolId: 1, parentId: 2, parentName: 'خالد حسين' },
    ]);
    const classes = await Class.bulkCreate([
      { id: 2, name: 'الصف الخامس - ب', gradeLevel: 'الصف الخامس', homeroomTeacherName: 'أ. محمد الغامدي', studentCount: 28, schoolId: 1, homeroomTeacherId: 1 },
      { id: 3, name: 'الصف السابع - ج', gradeLevel: 'الصف السابع', homeroomTeacherName: 'أ. حصة السبيعي', studentCount: 30, schoolId: 1, homeroomTeacherId: 2 },
    ]);
    console.log('Base school data seeded!');

     // Create Users
    await User.bulkCreate([
      { id: 1, name: 'المدير العام', email: 'super@admin.com', password: 'password', role: 'SUPER_ADMIN' },
      { id: 2, name: 'مدير مدرسة النهضة', email: 'admin@school.com', password: 'password', role: 'SCHOOL_ADMIN', schoolId: 1 },
      { id: 3, name: 'أ. محمد الغامدي', email: 'teacher@school.com', password: 'password', role: 'TEACHER', schoolId: 1, teacherId: 1 },
      { id: 4, name: 'محمد عبدالله', email: 'parent@school.com', password: 'password', role: 'PARENT', schoolId: 1, parentId: 1 },
    ]);
    console.log('Users seeded!');
    
    // Create Invoices for students
    await Invoice.bulkCreate([
        { studentId: 1, amount: 500.00, dueDate: new Date('2024-05-15'), status: 'PAID', schoolId: 1 },
        { studentId: 1, amount: 150.00, dueDate: new Date('2024-05-20'), status: 'UNPAID', schoolId: 1 },
    ]);
    console.log('Invoices seeded!');

    // Create detailed student data for Student Profile
    await Grade.bulkCreate([
        { subject: 'الرياضيات', homework: 10, quiz: 14, midterm: 25, final: 49, studentId: 1, teacherId: 1, classId: 2, schoolId: 1 },
        { subject: 'اللغة الإنجليزية', homework: 9, quiz: 13, midterm: 21, final: 42, studentId: 1, teacherId: 2, classId: 2, schoolId: 1 },
        { subject: 'العلوم', homework: 8, quiz: 12, midterm: 22, final: 45, studentId: 1, teacherId: 3, classId: 2, schoolId: 1 },
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
       { day: 'Sunday', timeSlot: '08:00 - 09:00', subject: 'الرياضيات', classId: 2, teacherId: 1, schoolId: 1 },
       { day: 'Sunday', timeSlot: '09:00 - 10:00', subject: 'العلوم', classId: 2, teacherId: 3, schoolId: 1 },
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
    
    // Create notifications for teacher
    await Notification.bulkCreate([
        { type: 'Info', title: 'تسليم درجات الرياضيات', description: 'آخر موعد لتسليم درجات اختبار منتصف الفصل للصف الخامس-ب هو غدًا.', date: new Date(), teacherId: 1, schoolId: 1 },
        { type: 'Approval', title: 'رسالة جديدة من ولي أمر', description: 'لديك رسالة جديدة من "محمد عبدالله" بخصوص الطالب أحمد.', date: new Date(), teacherId: 1, schoolId: 1 },
    ]);
    console.log('Teacher Notifications seeded!');

    // Create notifications for parent
     await Notification.bulkCreate([
        { type: 'Warning', title: 'فاتورة مستحقة', description: 'فاتورة الرسوم الدراسية لشهر مايو مستحقة الدفع.', date: new Date(), parentId: 1, schoolId: 1 },
        { type: 'Info', title: 'درجات جديدة', description: 'تم رصد درجات جديدة في مادة العلوم.', date: new Date(), parentId: 1, schoolId: 1 },
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
