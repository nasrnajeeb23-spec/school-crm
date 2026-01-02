const buckets = new Map();

function getKey(req, name) {
  const uid = req.user && req.user.id ? String(req.user.id) : 'anon';
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString();
  return `${name}:${uid}:${ip}`;
}

function rateLimit(options = {}) {
  const windowMs = Number(options.windowMs || 60000);
  const max = Number(options.max || 10);
  const name = String(options.name || 'default');
  return (req, res, next) => {
    try {
      const key = getKey(req, name);
      const now = Date.now();
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { resetAt: now + windowMs, count: 0 };
        buckets.set(key, bucket);
      }
      if (now > bucket.resetAt) {
        bucket.resetAt = now + windowMs;
        bucket.count = 0;
      }
      bucket.count += 1;
      if (bucket.count > max) {
        return res.status(429).json({ msg: 'Too many requests', retryAfterMs: bucket.resetAt - now });
      }
      next();
    } catch (e) {
      next();
    }
  };
}

module.exports = { rateLimit };
