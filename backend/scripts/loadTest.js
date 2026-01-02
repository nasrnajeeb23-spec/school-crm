require('dotenv').config();
const { sequelize, School, User, Student, Teacher, Class, Attendance, SalarySlip, Conversation, Message, FeeSetup } = require('../models');

async function main() {
  const RUN = String(process.env.RUN_LOAD_SIMULATOR || '').toLowerCase() === 'true';
  if (!RUN) {
    console.log('Load simulator disabled. Set RUN_LOAD_SIMULATOR=true to enable.');
    process.exit(0);
  }
  const startAll = Date.now();
  const schools = [];
  for (let i = 1; i <= 3; i++) {
    const s = await School.create({ name: `مدرسة محاكاة ${i}`, contactEmail: `sim${i}@example.com`, studentCount: 0, teacherCount: 0, balance: 0 });
    schools.push(s);
  }
  for (const sch of schools) {
    const tStart = Date.now();
    // 3000 students
    const students = [];
    for (let i = 0; i < 3000; i++) {
      students.push({ id: `std_${sch.id}_${i}_${Date.now()}`, name: `طالب ${i}`, grade: 'الصف الخامس', parentName: 'ولي أمر', dateOfBirth: '2014-01-01', schoolId: sch.id, status: 'Active', registrationDate: new Date() });
    }
    await Student.bulkCreate(students, { validate: false });
    await sch.update({ studentCount: (sch.studentCount || 0) + 3000 });

    // 100 teachers
    const teachers = [];
    for (let i = 0; i < 100; i++) { teachers.push({ name: `معلم ${i}`, schoolId: sch.id, status: 'Active' }); }
    const teacherRows = await Teacher.bulkCreate(teachers, { validate: false });
    await sch.update({ teacherCount: (sch.teacherCount || 0) + 100 });

    // Classes
    const classes = [];
    for (let i = 0; i < 100; i++) { classes.push({ id: `cls_${sch.id}_${i}`, name: `فصل ${i}`, schoolId: sch.id, gradeLevel: '5', section: 'أ', capacity: 30 }); }
    await Class.bulkCreate(classes, { validate: false });

    // Fee setup
    await FeeSetup.create({ schoolId: sch.id, stage: 'ابتدائي', tuitionFee: 1000, bookFees: 200, uniformFees: 150, activityFees: 100, paymentPlanType: 'Monthly' });

    // Attendance (daily) for first 1000 students
    const today = new Date().toISOString().split('T')[0];
    const attRows = [];
    for (let i = 0; i < 1000; i++) { attRows.push({ id: `att_${sch.id}_${i}_${Date.now()}`, studentId: students[i].id, classId: classes[i % classes.length].id, date: today, status: 'Present' }); }
    await Attendance.bulkCreate(attRows, { validate: false });

    // Salaries (monthly) for teachers
    const slips = [];
    for (const t of teacherRows) { slips.push({ id: `slip_${sch.id}_${t.id}_${Date.now()}`, schoolId: sch.id, personType: 'teacher', personId: String(t.id), month: `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`, baseAmount: 3000, allowancesTotal: 500, deductionsTotal: 100, netAmount: 3400, status: 'Approved' }); }
    await SalarySlip.bulkCreate(slips, { validate: false });

    // Messaging among 200 users
    const conv = await Conversation.create({ id: `conv_${sch.id}_${Date.now()}`, roomId: `room_${sch.id}_${Date.now()}`, title: `غرفة ${sch.id}`, schoolId: sch.id });
    const msgs = [];
    for (let i = 0; i < 200; i++) { msgs.push({ id: `msg_${sch.id}_${i}_${Date.now()}`, text: `رسالة ${i}`, senderId: String(i+1), senderRole: 'SCHOOL_ADMIN', conversationId: conv.id }); }
    await Message.bulkCreate(msgs, { validate: false });

    const dur = Date.now() - tStart;
    console.log(`School ${sch.id} simulated: ${dur}ms`);
  }
  const total = Date.now() - startAll;
  console.log('Simulation completed in', total, 'ms');
  await sequelize.close();
}

main().catch(e => { console.error(e); process.exit(1); });
