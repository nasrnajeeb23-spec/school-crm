require('dotenv').config();
const express = require('express');
const http = require('http');
const { sequelize } = require('./models');
const { createLogger, format, transports } = require('winston');
const DailyRotate = require('winston-daily-rotate-file');
const path = require('path');

// Logger Setup
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console(),
    new DailyRotate({
      filename: path.join(__dirname, '..', 'logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '30d',
    })
  ]
});

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Globals
app.locals.logger = logger;
app.locals.disabledModules = new Set();

// DB Info Log
try {
  const dial = sequelize.getDialect();
  logger.info('db_info', { dialect: dial });
} catch { }

// Loaders & Services
const socketService = require('./services/socketService');
const middlewareLoader = require('./loaders/middleware');
const licenseLoader = require('./loaders/license');
const routesLoader = require('./loaders/routes');
const bootstrapLoader = require('./loaders/bootstrap');
const jobService = require('./services/jobService');
const backupService = require('./services/backupService');
// Legacy CronService (Self-initializing if required, or we init it here)
// Based on file check, it exports a class but might be used elsewhere. 
// Ideally we should verify if it needs explicit start. 
// Assuming it might be used by other modules or needs to be just required?
// Re-adding it for safety as it was in the original header.
const CronService = require('./services/CronService');

// 1. Init Socket.IO
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001';
const allowedOrigins = allowedOrigin.split(',').map(o => o.trim());
allowedOrigins.push('https://school-crm-admin.onrender.com');
if (process.env.FRONTEND_URL) {
  try { allowedOrigins.push(process.env.FRONTEND_URL.trim()); } catch { }
}
const io = socketService.init(server, allowedOrigins, logger);
app.set('io', io);

// 2. Init Middleware (Cors, Helmet, Session, etc)
const limiters = middlewareLoader.init(app, logger);

// 3. Init License
licenseLoader.init(app, logger);

// 4. Init Services
app.locals.enqueueJob = jobService.enqueueJob;
app.locals.cronTasks = backupService.cronTasks;
app.locals.scheduleBackupForSchool = backupService.scheduleBackupForSchool;
app.locals.reloadBackupSchedules = backupService.reloadBackupSchedules;
app.locals.cleanupOldBackups = backupService.cleanupOldBackups;
backupService.initCron();

// 5. Init Routes
routesLoader.init(app, limiters);

// 6. Bootstrap (Permissions, Security Policies, etc)
bootstrapLoader.init(app, logger);

// 7. Serve Static Frontend (Self-hosted)
const frontendDist = path.join(__dirname, '..', 'admin', 'dist');
if (require('fs').existsSync(frontendDist)) {
  logger.info('Serving static frontend from admin/dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 8. Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info('Server startup complete');
});

logger.info(`Server file path: ${__filename}`);
