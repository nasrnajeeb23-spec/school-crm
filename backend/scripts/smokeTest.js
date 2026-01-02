const http = require('http');
const { URL } = require('url');
const speakeasy = require('speakeasy');
const base = process.env.BASE_URL || 'http://127.0.0.1:5000';

function req(method, path, headers={}, body){
  return new Promise((resolve,reject)=>{
    const u = new URL(base + path);
    const opts = { method, headers };
    const r = http.request(u, opts, res=>{
      let d='';
      res.on('data', c=> d+=c);
      res.on('end', ()=> resolve({ status: res.statusCode, ok: res.statusCode>=200 && res.statusCode<300, body: d }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function run(){
  const r1 = await req('GET','/health');
  if (!r1.ok) throw new Error('health failed');

  const login = await req('POST','/api/auth/login', { 'Content-Type': 'application/json' }, JSON.stringify({ email: 'admin@school.com', password: 'password' }));
  if (!login.ok) throw new Error('login failed');
  const data = JSON.parse(login.body);
  const t = data.token;
  const rt = data.refreshToken;

  const staff = await req('GET','/api/school/1/staff', { Authorization: 'Bearer ' + t });
  if (!staff.ok) throw new Error('staff failed');

  const inv = await req('GET','/api/school/1/invoices', { Authorization: 'Bearer ' + t });
  if (!inv.ok) throw new Error('invoices failed');

  const ref = await req('POST','/api/auth/refresh', { 'Content-Type': 'application/json' }, JSON.stringify({ refreshToken: rt }));
  if (!ref.ok) throw new Error('refresh failed');
  const refData = JSON.parse(ref.body);
  const newAccess = refData.token;

  const enroll = await req('POST','/api/auth/mfa/enroll', { Authorization: 'Bearer ' + newAccess });
  if (!enroll.ok) throw new Error('mfa enroll failed');
  const enrollData = JSON.parse(enroll.body);
  const otpauth = enrollData.otpauth;
  const otpUrl = new URL(otpauth);
  const secret = otpUrl.searchParams.get('secret');
  if (!secret) throw new Error('mfa secret not found');

  const token = speakeasy.totp({ secret, encoding: 'base32' });
  const verify = await req('POST','/api/auth/mfa/verify', { Authorization: 'Bearer ' + newAccess, 'Content-Type': 'application/json' }, JSON.stringify({ token }));
  if (!verify.ok) throw new Error('mfa verify failed');

  const me = await req('GET','/api/auth/me', { Authorization: 'Bearer ' + newAccess });
  if (!me.ok) throw new Error('me failed');

  const crtStu = await req('POST','/api/school/1/students', { 'Content-Type': 'application/json', Authorization: 'Bearer ' + newAccess }, JSON.stringify({ name: 'طالب smoke', grade: 'الصف الرابع', parentName: 'ولي smoke', dateOfBirth: '2015-01-01' }));
  if (!crtStu.ok) throw new Error('create student failed');
  const stuData = JSON.parse(crtStu.body);
  const sid = (stuData && stuData.data && stuData.data.id) ? stuData.data.id : stuData.id;
  if (!sid) throw new Error('student id not found');

  const crtInv = await req('POST','/api/school/1/invoices', { 'Content-Type': 'application/json', Authorization: 'Bearer ' + newAccess }, JSON.stringify({ studentId: sid, dueDate: '2025-12-01', items: [{ description: 'رسوم دراسية', amount: 500 }] }));
  if (!crtInv.ok) throw new Error('create invoice failed');
  const invData = JSON.parse(crtInv.body);
  const invId = invData.id;

  const payInv = await req('POST',`/api/school/1/invoices/${invId}/payments`, { 'Content-Type': 'application/json', Authorization: 'Bearer ' + newAccess }, JSON.stringify({ amount: 500, paymentDate: '2025-11-20', paymentMethod: 'CASH', notes: '' }));
  if (!payInv.ok) throw new Error('pay invoice failed');

  const classesRes = await req('GET','/api/school/1/classes', { Authorization: 'Bearer ' + newAccess });
  const classes = classesRes.ok ? JSON.parse(classesRes.body) : [];
  let classId = classes[0] ? classes[0].id : null;
<<<<<<< HEAD
  const randomPhone = '050' + String(Math.floor(1000000 + Math.random() * 9000000));
  const randomName = 'معلم smoke ' + Math.random().toString(36).slice(2,6);
  const t1 = await req('POST','/api/school/1/teachers', { 'Content-Type': 'application/json', Authorization: 'Bearer ' + newAccess }, JSON.stringify({ name: randomName, subject: 'الرياضيات', phone: randomPhone }));
  let tid;
  if (!t1.ok) {
    const tList = await req('GET','/api/school/1/teachers', { Authorization: 'Bearer ' + newAccess });
    if (!tList.ok) throw new Error('create teacher failed');
    const listBody = JSON.parse(tList.body);
    const arr = Array.isArray(listBody) ? listBody : (Array.isArray(listBody.teachers) ? listBody.teachers : []);
    if (!arr.length) throw new Error('create teacher failed');
    tid = arr[0].id;
  } else {
    const tData = JSON.parse(t1.body);
    tid = tData.id;
=======
  const teachersRes = await req('GET','/api/school/1/teachers', { Authorization: 'Bearer ' + newAccess });
  const teachers = teachersRes.ok ? JSON.parse(teachersRes.body) : [];
  let tid = teachers[0] ? teachers[0].id : null;
  if (!tid) {
    const rand = String(Date.now()).slice(-8);
    const t1 = await req('POST','/api/school/1/teachers', { 'Content-Type': 'application/json', Authorization: 'Bearer ' + newAccess }, JSON.stringify({ name: `معلم جدول ${rand}`, subject: 'الرياضيات', phone: `050${rand}` }));
    if (t1.ok) {
      const tData = JSON.parse(t1.body);
      tid = tData.id;
    } else {
      const t2 = await req('GET','/api/school/1/teachers', { Authorization: 'Bearer ' + newAccess });
      const tList = t2.ok ? JSON.parse(t2.body) : [];
      tid = tList[0] ? tList[0].id : null;
      if (!tid) throw new Error('create teacher failed');
    }
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
  }
  if (!classId) {
    const crtClass = await req('POST','/api/school/1/classes', { 'Content-Type': 'application/json', Authorization: 'Bearer ' + newAccess }, JSON.stringify({ name: 'فصل اختبار', gradeLevel: 'الصف الأول', homeroomTeacherId: String(tid), capacity: 30, subjects: ['الرياضيات'] }));
    if (!crtClass.ok) throw new Error('create class failed');
    classId = JSON.parse(crtClass.body).id;
  } else {
    await req('PUT',`/api/school/1/classes/${classId}/subjects`, { 'Content-Type': 'application/json', Authorization: 'Bearer ' + newAccess }, JSON.stringify({ subjects: ['الرياضيات'] }));
  }
  await req('PUT',`/api/school/1/classes/${classId}/subject-teachers`, { 'Content-Type': 'application/json', Authorization: 'Bearer ' + newAccess }, JSON.stringify({ 'الرياضيات': tid }));
  const bodySched = { entries: [ { day: 'Sunday', timeSlot: '08:00 - 09:00', subject: 'الرياضيات' }, { day: 'Sunday', timeSlot: '08:30 - 09:30', subject: 'الرياضيات' } ] };
  const saveSched = await req('POST',`/api/school/class/${classId}/schedule`, { 'Content-Type': 'application/json', Authorization: 'Bearer ' + newAccess }, JSON.stringify(bodySched));
  if (saveSched.ok) throw new Error('schedule conflict expected');
  const conflictBody = JSON.parse(saveSched.body);
  if (!Array.isArray(conflictBody.conflicts) || conflictBody.conflicts.length === 0) throw new Error('no conflicts reported');

  console.log('ok');
}

run().catch(e=>{ console.error('smoke error', e.message || e); process.exit(1); });
