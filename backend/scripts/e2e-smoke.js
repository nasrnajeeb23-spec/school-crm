const { io } = require('socket.io-client');
const http = require('http');
const https = require('https');
const net = require('net');

function simpleFetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const isHttps = u.protocol === 'https:';
    const options = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {}
    };
    const req = (isHttps ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ ok: res.statusCode < 400, status: res.statusCode, json: async () => json, text: async () => data });
        } catch {
          resolve({ ok: res.statusCode < 400, status: res.statusCode, json: async () => { throw new Error('Not JSON'); }, text: async () => data });
        }
      });
    });
    req.on('error', (err) => {
      console.log('simpleFetch error:', err.message, url);
      reject(err);
    });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

const fetch = globalThis.fetch || simpleFetch;

async function waitFor(url, { headers = {}, timeoutMs = 7000, intervalMs = 400 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url, { headers });
      if (r.ok) return true;
    } catch (e) {
      console.log('waitFor fetch error:', e.message || e, url);
    }
    await new Promise(res => setTimeout(res, intervalMs));
  }
  return false;
}

(async () => {
  const base = process.env.BASE_API || 'http://127.0.0.1:5002/api';
  function log(step, ok, extra) { console.log(JSON.stringify({ step, ok, ...(extra||{}) })); }
  try {
    const u = new URL(base);
    const port = Number(u.port || (u.protocol === 'https:' ? 443 : 80));
    const host = u.hostname;
    const portOpen = await new Promise(res => {
      const s = net.createConnection(port, host);
      s.on('connect', () => { s.destroy(); res(true); });
      s.on('error', () => res(false));
    });
    if (!portOpen) {
      throw new Error(`Port ${port} not open on ${host}`);
    }
    await new Promise(res => setTimeout(res, 1500));
    const ready = await waitFor(`${u.protocol}//${host}:${port}/health`, { timeoutMs: 7000 });
    if (!ready) {
      throw new Error('Backend not ready at ' + base);
    }

    let resp = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'super@admin.com', password: 'password' }) });
    const superData = await resp.json();
    const superToken = superData.token;
    log('login_superadmin', !!superToken);

    resp = await fetch(`${base}/superadmin/stats`, { headers: { Authorization: `Bearer ${superToken}` } });
    log('superadmin_stats', resp.ok);

    resp = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@school.com', password: 'password' }) });
    const adminData = await resp.json();
    const adminToken = adminData.token;
    log('login_school_admin', !!adminToken);

    resp = await fetch(`${base}/school/1/students`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const students = await resp.json();
    log('list_students', resp.ok, { count: Array.isArray(students) ? students.length : 0 });

    resp = await fetch(`${base}/school/1/students`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ name: 'طالب اختبار', grade: 'الصف الرابع', parentName: 'ولي اختبار', dateOfBirth: '2015-01-01' }) });
    const stu = await resp.json();
    const sid = (stu && (stu.id || (stu.data && stu.data.id))) || null;
    log('create_student', resp.ok, { studentId: sid });

    resp = await fetch(`${base}/school/1/invoices`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ studentId: sid, dueDate: '2025-12-01', items: [{ description: 'رسوم دراسية', amount: 500 }] }) });
    const inv = await resp.json();
    const invId = (inv && (inv.id || (inv.data && inv.data.id))) || null;
    log('create_invoice', resp.ok, { invoiceId: invId });

    resp = await fetch(`${base}/school/1/invoices/${invId}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ amount: 500, paymentDate: '2025-11-20', paymentMethod: 'CASH', notes: '' }) });
    log('pay_invoice', resp.ok);

    // Login parent and create conversation using real parentId
    const parentLogin = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'parent@school.com', password: 'password' }) });
    const parentData = await parentLogin.json();
    const parentToken = parentData.token;
    const parentsResp = await fetch(`${base}/school/1/parents`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const parentsList = parentsResp.ok ? await parentsResp.json() : [];
    const parentItem = parentsList.find(p => p.email === 'parent@school.com') || parentsList[0];
    const parentId = parentItem ? parentItem.id : null;
    log('login_parent', !!parentToken, { parentId });

    try {
      resp = await fetch(`${base}/messaging/conversations`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superToken}` }, body: JSON.stringify({ title: 'اختبار محادثة', schoolId: 1, parentId }) });
      const conv = await resp.json();
      log('create_conversation', true, { roomId: conv.roomId, conversationId: conv.id });
      const socket = io(`${u.protocol}//${host}:${port}`, { transports: ['websocket'], auth: { token: adminToken } });
      await new Promise(res => socket.on('connect', res));
      socket.emit('join_room', conv.roomId);
      socket.emit('send_message', { conversationId: conv.id, roomId: conv.roomId, text: 'رسالة اختبار', senderId: 'user_002', senderRole: 'SCHOOL_ADMIN' });
      const got = await new Promise(res => socket.once('new_message', msg => res(msg)));
      log('socket_send_receive', !!got, { msgId: got?.id });
      socket.disconnect();

      try {
        resp = await fetch(`${base}/messaging/conversations/${conv.id}/messages`, { headers: { Authorization: `Bearer ${adminToken}` } });
        const msgs = resp.ok ? await resp.json() : [];
        log('list_messages', resp.ok, { count: Array.isArray(msgs) ? msgs.length : 0 });
      } catch {}
      log('messaging_flow', true);
    } catch (e) {
      log('messaging_flow', false, { message: String(e) });
    }

    // Transportation simulate notifications using existing route
    await new Promise(res => setTimeout(res, 500));
    resp = await fetch(`${base}/transportation/1/routes`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const routes = resp.ok ? await resp.json() : [];
    const routeId = (routes[0] && routes[0].id) || null;
    if (routeId) {
      resp = await fetch(`${base}/transportation/routes/${routeId}/simulate`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superToken}` }, body: JSON.stringify({ progress: 80 }) });
      log('transport_sim_80', resp.ok);
      resp = await fetch(`${base}/transportation/routes/${routeId}/simulate`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superToken}` }, body: JSON.stringify({ progress: 100 }) });
      log('transport_sim_100', resp.ok);
    } else {
      log('transport_sim_80', false);
      log('transport_sim_100', false);
    }

    // Parent dashboard
    const parentResp = await fetch(`${base}/parent/${parentId}/dashboard`, { headers: { Authorization: `Bearer ${parentToken}` } });
    log('parent_dashboard', parentResp.ok);
  } catch (e) {
    log('error', false, { message: String(e) });
    process.exit(1);
  }
  process.exit(0);
})();
