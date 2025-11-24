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


const app = express();
const server = http.createServer(app);
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,https://school-crm-admin.onrender.com';
const allowedOrigins = allowedOrigin.split(',').map(o => o.trim());
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
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      logger.warn(`CORS blocked request from: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
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
app.use(express.json());

// Session middleware for enterprise/SAML features
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev_session_secret',
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
      client.on('error', () => {});
      client.connect().catch(() => {});
      sessionConfig.store = new RedisStore({ client });
    } catch {}
  }
} catch {}
app.use(session(sessionConfig));
app.use(samlAuth.initialize());
app.use(samlAuth.session());
app.use(languageMiddleware);

// License enforcement setup
const { verifyLicenseKey } = require('./utils/license');
const coreModules = ['student_management', 'academic_management'];
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

// API Routes
const authLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 50 });
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/auth/superadmin', authSuperAdminRoutes);
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
app.use('/uploads', express.static(require('path').join(__dirname, '..', 'uploads')));

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
  const { School, Plan, Subscription, BusOperator, Route, Parent, Student, Teacher, User, Conversation, Message, Expense } = require('./models');
  
  // Sync independent tables first
  await School.sync(opts);
  await Plan.sync(opts);
  await BusOperator.sync(opts);
  await Parent.sync(opts);
  await Student.sync(opts);
  await Teacher.sync(opts);
  
  // Then sync dependent tables
  await Subscription.sync(opts);
  await Route.sync(opts);
  await User.sync(opts);
  await Conversation.sync(opts);
  await Message.sync(opts);
  await Expense.sync(opts);
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
        const op = await BusOperator.create({ name: 'أحمد علي', phone: '0501112233', licenseNumber: 'A12345', busPlateNumber: 'أ ب ج ١٢٣٤', busCapacity: 25, busModel: 'Toyota Coaster 2022', status: 'Approved', schoolId: school.id });
        const rt = await Route.create({ name: 'مسار حي الياسمين', schoolId: school.id, busOperatorId: op.id });
        const parent = await Parent.create({ name: 'محمد عبدالله', phone: '0502223344', email: 'parent@school.com', status: 'Active' });
        const student = await Student.create({ name: 'أحمد محمد عبدالله', grade: 'الصف الخامس', parentName: parent.name, parentId: parent.id, dateOfBirth: '2014-01-01', status: 'Active', schoolId: school.id, registrationDate: new Date().toISOString().split('T')[0] });
        await RouteStudent.create({ routeId: rt.id, studentId: student.id });
        console.log('Seeded minimal dev data');
      }
      // Ensure demo parent/student and transportation always exist
      const school = await School.findOne();
      if (school) {
        const [parent] = await Parent.findOrCreate({ where: { email: 'parent@school.com' }, defaults: { name: 'محمد عبدالله', phone: '0502223344', email: 'parent@school.com', status: 'Active' } });
        const [student] = await Student.findOrCreate({ where: { name: 'أحمد محمد عبدالله' }, defaults: { name: 'أحمد محمد عبدالله', grade: 'الصف الخامس', parentName: parent.name, parentId: parent.id, dateOfBirth: '2014-01-01', status: 'Active', registrationDate: new Date().toISOString().split('T')[0], profileImageUrl: '', schoolId: school.id } });
        const [op] = await BusOperator.findOrCreate({ where: { phone: '0501112233' }, defaults: { name: 'أحمد علي', phone: '0501112233', licenseNumber: 'A12345', busPlateNumber: 'أ ب ج ١٢٣٤', busCapacity: 25, busModel: 'Toyota Coaster 2022', status: 'Approved', schoolId: school.id } });
        const [rt] = await Route.findOrCreate({ where: { name: 'مسار حي الياسمين' }, defaults: { name: 'مسار حي الياسمين', schoolId: school.id, busOperatorId: op.id } });
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