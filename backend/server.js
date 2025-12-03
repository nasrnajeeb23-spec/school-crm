require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
const { verifyToken, requireRole } = require('./middleware/auth');
const { createLogger, format, transports } = require('winston');
const DailyRotate = require('winston-daily-rotate-file');

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
const cron = require('node-cron');
const archiver = require('archiver');
const fse = require('fs-extra');
const path = require('path');
const fs = require('fs');


const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
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
console.log('Server file path:', __filename);

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
app.locals.logger = logger;

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn(`CORS blocked request from: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
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
const coreModules = ['student_management', 'academic_management', 'parent_portal', 'teacher_portal', 'teacher_app'];
const licenseKey = process.env.LICENSE_KEY || null;
let allowedModules = [...coreModules];
if (licenseKey) {
  const result = verifyLicenseKey(licenseKey);
  if (result.valid && Array.isArray(result.payload.modules)) {
    allowedModules = [...coreModules, ...result.payload.modules];
    logger.info('License valid. Enabled modules: ' + allowedModules.join(', '));
  } else {
    logger.warn('Invalid license. Only core modules enabled. Reason: ' + result.reason);
  }
} else {
  logger.warn('No LICENSE_KEY provided. Only core modules enabled.');
  if (process.env.NODE_ENV !== 'production') {
    allowedModules = [...allowedModules, 'finance', 'transportation'];
    logger.warn('Dev mode: enabling finance & transportation modules for testing');
  }
}
app.locals.allowedModules = allowedModules;

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
  const task = cron.schedule(cronExpr, () => {
    try {
      app.locals.enqueueJob('backup_store', { schoolId }, async (payload) => {
        const archiver = require('archiver');
        const { PassThrough } = require('stream');
        const out = new PassThrough();
        const chunks = [];
        out.on('data', (d) => chunks.push(d));
        const zipDone = new Promise((resolve, reject) => {
          out.on('end', () => resolve(Buffer.concat(chunks)));
          out.on('error', reject);
        });
        const zip = archiver('zip', { zlib: { level: 9 } });
        zip.pipe(out);
        const { School, Subscription, Plan } = require('./models');
        const school = await School.findByPk(schoolId, { attributes: ['id','name'], raw: true }).catch(() => null);
        const subs = await Subscription.findAll({ include: [{ model: Plan, attributes: ['name','price'] }], where: { schoolId }, raw: true }).catch(() => []);
        zip.append(JSON.stringify({ school, subscriptions: subs }, null, 2), { name: 'data.json' });
        const header = ['SubscriptionId','Plan','Status','Price'].join(',');
        const body = (subs || []).map(r => [r.id, r['Plan.name'], r.status, r['Plan.price'] || 0].join(',')).join('\n');
        zip.append(header + '\n' + body, { name: 'subscriptions.csv' });
        await zip.finalize();
        const buffer = await zipDone;
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

cron.schedule('0 3 * * *', async () => { try { await app.locals.cleanupOldBackups(); } catch {} }, { scheduled: true });

// API Routes
const authLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 50 });
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth/superadmin', authLimiter, authSuperAdminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/schools', schoolsRoutes);
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
app.use('/api/superadmin', packageRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/auth/enterprise', authEnterpriseRoutes);
app.use('/api/analytics', analyticsRoutes);
// Additional route mounts for compatibility with frontend endpoints
app.use('/api/dashboard', analyticsRoutes);
app.use('/api/superadmin/subscriptions', subscriptionsRoutes);
تقرير// Aliases without "/api" to support frontend fallback requests
app.use('/superadmin', superadminRoutes);
app.use('/dashboard', analyticsRoutes);
app.use('/public', schoolsRoutes);

// Public content endpoints for landing page
app.get('/api/content/landing', (req, res) => {
  res.json({
    hero: {
      title: 'منصة SchoolSaaS لإدارة المدارس باحترافية',
      subtitle: 'حل شامل لتبسيط إدارة الطلاب والمعلمين والمالية والتواصل في مدرسة واحدة'
    },
    features: {
      title: 'أهم الميزات',
      subtitle: 'ميزات عملية تُسهّل عمل الإدارة والمعلمين وأولياء الأمور',
      items: [
        { id: 'f1', title: 'إدارة الطلاب', description: 'ملفات الطلاب، الحضور، الدرجات، والأنشطة في مكان واحد' },
        { id: 'f2', title: 'إدارة مالية', description: 'فواتير، مدفوعات، وإيرادات مع تقارير مفصلة' },
        { id: 'f3', title: 'نظام الدرجات', description: 'إدخال الدرجات، استخراج التقارير، ومتابعة الأداء' },
        { id: 'f4', title: 'الرسائل والتواصل', description: 'تواصل داخلي بين الإدارة والمعلمين وأولياء الأمور' },
        { id: 'f5', title: 'التقارير المتقدمة', description: 'لوحات معلومات وتحليلات لاتخاذ قرارات أفضل' },
        { id: 'f6', title: 'الصلاحيات والأذونات', description: 'صلاحيات دقيقة لكل دور داخل المدرسة' }
      ]
    },
    ads: {
      title: 'عروض وخدمات إضافية',
      slides: [
        { id: 'ad1', title: 'باقات مرنة للمدارس', description: 'اختر الخطة التي تناسب حجم مدرستك واحتياجاتك', ctaText: 'شاهد الباقات', link: '/#pricing', imageUrl: 'https://images.unsplash.com/photo-1554931545-5b453faafe36?w=1200&q=80&auto=format&fit=crop' },
        { id: 'ad2', title: 'تجربة مجانية', description: 'جرّب المنصة مجاناً وابدأ إدارة مدرستك اليوم', ctaText: 'ابدأ الآن', link: '/#contact', imageUrl: 'https://images.unsplash.com/photo-1523580846011-df4f04b29464?w=1200&q=80&auto=format&fit=crop' },
        { id: 'ad3', title: 'حل مستضاف ذاتياً', description: 'امتلك نسخة خاصة من النظام داخل مؤسستك', ctaText: 'اطلب عرض سعر', link: '/#contact', imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80&auto=format&fit=crop' }
      ]
    }
  });
});

// Modules catalog and pricing config (in-memory)
const modulesCatalog = [
  { id: 'student_management', name: 'إدارة الطلاب', description: 'ملفات الطلاب والحضور والدرجات.', monthlyPrice: 0, isEnabled: true, isCore: true },
  { id: 'academic_management', name: 'الإدارة الأكاديمية', description: 'الجدول والمواد الدراسية وتنظيم الفصول.', monthlyPrice: 0, isEnabled: true, isCore: true },
  { id: 'parent_portal', name: 'بوابة ولي الأمر', description: 'وصول أولياء الأمور لمتابعة الحضور والدرجات والرسائل.', monthlyPrice: 0, isEnabled: true, isCore: true },
  { id: 'teacher_portal', name: 'بوابة المعلم', description: 'واجهة ويب للمعلم لإدارة الجدول والحضور والدرجات.', monthlyPrice: 0, isEnabled: true, isCore: true },
  { id: 'teacher_app', name: 'تطبيق المعلم', description: 'تطبيق الجوال للمعلم مع إشعارات فورية.', monthlyPrice: 0, isEnabled: true, isCore: true },
  { id: 'finance', name: 'المالية', description: 'فواتير ورسوم وتقارير مالية متقدمة.', monthlyPrice: 49, oneTimePrice: 0, isEnabled: true, isCore: false },
  { id: 'transportation', name: 'النقل المدرسي', description: 'إدارة الحافلات والمسارات والطلاب المنقولين.', monthlyPrice: 29, oneTimePrice: 0, isEnabled: true, isCore: false },
  { id: 'advanced_reports', name: 'التقارير المتقدمة', description: 'لوحات معلومات وتحليلات مخصصة.', monthlyPrice: 39, oneTimePrice: 0, isEnabled: true, isCore: false },
];
app.locals.modulesCatalog = modulesCatalog;
app.locals.pricingConfig = { pricePerStudent: 1.5 };

// List available modules
app.get('/api/modules', (req, res) => {
  try {
    const list = (req.app?.locals?.modulesCatalog || modulesCatalog).map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      monthlyPrice: m.monthlyPrice,
      oneTimePrice: m.oneTimePrice || 0,
      isEnabled: m.isEnabled !== false,
      isCore: !!m.isCore,
    }));
    res.json(list);
  } catch (e) { res.status(500).json({ msg: 'Server Error' }); }
});

// Update a module (SuperAdmin only)
app.put('/api/modules/:id', verifyToken, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const id = String(req.params.id || '');
    const catalog = req.app?.locals?.modulesCatalog || modulesCatalog;
    const idx = catalog.findIndex(m => String(m.id) === id);
    if (idx === -1) return res.status(404).json({ msg: 'Module not found' });
    const m = catalog[idx];
    const { name, description, monthlyPrice, oneTimePrice, isEnabled } = req.body || {};
    if (name !== undefined) m.name = name;
    if (description !== undefined) m.description = description;
    if (monthlyPrice !== undefined) m.monthlyPrice = Number(monthlyPrice) || 0;
    if (oneTimePrice !== undefined) m.oneTimePrice = Number(oneTimePrice) || 0;
    if (isEnabled !== undefined) m.isEnabled = !!isEnabled;
    catalog[idx] = m;
    req.app.locals.modulesCatalog = catalog;
    res.json(m);
  } catch (e) { res.status(500).json({ msg: 'Server Error' }); }
});

// Pricing config endpoints (SuperAdmin manages, public read)
app.get('/api/pricing/config', (req, res) => {
  try {
    const cfg = req.app?.locals?.pricingConfig || { pricePerStudent: 1.5 };
    res.json(cfg);
  } catch (e) { res.status(500).json({ msg: 'Server Error' }); }
});
app.put('/api/pricing/config', verifyToken, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const cfg = req.app?.locals?.pricingConfig || { pricePerStudent: 1.5 };
    const next = { ...cfg, pricePerStudent: Number(req.body?.pricePerStudent) || cfg.pricePerStudent };
    req.app.locals.pricingConfig = next;
    res.json(next);
  } catch (e) { res.status(500).json({ msg: 'Server Error' }); }
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

app.get('/api/messaging', (req, res) => res.json({ ok: true }));
app.get('/api/messaging/conversations', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'), async (req, res) => {
  try {
    const { Conversation } = require('./models');
    const { schoolId } = req.query;
    const where = {};
    if (schoolId) where.schoolId = Number(schoolId);
    if (req.user.role === 'TEACHER') where.teacherId = req.user.teacherId;
    if (req.user.role === 'PARENT') where.parentId = req.user.parentId;
    const convs = await Conversation.findAll({ where, order: [['updatedAt','DESC']] });
    res.json(convs.map(c => ({ id: c.id, roomId: c.roomId, title: c.title })));
  } catch (e) { res.status(500).send('Server Error'); }
});
app.get('/api/messaging/conversations/:conversationId/messages', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'), async (req, res) => {
  try {
    const { Message } = require('./models');
    const msgs = await Message.findAll({ where: { conversationId: req.params.conversationId }, order: [['createdAt','ASC']] });
    res.json(msgs.map(m => ({ id: m.id, text: m.text, senderId: m.senderId, senderRole: m.senderRole, timestamp: m.createdAt, attachmentUrl: m.attachmentUrl, attachmentType: m.attachmentType, attachmentName: m.attachmentName })));
  } catch (e) { res.status(500).send('Server Error'); }
});
app.post('/api/messaging/conversations', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { Conversation } = require('./models');
    const { title, schoolId, teacherId, parentId } = req.body || {};
    if (!title || !schoolId || (!teacherId && !parentId)) return res.status(400).json({ msg: 'Invalid payload' });
    const conv = await Conversation.create({ id: `conv_${Date.now()}`, roomId: `room_${Date.now()}`, title, schoolId, teacherId: teacherId || null, parentId: parentId || null });
    res.status(201).json({ id: conv.id, roomId: conv.roomId, title: conv.title });
  } catch (e) { res.status(500).send('Server Error'); }
});
const uploadLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 100 });
app.post('/api/messaging/upload', uploadLimiter, verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'), async (req, res) => {
  try {
    const path = require('path');
    const fse = require('fs-extra');
    const multer = require('multer');
    
    // File upload configuration with security measures
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB default
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.mp4', '.mp3'];
    
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        const targetDir = path.join(__dirname, '..', 'uploads', 'chat');
        fse.ensureDirSync(targetDir);
        cb(null, targetDir);
      },
      filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
        cb(null, safeName);
      }
    });
    
    const upload = multer({ 
      storage: storage,
      limits: { 
        fileSize: maxFileSize,
        files: parseInt(process.env.MAX_FILES) || 5
      },
      fileFilter: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          return cb(new Error('File type not allowed'), false);
        }
        cb(null, true);
      }
    }).single('file');
    
    upload(req, res, async function(err){
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ msg: 'File too large' });
        }
        return res.status(400).json({ msg: 'Upload error' });
      } else if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({ msg: err.message });
      }
      
      if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });
      
      const ext = path.extname(req.file.originalname).toLowerCase();
      const url = `/uploads/chat/${req.file.filename}`;
      return res.json({ 
        url, 
        name: req.file.originalname, 
        type: ext,
        size: req.file.size
      });
    });
  } catch (e) { 
    console.error('Upload exception:', e);
    res.status(500).json({ msg: 'Server error during upload' }); 
  }
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
console.log('Starting server on port', PORT);

// Connect to database and start server
async function syncDatabase(){
  const isProd = process.env.NODE_ENV === 'production';
  // Sync database without force to preserve data
  const opts = { force: false };
  
  // Sync models in correct order to avoid foreign key constraint issues
  const { School, Plan, Subscription, BusOperator, Route, Parent, Student, Teacher, User, Conversation, Message, Expense, SchoolSettings, Class, SalaryStructure, SalarySlip, StaffAttendance, TeacherAttendance, Schedule, FeeSetup } = require('./models');
  
  // Sync independent tables first
  await School.sync(opts);
  try { await require('./models').sequelize.getQueryInterface().dropTable('SchoolSettings_backup'); } catch {}
  await SchoolSettings.sync(isProd ? { force: false } : { alter: true });
  await Plan.sync(opts);
  await BusOperator.sync(isProd ? { force: false } : { alter: true });
  await Parent.sync(opts);
  await Student.sync(isProd ? { force: false } : { alter: true });
  await Teacher.sync(isProd ? { force: false } : { alter: true });
  await Class.sync(isProd ? { force: false } : { alter: true });
  await FeeSetup.sync(isProd ? { force: false } : { alter: true });
  
  // Then sync dependent tables
  await Subscription.sync(opts);
  await Route.sync(isProd ? { force: false } : { alter: true });
  await User.sync(isProd ? { force: false } : { alter: true });
  await Conversation.sync(opts);
  await Message.sync(opts);
  await Expense.sync(opts);
  await SalaryStructure.sync(isProd ? { force: false } : { alter: true });
  await SalarySlip.sync(isProd ? { force: false } : { alter: true });
  await StaffAttendance.sync(isProd ? { force: false } : { alter: true });
  await TeacherAttendance.sync(isProd ? { force: false } : { alter: true });
  await Schedule.sync(isProd ? { force: false } : { alter: true });
}
syncDatabase()
  .then(async () => {
    console.log('Database connected successfully.');
    try {
      const { User, Plan, School, Subscription, BusOperator, Route, RouteStudent, Student, Parent } = require('./models');
      const userCount = await User.count();
      if (userCount === 0) {
        await Plan.bulkCreate([
          { id: 1, name: 'الأساسية', price: 99, pricePeriod: 'شهرياً', features: JSON.stringify(['الوظائف الأساسية']), limits: JSON.stringify({ students: 200, teachers: 15 }), recommended: false },
          { id: 2, name: 'المميزة', price: 249, pricePeriod: 'شهرياً', features: JSON.stringify(['كل ميزات الأساسية', 'إدارة مالية متقدمة']), limits: JSON.stringify({ students: 1000, teachers: 50 }), recommended: true },
          { id: 3, name: 'المؤسسات', price: 899, pricePeriod: 'تواصل معنا', features: JSON.stringify(['كل ميزات المميزة', 'تقارير مخصصة']), limits: JSON.stringify({ students: 'غير محدود', teachers: 'غير محدود' }), recommended: false },
        ]);
        const school = await School.create({ id: 1, name: 'مدرسة النهضة الحديثة', contactEmail: 'info@nahda.com', studentCount: 0, teacherCount: 0, balance: 0 });
        await Subscription.create({ schoolId: school.id, planId: 2, status: 'ACTIVE', renewalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) });
        await User.bulkCreate([
          { name: 'المدير العام', email: 'super@admin.com', password: await bcrypt.hash('password', 10), role: 'SuperAdmin' },
          { name: 'مدير مدرسة النهضة', email: 'admin@school.com', password: await bcrypt.hash('password', 10), role: 'SchoolAdmin', schoolId: school.id },
        ]);
    // Transportation seed
        const op = await BusOperator.create({ id: 'bus_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'أحمد علي', phone: '0501112233', licenseNumber: 'A12345', busPlateNumber: 'أ ب ج ١٢٣٤', busCapacity: 25, busModel: 'Toyota Coaster 2022', status: 'Approved', schoolId: school.id });
        const rt = await Route.create({ id: 'route_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'مسار حي الياسمين', schoolId: school.id, busOperatorId: op.id });
        const parent = await Parent.create({ name: 'محمد عبدالله', phone: '0502223344', email: 'parent@school.com', status: 'Active' });
        const student = await Student.create({ id: 'stu_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'أحمد محمد عبدالله', grade: 'الصف الخامس', parentName: parent.name, parentId: parent.id, dateOfBirth: '2014-01-01', status: 'Active', schoolId: school.id, registrationDate: new Date().toISOString().split('T')[0] });
        await RouteStudent.create({ routeId: rt.id, studentId: student.id });
        console.log('Seeded minimal dev data');
      }
      // Ensure demo parent/student and transportation always exist
      const school = await School.findOne();
      if (school) {
        const [parent] = await Parent.findOrCreate({ where: { email: 'parent@school.com' }, defaults: { name: 'محمد عبدالله', phone: '0502223344', email: 'parent@school.com', status: 'Active' } });
        const [student] = await Student.findOrCreate({ where: { name: 'أحمد محمد عبدالله' }, defaults: { id: 'stu_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'أحمد محمد عبدالله', grade: 'الصف الخامس', parentName: parent.name, parentId: parent.id, dateOfBirth: '2014-01-01', status: 'Active', registrationDate: new Date().toISOString().split('T')[0], profileImageUrl: '', schoolId: school.id } });
        const [op] = await BusOperator.findOrCreate({ where: { phone: '0501112233' }, defaults: { id: 'bus_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'أحمد علي', phone: '0501112233', licenseNumber: 'A12345', busPlateNumber: 'أ ب ج ١٢٣٤', busCapacity: 25, busModel: 'Toyota Coaster 2022', status: 'Approved', schoolId: school.id } });
        const [rt] = await Route.findOrCreate({ where: { name: 'مسار حي الياسمين' }, defaults: { id: 'route_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: 'مسار حي الياسمين', schoolId: school.id, busOperatorId: op.id } });
        await RouteStudent.findOrCreate({ where: { routeId: rt.id, studentId: student.id }, defaults: { routeId: rt.id, studentId: student.id } });
        // Ensure parent user for dashboard login
        const { User } = require('./models');
        await User.findOrCreate({ where: { email: 'parent@school.com' }, defaults: { name: parent.name, email: 'parent@school.com', password: await bcrypt.hash('password', 10), role: 'Parent', parentId: parent.id } });
        await User.findOrCreate({ where: { email: 'super@admin.com' }, defaults: { name: 'المدير العام', email: 'super@admin.com', password: await bcrypt.hash('password', 10), role: 'SuperAdmin' } });
        const [adminUser] = await User.findOrCreate({ where: { email: 'admin@school.com' }, defaults: { name: 'مدير مدرسة النهضة', email: 'admin@school.com', password: await bcrypt.hash('password', 10), role: 'SchoolAdmin', schoolId: school.id, schoolRole: 'مدير', permissions: ['VIEW_DASHBOARD','MANAGE_STUDENTS','MANAGE_TEACHERS','MANAGE_PARENTS','MANAGE_CLASSES','MANAGE_FINANCE','MANAGE_TRANSPORTATION','MANAGE_REPORTS','MANAGE_SETTINGS','MANAGE_MODULES'] } });
        if (!adminUser.schoolId || !adminUser.permissions || adminUser.permissions.length === 0) { adminUser.schoolId = school.id; adminUser.schoolRole = 'مدير'; adminUser.permissions = ['VIEW_DASHBOARD','MANAGE_STUDENTS','MANAGE_TEACHERS','MANAGE_PARENTS','MANAGE_CLASSES','MANAGE_FINANCE','MANAGE_TRANSPORTATION','MANAGE_REPORTS','MANAGE_SETTINGS','MANAGE_MODULES']; await adminUser.save(); }
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
    try {
      const { SchoolSettings, Subscription } = require('./models');
      const settingsRows = await SchoolSettings.findAll();
      let updatedCount = 0;
      const catalog = Array.isArray(app.locals.modulesCatalog) ? app.locals.modulesCatalog : [];
      const allIds = catalog.map(m => m.id);
      for (const s of settingsRows) {
        const sub = await Subscription.findOne({ where: { schoolId: s.schoolId } });
        if (!sub || String(sub.status).toUpperCase() !== 'TRIAL') continue;
        const now = new Date();
        const expiry = sub.endDate || sub.renewalDate;
        if (expiry && now > new Date(expiry)) continue; // لا تعديل بعد انتهاء التجربة
        const active = Array.isArray(s.activeModules) ? s.activeModules : [];
        const nextSet = new Set([ ...active, ...allIds ]);
        const next = Array.from(nextSet);
        const changed = JSON.stringify(active) !== JSON.stringify(next);
        if (changed) { s.activeModules = next; await s.save(); updatedCount++; }
      }
      console.log('Trial module sync complete. Updated schools:', updatedCount);
    } catch (e) {
      console.warn('Trial module sync failed:', e?.message || e);
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
          const isAllowed = (u.role === 'PARENT' && conv.parentId === u.parentId) ||
                            (u.role === 'TEACHER' && conv.teacherId === u.teacherId) ||
                            (u.role === 'SCHOOL_ADMIN' && conv.schoolId === u.schoolId) ||
                            (u.role === 'SUPER_ADMIN');
          if (!isAllowed) return;
          socket.join(roomId);
        } catch {}
      });
      socket.on('send_message', async (payload) => {
        try {
          const { conversationId, roomId, text, senderId, senderRole } = payload || {};
          if (!conversationId || !roomId || !text || !senderId || !senderRole) return;
          const { Message } = require('./models');
          const sid = socket.user?.id || senderId;
          const srole = socket.user?.role || senderRole;
          const msg = await Message.create({ id: `msg_${Date.now()}`, conversationId, text, senderId: sid, senderRole: srole });
          io.to(roomId).emit('new_message', { id: msg.id, conversationId, text, senderId, senderRole, timestamp: msg.createdAt });
        } catch {}
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
      console.log(`Server running on port ${PORT}`);
      console.log('Server startup complete');
      console.log('Server listening on 0.0.0.0');
      console.log('Test this: curl http://127.0.0.1:'+PORT+'/api/auth/login');
      console.log('PID:', process.pid);
    });
    // Keep process alive
    process.on('SIGINT', () => {
      console.log('Shutting down gracefully...');
      server.close(() => process.exit(0));
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });
if (Sentry && Sentry.Handlers && typeof Sentry.Handlers.errorHandler === 'function') { app.use(Sentry.Handlers.errorHandler()); }
