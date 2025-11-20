const express = require('express');
const router = express.Router();
const { School, Student, Teacher, Class, Parent, Invoice, SchoolSettings, SchoolEvent, Grade, Attendance, StudentNote, StudentDocument, User } = require('../models');
const { verifyToken, requireRole, requireSameSchoolParam, requirePermission } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { validate } = require('../middleware/validate');
const { requireModule } = require('../middleware/modules');

// @route   GET api/school/:schoolId/students
// @desc    Get all students for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/students', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const students = await Student.findAll({ where: { schoolId: req.params.schoolId }, order: [['name', 'ASC']] });
    if (!students) return res.status(404).json({ msg: 'No students found' });
    
    const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
    res.json(students.map(s => ({ ...s.toJSON(), status: statusMap[s.status] || s.status })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/students
// @desc    Add a new student to a school
// @access  Private (SchoolAdmin)
router.post('/:schoolId/students', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'grade', required: true, type: 'string' },
  { name: 'parentName', required: true, type: 'string' },
  { name: 'dateOfBirth', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { name, grade, parentName, dateOfBirth } = req.body;

    const school = await School.findByPk(schoolId);
    if (!school) {
      return res.status(404).json({ msg: 'School not found' });
    }

    const newStudent = await Student.create({
      id: `std_${Date.now()}`,
      name,
      grade,
      parentName,
      dateOfBirth,
      schoolId: parseInt(schoolId),
      status: 'Active', // Default status
      registrationDate: new Date(),
      profileImageUrl: `https://picsum.photos/seed/std_${Date.now()}/100/100`,
    });

    // Increment student count in the school
    await school.increment('studentCount');

    // Map status for frontend consistency
    const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
    const formattedStudent = {
        ...newStudent.toJSON(),
        status: statusMap[newStudent.status] || newStudent.status
    };

    res.status(201).json(formattedStudent);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/school/:schoolId/students/:studentId
// @desc    Update a student
// @access  Private (SchoolAdmin)
router.put('/:schoolId/students/:studentId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'grade', required: true, type: 'string' },
  { name: 'parentName', required: true, type: 'string' },
  { name: 'dateOfBirth', required: true, type: 'string' },
  { name: 'status', required: true, type: 'string', enum: ['نشط', 'موقوف'] },
]), async (req, res) => {
  try {
    const { name, grade, parentName, dateOfBirth, status } = req.body;
    if (!name || !grade || !parentName || !dateOfBirth || !status) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }
    const student = await Student.findByPk(req.params.studentId);
    if (!student) return res.status(404).json({ msg: 'Student not found' });
    student.name = name;
    student.grade = grade;
    student.parentName = parentName;
    student.dateOfBirth = dateOfBirth;
    student.status = status === 'نشط' ? 'Active' : status === 'موقوف' ? 'Suspended' : student.status;
    await student.save();
    const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
    res.json({ ...student.toJSON(), status: statusMap[student.status] || student.status });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});


// @route   GET api/school/:schoolId/teachers
// @desc    Get all teachers for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/teachers', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const teachers = await Teacher.findAll({ where: { schoolId: req.params.schoolId }, order: [['name', 'ASC']] });
    if (!teachers) return res.status(404).json({ msg: 'No teachers found' });
    
    const statusMap = { 'Active': 'نشط', 'OnLeave': 'في إجازة' };
    res.json(teachers.map(t => ({ ...t.toJSON(), status: statusMap[t.status] || t.status })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/teachers
// @desc    Add a new teacher to a school
// @access  Private (SchoolAdmin)
router.post('/:schoolId/teachers', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'subject', required: true, type: 'string' },
  { name: 'phone', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { name, subject, phone } = req.body;

    const school = await School.findByPk(schoolId);
    if (!school) {
      return res.status(404).json({ msg: 'School not found' });
    }

    const newTeacher = await Teacher.create({
      id: `tech_${Date.now()}`,
      name,
      subject,
      phone,
      schoolId: parseInt(schoolId),
      status: 'Active', // Default status
      joinDate: new Date(),
    });

    // Increment teacher count in the school
    await school.increment('teacherCount');

    // Map status for frontend consistency
    const statusMap = { 'Active': 'نشط', 'OnLeave': 'في إجازة' };
    const formattedTeacher = {
        ...newTeacher.toJSON(),
        status: statusMap[newTeacher.status] || newTeacher.status
    };

    res.status(201).json(formattedTeacher);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/school/:schoolId/teachers/:teacherId
// @desc    Update a teacher
// @access  Private (SchoolAdmin)
router.put('/:schoolId/teachers/:teacherId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'subject', required: true, type: 'string' },
  { name: 'phone', required: true, type: 'string' },
  { name: 'status', required: true, type: 'string', enum: ['نشط', 'في إجازة'] },
]), async (req, res) => {
  try {
    const { name, subject, phone, status } = req.body;
    if (!name || !subject || !phone || !status) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }
    const teacher = await Teacher.findByPk(req.params.teacherId);
    if (!teacher) return res.status(404).json({ msg: 'Teacher not found' });
    teacher.name = name;
    teacher.subject = subject;
    teacher.phone = phone;
    teacher.status = status === 'نشط' ? 'Active' : status === 'في إجازة' ? 'OnLeave' : teacher.status;
    await teacher.save();
    const statusMap = { 'Active': 'نشط', 'OnLeave': 'في إجازة' };
    res.json({ ...teacher.toJSON(), status: statusMap[teacher.status] || teacher.status });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/:schoolId/staff', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const users = await User.findAll({ where: { schoolId: req.params.schoolId, role: 'SchoolAdmin' }, order: [['createdAt', 'DESC']] });
    res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, username: u.username, role: u.role, schoolId: u.schoolId, schoolRole: u.schoolRole })));
  } catch (err) { res.status(500).send('Server Error'); }
});

router.post('/:schoolId/staff', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string', minLength: 2 },
  { name: 'email', required: true, type: 'string' },
  { name: 'role', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const exists = await User.findOne({ where: { [Op.or]: [{ email }, { username: email.split('@')[0] }] } });
    if (exists) return res.status(400).json({ message: 'Email or username already exists' });
    function genPwd(){
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_+=';
      let s = '';
      for(let i=0;i<14;i++){ s += chars[Math.floor(Math.random()*chars.length)]; }
      return s;
    }
    const plain = genPwd();
    const pwd = await bcrypt.hash(plain, 10);
    const permissionsMap = {
      'مسؤول تسجيل': ['VIEW_DASHBOARD', 'MANAGE_STUDENTS', 'MANAGE_PARENTS'],
      'مسؤول مالي': ['VIEW_DASHBOARD', 'MANAGE_FINANCE'],
      'منسق أكاديمي': ['VIEW_DASHBOARD', 'MANAGE_CLASSES', 'MANAGE_ATTENDANCE', 'MANAGE_GRADES'],
      'مدير': ['VIEW_DASHBOARD', 'MANAGE_STUDENTS', 'MANAGE_TEACHERS', 'MANAGE_PARENTS', 'MANAGE_CLASSES', 'MANAGE_FINANCE', 'MANAGE_TRANSPORTATION']
    };
    const user = await User.create({ name, email, username: email.split('@')[0], password: pwd, role: 'SchoolAdmin', schoolId: parseInt(req.params.schoolId, 10), schoolRole: role, permissions: permissionsMap[role] || ['VIEW_DASHBOARD'], passwordMustChange: true, tokenVersion: 0 });
    const { password: _, ...data } = user.toJSON();
    res.status(201).json({ id: data.id, name: data.name, email: data.email, username: data.username, role: data.role, schoolId: data.schoolId, schoolRole: data.schoolRole, tempPassword: plain });
  } catch (err) { console.error(err); res.status(500).json({ msg: String(err?.message || err) }); }
});

router.put('/:schoolId/staff/:userId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const staff = await User.findOne({ where: { id: req.params.userId, schoolId: req.params.schoolId, role: 'SchoolAdmin' } });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    const { name, email, role } = req.body || {};
    if (email && email !== staff.email) {
      const dupe = await User.findOne({ where: { email, id: { [Op.ne]: staff.id } } });
      if (dupe) return res.status(400).json({ message: 'Email already in use' });
      staff.email = email;
      const uname = email.split('@')[0];
      const dupeUser = await User.findOne({ where: { username: uname, id: { [Op.ne]: staff.id } } });
      staff.username = dupeUser ? `${uname}_${Date.now()}` : uname;
    }
    if (name) staff.name = name;
    if (role) {
      staff.schoolRole = role;
      const permissionsMap = {
        'مسؤول تسجيل': ['VIEW_DASHBOARD', 'MANAGE_STUDENTS', 'MANAGE_PARENTS', 'MANAGE_ATTENDANCE'],
        'مسؤول مالي': ['VIEW_DASHBOARD', 'MANAGE_FINANCE', 'MANAGE_REPORTS'],
        'منسق أكاديمي': ['VIEW_DASHBOARD', 'MANAGE_CLASSES', 'MANAGE_ATTENDANCE', 'MANAGE_GRADES', 'MANAGE_TEACHERS'],
        'مدير': ['VIEW_DASHBOARD', 'MANAGE_STUDENTS', 'MANAGE_TEACHERS', 'MANAGE_PARENTS', 'MANAGE_CLASSES', 'MANAGE_FINANCE', 'MANAGE_TRANSPORTATION', 'MANAGE_REPORTS', 'MANAGE_SETTINGS', 'MANAGE_MODULES']
      };
      staff.permissions = permissionsMap[role] || ['VIEW_DASHBOARD'];
    }
    await staff.save();
    return res.json({ id: staff.id, name: staff.name, email: staff.email, username: staff.username, role: staff.role, schoolId: staff.schoolId, schoolRole: staff.schoolRole });
  } catch (err) { console.error(err); res.status(500).json({ msg: String(err?.message || err) }); }
});

router.delete('/:schoolId/staff/:userId', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const staff = await User.findOne({ where: { id: req.params.userId, schoolId: req.params.schoolId, role: 'SchoolAdmin' } });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    if (req.user.id === staff.id) return res.status(400).json({ message: 'Cannot delete current user' });
    await staff.destroy();
    return res.json({ message: 'Deleted' });
  } catch (err) { console.error(err); res.status(500).json({ msg: String(err?.message || err) }); }
});

// @route   GET api/school/:schoolId/classes
// @desc    Get all classes for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/classes', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const classes = await Class.findAll({ where: { schoolId: req.params.schoolId }, order: [['name', 'ASC']] });
    // This model has no enums to map, but keeping structure consistent
    res.json(classes.map(c => ({...c.toJSON(), subjects: ['الرياضيات', 'العلوم', 'اللغة الإنجليزية']}))); // Adding mock subjects for now
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/classes
// @desc    Add a new class
// @access  Private (SchoolAdmin)
router.post('/:schoolId/classes', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), validate([
  { name: 'name', required: true, type: 'string' },
  { name: 'gradeLevel', required: true, type: 'string' },
  { name: 'homeroomTeacherId', required: true, type: 'string' },
  { name: 'subjects', required: true },
]), async (req, res) => {
  try {
    const { name, gradeLevel, homeroomTeacherId, subjects } = req.body;
    if (!name || !gradeLevel || !homeroomTeacherId || !Array.isArray(subjects)) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }
    const teacher = await Teacher.findByPk(homeroomTeacherId);
    if (!teacher) return res.status(404).json({ msg: 'Teacher not found' });
    const newClass = await Class.create({
      id: `cls_${Date.now()}`,
      name,
      gradeLevel,
      homeroomTeacherName: teacher.name,
      studentCount: 0,
      schoolId: parseInt(req.params.schoolId, 10),
      homeroomTeacherId: homeroomTeacherId,
    });
    res.status(201).json({ ...newClass.toJSON(), subjects });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   PUT api/school/:schoolId/classes/:classId/roster
// @desc    Update class roster (student count only placeholder)
// @access  Private (SchoolAdmin)
router.put('/:schoolId/classes/:classId/roster', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds)) return res.status(400).json({ msg: 'studentIds must be an array' });
    const cls = await Class.findByPk(req.params.classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    cls.studentCount = studentIds.length;
    await cls.save();
    res.json({ ...cls.toJSON(), subjects: ['الرياضيات', 'العلوم', 'اللغة الإنجليزية'] });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   GET api/school/:schoolId/parents
// @desc    Get all parents for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/parents', verifyToken, requireRole('SCHOOL_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const parents = await Parent.findAll({ 
        where: { schoolId: req.params.schoolId },
        include: { model: Student, attributes: ['name', 'id'] },
        order: [['name', 'ASC']]
    });
    if (!parents) return res.status(404).json({ msg: 'No parents found' });

    const statusMap = { 'Active': 'نشط', 'Invited': 'مدعو' };
    res.json(parents.map(p => {
        const parentJson = p.toJSON();
        return {
            id: parentJson.id,
            name: parentJson.name,
            studentName: parentJson.Students.length > 0 ? parentJson.Students[0].name : 'N/A',
            studentId: parentJson.Students.length > 0 ? parentJson.Students[0].id : 'N/A',
            email: parentJson.email,
            phone: parentJson.phone,
            status: statusMap[parentJson.status] || parentJson.status,
        }
    }));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   GET api/school/:schoolId/invoices
// @desc    Get all invoices for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/invoices', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
        include: {
            model: Student,
            attributes: ['name'],
            where: { schoolId: req.params.schoolId },
        },
        order: [['dueDate', 'DESC']]
    });

    const statusMap = { 'PAID': 'مدفوعة', 'UNPAID': 'غير مدفوعة', 'OVERDUE': 'متأخرة' };
    res.json(invoices.map(inv => ({
        id: inv.id.toString(),
        studentId: inv.studentId,
        studentName: inv.Student.name,
        status: statusMap[inv.status] || inv.status,
        issueDate: inv.createdAt.toISOString().split('T')[0],
        dueDate: inv.dueDate.toISOString().split('T')[0],
        items: [{ description: `رسوم دراسية`, amount: parseFloat(inv.amount) }],
        totalAmount: parseFloat(inv.amount),
    })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/invoices
// @desc    Create a new invoice
// @access  Private (SchoolAdmin)
router.post('/:schoolId/invoices', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), validate([
  { name: 'studentId', required: true, type: 'string' },
  { name: 'dueDate', required: true, type: 'string' },
  { name: 'items', required: true },
]), async (req, res) => {
  try {
    const { studentId, dueDate, items } = req.body;
    if (!studentId || !dueDate || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: 'Invalid invoice data' });
    }
    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const inv = await Invoice.create({ studentId, amount: totalAmount, dueDate: new Date(dueDate), status: 'UNPAID' });
    res.status(201).json({ id: inv.id.toString(), studentId, studentName: '', status: 'غير مدفوعة', issueDate: inv.createdAt.toISOString().split('T')[0], dueDate, items, totalAmount });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/school/:schoolId/invoices/:invoiceId/payments
// @desc    Record a payment for an invoice
// @access  Private (SchoolAdmin)
router.post('/:schoolId/invoices/:invoiceId/payments', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requirePermission('MANAGE_FINANCE'), requireSameSchoolParam('schoolId'), requireModule('finance'), validate([
  { name: 'amount', required: true },
  { name: 'paymentDate', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const { amount, paymentDate, paymentMethod, notes } = req.body;
    if (!amount || !paymentDate) return res.status(400).json({ msg: 'Missing payment data' });
    const inv = await Invoice.findByPk(req.params.invoiceId);
    if (!inv) return res.status(404).json({ msg: 'Invoice not found' });
    inv.status = 'PAID';
    await inv.save();
    res.json({ id: inv.id.toString(), studentId: inv.studentId, studentName: '', status: 'مدفوعة', issueDate: inv.createdAt.toISOString().split('T')[0], dueDate: inv.dueDate.toISOString().split('T')[0], items: [{ description: 'القسط الدراسي', amount: parseFloat(inv.amount) }], totalAmount: parseFloat(inv.amount) });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// --- Student Profile Details ---
// @route   GET api/school/:schoolId/student/:studentId/details
// @desc    Get all details for a specific student
// @access  Private (SchoolAdmin)
router.get('/:schoolId/student/:studentId/details', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
    try {
        const { schoolId, studentId } = req.params;

        const gradesPromise = Grade.findAll({ where: { studentId }, include: Teacher, order: [['subject', 'ASC']] });
        const attendancePromise = Attendance.findAll({ where: { studentId }, order: [['date', 'DESC']] });
        const invoicesPromise = Invoice.findAll({ where: { studentId }, order: [['dueDate', 'DESC']] });
        const notesPromise = StudentNote.findAll({ where: { studentId }, order: [['date', 'DESC']] });
        const documentsPromise = StudentDocument.findAll({ where: { studentId }, order: [['uploadDate', 'DESC']] });

        const [grades, attendance, invoices, notes, documents] = await Promise.all([
            gradesPromise, attendancePromise, invoicesPromise, notesPromise, documentsPromise
        ]);
        
        // --- Map Enums to frontend friendly strings ---
        const attendanceStatusMap = { 'Present': 'حاضر', 'Absent': 'غائب', 'Late': 'متأخر', 'Excused': 'بعذر' };
        const invoiceStatusMap = { 'PAID': 'مدفوعة', 'UNPAID': 'غير مدفوعة', 'OVERDUE': 'متأخرة' };

        res.json({
            grades: grades.map(g => ({
                ...g.toJSON(),
                studentId: g.studentId,
                studentName: '', // Student name is already known on frontend
                classId: g.classId,
                grades: { homework: g.homework, quiz: g.quiz, midterm: g.midterm, final: g.final },
            })),
            attendance: attendance.map(a => ({
                studentId: a.studentId,
                studentName: '',
                status: attendanceStatusMap[a.status] || a.status,
                date: a.date,
            })),
            invoices: invoices.map(inv => ({
                id: inv.id.toString(),
                studentId: inv.studentId,
                studentName: '',
                status: invoiceStatusMap[inv.status] || inv.status,
                issueDate: inv.createdAt.toISOString().split('T')[0],
                dueDate: inv.dueDate.toISOString().split('T')[0],
                items: [{ description: `رسوم دراسية`, amount: parseFloat(inv.amount) }],
                totalAmount: parseFloat(inv.amount),
            })),
            notes,
            documents,
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   GET api/school/:schoolId/settings
// @desc    Get settings for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/settings', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const settings = await SchoolSettings.findOne({ where: { schoolId: req.params.schoolId } });
    if (!settings) return res.status(404).json({ msg: 'Settings not found' });
    res.json({
        ...settings.toJSON(),
        notifications: typeof settings.notifications === 'string' ? JSON.parse(settings.notifications) : settings.notifications,
    });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   PUT api/school/:schoolId/settings
// @desc    Update settings for a specific school
// @access  Private (SchoolAdmin)
router.put('/:schoolId/settings', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const { schoolName, schoolAddress, academicYearStart, academicYearEnd, notifications } = req.body;
    const settings = await SchoolSettings.findOne({ where: { schoolId: req.params.schoolId } });
    if (!settings) return res.status(404).json({ msg: 'Settings not found' });

    settings.schoolName = schoolName;
    settings.schoolAddress = schoolAddress;
    settings.academicYearStart = academicYearStart;
    settings.academicYearEnd = academicYearEnd;
    settings.notifications = notifications;
    
    await settings.save();
    res.json(settings);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});


// @route   GET api/school/:schoolId/events
// @desc    Get all events for a specific school
// @access  Private (SchoolAdmin)
router.get('/:schoolId/events', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), async (req, res) => {
  try {
    const events = await SchoolEvent.findAll({ 
        where: { schoolId: req.params.schoolId },
        order: [['date', 'ASC']]
    });
    const eventTypeMap = { 'Meeting': 'اجتماع', 'Activity': 'نشاط', 'Exam': 'اختبار', 'Holiday': 'عطلة' };
    res.json(events.map(e => ({...e.toJSON(), eventType: eventTypeMap[e.eventType] || e.eventType })));
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});


module.exports = router;