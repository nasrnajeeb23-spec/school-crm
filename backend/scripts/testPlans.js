const http = require('http');
const jwt = require('jsonwebtoken');

function request(method, path, data, headers){
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const baseHeaders = { 'Content-Type': 'application/json', 'Content-Length': payload ? Buffer.byteLength(payload) : 0 };
    const allHeaders = Object.assign({}, baseHeaders, headers || {});
    const req = http.request({ host: '127.0.0.1', port: process.env.PORT || 5000, path: `/api${path}`, method, headers: allHeaders }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch { resolve(body); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function getToken(){
  try {
    const loginRes = await request('POST', '/auth/superadmin/login', { email: 'super@admin.com', password: 'password', ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0', timestamp: Date.now() });
    if (loginRes && loginRes.requiresMfa && loginRes.tempToken) {
      const verifyRes = await request('POST', '/auth/superadmin/verify-mfa', { tempToken: loginRes.tempToken, mfaCode: '123456', ipAddress: '127.0.0.1', timestamp: Date.now() });
      if (verifyRes && verifyRes.token) return verifyRes.token;
    }
  } catch {}
  try {
    const secret = process.env.JWT_SECRET || 'devsecret';
    const token = jwt.sign({ id: 1, email: 'super@admin.com', role: 'SuperAdmin', type: 'superadmin', tokenVersion: 0 }, secret, { expiresIn: '1h' });
    return token;
  } catch { return null; }
}

(async () => {
  try {
    const plans = await request('GET', '/plans');
    if (!Array.isArray(plans) || plans.length === 0) throw new Error('No plans');
    const p = plans[0];
    const original = { name: p.name, price: p.price, pricePeriod: p.pricePeriod, features: p.features, limits: p.limits, recommended: !!p.recommended };
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await request('PUT', `/plans/${p.id}`, original, headers);
    if (res && res.id === String(p.id)) {
      console.log('Plans GET/PUT smoke OK');
      process.exit(0);
    } else {
      throw new Error('Invalid PUT response');
    }
  } catch(e) {
    console.error('testPlans failed:', e.message);
    process.exit(1);
  }
})();
