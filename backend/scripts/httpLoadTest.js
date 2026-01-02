const urlLib = require('url');
const https = require('https');
const http = require('http');

function now() { return Date.now(); }
function ms(d) { return Math.round(d); }

function request(method, fullUrl, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = urlLib.parse(fullUrl);
    const isHttps = u.protocol === 'https:';
    const opts = { method, hostname: u.hostname, port: u.port || (isHttps ? 443 : 80), path: u.path, headers };
    const client = isHttps ? https : http;
    const req = client.request(opts, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        let json = null;
        try { json = JSON.parse(buf.toString('utf8')); } catch {}
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: json });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function login(baseUrl, email, password, schoolId) {
  const res = await request('POST', `${baseUrl}/auth/login`, { 'Content-Type': 'application/json' }, { email, password, schoolId });
  if (!res.ok) throw new Error(`Login failed: HTTP ${res.status}`);
  return res.body && res.body.token ? res.body.token : null;
}

async function hit(baseUrl, endpoint, token) {
  const start = now();
  const res = await request('GET', `${baseUrl}${endpoint}`, { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });
  const duration = now() - start;
  return { ok: res.ok, status: res.status, duration };
}

function stats(latencies) {
  const arr = latencies.slice().sort((a,b)=>a-b);
  const n = arr.length;
  const avg = arr.reduce((s,x)=>s+x,0)/Math.max(n,1);
  const p = (q)=> arr[Math.min(n-1, Math.floor(q*(n-1)))];
  return { count:n, avg: ms(avg), p50: ms(p(0.5)), p90: ms(p(0.9)), p95: ms(p(0.95)), p99: ms(p(0.99)) };
}

async function main() {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';
  const EMAIL = process.env.LT_EMAIL || 'admin@school.com';
  const PASSWORD = process.env.LT_PASSWORD || 'password';
  const SCHOOL_ID = Number(process.env.SCHOOL_ID || 1);
  const DURATION_SEC = Number(process.env.LT_DURATION_SEC || 30);
  const CONCURRENCY = Number(process.env.LT_CONCURRENCY || 10);

  console.log('Load test starting', { BASE_URL, SCHOOL_ID, DURATION_SEC, CONCURRENCY });
  let token = null;
  try { token = await login(BASE_URL, EMAIL, PASSWORD, SCHOOL_ID); } catch (e) { console.log('Login skipped or failed, testing public endpoints only:', e.message); }

  const endpoints = [
    { name: 'root', ep: '/..' }, // maps to BASE_URL.replace(/\/api$/, '') root
    { name: 'health', ep: '/health' },
    { name: 'school_overview_public', ep: `/schools/${SCHOOL_ID}` },
    { name: 'students', ep: `/school/${SCHOOL_ID}/students` },
    { name: 'teachers', ep: `/school/${SCHOOL_ID}/teachers` },
    { name: 'analytics_dashboard', ep: `/analytics/dashboard/overview?schoolId=${SCHOOL_ID}` }
  ];

  const startAll = now();
  const until = startAll + DURATION_SEC*1000;
  const results = Object.create(null);
  for (const e of endpoints) { results[e.name] = { latencies: [], ok: 0, fail: 0 }; }

  function resolveUrl(ep) {
    if (ep === '/..') return BASE_URL.replace(/\/api$/, '') + '/';
    return BASE_URL + ep;
  }

  async function worker(id) {
    while (now() < until) {
      for (const e of endpoints) {
        const url = resolveUrl(e.ep);
        const isPublic = /\/schools\//.test(e.ep) || e.name==='health' || e.name==='root';
        const t = isPublic ? null : token;
        try {
          const start = now();
          const res = await request('GET', url, { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) });
          const dur = now() - start;
          results[e.name].latencies.push(dur);
          if (res.ok) results[e.name].ok++; else results[e.name].fail++;
        } catch {
          results[e.name].fail++;
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_,i)=>worker(i)));

  const elapsed = now() - startAll;
  const report = {};
  for (const e of endpoints) {
    const r = results[e.name];
    report[e.name] = { stats: stats(r.latencies), ok: r.ok, fail: r.fail, rps: Math.round((r.ok + r.fail) / (elapsed/1000)) };
  }
  console.log('Elapsed ms:', elapsed);
  console.log('Report:', JSON.stringify(report, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
