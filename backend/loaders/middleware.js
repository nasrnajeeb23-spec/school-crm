const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const samlAuth = require('../middleware/samlAuth');
const { languageMiddleware } = require('../i18n/config');
const path = require('path');
const { checkStorageLimit, updateUsedStorage } = require('../middleware/storageLimits');

const init = (app, logger) => {
    let Sentry;
    try { Sentry = require('@sentry/node'); } catch { }
    if (Sentry && process.env.SENTRY_DSN) {
        try {
            Sentry.init({
                dsn: process.env.SENTRY_DSN,
                tracesSampleRate: 1.0,
                environment: process.env.NODE_ENV || 'development'
            });
            app.use(Sentry.Handlers.requestHandler());
            app.use(Sentry.Handlers.tracingHandler());
            logger.info('Sentry Initialized');
        } catch (e) { logger.warn('Sentry init failed', e); }
    }

    // Basic Middlewares
    app.use(cors({
        origin: (origin, callback) => {
            const allowedOrigins = [
                'http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173',
                'http://localhost:4173', 'http://localhost:3001', 'http://127.0.0.1:3000'
            ];
            if (process.env.CORS_ORIGIN) {
                process.env.CORS_ORIGIN.split(',').forEach(o => allowedOrigins.push(o.trim()));
            }
            if (process.env.FRONTEND_URL) {
                try { allowedOrigins.push(process.env.FRONTEND_URL.trim()); } catch { }
            }
            if (!origin || allowedOrigins.includes(origin)) callback(null, true);
            else callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'CSRF-Token']
    }));
    app.use(compression());

    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:", "blob:"],
                connectSrc: ["'self'", "http://localhost:3000", "http://localhost:5173", "ws://localhost:3000"], // Add dynamic origins if needed
                fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
            useDefaults: false // We are defining manual directives
        },
        crossOriginResourcePolicy: { policy: "cross-origin" },
        hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
    }));

    // Prometheus Metrics
    let promClient;
    try { promClient = require('prom-client'); } catch { }
    if (promClient) {
        promClient.collectDefaultMetrics();
        const httpRequestCounter = new promClient.Counter({ name: 'http_requests_total', help: 'Total HTTP requests', labelNames: ['method', 'route', 'status'] });
        const httpRequestDuration = new promClient.Histogram({ name: 'http_request_duration_seconds', help: 'HTTP request duration in seconds', labelNames: ['method', 'route', 'status'], buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10] });
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
                } catch { }
            });
            next();
        });
        app.get('/metrics', async (req, res) => {
            try { res.setHeader('Content-Type', promClient.register.contentType); res.send(await promClient.register.metrics()); }
            catch { res.status(500).end(); }
        });
    }

    // Session & Redis
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret && process.env.NODE_ENV === 'production') { throw new Error('SESSION_SECRET required'); }
    const sessionConfig = {
        secret: sessionSecret || 'dev_session_secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax', // Relaxed for redirect flows often
            maxAge: 24 * 60 * 60 * 1000
        }
    };

    try {
        if (process.env.REDIS_URL && process.env.NODE_ENV !== 'test') {
            const RedisStore = require('connect-redis').default;
            const redis = require('redis');
            const useTls = process.env.REDIS_URL.startsWith('rediss://');
            const client = redis.createClient({ url: process.env.REDIS_URL, socket: useTls ? { tls: true } : {} });
            client.on('error', (err) => { try { logger.warn('Redis client error'); } catch { } });
            client.connect().catch(() => { });
            sessionConfig.store = new RedisStore({ client });
            app.locals.redisClient = client;

            // Inject into services
            try {
                require('../services/jobService').setRedisClient(client);
                require('../services/backupService').setRedisClient(client);
            } catch (e) { console.error('Failed to inject redis into services', e); }

            try { logger.info('Session store: Redis'); } catch { }
        }
    } catch (e) { logger.warn('Redis setup failed', e); }

    app.use(session(sessionConfig));
    app.use(samlAuth.initialize());
    app.use(samlAuth.session());

    // CSRF
    let csrfProtection = (req, res, next) => next();
    try {
        const csurf = require('csurf');
        const isProd = process.env.NODE_ENV === 'production';
        const csrfDisabled = String(process.env.CSRF_DISABLED || 'false').toLowerCase() === 'true';
        const csrfEnabled = isProd ? !csrfDisabled : (String(process.env.CSRF_ENABLED || 'false').toLowerCase() === 'true');
        if (csrfEnabled) {
            csrfProtection = csurf({ cookie: { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax' } });
            logger.info('CSRF Protection: ENABLED');
            app.use(csrfProtection);
            app.use((req, res, next) => {
                res.locals.csrfToken = req.csrfToken ? req.csrfToken() : null;
                next();
            });
            app.get('/api/csrf-token', (req, res) => { res.json({ csrfToken: req.csrfToken ? req.csrfToken() : null }); });
        } else {
            logger.warn('CSRF Protection: DISABLED');
        }
    } catch (err) { logger.warn('CSRF Protection: NOT AVAILABLE'); }

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(languageMiddleware);

    // Rate Limiters
    const isTestEnv = String(process.env.NODE_ENV || '').toLowerCase() === 'test';

    const globalLimiter = isTestEnv ? (req, res, next) => next() : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests',
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger.warn('Global rate limit exceeded', { ip: req.ip, path: req.path });
            res.status(429).json({ error: 'Too many requests', retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) });
        },
        skip: (req) => req.path === '/health' || req.path === '/api/health'
    });

    const authLimiter = isTestEnv ? (req, res, next) => next() : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        skipSuccessfulRequests: true,
        message: 'Too many login attempts',
        handler: (req, res) => {
            logger.warn('Auth rate limit exceeded', { ip: req.ip, email: req.body?.email });
            res.status(429).json({ error: 'Too many login attempts', retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) });
        }
    });

    app.use('/api/', globalLimiter);
    app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
    // Legacy downloads path if needed
    app.use('/downloads', express.static(path.join(__dirname, '..', '..', 'admin', 'public', 'downloads')));

    // Standard response formatter
    try { app.use(require('../middleware/response').responseFormatter); } catch { }

    return { globalLimiter, authLimiter, Sentry };
};

module.exports = { init };
