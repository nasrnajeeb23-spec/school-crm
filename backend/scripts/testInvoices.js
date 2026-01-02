const http = require('http');
const { URL } = require('url');

const base = process.env.BASE_URL || 'http://127.0.0.1:5000';

function req(method, path, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(base + path);
    const opts = { method, headers };
    const r = http.request(u, opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, body: d }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function run() {
  const login = await req('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, JSON.stringify({ email: 'admin@school.com', password: 'password' }));
  if (!login.ok) throw new Error('login failed');
  const data = JSON.parse(login.body);
  const rt = data.refreshToken;
  const ref = await req('POST', '/api/auth/refresh', { 'Content-Type': 'application/json' }, JSON.stringify({ refreshToken: rt }));
  if (!ref.ok) throw new Error('refresh failed');
  const refData = JSON.parse(ref.body);
  const token = refData.token;

  const crtStu = await req('POST', '/api/school/1/students', { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, JSON.stringify({ name: 'طالب فواتير', grade: 'الصف الرابع', parentName: 'ولي فواتير', dateOfBirth: '2015-01-01' }));
  if (!crtStu.ok) throw new Error('create student failed');
  const stu = JSON.parse(crtStu.body);
  const studentId = (stu && stu.data && stu.data.id) ? stu.data.id : stu.id;
  if (!studentId) throw new Error('student id missing');

  const items = [{ description: 'رسوم دراسية', amount: 500 }];
  const invRes = await req('POST', '/api/school/1/invoices', { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, JSON.stringify({ studentId, dueDate: '2025-12-01', items }));
  if (!invRes.ok) throw new Error('create invoice failed');
  const inv = JSON.parse(invRes.body);
  const invoiceId = inv.id;
  if (!invoiceId) throw new Error('invoice id missing');

  const pay1 = await req('POST', `/api/school/1/invoices/${invoiceId}/payments`, { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, JSON.stringify({ amount: 200, paymentDate: '2025-11-20', paymentMethod: 'CASH', notes: '' }));
  if (!pay1.ok) throw new Error('partial payment failed');
  const p1Inv = JSON.parse(pay1.body);
  if (p1Inv.status !== 'مدفوعة جزئياً') throw new Error('status not partially paid');

  const pay2 = await req('POST', `/api/school/1/invoices/${invoiceId}/payments`, { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, JSON.stringify({ amount: 300, paymentDate: '2025-11-25', paymentMethod: 'CASH', notes: '' }));
  if (!pay2.ok) throw new Error('final payment failed');
  const p2Inv = JSON.parse(pay2.body);
  if (p2Inv.status !== 'مدفوعة') throw new Error('status not paid');
  if (Math.abs(Number(p2Inv.remainingAmount || 0)) > 0.001) throw new Error('remaining amount not zero');

  const list = await req('GET', '/api/school/1/invoices', { Authorization: 'Bearer ' + token });
  if (!list.ok) throw new Error('list invoices failed');
  const arr = JSON.parse(list.body);
  const found = arr.some(x => String(x.id) === String(invoiceId));
  if (!found) throw new Error('created invoice not found in list');

  console.log('invoices test ok');
}

run().catch(e => { console.error('invoices test error', e.message || e); process.exit(1); });

