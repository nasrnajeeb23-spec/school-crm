const nodeCron = require('node-cron');
const archiver = require('archiver');
const fse = require('fs-extra');
const path = require('path');
const fs = require('fs');
const { SchoolSettings, AuditLog, Job, School, Class, Student, Parent, Teacher, Grade, Attendance, Schedule, FeeSetup } = require('../models');
const { Op } = require('sequelize');
const jobService = require('./jobService');

// Internal state for cron tasks
const cronTasks = Object.create(null);
let redisClient = null;

const setRedisClient = (client) => {
    redisClient = client;
};

// --- Helper Functions ---

async function toCSV(headers, rows) {
    const esc = (v) => { const s = v === null || v === undefined ? '' : String(v); return (s.includes(',') || s.includes('\n') || s.includes('"')) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const head = headers.join(',');
    const body = rows.map(r => headers.map(h => esc(r[h])).join(',')).join('\n');
    return head + '\n' + body + (body ? '\n' : '');
}

async function buildExportCSVMap(schoolId, types, filters) {
    const map = {};
    const classes = await Class.findAll({ where: { schoolId }, order: [['name', 'ASC']] });
    const classNameById = new Map(classes.map(c => [String(c.id), `${c.gradeLevel} (${c.section || 'أ'})`]));

    if (types.includes('students')) {
        const students = await Student.findAll({ where: { schoolId }, order: [['name', 'ASC']] });
        const parents = await Parent.findAll({ where: { schoolId } });
        const parentById = new Map(parents.map(p => [String(p.id), p]));
        const rows = students.map(s => {
            const p = s.parentId ? parentById.get(String(s.parentId)) || null : null;
            const className = s.classId ? (classNameById.get(String(s.classId)) || '') : '';
            return { studentId: s.id, nationalId: '', name: s.name, dateOfBirth: s.dateOfBirth || '', gender: '', city: '', address: '', admissionDate: s.registrationDate || '', parentName: s.parentName || (p ? p.name : ''), parentPhone: p ? (p.phone || '') : '', parentEmail: p ? (p.email || '') : '', className };
        });
        const f = String(filters?.className || '').trim();
        const filtered = f ? rows.filter(r => r.className === f) : rows;
        map['Export_Students.csv'] = await toCSV(['studentId', 'nationalId', 'name', 'dateOfBirth', 'gender', 'city', 'address', 'admissionDate', 'parentName', 'parentPhone', 'parentEmail', 'className'], filtered);
    }
    if (types.includes('classes')) {
        const teachers = await Teacher.findAll({ where: { schoolId } });
        const tNameById = new Map(teachers.map(t => [String(t.id), t.name]));
        const rows = classes.map(c => ({ gradeLevel: c.gradeLevel, section: c.section || 'أ', capacity: c.capacity || 30, homeroomTeacherName: c.homeroomTeacherId ? (tNameById.get(String(c.homeroomTeacherId)) || '') : '' }));
        map['Export_Classes.csv'] = await toCSV(['gradeLevel', 'section', 'capacity', 'homeroomTeacherName'], rows);
    }
    if (types.includes('subjects')) {
        const rows = [];
        for (const c of classes) {
            const className = `${c.gradeLevel} (${c.section || 'أ'})`;
            const list = Array.isArray(c.subjects) ? c.subjects : [];
            if (list.length === 0) {
                const sched = await Schedule.findAll({ where: { classId: c.id } });
                const subs = Array.from(new Set(sched.map(x => x.subject).filter(Boolean)));
                for (const s of subs) rows.push({ className, subjectName: s });
            } else {
                for (const s of list) rows.push({ className, subjectName: s });
            }
        }
        const f = String(filters?.className || '').trim();
        const subj = String(filters?.subjectName || '').trim();
        let filtered = f ? rows.filter(r => r.className === f) : rows;
        filtered = subj ? filtered.filter(r => String(r.subjectName || '').trim() === subj) : filtered;
        map['Export_Subjects.csv'] = await toCSV(['className', 'subjectName'], filtered);
    }
    if (types.includes('classSubjectTeachers')) {
        const rows = [];
        const teachers = await Teacher.findAll({ where: { schoolId } });
        const tNameById = new Map(teachers.map(t => [String(t.id), t.name]));
        for (const c of classes) {
            const className = `${c.gradeLevel} (${c.section || 'أ'})`;
            const sched = await Schedule.findAll({ where: { classId: c.id } });
            for (const x of sched) {
                const teacherName = x.teacherId ? (tNameById.get(String(x.teacherId)) || '') : '';
                rows.push({ className, subjectName: x.subject, teacherName });
            }
        }
        const f = String(filters?.className || '').trim();
        const subj = String(filters?.subjectName || '').trim();
        let filtered = f ? rows.filter(r => r.className === f) : rows;
        filtered = subj ? filtered.filter(r => String(r.subjectName || '').trim() === subj) : filtered;
        map['Export_ClassSubjectTeachers.csv'] = await toCSV(['className', 'subjectName', 'teacherName'], filtered);
    }
    if (types.includes('grades')) {
        const grades = await Grade.findAll({ include: [{ model: Class, attributes: ['gradeLevel', 'section'] }], where: { '$Class.schoolId$': schoolId } });
        const rows = grades.map(e => ({ className: `${e.Class?.gradeLevel || ''} (${e.Class?.section || 'أ'})`, subjectName: e.subject, studentId: String(e.studentId), studentName: '', homework: e.homework || 0, quiz: e.quiz || 0, midterm: e.midterm || 0, final: e.final || 0 }));
        const f = String(filters?.className || '').trim();
        const subj = String(filters?.subjectName || '').trim();
        let filtered = f ? rows.filter(r => r.className === f) : rows;
        filtered = subj ? filtered.filter(r => String(r.subjectName || '').trim() === subj) : filtered;
        map['Export_Grades.csv'] = await toCSV(['className', 'subjectName', 'studentId', 'studentName', 'homework', 'quiz', 'midterm', 'final'], filtered);
    }
    if (types.includes('attendance')) {
        const date = String(filters?.date || '').trim();
        const rows = [];
        for (const c of classes) {
            const className = `${c.gradeLevel} (${c.section || 'أ'})`;
            if (String(filters?.className || '').trim() && String(filters?.className || '').trim() !== className) continue;
            const where = { classId: c.id };
            if (date) where.date = date;
            const arr = await Attendance.findAll({ where });
            for (const r of arr) { rows.push({ date: r.date, className, studentId: String(r.studentId), status: r.status }); }
        }
        map['Export_Attendance.csv'] = await toCSV(['date', 'className', 'studentId', 'status'], rows);
    }
    if (types.includes('schedule')) {
        const rows = [];
        for (const c of classes) {
            const className = `${c.gradeLevel} (${c.section || 'أ'})`;
            if (String(filters?.className || '').trim() && String(filters?.className || '').trim() !== className) continue;
            const sched = await Schedule.findAll({ where: { classId: c.id } });
            for (const x of sched) { rows.push({ className, day: x.day, timeSlot: x.timeSlot, subjectName: x.subject, teacherName: '' }); }
        }
        const subj = String(filters?.subjectName || '').trim();
        const filtered = subj ? rows.filter(r => String(r.subjectName || '').trim() === subj) : rows;
        map['Export_Schedule.csv'] = await toCSV(['className', 'day', 'timeSlot', 'subjectName', 'teacherName'], filtered);
    }
    if (types.includes('fees')) {
        const list = await FeeSetup.findAll({ where: { schoolId } });
        const rows = list.map(x => ({ stage: x.stage, tuitionFee: Number(x.tuitionFee || 0), bookFees: Number(x.bookFees || 0), uniformFees: Number(x.uniformFees || 0), activityFees: Number(x.activityFees || 0), paymentPlanType: x.paymentPlanType || 'Monthly' }));
        map['Export_Fees.csv'] = await toCSV(['stage', 'tuitionFee', 'bookFees', 'uniformFees', 'activityFees', 'paymentPlanType'], rows);
    }
    if (types.includes('teachers')) {
        const list = await Teacher.findAll({ where: { schoolId }, order: [['name', 'ASC']] });
        const rows = list.map(t => ({ teacherId: String(t.id), name: t.name, phone: t.phone || '', subject: t.subject || '' }));
        map['Export_Teachers.csv'] = await toCSV(['teacherId', 'name', 'phone', 'subject'], rows);
    }
    if (types.includes('parents')) {
        const list = await Parent.findAll({ where: { schoolId }, order: [['name', 'ASC']] });
        const rows = list.map(p => ({ parentId: String(p.id), name: p.name, email: p.email || '', phone: p.phone || '', studentId: '' }));
        map['Export_Parents.csv'] = await toCSV(['parentId', 'name', 'email', 'phone', 'studentId'], rows);
    }
    return map;
}

async function storeBackupZip(schoolId, types, filters) {
    const map = await buildExportCSVMap(schoolId, types, filters);
    const dir = path.join(__dirname, '..', 'uploads', 'backups', String(schoolId));
    await fse.ensureDir(dir);
    const fname = `Backup_${new Date().toISOString().replace(/[:]/g, '-')}.zip`;
    const full = path.join(dir, fname);
    const out = fs.createWriteStream(full);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(out);
    for (const [name, csv] of Object.entries(map)) archive.append(csv, { name });
    await archive.finalize();
    return full;
}

async function acquireBackupLock(schoolId) {
    try {
        const s = await SchoolSettings.findOne({ where: { schoolId } });
        if (!s) return false;
        const now = Date.now();
        const lock = s.backupLock || {};
        const until = lock.until ? new Date(lock.until).getTime() : 0;
        if (until && until > now) return false;
        const token = Math.random().toString(36).slice(2);
        s.backupLock = { token, until: new Date(now + 2 * 60 * 1000).toISOString() };
        await s.save();
        return token;
    } catch { return false; }
}

async function releaseBackupLock(schoolId, token) {
    try {
        const s = await SchoolSettings.findOne({ where: { schoolId } });
        if (!s) return;
        const lock = s.backupLock || {};
        if (lock.token && lock.token !== token) return;
        s.backupLock = null;
        await s.save();
    } catch { }
}

// --- Exported Functions ---

const scheduleBackupForSchool = async (schoolId, cronExpr) => {
    const sid = String(schoolId);
    if (cronTasks[sid]) {
        try { cronTasks[sid].stop(); } catch { }
        delete cronTasks[sid];
    }
    if (!cronExpr || typeof cronExpr !== 'string') return;
    const task = nodeCron.schedule(cronExpr, () => {
        try {
            jobService.enqueueJob('backup_store', { schoolId }, async ({ schoolId }) => {
                const s = await SchoolSettings.findOne({ where: { schoolId } }).catch(() => null);
                const cfg = s?.backupConfig || {};
                const types = Array.isArray(cfg.types) ? cfg.types : ['students', 'classes', 'subjects', 'classSubjectTeachers', 'grades', 'attendance', 'schedule', 'fees', 'teachers', 'parents'];
                const full = await storeBackupZip(Number(schoolId), types, {});
                const buffer = fs.readFileSync(full);
                try {
                    const stat = fs.statSync(full);
                    const baseName = path.basename(full);
                    await AuditLog.create({
                        action: 'school.backup.auto.store',
                        userId: null,
                        userEmail: null,
                        ipAddress: '127.0.0.1',
                        userAgent: 'cron',
                        details: JSON.stringify({ schoolId: Number(schoolId), file: baseName, size: stat.size, types }),
                        timestamp: new Date(),
                        riskLevel: 'low'
                    });
                } catch { }
                return { ok: true, jobType: 'backup_store', schoolId, zip: buffer };
            });
        } catch { }
    }, { scheduled: true });
    cronTasks[sid] = task;
};

const reloadBackupSchedules = async () => {
    if (!redisClient) return;
    try {
        const schoolsSetKey = 'backup:schedule:set';
        const schools = await redisClient.sMembers(schoolsSetKey).catch(() => []);
        for (const sid of (schools || [])) {
            const expr = await redisClient.get(`backup:schedule:${sid}`).catch(() => null);
            await scheduleBackupForSchool(Number(sid), expr);
        }
    } catch { }
};

const cleanupOldBackups = async () => {
    try {
        const daysStr = redisClient ? await redisClient.get('backup:retention:days').catch(() => null) : null;
        const days = Number(daysStr || 30) || 30;
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const outdated = await Job.findAll({ where: { status: 'completed', updatedAt: { [Op.lt]: cutoff } }, raw: true }).catch(() => []);
        for (const j of outdated) {
            if (redisClient) {
                await redisClient.del(`job:${j.id}:csv`).catch(() => { });
                await redisClient.del(`job:${j.id}:zip`).catch(() => { });
            }
        }
    } catch { }
};

const initCron = () => {
    // Cleanup task
    nodeCron.schedule('0 3 * * *', async () => { try { await cleanupOldBackups(); } catch { } }, { scheduled: true });

    // Main automatic backup loop (every 5 mins)
    const lastRun = new Map();
    nodeCron.schedule('*/5 * * * *', async () => {
        try {
            const schools = await School.findAll();
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            for (const sch of schools) {
                const s = await SchoolSettings.findOne({ where: { schoolId: Number(sch.id) } });
                const cfg = s?.backupConfig || {};
                const types = Array.isArray(cfg.types) ? cfg.types : ['students', 'classes', 'subjects', 'classSubjectTeachers', 'grades', 'attendance', 'schedule', 'fees', 'teachers', 'parents'];
                const retainDays = Number(cfg.retainDays || 30);

                // Daily Backup Logic
                if (cfg.enabledDaily) {
                    const t = String(cfg.dailyTime || '02:00');
                    if (t === `${hh}:${mm}`) {
                        const key = `daily_${sch.id}_${t}_${now.toISOString().slice(0, 10)}`;
                        if (!lastRun.has(key)) {
                            const token = await acquireBackupLock(Number(sch.id));
                            if (token) {
                                const full = await storeBackupZip(Number(sch.id), types, {});
                                try {
                                    const stat = fs.statSync(full);
                                    await AuditLog.create({ action: 'school.backup.auto.store', userId: null, userEmail: null, ipAddress: '127.0.0.1', userAgent: 'cron', details: JSON.stringify({ schoolId: Number(sch.id), file: path.basename(full), size: stat.size, types }), timestamp: new Date(), riskLevel: 'low' });
                                } catch { }
                                await releaseBackupLock(Number(sch.id), token);
                            }
                            lastRun.set(key, true);
                        }
                    }
                }

                // Monthly Backup Logic
                if (cfg.enabledMonthly) {
                    const day = Number(cfg.monthlyDay || 1);
                    const t = String(cfg.monthlyTime || '03:00');
                    const dNow = now.getDate();
                    if (dNow === day && t === `${hh}:${mm}`) {
                        const key = `monthly_${sch.id}_${t}_${now.getFullYear()}_${now.getMonth() + 1}`;
                        if (!lastRun.has(key)) {
                            const token = await acquireBackupLock(Number(sch.id));
                            if (token) {
                                const full = await storeBackupZip(Number(sch.id), types, {});
                                try {
                                    const stat = fs.statSync(full);
                                    await AuditLog.create({ action: 'school.backup.auto.store', userId: null, userEmail: null, ipAddress: '127.0.0.1', userAgent: 'cron', details: JSON.stringify({ schoolId: Number(sch.id), file: path.basename(full), size: stat.size, types }), timestamp: new Date(), riskLevel: 'low' });
                                } catch { }
                                await releaseBackupLock(Number(sch.id), token);
                            }
                            lastRun.set(key, true);
                        }
                    }
                }

                // Retention cleanup
                try {
                    const dir = path.join(__dirname, '..', 'uploads', 'backups', String(sch.id));
                    await fse.ensureDir(dir);
                    const files = fs.readdirSync(dir).filter(f => f.endsWith('.zip'));
                    for (const f of files) {
                        const full = path.join(dir, f);
                        const stat = fs.statSync(full);
                        const ageDays = Math.floor((now.getTime() - (stat.mtime || stat.birthtime).getTime()) / (1000 * 60 * 60 * 24));
                        if (retainDays > 0 && ageDays > retainDays) {
                            try { fs.unlinkSync(full); } catch { }
                        }
                    }
                } catch { }
            }
        } catch (e) {
            console.warn('Backup cron error:', e?.message || e);
        }
    });
};

module.exports = {
    setRedisClient,
    initCron,
    scheduleBackupForSchool,
    reloadBackupSchedules,
    cleanupOldBackups,
    storeBackupZip,
    cronTasks
};
