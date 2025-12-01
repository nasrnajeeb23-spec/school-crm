const fetch = require('node-fetch');

async function run(){
  const base = process.env.BASE_API || 'http://127.0.0.1:5000/api';
  const results = [];
  try {
    let resp = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@school.com', password: 'password' })
    });
    if (!resp.ok) throw new Error('login_failed');
    const data = await resp.json();
    const token = data.token;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const me = await (await fetch(`${base}/auth/me`, { headers })).json();
    const mySchool = Number(me.schoolId || 1);
    const otherSchool = mySchool + 1;

    // GET students other school
    resp = await fetch(`${base}/school/${otherSchool}/students`, { headers });
    results.push({ test: 'students_other_school_403', ok: resp.status === 403, status: resp.status });

    // POST classes other school
    resp = await fetch(`${base}/school/${otherSchool}/classes`, {
      method: 'POST', headers,
      body: JSON.stringify({ name: 'اختبار', gradeLevel: 'الصف الأول', homeroomTeacherId: '1', subjects: ['الرياضيات'] })
    });
    results.push({ test: 'classes_other_school_403', ok: resp.status === 403, status: resp.status });

    // GET invoices other school
    resp = await fetch(`${base}/school/${otherSchool}/invoices`, { headers });
    results.push({ test: 'finance_other_school_403', ok: resp.status === 403, status: resp.status });

  } catch (e) {
    results.push({ test: 'scope_tests_exception', ok: false, error: String(e) });
  }
  console.log(JSON.stringify(results));
}

run();

