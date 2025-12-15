const { Student, School, Subscription, Plan, SchoolSettings } = require('../../models');

// @desc    Get all students for a specific school
// @route   GET api/school/:schoolId/students
// @access  Private (SchoolAdmin)
exports.getStudents = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const students = await Student.findAll({ where: { schoolId: req.params.schoolId }, order: [['name', 'ASC']], limit, offset });
    
    if (!students) return res.status(404).json({ msg: 'No students found' }); // proper 404 json
    
    const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
    
    // Check if response formatter middleware is attached or send standard json
    if (res.success) {
        return res.success({ students: students.map(s => ({ ...s.toJSON(), status: statusMap[s.status] || s.status })), limit, offset });
    } else {
        return res.json({ students: students.map(s => ({ ...s.toJSON(), status: statusMap[s.status] || s.status })), limit, offset });
    }
  } catch (err) { 
    console.error(err.message); 
    return res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

// @desc    Add a new student to a school
// @route   POST api/school/:schoolId/students
// @access  Private (SchoolAdmin)
exports.createStudent = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { name, grade, parentName, dateOfBirth, address, city, homeLocation, lat, lng } = req.body;

    const school = await School.findByPk(schoolId);
    if (!school) {
        return res.status(404).json({ msg: 'School not found' });
    }

    // Check plan limits
    const subscription = await Subscription.findOne({ where: { schoolId }, include: [Plan] });
    const settings = await SchoolSettings.findOne({ where: { schoolId } });
    
    // Default limits if no plan (fallback)
    let maxStudents = 50; 
    let limitSource = 'default';

    // 1. Check Custom Limits (Highest Priority)
    if (settings && settings.customLimits && settings.customLimits.students !== undefined) {
        const val = settings.customLimits.students;
        if (val === 'unlimited') maxStudents = 999999;
        else maxStudents = Number(val);
        limitSource = 'custom';
    } 
    // 2. Check Plan Limits
    else if (subscription && subscription.Plan && subscription.Plan.limits) {
        const limits = typeof subscription.Plan.limits === 'string' 
            ? JSON.parse(subscription.Plan.limits) 
            : subscription.Plan.limits;
        
        if (limits.students && limits.students !== 'unlimited') {
            maxStudents = Number(limits.students);
        } else if (limits.students === 'unlimited') {
            maxStudents = 999999;
        }
        limitSource = 'plan';
    }
    // 3. Check Subscription customLimits (Legacy/Fallback)
    else if (subscription && subscription.customLimits) {
         const limits = typeof subscription.customLimits === 'string' ? JSON.parse(subscription.customLimits) : subscription.customLimits;
         if (limits.students) maxStudents = limits.students === 'unlimited' ? 999999 : Number(limits.students);
    }

    const currentCount = await Student.count({ where: { schoolId } });
    if (currentCount >= maxStudents) {
        return res.status(403).json({ 
            msg: `لقد تجاوزت الحد الأقصى لعدد الطلاب (${maxStudents}). يرجى ترقية الاشتراك.`,
            code: 'LIMIT_EXCEEDED',
            details: { current: currentCount, max: maxStudents, source: limitSource }
        });
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
      homeLocation: homeLocation || ((address || city || lat !== undefined || lng !== undefined) ? { address: address || '', city: city || '', ...(lat !== undefined ? { lat: Number(lat) } : {}), ...(lng !== undefined ? { lng: Number(lng) } : {}) } : null),
    });

    // Increment student count in the school
    await school.increment('studentCount');

    // Map status for frontend consistency
    const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
    const formattedStudent = {
        ...newStudent.toJSON(),
        status: statusMap[newStudent.status] || newStudent.status
    };

    if (res.status) return res.status(201).json(formattedStudent);
    return res.json(formattedStudent);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Update a student
// @route   PUT api/school/:schoolId/students/:studentId
// @access  Private (SchoolAdmin)
exports.updateStudent = async (req, res) => {
  try {
    const { name, grade, parentName, dateOfBirth, status } = req.body;
    // Basic validation handled by route or here
    if (!name || !grade || !parentName || !dateOfBirth || !status) {
      if (res.error) return res.error(400, 'VALIDATION_FAILED', 'Missing required fields');
      return res.status(400).json({ msg: 'Missing required fields' });
    }
    
    const student = await Student.findByPk(req.params.studentId);
    if (!student) {
        if (res.error) return res.error(404, 'NOT_FOUND', 'Student not found');
        return res.status(404).json({ msg: 'Student not found' });
    }
    
    student.name = name;
    student.grade = grade;
    student.parentName = parentName;
    student.dateOfBirth = dateOfBirth;
    student.status = status === 'نشط' ? 'Active' : status === 'موقوف' ? 'Suspended' : student.status;
    
    await student.save();
    
    const statusMap = { 'Active': 'نشط', 'Suspended': 'موقوف' };
    const result = { ...student.toJSON(), status: statusMap[student.status] || student.status };
    
    if (res.success) return res.success(result, 'Student updated');
    return res.json(result);
  } catch (err) { 
    console.error(err.message); 
    return res.status(500).json({ msg: 'Server Error' }); 
  }
};
