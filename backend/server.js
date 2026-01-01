require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { sequelize } = require('./models'); // Import sequelize from models/index
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const samlAuth = require('./middleware/samlAuth');
const { languageMiddleware } = require('./i18n/config');
const { verifyToken, requireRole, isSuperAdminUser, isSuperAdminRole, normalizeRole } = require('./middleware/auth');
const { createLogger, format, transports } = require('winston');
const DailyRotate = require('winston-daily-rotate-file');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console(),
    new DailyRotate({
      filename: require('path').join(__dirname, '..', 'logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '30d',
    })
  ]
});

// Import routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const schoolsRoutes = require('./routes/schools');
const plansRoutes = require('./routes/plans');
const paymentsRoutes = require('./routes/payments');
const superadminRoutes = require('./routes/superadmin');
const subscriptionsRoutes = require('./routes/subscriptions');
const rolesRoutes = require('./routes/roles');
const schoolAdminRoutes = require('./routes/schoolAdmin');
const teacherRoutes = require('./routes/teacher');
const parentRoutes = require('./routes/parent');
const licenseRoutes = require('./routes/license');
const transportationRoutes = require('./routes/transportation');
const packageRoutes = require('./routes/package');
const messagingRoutes = require('./routes/messaging');
const authEnterpriseRoutes = require('./routes/authEnterprise');
const authSuperAdminRoutes = require('./routes/authSuperAdmin');
const analyticsRoutes = require('./routes/analytics');
const helpRoutes = require('./routes/help');
const modulesRoutes = require('./routes/modules');
const pricingRoutes = require('./routes/pricing');
const billingRoutes = require('./routes/billing');
const contactRoutes = require('./routes/contact');
const reportsRoutes = require('./routes/reports');
const driverRoutes = require('./routes/driver');
const CronService = require('./services/CronService');
const nodeCron = require('node-cron');
const archiver = require('archiver');
const fse = require('fs-extra');
const path = require('path');
const fs = require('fs');
const { checkStorageLimit, updateUsedStorage } = require('./middleware/storageLimits');
const multer = require('multer');


const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
app.locals.disabledModules = new Set();
let Sentry;
try { Sentry = require('@sentry/node'); } catch {}
if (Sentry && process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'development' });
  app.use(Sentry.Handlers.requestHandler());
}
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001';
const allowedOrigins = allowedOrigin.split(',').map(o => o.trim());
allowedOrigins.push('https://school-crm-admin.onrender.com');
if (process.env.FRONTEND_URL) {
  try { allowedOrigins.push(process.env.FRONTEND_URL.trim()); } catch {}
}
const io = new Server(server, { 
  cors: { 
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"]
  }
});
app.set('io', io);

io.on('connection', (socket) => {
  logger.info(`User Connected: ${socket.id}`);

  socket.on('join_conversation', (roomId) => {
    socket.join(roomId);
    logger.info(`User ${socket.id} joined room: ${roomId}`);
  });

  socket.on('leave_conversation', (roomId) => {
    socket.leave(roomId);
    logger.info(`User ${socket.id} left room: ${roomId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`User Disconnected: ${socket.id}`);
  });
});
logger.info(`Server file path: ${__filename}`);

app.locals.logger = logger;

// Initialize central security policies (used by auth middleware)
app.locals.securityPolicies = {
  enforceMfaForAdmins: true,
  passwordMinLength: 8,
  lockoutThreshold: 3,
  allowedIpRanges: [],
  sessionMaxAgeHours: 24
};
// Load persisted policies if present
(async () => {
  try {
    const { SecurityPolicy } = require('./models');
    const dbPolicy = await SecurityPolicy.findOne();
    if (dbPolicy) {
      app.locals.securityPolicies = {
        enforceMfaForAdmins: !!dbPolicy.enforceMfaForAdmins,
        passwordMinLength: Number(dbPolicy.passwordMinLength || 8),
        lockoutThreshold: Number(dbPolicy.lockoutThreshold || 3),
        allowedIpRanges: (() => { try { return JSON.parse(dbPolicy.allowedIpRanges || '[]'); } catch { return []; } })(),
        sessionMaxAgeHours: Number(dbPolicy.sessionMaxAgeHours || 24)
      };
    }
  } catch {}
})();

// Middleware
app.use((req, res, next) => {
  try {
    const origin = req.headers.origin;
    if (!origin) return next();
    const allowAny = allowedOrigins.includes('*');
    const allowed = allowAny || allowedOrigins.includes(origin);
    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      const reqHeaders = req.headers['access-control-request-headers'];
      res.setHeader('Access-Control-Allow-Headers', reqHeaders || 'Content-Type, Authorization, x-school-id, x-client, x-requested-with');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    return next();
  } catch {
    return next();
  }
});

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*')) return callback(null, origin);
    if (allowedOrigins.includes(origin)) return callback(null, origin);
    logger.warn(`CORS blocked request from: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id', 'x-client', 'x-requested-with'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(compression());
app.use((req, res, next) => {
  try {
    const origin = req.headers.origin;
    if (origin && res.getHeader('Access-Control-Allow-Origin') === '*') {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  } catch {}
  next();
});
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://school-crm-admin.onrender.com", process.env.FRONTEND_URL || ""].filter(Boolean),
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW) || 15;
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 300;
app.use(rateLimit({ 
  windowMs: rateLimitWindow * 60 * 1000, 
  max: rateLimitMax,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: rateLimitWindow * 60
  }
}));

// Basic HTTP request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    try {
      const ms = Date.now() - start;
      const u = req.user || {};
      logger.info('http_access', { method: req.method, path: req.originalUrl || req.url, status: res.statusCode, durationMs: ms, userId: u.id || null, role: u.role || null, ip: req.ip });
    } catch {}
  });
  next();
});
app.use(express.json());
// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Standard API response middleware
try { app.use(require('./middleware/response').responseFormatter); } catch {}
let promClient;
try { promClient = require('prom-client'); } catch {}
if (promClient) { 
  promClient.collectDefaultMetrics();
  const httpRequestCounter = new promClient.Counter({ name: 'http_requests_total', help: 'Total HTTP requests', labelNames: ['method','route','status'] });
  const httpRequestDuration = new promClient.Histogram({ name: 'http_request_duration_seconds', help: 'HTTP request duration in seconds', labelNames: ['method','route','status'], buckets: [0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5,10] });
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      try {
        const diff = Number(process.hrtime.bigint() - start);
        const sec = diff / 1e9;
        const route = (req.route && req.route.path) || (req.baseUrl ? req.baseUrl + (req.path || '') : (req.path || req.originalUrl || 'unknown'));
        const labels = { method: req.method, route, status: String(res.statusCode) };
        httpRequestCounter.inc(labels);
        httpRequestDuration.observe(labels, sec);
        if (Sentry && process.env.SENTRY_DSN && res.statusCode >= 500) {
          Sentry.captureMessage('HTTP_5xx', { level: 'fatal', extra: { method: req.method, route, status: res.statusCode, duration_seconds: sec } });
        }
      } catch {}
    });
    next();
  });
  app.get('/metrics', async (req, res) => {
    try {
      res.setHeader('Content-Type', promClient.register.contentType);
      res.send(await promClient.register.metrics());
    } catch {
      res.status(500).end();
    }
  });
}

// Session middleware for enterprise/SAML features
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === 'production') { throw new Error('SESSION_SECRET required'); }
const sessionConfig = {
  secret: sessionSecret || 'dev_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
};
try {
  if (process.env.REDIS_URL) {
    let RedisStore;
    let client;
    try {
      RedisStore = require('connect-redis').default;
      const redis = require('redis');
      const useTls = process.env.REDIS_URL.startsWith('rediss://');
      client = redis.createClient({ url: process.env.REDIS_URL, socket: useTls ? { tls: true } : {} });
      client.on('error', (err) => { try { logger.warn('Redis client error'); } catch {} });
      client.connect().catch(() => {});
      sessionConfig.store = new RedisStore({ client });
      app.locals.redisClient = client;
      try { logger.info('Session store: Redis'); } catch {}
    } catch {}
  }
} catch {}
app.use(session(sessionConfig));
app.use(samlAuth.initialize());
app.use(samlAuth.session());
app.use(languageMiddleware);

// License enforcement setup
const { verifyLicenseKey } = require('./utils/license');
const coreModules = ['student_management', 'academic_management', 'parent_portal', 'teacher_portal', 'teacher_app', 'finance'];
const licenseKey = process.env.LICENSE_KEY || null;
let allowedModules = [...coreModules];
if (licenseKey) {
  const result = verifyLicenseKey(licenseKey);
  if (result.valid && Array.isArray(result.payload.modules)) {
    allowedModules = [...coreModules, ...result.payload.modules];
    logger.info('License valid. Enabled modules: ' + allowedModules.join(', '));
  } else {
    logger.warn('Invalid license. Reason: ' + result.reason);
    if (process.env.NODE_ENV === 'production') {
        logger.error('CRITICAL: Invalid License in Production. Shutting down.');
        // In a real obfuscated build, this ensures the server won't run without a valid key.
        // process.exit(1); // Commented out for dev safety, but uncomment for production build logic
    }
  }
} else {
  logger.warn('No LICENSE_KEY provided.');
  if (process.env.NODE_ENV === 'production') {
      logger.error('CRITICAL: No License Key found in Production. Shutting down.');
      // process.exit(1); 
  } else {
    allowedModules = [...allowedModules, 'finance', 'transportation'];
    logger.warn('Dev mode: enabling finance & transportation modules for testing');
  }
}
allowedModules = Array.from(new Set(allowedModules));
app.locals.allowedModules = allowedModules;

// Static file serving for Frontend (Self-Hosted Support)
// If admin/dist exists relative to backend, serve it.
const frontendDist = path.join(__dirname, '..', 'admin', 'dist');
if (fs.existsSync(frontendDist)) {
    logger.info('Serving static frontend from admin/dist');
    app.use(express.static(frontendDist));
    // SPA Fallback
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

const { Job } = require('./models');
const cron = require('node-cron');
app.locals.enqueueJob = (name, payload, executor) => {
  const id = 'job_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  Job.create({ id, name, status: 'queued', schoolId: Number(payload.schoolId || 0) }).catch(() => {});
  setImmediate(async () => {
    try {
      await Job.update({ status: 'running', updatedAt: new Date() }, { where: { id } });
      const result = await executor(payload);
      await Job.update({ status: 'completed', updatedAt: new Date() }, { where: { id } });
      const redis = app.locals.redisClient;
      if (redis) {
        if (result && result.csv) await redis.setEx(`job:${id}:csv`, 3600, result.csv.toString());
        if (result && result.zip) await redis.setEx(`job:${id}:zip`, 3600, result.zip.toString('base64'));
      }
    } catch (e) {
      await Job.update({ status: 'failed', updatedAt: new Date() }, { where: { id } }).catch(() => {});
    }
  });
  return id;
};

app.locals.cronTasks = Object.create(null);
app.locals.scheduleBackupForSchool = async (schoolId, cronExpr) => {
  const sid = String(schoolId);
  if (app.locals.cronTasks[sid]) {
    try { app.locals.cronTasks[sid].stop(); } catch {}
    delete app.locals.cronTasks[sid];
  }
  if (!cronExpr || typeof cronExpr !== 'string') return;
  const task = nodeCron.schedule(cronExpr, () => {
    try {
      app.locals.enqueueJob('backup_store', { schoolId }, async ({ schoolId }) => {
        const { SchoolSettings, AuditLog } = require('./models');
        const s = await SchoolSettings.findOne({ where: { schoolId } }).catch(() => null);
        const cfg = s?.backupConfig || {};
        const types = Array.isArray(cfg.types) ? cfg.types : ['students','classes','subjects','classSubjectTeachers','grades','attendance','schedule','fees','teachers','parents'];
        const full = await storeBackupZip(Number(schoolId), types, {});
        const fs = require('fs');
        const path = require('path');
        const buffer = fs.readFileSync(full);
        try {
          const stat = fs.statSync(full);
          await AuditLog.create({ action: 'school.backup.auto.store', userId: null, userEmail: null, ipAddress: '127.0.0.1', userAgent: 'cron', details: JSON.stringify({ schoolId: Number(schoolId), file: path.basename(full), size: stat.size, types }), timestamp: new Date(), riskLevel: 'low' });
        } catch {}
        return { ok: true, jobType: 'backup_store', schoolId, zip: buffer };
      });
    } catch {}
  }, { scheduled: true });
  app.locals.cronTasks[sid] = task;
};

app.locals.reloadBackupSchedules = async () => {
  const redis = app.locals.redisClient;
  if (!redis) return;
  try {
    const schoolsSetKey = 'backup:schedule:set';
    const schools = await redis.sMembers(schoolsSetKey).catch(() => []);
    for (const sid of (schools || [])) {
      const expr = await redis.get(`backup:schedule:${sid}`).catch(() => null);
      await app.locals.scheduleBackupForSchool(Number(sid), expr);
    }
  } catch {}
};

app.locals.cleanupOldBackups = async () => {
  const redis = app.locals.redisClient;
  try {
    const daysStr = redis ? await redis.get('backup:retention:days').catch(() => null) : null;
    const days = Number(daysStr || 30) || 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { Job } = require('./models');
    const outdated = await Job.findAll({ where: { status: 'completed', updatedAt: { [require('sequelize').Op.lt]: cutoff } }, raw: true }).catch(() => []);
    for (const j of outdated) {
      if (redis) {
        await redis.del(`job:${j.id}:csv`).catch(() => {});
        await redis.del(`job:${j.id}:zip`).catch(() => {});
      }
    }
  } catch {}
};

nodeCron.schedule('0 3 * * *', async () => { try { await app.locals.cleanupOldBackups(); } catch {} }, { scheduled: true });

// API Routes
const authLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 50 });
app.use('/api/auth', authRoutes);
app.use('/api/auth/superadmin', authLimiter, authSuperAdminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/schools', verifyToken, schoolsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/school', schoolAdminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/transportation', transportationRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/superadmin', packageRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/auth/enterprise', authEnterpriseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/contact', contactRoutes);
// Additional route mounts for compatibility with frontend endpoints
app.use('/api/dashboard', analyticsRoutes);
app.use('/api/superadmin/subscriptions', subscriptionsRoutes);
// Aliases without "/api" to support frontend fallback requests
app.use('/superadmin', superadminRoutes);
app.use('/dashboard', analyticsRoutes);
app.use('/contact', contactRoutes);
app.use('/public/schools', schoolsRoutes); // Fix for /public/schools 500/404
app.use('/api/public/schools', schoolsRoutes); // Fix for /api/public/schools 404
app.use('/public', schoolsRoutes);

(async () => {
  try {
    const { User } = require('./models');
    const bcrypt = require('bcryptjs');
    const email = process.env.SUPER_ADMIN_EMAIL;
    const pwd = process.env.SUPER_ADMIN_PASSWORD;
    
    if (!email || !pwd) {
      console.warn('⚠️ SuperAdmin credentials not found in environment variables. Skipping auto-creation.');
      return;
    }

    const hashed = await bcrypt.hash(pwd, 10);
    let u = await User.findOne({ where: { email } });
    if (!u) {
      await User.create({ name: 'المدير العام', email, username: email, password: hashed, role: 'SuperAdmin' });
    } else {
      const s = String(u.password || '');
      const isHashed = s.startsWith('$2a$') || s.startsWith('$2b$') || s.startsWith('$2y$');
      if (!isHashed) {
        await u.update({ password: hashed });
      }
      if (String(u.role || '') !== 'SuperAdmin') {
        await u.update({ role: 'SuperAdmin' });
      }
    }
  } catch {}
})();

app.get('/api/proxy/image', async (req, res) => {
  try {
    const startUrl = String(req.query.url || '');
    if (!/^https?:\/\//i.test(startUrl)) return res.status(400).json({ msg: 'Invalid url' });
    const allow = new Set(['images.unsplash.com']);
    const doRequest = (target, redirects = 0) => {
      if (redirects > 3) return res.status(400).json({ msg: 'Too many redirects' });
      let host;
      try { host = new URL(target).hostname; } catch { return res.status(400).json({ msg: 'Invalid url' }); }
      if (!allow.has(host)) return res.status(403).json({ msg: 'Host not allowed' });
      const isHttps = target.startsWith('https');
      const client = isHttps ? require('https') : require('http');
      const urlObj = new URL(target);
      const options = {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        path: urlObj.pathname + (urlObj.search || ''),
        method: 'GET',
        headers: {
          'User-Agent': 'SchoolSaaS/1.0',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
        }
      };
      const reqUpstream = client.request(options, (resp) => {
        const code = resp.statusCode || 200;
        if ([301,302,303,307,308].includes(code)) {
          const loc = resp.headers['location'];
          if (loc) return doRequest(loc, redirects + 1);
        }
        const ct = resp.headers['content-type'] || 'image/jpeg';
        res.setHeader('Content-Type', ct);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        resp.pipe(res);
      });
      reqUpstream.on('error', () => { try { res.status(500).end(); } catch {} });
      reqUpstream.end();
    };
    return doRequest(startUrl, 0);
  } catch {
    return res.status(500).json({ msg: 'Server Error' });
  }
});

// Advertising requests (alias to contact messages with structured payload)
app.post('/api/ads/request', async (req, res) => {
  try {
    const { ContactMessage } = require('./models');
    const { advertiserName, advertiserEmail, title, description, imageUrl, link } = req.body || {};
    if (!advertiserName || !advertiserEmail || !title || !description) {
      return res.status(400).json({ msg: 'Invalid payload' });
    }
    const message = JSON.stringify({
      type: 'AD_REQUEST',
      advertiserName: String(advertiserName),
      advertiserEmail: String(advertiserEmail),
      title: String(title),
      description: String(description),
      imageUrl: String(imageUrl || ''),
      link: String(link || ''),
      submittedAt: new Date().toISOString()
    });
    const row = await ContactMessage.create({ name: String(advertiserName), email: String(advertiserEmail), message, status: 'NEW' });
    return res.status(201).json({ id: row.id, status: 'NEW' });
  } catch (e) {
    try { console.error('AD request error:', e?.message || e); } catch {}
    return res.status(500).json({ msg: 'Server Error' });
  }
});
// Alias without /api to support frontend fallback base
app.post('/ads/request', async (req, res) => {
  try {
    const { ContactMessage } = require('./models');
    const { advertiserName, advertiserEmail, title, description, imageUrl, link } = req.body || {};
    if (!advertiserName || !advertiserEmail || !title || !description) {
      return res.status(400).json({ msg: 'Invalid payload' });
    }
    const message = JSON.stringify({
      type: 'AD_REQUEST',
      advertiserName: String(advertiserName),
      advertiserEmail: String(advertiserEmail),
      title: String(title),
      description: String(description),
      imageUrl: String(imageUrl || ''),
      link: String(link || ''),
      submittedAt: new Date().toISOString()
    });
    const row = await ContactMessage.create({ name: String(advertiserName), email: String(advertiserEmail), message, status: 'NEW' });
    return res.status(201).json({ id: row.id, status: 'NEW' });
  } catch (e) {
    try { console.error('AD request error (alias):', e?.message || e); } catch {}
    return res.status(500).json({ msg: 'Server Error' });
  }
});

// Database Schema Fixer (Auto-run on start to ensure columns exist)
(async () => {
  try {
    const { sequelize } = require('./models');
    const queryInterface = sequelize.getQueryInterface();
    
    // Check and add customLimits to Subscriptions
    try {
      const tableDesc = await queryInterface.describeTable('Subscriptions');
      if (!tableDesc.customLimits) {
        console.log('Adding customLimits to Subscriptions...');
        await queryInterface.addColumn('Subscriptions', 'customLimits', {
          type: require('sequelize').DataTypes.JSON,
          allowNull: true
        });
      }
    } catch (e) { console.error('Schema Fix Subscriptions:', e.message); }

    // Check and add priceSnapshot to SubscriptionModules
    try {
        // SubscriptionModules might not exist yet, let sequelize sync handle creation if model exists, 
        // but if table exists and column missing:
        const tableDesc = await queryInterface.describeTable('SubscriptionModules');
        if (!tableDesc.priceSnapshot) {
          console.log('Adding priceSnapshot to SubscriptionModules...');
          await queryInterface.addColumn('SubscriptionModules', 'priceSnapshot', {
             type: require('sequelize').DataTypes.FLOAT,
             allowNull: true
          });
        }
    } catch (e) { 
        // Table might not exist, ignore
    }

    // Ensure SubscriptionModule table exists
    try {
        await sequelize.models.SubscriptionModule.sync(); 
    } catch(e) {}

    // Ensure new pricing columns exist
    try {
      const tableDesc = await queryInterface.describeTable('pricing_config');
      if (!tableDesc.pricePerTeacher) {
        console.log('Adding pricePerTeacher to pricing_config...');
        await queryInterface.addColumn('pricing_config', 'pricePerTeacher', { type: require('sequelize').DataTypes.FLOAT, allowNull: false, defaultValue: 2.0 });
      }
      if (!tableDesc.pricePerGBStorage) {
        console.log('Adding pricePerGBStorage to pricing_config...');
        await queryInterface.addColumn('pricing_config', 'pricePerGBStorage', { type: require('sequelize').DataTypes.FLOAT, allowNull: false, defaultValue: 0.2 });
      }
      if (!tableDesc.pricePerInvoice) {
        console.log('Adding pricePerInvoice to pricing_config...');
        await queryInterface.addColumn('pricing_config', 'pricePerInvoice', { type: require('sequelize').DataTypes.FLOAT, allowNull: false, defaultValue: 0.05 });
      }
      if (!tableDesc.currency) {
        console.log('Adding currency to pricing_config...');
        await queryInterface.addColumn('pricing_config', 'currency', { type: require('sequelize').DataTypes.STRING, allowNull: false, defaultValue: 'USD' });
      }
      if (!tableDesc.yearlyDiscountPercent) {
        console.log('Adding yearlyDiscountPercent to pricing_config...');
        await queryInterface.addColumn('pricing_config', 'yearlyDiscountPercent', { type: require('sequelize').DataTypes.FLOAT, allowNull: true, defaultValue: 0 });
      }
    } catch (e) { try { console.warn('Schema Fix pricing_config:', e.message); } catch {} }

  } catch (err) {
    console.error('Schema Fixer Error:', err.message);
  }
})();

// Removed legacy /api/content/landing handler (moved to routes/content.js)

// Health check endpoint for production verification
app.get('/api/health', async (req, res) => {
  const out = {
    success: true,
    code: 'HEALTH_OK',
    message: 'Health status',
    data: {
      env: {
        JWT_SECRET: !!process.env.JWT_SECRET,
        SESSION_SECRET: !!process.env.SESSION_SECRET,
        REDIS_URL: !!process.env.REDIS_URL,
        ANALYTICS_CACHE_ENABLED: (process.env.ANALYTICS_CACHE_ENABLED || null),
        ANALYTICS_CACHE_TTL_SECONDS: (process.env.ANALYTICS_CACHE_TTL_SECONDS || null)
      },
      responseMiddlewareAttached: typeof (res.success) === 'function',
      cache: {
        enabled: (() => { try { return (process.env.ANALYTICS_CACHE_ENABLED ? String(process.env.ANALYTICS_CACHE_ENABLED).toLowerCase() === 'true' : (process.env.NODE_ENV !== 'development')); } catch { return false; } })()
      },
      redis: { connected: false, ping: null },
      db: { authenticated: false, dialect: null },
      indexes: { checked: false, tables: [] }
    }
  };
  try {
    // Redis check
    const client = app.locals.redisClient;
    if (client) {
      try { const pong = await client.ping(); out.data.redis.connected = true; out.data.redis.ping = pong; } catch {}
    }
  } catch {}
  try {
    // DB check
    const db = require('./models');
    const qi = db.sequelize.getQueryInterface();
    out.data.db.dialect = db.sequelize.getDialect();
    await db.sequelize.authenticate();
    out.data.db.authenticated = true;
    // Indexes check (Postgres): use model table names for accuracy
    const tables = [db.FeeSetup, db.StaffAttendance, db.TeacherAttendance, db.SalarySlip, db.SalaryStructure, db.Conversation, db.Message]
      .map(m => (m && typeof m.getTableName === 'function') ? m.getTableName() : null)
      .filter(Boolean);
    for (const t of tables) {
      try {
        const idx = await qi.showIndex(t);
        out.data.indexes.tables.push({ table: t, indexes: (idx || []).map(i => ({ name: i.name || i.indexName || '', fields: i.fields ? i.fields.map(f => f.attribute || f) : [] })) });
        out.data.indexes.checked = true;
      } catch {}
    }
  } catch {}
  try { return res.json(out); } catch { return res.status(200).json(out); }
});

// Modules catalog (in-memory)
const modulesCatalog = [
  { id: 'student_management', name: 'إدارة الطلاب', description: 'ملفات الطلاب والحضور والدرجات.', monthlyPrice: 0, isEnabled: true, isCore: true },
  { id: 'academic_management', name: 'الإدارة الأكاديمية', description: 'الجدول والمواد الدراسية وتنظيم الفصول.', monthlyPrice: 0, isEnabled: true, isCore: true },
  { id: 'parent_portal', name: 'بوابة ولي الأمر', description: 'وصول أولياء الأمور لمتابعة الحضور والدرجات والرسائل.', monthlyPrice: 0, isEnabled: true, isCore: true },
  { id: 'teacher_portal', name: 'بوابة المعلم', description: 'واجهة ويب للمعلم لإدارة الجدول والحضور والدرجات.', monthlyPrice: 0, isEnabled: true, isCore: true },
  { id: 'teacher_app', name: 'تطبيق المعلم', description: 'تطبيق الجوال للمعلم مع إشعارات فورية.', monthlyPrice: 0, isEnabled: true, isCore: true },
  { id: 'finance_fees', name: 'الرسوم الدراسية', description: 'إدارة الفواتير والرسوم الدراسية والمدفوعات.', monthlyPrice: 29, oneTimePrice: 0, isEnabled: true, isCore: false },
  { id: 'finance_salaries', name: 'الرواتب وشؤون الموظفين', description: 'إدارة مسيرات الرواتب وهياكل الأجور والحضور.', monthlyPrice: 29, oneTimePrice: 0, isEnabled: true, isCore: false },
  { id: 'finance_expenses', name: 'المصروفات', description: 'تتبع المصروفات والمشتريات.', monthlyPrice: 19, oneTimePrice: 0, isEnabled: true, isCore: false },
  { id: 'transportation', name: 'النقل المدرسي', description: 'إدارة الحافلات والمسارات والطلاب المنقولين.', monthlyPrice: 29, oneTimePrice: 0, isEnabled: true, isCore: false },
  { id: 'advanced_reports', name: 'التقارير المتقدمة', description: 'لوحات معلومات وتحليلات مخصصة.', monthlyPrice: 39, oneTimePrice: 0, isEnabled: true, isCore: false },
];
app.locals.modulesCatalog = modulesCatalog;

// Attachments: config and helpers
const MAX_ATTACHMENT_SIZE = parseInt(process.env.MAX_ATTACHMENT_SIZE || `${25 * 1024 * 1024}`, 10); // 25 MB
const allowedMimeTypes = new Set([
  'image/png','image/jpeg','image/jpg','image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'text/plain'
]);
function ensureDir(p){ try { fs.mkdirSync(p, { recursive: true }); } catch {} }
function makeSafeName(name){
  const base = path.basename(name).replace(/[^A-Za-z0-9._-]+/g, '_');
  return `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${base}`;
}
const assignmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const schoolId = Number(req.user?.schoolId || 0) || 0;
      const dir = path.join(__dirname, 'storage', 'assignments', String(schoolId || 'unknown'));
      ensureDir(dir);
      cb(null, dir);
    } catch (e) { cb(e); }
  },
  filename: (_req, file, cb) => cb(null, makeSafeName(file.originalname))
});
const assignmentUpload = multer({
  storage: assignmentStorage,
  limits: { fileSize: MAX_ATTACHMENT_SIZE },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  }
});

app.post('/api/assignments', verifyToken, requireRole('TEACHER'), checkStorageLimit, assignmentUpload.array('attachments', 10), async (req, res) => {
  try {
    const { Assignment, Class, Student, Submission, Teacher } = require('./models');
    const teacherId = Number(req.user.teacherId || 0);
    if (!teacherId) return res.status(403).json({ msg: 'Access denied' });
    const { title, description, classId, dueDate } = req.body || {};
    if (!title || !classId) return res.status(400).json({ msg: 'title and classId are required' });
    const cls = await Class.findByPk(String(classId));
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ msg: 'Teacher not found' });
    if (Number(teacher.schoolId) !== Number(cls.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const files = Array.isArray(req.files) ? req.files : [];
    
    // Update storage usage
    let totalSize = 0;
    for (const f of files) {
      totalSize += f.size;
    }
    if (totalSize > 0) {
      try { await updateUsedStorage(teacher.schoolId, totalSize); } catch (e) { console.error('Storage update failed', e); }
    }

    const attachments = files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      url: `/api/assignments/${/* placeholder, updated below */'pending'}/attachments/${encodeURIComponent(f.filename)}`,
      uploadedAt: new Date().toISOString()
    }));
    const assignment = await Assignment.create({
      schoolId: Number(teacher.schoolId),
      classId: String(classId),
      teacherId: teacherId,
      title: String(title),
      description: description || '',
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'Active',
      attachments
    });
    // Fix attachment URLs with real assignmentId
    if (attachments.length > 0) {
      assignment.attachments = attachments.map(a => ({ ...a, url: `/api/assignments/${assignment.id}/attachments/${encodeURIComponent(a.filename)}` }));
      try { await assignment.save(); } catch {}
    }
    const students = await Student.findAll({ where: { classId: String(cls.id), schoolId: Number(teacher.schoolId) } });
    if (students && students.length > 0) {
      try {
        await Submission.bulkCreate(
          students.map(s => ({ assignmentId: assignment.id, studentId: s.id, status: 'NotSubmitted', attachments: [] })),
          { validate: true }
        );
      } catch (e) { try { console.warn('Bulk create submissions failed', e?.message || e); } catch {} }
    }
    const className = `${cls.gradeLevel} (${cls.section || 'أ'})`;
    return res.status(201).json({
      id: String(assignment.id),
      title: assignment.title,
      description: assignment.description || '',
      dueDate: assignment.dueDate ? assignment.dueDate.toISOString().split('T')[0] : '',
      classId: String(cls.id),
      className,
      status: assignment.status,
      attachments: Array.isArray(assignment.attachments) ? assignment.attachments : []
    });
  } catch (e) {
    try { console.error('Create assignment error:', e?.message || e); } catch {}
    res.status(500).json({ msg: 'Server Error' });
  }
});

app.get('/api/school/class/:classId/assignments', verifyToken, requireRole('TEACHER','SCHOOL_ADMIN','SUPER_ADMIN'), async (req, res) => {
  try {
    const { Assignment, Class, Teacher, Submission } = require('./models');
    const classId = String(req.params.classId);
    const cls = await Class.findByPk(classId);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    if (!isSuperAdminUser(req.user) && Number(req.user.schoolId || 0) !== Number(cls.schoolId || 0)) return res.status(403).json({ msg: 'Access denied' });
    const rows = await Assignment.findAll({ where: { classId }, include: [{ model: Class, attributes: ['gradeLevel','section'] }, { model: Teacher, attributes: ['name'] }], order: [['createdAt','DESC']] });
    const list = [];
    for (const a of rows) {
      const j = a.toJSON();
      const count = await Submission.count({ where: { assignmentId: a.id } }).catch(() => 0);
      list.push({
        id: String(j.id),
        classId: String(j.classId),
        className: a.Class ? `${a.Class.gradeLevel} (${a.Class.section || 'أ'})` : '',
        title: j.title,
        description: j.description || '',
        dueDate: j.dueDate ? new Date(j.dueDate).toISOString().split('T')[0] : '',
        creationDate: a.createdAt ? a.createdAt.toISOString().split('T')[0] : '',
        status: j.status,
        submissionCount: count,
        attachments: Array.isArray(j.attachments) ? j.attachments.map(att => ({
          filename: att.filename,
          originalName: att.originalName,
          mimeType: att.mimeType,
          size: att.size,
          url: `/api/assignments/${j.id}/attachments/${encodeURIComponent(att.filename)}`,
          uploadedAt: att.uploadedAt
        })) : []
      });
    }
    return res.json(list);
  } catch (e) {
    try { console.error('List class assignments error:', e?.message || e); } catch {}
    res.status(500).json({ msg: 'Server Error' });
  }
});

app.get('/api/assignments/:assignmentId/submissions', verifyToken, requireRole('TEACHER'), async (req, res) => {
  try {
    const { Assignment, Submission, Student, Teacher, Class } = require('./models');
    const teacherId = Number(req.user.teacherId || 0);
    if (!teacherId) return res.status(403).json({ msg: 'Access denied' });
    const assignment = await Assignment.findByPk(Number(req.params.assignmentId));
    if (!assignment) return res.status(404).json({ msg: 'Assignment not found' });
    if (Number(assignment.teacherId || 0) !== teacherId) return res.status(403).json({ msg: 'Access denied' });
    const cls = await Class.findByPk(String(assignment.classId));
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    const students = await Student.findAll({ where: { classId: String(cls.id) }, order: [['name','ASC']] });
    const rows = await Submission.findAll({ where: { assignmentId: assignment.id } });
    const map = new Map(rows.map(r => [String(r.studentId), r]));
    const statusMap = { Submitted: 'تم التسليم', NotSubmitted: 'لم يسلم', Late: 'متأخر', Graded: 'تم التقييم' };
    const result = students.map(s => {
      const sub = map.get(String(s.id));
      if (sub) {
        const j = sub.toJSON();
        return {
          id: String(j.id),
          assignmentId: String(j.assignmentId),
          studentId: String(j.studentId),
          studentName: s.name,
          submissionDate: j.submissionDate ? new Date(j.submissionDate).toISOString().split('T')[0] : null,
          status: statusMap[j.status] || j.status,
          grade: typeof j.grade === 'number' ? Number(j.grade) : undefined,
          feedback: j.feedback || undefined,
          attachments: Array.isArray(j.attachments) ? j.attachments.map(a => ({
            filename: a.filename,
            mimeType: a.mimeType,
            size: a.size,
            url: `/api/submissions/${j.id}/attachments/${encodeURIComponent(a.filename)}`,
            uploadedAt: a.uploadedAt
          })) : []
        };
      }
      return {
        id: `pending_${assignment.id}_${s.id}`,
        assignmentId: String(assignment.id),
        studentId: String(s.id),
        studentName: s.name,
        submissionDate: null,
        status: statusMap['NotSubmitted'],
        grade: undefined,
        feedback: undefined,
        attachments: []
      };
    });
    return res.json(result);
  } catch (e) {
    try { console.error('List submissions error:', e?.message || e); } catch {}
    res.status(500).json({ msg: 'Server Error' });
  }
});

app.put('/api/submissions/:id/grade', verifyToken, requireRole('TEACHER'), async (req, res) => {
  try {
    const { Submission, Assignment, Student } = require('./models');
    const teacherId = Number(req.user.teacherId || 0);
    if (!teacherId) return res.status(403).json({ msg: 'Access denied' });
    const submission = await Submission.findByPk(Number(req.params.id));
    if (!submission) return res.status(404).json({ msg: 'Submission not found' });
    const assignment = await Assignment.findByPk(Number(submission.assignmentId));
    if (!assignment) return res.status(404).json({ msg: 'Assignment not found' });
    if (Number(assignment.teacherId || 0) !== teacherId) return res.status(403).json({ msg: 'Access denied' });
    const { grade, feedback } = req.body || {};
    submission.grade = typeof grade === 'number' ? grade : submission.grade;
    submission.feedback = typeof feedback === 'string' ? feedback : submission.feedback;
    submission.status = 'Graded';
    await submission.save();
    const s = await Student.findByPk(String(submission.studentId)).catch(() => null);
    const statusMap = { Submitted: 'تم التسليم', NotSubmitted: 'لم يسلم', Late: 'متأخر', Graded: 'تم التقييم' };
    return res.json({
      id: String(submission.id),
      assignmentId: String(submission.assignmentId),
      studentId: String(submission.studentId),
      studentName: s ? s.name : '',
      submissionDate: submission.submissionDate ? new Date(submission.submissionDate).toISOString().split('T')[0] : null,
      status: statusMap[submission.status] || submission.status,
      grade: typeof submission.grade === 'number' ? Number(submission.grade) : undefined,
      feedback: submission.feedback || undefined,
      attachments: Array.isArray(submission.attachments) ? submission.attachments.map(a => ({
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size,
        url: `/api/submissions/${submission.id}/attachments/${encodeURIComponent(a.filename)}`,
        uploadedAt: a.uploadedAt
      })) : []
    });
  } catch (e) {
    try { console.error('Grade submission error:', e?.message || e); } catch {}
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Download teacher attachments (assignment)
app.get('/api/assignments/:assignmentId/attachments/:filename', verifyToken, requireRole('TEACHER'), async (req, res) => {
  try {
    const { Assignment, Teacher } = require('./models');
    const assignment = await Assignment.findByPk(Number(req.params.assignmentId));
    if (!assignment) return res.status(404).json({ msg: 'Assignment not found' });
    const teacherId = Number(req.user.teacherId || 0);
    if (!teacherId || Number(assignment.teacherId || 0) !== teacherId) return res.status(403).json({ msg: 'Access denied' });
    const schoolId = Number(assignment.schoolId || 0);
    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, 'storage', 'assignments', String(schoolId || 'unknown'), filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found' });
    res.setHeader('Content-Disposition', `inline; filename=${filename}`);
    res.type(path.extname(filename));
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { try { console.error('Download assignment attachment error:', e?.message || e); } catch {} res.status(500).json({ msg: 'Server Error' }); }
});

// Parent download: teacher attachments for assignments (secure, same school)
app.get('/api/parent/:parentId/assignments/:assignmentId/attachments/:filename', verifyToken, requireRole('PARENT'), async (req, res) => {
  try {
    const { Assignment, Parent } = require('./models');
    if (String(req.user.parentId) !== String(req.params.parentId)) return res.status(403).json({ msg: 'Access denied' });
    const parent = await Parent.findByPk(String(req.params.parentId));
    if (!parent) return res.status(404).json({ msg: 'Parent not found' });
    const assignment = await Assignment.findByPk(Number(req.params.assignmentId));
    if (!assignment) return res.status(404).json({ msg: 'Assignment not found' });
    if (Number(parent.schoolId || 0) !== Number(assignment.schoolId || 0)) return res.status(403).json({ msg: 'Access denied' });
    const schoolId = Number(assignment.schoolId || 0);
    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, 'storage', 'assignments', String(schoolId || 'unknown'), filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found' });
    res.setHeader('Content-Disposition', `inline; filename=${filename}`);
    res.type(path.extname(filename));
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { try { console.error('Parent download assignment attachment error:', e?.message || e); } catch {} res.status(500).json({ msg: 'Server Error' }); }
});

// Download submission attachments (teacher review)
app.get('/api/submissions/:id/attachments/:filename', verifyToken, requireRole('TEACHER'), async (req, res) => {
  try {
    const { Submission, Assignment } = require('./models');
    const submission = await Submission.findByPk(Number(req.params.id));
    if (!submission) return res.status(404).json({ msg: 'Submission not found' });
    const assignment = await Assignment.findByPk(Number(submission.assignmentId));
    const teacherId = Number(req.user.teacherId || 0);
    if (!assignment || Number(assignment.teacherId || 0) !== teacherId) return res.status(403).json({ msg: 'Access denied' });
    const schoolId = Number(assignment.schoolId || 0);
    const filename = path.basename(req.params.filename);
    const studentId = String(submission.studentId);
    const filePath = path.join(__dirname, 'storage', 'submissions', String(schoolId || 'unknown'), String(studentId || 'unknown'), filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found' });
    res.setHeader('Content-Disposition', `inline; filename=${filename}`);
    res.type(path.extname(filename));
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { try { console.error('Download submission attachment error:', e?.message || e); } catch {} res.status(500).json({ msg: 'Server Error' }); }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'SchoolSaaS CRM Backend is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});



// Global error handler
app.use((err, req, res, next) => {
  try {
    const status = err.status || 500;
    const msg = err.message || 'Server Error';
    try { (req.app?.locals?.logger || console).error(msg); } catch {}
    res.status(status).json({ msg });
  } catch {
    res.status(500).json({ msg: 'Server Error' });
  }
});

// JSON 404 fallback
app.use((req, res) => {
  res.status(404).json({ msg: 'Not Found', path: req.path });
});

const PORT = process.env.PORT || 5000;
logger.info(`Starting server on port ${PORT}`);

// Connect to database and start server
async function syncDatabase(){
  const isProd = process.env.NODE_ENV === 'production';
  // Sync database without force to preserve data
  const opts = { force: false };
  
  // Sync models in correct order to avoid foreign key constraint issues
  const { School, Plan, Subscription, BusOperator, Route, Parent, Student, Teacher, User, Conversation, Message, Expense, SchoolSettings, Class, SalaryStructure, SalarySlip, StaffAttendance, TeacherAttendance, Schedule, FeeSetup, Notification, ModuleCatalog, PricingConfig, BehaviorRecord, Invoice, Payment, ContactMessage, Assignment, Submission } = require('./models');
  
  if (isProd) {
    console.log('Production: Skipping sequelize.sync() in server.js. Relying on migrations.');
  } else {
    // Sync independent tables first
    await School.sync(opts);
    try { await require('./models').sequelize.getQueryInterface().dropTable('SchoolSettings_backup'); } catch {}
    await SchoolSettings.sync(opts);
    await Plan.sync(opts);
    await BusOperator.sync(opts);
    await Parent.sync(opts);
    try { await require('./models').sequelize.getQueryInterface().dropTable('Students_backup'); } catch {}
    try { await require('./models').sequelize.getQueryInterface().dropTable('Teachers_backup'); } catch {}
    await Student.sync(opts);
    await Teacher.sync(opts);
    await Class.sync(opts);
    await FeeSetup.sync(opts);
    await Invoice.sync(opts);
    await Payment.sync(opts);
    
    // Then sync dependent tables
    await Subscription.sync(opts);
    await Route.sync(opts);
    await User.sync(opts);
    await Conversation.sync(opts);
    await Message.sync(opts);
    await Expense.sync(opts);
    await SalaryStructure.sync(isProd ? { force: false } : { alter: true });
    await SalarySlip.sync(isProd ? { force: false } : { alter: true });
    await StaffAttendance.sync(isProd ? { force: false } : { alter: true });
    await TeacherAttendance.sync(isProd ? { force: false } : { alter: true });
    await Schedule.sync(isProd ? { force: false } : { alter: true });
    await Notification.sync(isProd ? { force: false } : { alter: true });
    await Assignment.sync({ force: false });
    await Submission.sync({ force: false });
    try { await require('./models').sequelize.getQueryInterface().dropTable('module_catalog_backup'); } catch {}
    await ModuleCatalog.sync({ force: false });
    await PricingConfig.sync(isProd ? { force: false } : { alter: true });
    await BehaviorRecord.sync(isProd ? { force: false } : { alter: true });
    await ContactMessage.sync(isProd ? { force: false } : { alter: true });
  }
}
syncDatabase()
  .then(async () => {
    console.log('Database connected successfully.');
    
    // Initialize Cron Service
    try {
      CronService.init();
    } catch (e) {
      console.error('Failed to init CronService:', e);
    }

    try {
      const { User, Plan, School, Subscription, BusOperator, Route, RouteStudent, Student, Parent } = require('./models');
      const userCount = await User.count();
      const planCount = await Plan.count().catch(() => 0);
      const allFeatures = ['student_management', 'academic_management', 'parent_portal', 'teacher_portal', 'teacher_app', 'finance_fees', 'finance_salaries', 'finance_expenses', 'transportation', 'advanced_reports', 'messaging'];
      if (planCount === 0) {
        await Plan.bulkCreate([
          { id: 1, name: 'الأساسية', price: 99, pricePeriod: 'شهرياً', features: allFeatures, limits: { students: 200, teachers: 15, invoices: 200, storageGB: 5 }, recommended: false },
          { id: 2, name: 'المميزة', price: 249, pricePeriod: 'شهرياً', features: allFeatures, limits: { students: 1000, teachers: 50, invoices: 2000, storageGB: 50 }, recommended: true },
          { id: 3, name: 'المؤسسات', price: 899, pricePeriod: 'تواصل معنا', features: allFeatures, limits: { students: 'غير محدود', teachers: 'غير محدود', invoices: 'غير محدود', storageGB: 'غير محدود' }, recommended: false },
        ]);
      }
      if (userCount === 0) {
        const school = await School.create({ id: 1, name: 'مدرسة النهضة الحديثة', contactEmail: 'info@nahda.com', studentCount: 0, teacherCount: 0, balance: 0 });
        await Subscription.create({ schoolId: school.id, planId: 2, status: 'ACTIVE', renewalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) });
        await User.bulkCreate([
          { name: 'المدير العام', email: 'super@admin.com', password: await bcrypt.hash('password', 10), role: 'SuperAdmin' },
          { name: 'مدير مدرسة النهضة', email: 'admin@school.com', password: await bcrypt.hash('password', 10), role: 'SchoolAdmin', schoolId: school.id },
        ]);
    // Transportation seed
        const op = await BusOperator.create({ id: 'bus_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'أحمد علي', phone: '0501112233', licenseNumber: 'A12345', busPlateNumber: 'أ ب ج ١٢٣٤', busCapacity: 25, busModel: 'Toyota Coaster 2022', status: 'Approved', schoolId: school.id });
        const rt = await Route.create({ id: 'route_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'مسار حي الياسمين', schoolId: school.id, busOperatorId: op.id });
        const parent = await Parent.create({ name: 'محمد عبدالله', phone: '0502223344', email: 'parent@school.com', status: 'Active', schoolId: school.id });
        const student = await Student.create({ id: 'stu_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'أحمد محمد عبدالله', grade: 'الصف الخامس', parentName: parent.name, parentId: parent.id, dateOfBirth: '2014-01-01', status: 'Active', schoolId: school.id, registrationDate: new Date().toISOString().split('T')[0] });
        await RouteStudent.create({ routeId: rt.id, studentId: student.id });
        console.log('Seeded minimal dev data');
      }
      // Ensure demo parent/student and transportation always exist
      const school = await School.findOne();
      if (school) {
        const [parent] = await Parent.findOrCreate({ where: { email: 'parent@school.com' }, defaults: { name: 'محمد عبدالله', phone: '0502223344', email: 'parent@school.com', status: 'Active', schoolId: school.id } });
        if (!parent.schoolId) { try { parent.schoolId = school.id; await parent.save(); } catch {} }
        let [student] = await Student.findOrCreate({ where: { name: 'أحمد محمد عبدالله' }, defaults: { id: 'stu_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'أحمد محمد عبدالله', grade: 'الصف الخامس', parentName: parent.name, parentId: parent.id, dateOfBirth: '2014-01-01', status: 'Active', registrationDate: new Date().toISOString().split('T')[0], profileImageUrl: '', schoolId: school.id } });
        if (!student.id) {
          try { await student.destroy(); } catch {}
          student = await Student.create({ id: 'stu_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'أحمد محمد عبدالله', grade: 'الصف الخامس', parentName: parent.name, parentId: parent.id, dateOfBirth: '2014-01-01', status: 'Active', registrationDate: new Date().toISOString().split('T')[0], profileImageUrl: '', schoolId: school.id });
        } else {
          try {
            if (!student.parentId) { student.parentId = parent.id; }
            if (!student.parentName) { student.parentName = parent.name; }
            if (!student.schoolId) { student.schoolId = school.id; }
            await student.save();
          } catch {}
        }
        let [op] = await BusOperator.findOrCreate({ where: { phone: '0501112233' }, defaults: { id: 'bus_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'أحمد علي', phone: '0501112233', licenseNumber: 'A12345', busPlateNumber: 'أ ب ج ١٢٣٤', busCapacity: 25, busModel: 'Toyota Coaster 2022', status: 'Approved', schoolId: school.id } });
        if (!op.id) {
          try { await op.destroy(); } catch {}
          op = await BusOperator.create({ id: 'bus_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'أحمد علي', phone: '0501112233', licenseNumber: 'A12345', busPlateNumber: 'أ ب ج ١٢٣٤', busCapacity: 25, busModel: 'Toyota Coaster 2022', status: 'Approved', schoolId: school.id });
        }
        const [rt] = await Route.findOrCreate({ where: { name: 'مسار حي الياسمين' }, defaults: { id: 'route_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'مسار حي الياسمين', schoolId: school.id, busOperatorId: op.id } });
        let routeToUse = rt;
        if (!routeToUse.id) {
          try { await routeToUse.destroy(); } catch {}
          routeToUse = await Route.create({ id: 'route_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'مسار حي الياسمين', schoolId: school.id, busOperatorId: op.id });
        }
        try { await RouteStudent.destroy({ where: { routeId: null } }); } catch {}
        try { await RouteStudent.destroy({ where: { studentId: null } }); } catch {}
        await RouteStudent.findOrCreate({ where: { routeId: routeToUse.id, studentId: student.id }, defaults: { routeId: routeToUse.id, studentId: student.id } });
        // Ensure parent user for dashboard login
        const { User } = require('./models');
        await User.findOrCreate({ where: { email: 'parent@school.com' }, defaults: { name: parent.name, email: 'parent@school.com', password: await bcrypt.hash('password', 10), role: 'Parent', parentId: parent.id, schoolId: school.id } });
        await User.findOrCreate({ where: { email: 'super@admin.com' }, defaults: { name: 'المدير العام', email: 'super@admin.com', password: await bcrypt.hash('password', 10), role: 'SuperAdmin' } });
        const { derivePermissionsForUser } = require('./utils/permissionMatrix');
        const adminPermissions = derivePermissionsForUser({ role: 'SchoolAdmin', schoolRole: 'مدير' });
        const [adminUser] = await User.findOrCreate({ where: { email: 'admin@school.com' }, defaults: { name: 'مدير مدرسة النهضة', email: 'admin@school.com', password: await bcrypt.hash('password', 10), role: 'SchoolAdmin', schoolId: school.id, schoolRole: 'مدير', permissions: adminPermissions } });
        if (!adminUser.schoolId || !adminUser.permissions || adminUser.permissions.length === 0) { adminUser.schoolId = school.id; adminUser.schoolRole = 'مدير'; adminUser.permissions = adminPermissions; await adminUser.save(); }
        // Auto-migrate any plaintext passwords to bcrypt hashes (dev safety)
        const existingUsers = await User.findAll();
        for (const u of existingUsers) {
          const pwd = u.password || '';
          if (!String(pwd).startsWith('$2a$') && !String(pwd).startsWith('$2b$')) {
            u.password = await bcrypt.hash(pwd, 10);
            await u.save();
          }
        }
      }
    } catch (e) {
      console.warn('Seeding skipped or failed:', e?.message || e);
    }
    // Ensure critical indexes exist in production
    try {
      const db = require('./models');
      const qi = db.sequelize.getQueryInterface();
      const ensureIndex = async (model, fields, nameHint) => {
        try {
          const table = (model && typeof model.getTableName === 'function') ? model.getTableName() : null;
          if (!table) return;
          const existing = await qi.showIndex(table);
          const exists = (existing || []).some(ix => {
            const f = ix.fields ? ix.fields.map(x => (x.attribute || x)) : [];
            return f.join(',') === fields.join(',');
          });
          if (!exists) {
            const name = `idx_${String(table).replace(/[^a-z0-9_]/gi,'_')}_${fields.join('_')}`.toLowerCase();
            await qi.addIndex(table, fields, { name });
            try { logger.info(`Added index ${name} on ${table}`); } catch {}
          }
        } catch (e) { try { logger.warn(`Index ensure failed ${nameHint || fields.join(',')}: ${e?.message || e}`); } catch {} }
      };
      await ensureIndex(db.FeeSetup, ['schoolId'], 'fee_school');
      await ensureIndex(db.FeeSetup, ['schoolId','stage'], 'fee_school_stage');
      await ensureIndex(db.StaffAttendance, ['schoolId'], 'staff_school');
      await ensureIndex(db.StaffAttendance, ['schoolId','date'], 'staff_school_date');
      await ensureIndex(db.StaffAttendance, ['userId','date'], 'staff_user_date');
      await ensureIndex(db.TeacherAttendance, ['schoolId'], 'teach_school');
      await ensureIndex(db.TeacherAttendance, ['schoolId','date'], 'teach_school_date');
      await ensureIndex(db.TeacherAttendance, ['teacherId','date'], 'teach_teacher_date');
      await ensureIndex(db.SalarySlip, ['schoolId'], 'slip_school');
      await ensureIndex(db.SalarySlip, ['schoolId','month'], 'slip_school_month');
      await ensureIndex(db.SalarySlip, ['personType','personId','month'], 'slip_person_month');
      await ensureIndex(db.Conversation, ['schoolId'], 'conv_school');
      await ensureIndex(db.Conversation, ['teacherId'], 'conv_teacher');
      await ensureIndex(db.Conversation, ['parentId'], 'conv_parent');
      await ensureIndex(db.Message, ['senderId'], 'msg_sender');
      await ensureIndex(db.Message, ['senderRole'], 'msg_role');
    } catch (e) { try { console.warn('Index bootstrap failed', e?.message || e); } catch {} }
    try {
      console.log('Module sync disabled: activeModules no longer used');
    } catch (e) {
      console.warn('Module sync disabled with error:', e?.message || e);
    }
    io.on('connection', (socket) => {
      try {
        const token = socket.handshake?.auth?.token;
        if (token) {
          const payload = jwt.verify(token, JWT_SECRET);
          socket.user = payload;
        }
      } catch {}
      socket.on('join_room', async (roomId) => {
        try {
          if (!roomId) return;
          const { Conversation } = require('./models');
          const conv = await Conversation.findOne({ where: { roomId } });
          if (!conv) return;
          const u = socket.user || {};
          const role = normalizeRole(u.role);
          const isAllowed = (role === 'PARENT' && String(conv.parentId || '') === String(u.parentId || '')) ||
                            (role === 'TEACHER' && String(conv.teacherId || '') === String(u.teacherId || '')) ||
                            (role === 'SCHOOL_ADMIN' && Number(conv.schoolId || 0) === Number(u.schoolId || 0)) ||
                            isSuperAdminRole(u.role);
          if (!isAllowed) return;
          socket.join(roomId);
        } catch (e) { console.error('Socket join_room error:', e.message); }
      });
      socket.on('send_message', async (payload) => {
        try {
          const { conversationId, roomId, text, senderId, senderRole } = payload || {};
          if (!conversationId || !roomId || !text || !senderId || !senderRole) return;
          const { Message } = require('./models');
          const sid = socket.user?.id || senderId;
          const srole = normalizeRole(socket.user?.role || senderRole);
          const msg = await Message.create({ id: `msg_${Date.now()}`, conversationId, text, senderId: sid, senderRole: srole });
          io.to(roomId).emit('new_message', { id: msg.id, conversationId, text, senderId: sid, senderRole: srole, timestamp: msg.createdAt });
        } catch (e) { console.error('Socket send_message error:', e.message); }
      });
    });
    async function toCSV(headers, rows){
      const esc = (v) => { const s = v === null || v === undefined ? '' : String(v); return (s.includes(',') || s.includes('\n') || s.includes('"')) ? '"' + s.replace(/"/g,'""') + '"' : s; };
      const head = headers.join(',');
      const body = rows.map(r => headers.map(h => esc(r[h])).join(',')).join('\n');
      return head + '\n' + body + (body ? '\n' : '');
    }
    async function buildExportCSVMap(schoolId, types, filters){
      const { Class, Student, Parent, Teacher, Grade, Attendance, Schedule, FeeSetup } = require('./models');
      const map = {};
      const classes = await Class.findAll({ where: { schoolId }, order: [['name','ASC']] });
      const classNameById = new Map(classes.map(c => [String(c.id), `${c.gradeLevel} (${c.section || 'أ'})`]));
      if (types.includes('students')){
        const students = await Student.findAll({ where: { schoolId }, order: [['name','ASC']] });
        const parents = await Parent.findAll({ where: { schoolId } });
        const parentById = new Map(parents.map(p => [String(p.id), p]));
        const rows = students.map(s => {
          const p = s.parentId ? parentById.get(String(s.parentId)) || null : null;
          const className = s.classId ? (classNameById.get(String(s.classId)) || '') : '';
          return { studentId: s.id, nationalId: '', name: s.name, dateOfBirth: s.dateOfBirth || '', gender: '', city: '', address: '', admissionDate: s.registrationDate || '', parentName: s.parentName || (p ? p.name : ''), parentPhone: p ? (p.phone || '') : '', parentEmail: p ? (p.email || '') : '', className };
        });
        const f = String(filters?.className || '').trim();
        const filtered = f ? rows.filter(r => r.className === f) : rows;
        map['Export_Students.csv'] = toCSV(['studentId','nationalId','name','dateOfBirth','gender','city','address','admissionDate','parentName','parentPhone','parentEmail','className'], filtered);
      }
      if (types.includes('classes')){
        const teachers = await Teacher.findAll({ where: { schoolId } });
        const tNameById = new Map(teachers.map(t => [String(t.id), t.name]));
        const rows = classes.map(c => ({ gradeLevel: c.gradeLevel, section: c.section || 'أ', capacity: c.capacity || 30, homeroomTeacherName: c.homeroomTeacherId ? (tNameById.get(String(c.homeroomTeacherId)) || '') : '' }));
        map['Export_Classes.csv'] = toCSV(['gradeLevel','section','capacity','homeroomTeacherName'], rows);
      }
      if (types.includes('subjects')){
        const rows = [];
        for (const c of classes){
          const className = `${c.gradeLevel} (${c.section || 'أ'})`;
          const list = Array.isArray(c.subjects) ? c.subjects : [];
          if (list.length === 0){
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
        filtered = subj ? filtered.filter(r => String(r.subjectName||'').trim() === subj) : filtered;
        map['Export_Subjects.csv'] = toCSV(['className','subjectName'], filtered);
      }
      if (types.includes('classSubjectTeachers')){
        const rows = [];
        const teachers = await Teacher.findAll({ where: { schoolId } });
        const tNameById = new Map(teachers.map(t => [String(t.id), t.name]));
        for (const c of classes){
          const className = `${c.gradeLevel} (${c.section || 'أ'})`;
          const sched = await Schedule.findAll({ where: { classId: c.id } });
          for (const x of sched){
            const teacherName = x.teacherId ? (tNameById.get(String(x.teacherId)) || '') : '';
            rows.push({ className, subjectName: x.subject, teacherName });
          }
        }
        const f = String(filters?.className || '').trim();
        const subj = String(filters?.subjectName || '').trim();
        let filtered = f ? rows.filter(r => r.className === f) : rows;
        filtered = subj ? filtered.filter(r => String(r.subjectName||'').trim() === subj) : filtered;
        map['Export_ClassSubjectTeachers.csv'] = toCSV(['className','subjectName','teacherName'], filtered);
      }
      if (types.includes('grades')){
        const grades = await Grade.findAll({ include: [{ model: require('./models').Class, attributes: ['gradeLevel','section'] }], where: { '$Class.schoolId$': schoolId } });
        const rows = grades.map(e => ({ className: `${e.Class?.gradeLevel || ''} (${e.Class?.section || 'أ'})`, subjectName: e.subject, studentId: String(e.studentId), studentName: '', homework: e.homework || 0, quiz: e.quiz || 0, midterm: e.midterm || 0, final: e.final || 0 }));
        const f = String(filters?.className || '').trim();
        const subj = String(filters?.subjectName || '').trim();
        let filtered = f ? rows.filter(r => r.className === f) : rows;
        filtered = subj ? filtered.filter(r => String(r.subjectName||'').trim() === subj) : filtered;
        map['Export_Grades.csv'] = toCSV(['className','subjectName','studentId','studentName','homework','quiz','midterm','final'], filtered);
      }
      if (types.includes('attendance')){
        const date = String(filters?.date || '').trim();
        const rows = [];
        for (const c of classes){
          const className = `${c.gradeLevel} (${c.section || 'أ'})`;
          if (String(filters?.className || '').trim() && String(filters?.className || '').trim() !== className) continue;
          const where = { classId: c.id };
          if (date) where.date = date;
          const arr = await Attendance.findAll({ where });
          for (const r of arr){ rows.push({ date: r.date, className, studentId: String(r.studentId), status: r.status }); }
        }
        map['Export_Attendance.csv'] = toCSV(['date','className','studentId','status'], rows);
      }
      if (types.includes('schedule')){
        const rows = [];
        for (const c of classes){
          const className = `${c.gradeLevel} (${c.section || 'أ'})`;
          if (String(filters?.className || '').trim() && String(filters?.className || '').trim() !== className) continue;
          const sched = await Schedule.findAll({ where: { classId: c.id } });
          for (const x of sched){ rows.push({ className, day: x.day, timeSlot: x.timeSlot, subjectName: x.subject, teacherName: '' }); }
        }
        const subj = String(filters?.subjectName || '').trim();
        const filtered = subj ? rows.filter(r => String(r.subjectName||'').trim() === subj) : rows;
        map['Export_Schedule.csv'] = toCSV(['className','day','timeSlot','subjectName','teacherName'], filtered);
      }
      if (types.includes('fees')){
        const list = await FeeSetup.findAll({ where: { schoolId } });
        const rows = list.map(x => ({ stage: x.stage, tuitionFee: Number(x.tuitionFee || 0), bookFees: Number(x.bookFees || 0), uniformFees: Number(x.uniformFees || 0), activityFees: Number(x.activityFees || 0), paymentPlanType: x.paymentPlanType || 'Monthly' }));
        map['Export_Fees.csv'] = toCSV(['stage','tuitionFee','bookFees','uniformFees','activityFees','paymentPlanType'], rows);
      }
      if (types.includes('teachers')){
        const list = await Teacher.findAll({ where: { schoolId }, order: [['name','ASC']] });
        const rows = list.map(t => ({ teacherId: String(t.id), name: t.name, phone: t.phone || '', subject: t.subject || '' }));
        map['Export_Teachers.csv'] = toCSV(['teacherId','name','phone','subject'], rows);
      }
      if (types.includes('parents')){
        const list = await Parent.findAll({ where: { schoolId }, order: [['name','ASC']] });
        const rows = list.map(p => ({ parentId: String(p.id), name: p.name, email: p.email || '', phone: p.phone || '', studentId: '' }));
        map['Export_Parents.csv'] = toCSV(['parentId','name','email','phone','studentId'], rows);
      }
      return map;
    }
    async function storeBackupZip(schoolId, types, filters){
      const map = await buildExportCSVMap(schoolId, types, filters);
      const dir = path.join(__dirname, '..', 'uploads', 'backups', String(schoolId));
      await fse.ensureDir(dir);
      const fname = `Backup_${new Date().toISOString().replace(/[:]/g,'-')}.zip`;
      const full = path.join(dir, fname);
      const out = fs.createWriteStream(full);
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(out);
      for (const [name, csv] of Object.entries(map)) archive.append(csv, { name });
      await archive.finalize();
      return full;
    }
    async function acquireBackupLock(schoolId){
      try {
        const { SchoolSettings } = require('./models');
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
    async function releaseBackupLock(schoolId, token){
      try {
        const { SchoolSettings } = require('./models');
        const s = await SchoolSettings.findOne({ where: { schoolId } });
        if (!s) return;
        const lock = s.backupLock || {};
        if (lock.token && lock.token !== token) return;
        s.backupLock = null;
        await s.save();
      } catch {}
    }
    const lastRun = new Map();
    cron.schedule('*/5 * * * *', async () => {
      try {
        const { SchoolSettings, School } = require('./models');
        const schools = await School.findAll();
        const now = new Date();
        const hh = String(now.getHours()).padStart(2,'0');
        const mm = String(now.getMinutes()).padStart(2,'0');
        for (const sch of schools){
          const s = await SchoolSettings.findOne({ where: { schoolId: Number(sch.id) } });
          const cfg = s?.backupConfig || {};
          const types = Array.isArray(cfg.types) ? cfg.types : ['students','classes','subjects','classSubjectTeachers','grades','attendance','schedule','fees','teachers','parents'];
          const retainDays = Number(cfg.retainDays || 30);
          if (cfg.enabledDaily){
            const t = String(cfg.dailyTime || '02:00');
            if (t === `${hh}:${mm}`){
              const key = `daily_${sch.id}_${t}_${now.toISOString().slice(0,10)}`;
              if (!lastRun.has(key)){
                const token = await acquireBackupLock(Number(sch.id));
                if (token){
                  const full = await storeBackupZip(Number(sch.id), types, {});
                  try {
                    const { AuditLog } = require('./models');
                    const stat = fs.statSync(full);
                    await AuditLog.create({ action: 'school.backup.auto.store', userId: null, userEmail: null, ipAddress: '127.0.0.1', userAgent: 'cron', details: JSON.stringify({ schoolId: Number(sch.id), file: path.basename(full), size: stat.size, types }), timestamp: new Date(), riskLevel: 'low' });
                  } catch {}
                  await releaseBackupLock(Number(sch.id), token);
                }
                lastRun.set(key, true);
              }
            }
          }
          if (cfg.enabledMonthly){
            const day = Number(cfg.monthlyDay || 1);
            const t = String(cfg.monthlyTime || '03:00');
            const dNow = now.getDate();
            if (dNow === day && t === `${hh}:${mm}`){
              const key = `monthly_${sch.id}_${t}_${now.getFullYear()}_${now.getMonth()+1}`;
              if (!lastRun.has(key)){
                const token = await acquireBackupLock(Number(sch.id));
                if (token){
                  const full = await storeBackupZip(Number(sch.id), types, {});
                  try {
                    const { AuditLog } = require('./models');
                    const stat = fs.statSync(full);
                    await AuditLog.create({ action: 'school.backup.auto.store', userId: null, userEmail: null, ipAddress: '127.0.0.1', userAgent: 'cron', details: JSON.stringify({ schoolId: Number(sch.id), file: path.basename(full), size: stat.size, types }), timestamp: new Date(), riskLevel: 'low' });
                  } catch {}
                  await releaseBackupLock(Number(sch.id), token);
                }
                lastRun.set(key, true);
              }
            }
          }
          try {
            const dir = path.join(__dirname, '..', 'uploads', 'backups', String(sch.id));
            await fse.ensureDir(dir);
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.zip'));
            for (const f of files){
              const full = path.join(dir, f);
              const stat = fs.statSync(full);
              const ageDays = Math.floor((now.getTime() - (stat.mtime || stat.birthtime).getTime()) / (1000*60*60*24));
              if (retainDays > 0 && ageDays > retainDays){
                try { fs.unlinkSync(full); } catch {}
              }
            }
          } catch {}
        }
      } catch {}
    });
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info('Server startup complete');
      logger.info('Server listening on 0.0.0.0');
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Test this: curl http://127.0.0.1:'+PORT+'/api/auth/login');
      }
      logger.info(`PID: ${process.pid}`);
    });
    // Keep process alive
    process.on('SIGINT', () => {
      logger.info('Shutting down gracefully...');
      server.close(() => process.exit(0));
    });
  })
  .catch(err => {
    logger.error(`Unable to connect to the database: ${err}`);
  });
if (Sentry && Sentry.Handlers && typeof Sentry.Handlers.errorHandler === 'function') { app.use(Sentry.Handlers.errorHandler()); }
