const http = require('http');
const { URL } = require('url');
const speakeasy = require('speakeasy');
const base = process.env.BASE_URL || 'http://127.0.0.1:5002';

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
  const sid = stuData.id;

  const crtInv = await req('POST','/api/school/1/invoices', { 'Content-Type': 'application/json', Authorization: 'Bearer ' + newAccess }, JSON.stringify({ studentId: sid, dueDate: '2025-12-01', items: [{ description: 'رسوم دراسية', amount: 500 }] }));
  if (!crtInv.ok) throw new Error('create invoice failed');
  const invData = JSON.parse(crtInv.body);
  const invId = invData.id;

  const payInv = await req('POST',`/api/school/1/invoices/${invId}/payments`, { 'Content-Type': 'application/json', Authorization: 'Bearer ' + newAccess }, JSON.stringify({ amount: 500, paymentDate: '2025-11-20', paymentMethod: 'CASH', notes: '' }));
  if (!payInv.ok) throw new Error('pay invoice failed');

  console.log('ok');
}

run().catch(e=>{ console.error('smoke error', e.message || e); process.exit(1); });