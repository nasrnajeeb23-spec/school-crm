const http = require('http');

function request(method, path, data){
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = http.request({ host: '127.0.0.1', port: process.env.PORT || 5000, path: `/api${path}`, method, headers: { 'Content-Type': 'application/json', 'Content-Length': payload ? Buffer.byteLength(payload) : 0 } }, res => {
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

(async () => {
  try {
    const plans = await request('GET', '/plans');
    if (!Array.isArray(plans) || plans.length === 0) throw new Error('No plans');
    const p = plans[0];
    const original = { name: p.name, price: p.price, pricePeriod: p.pricePeriod, features: p.features, limits: p.limits, recommended: !!p.recommended };
    const res = await request('PUT', `/plans/${p.id}`, original);
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

