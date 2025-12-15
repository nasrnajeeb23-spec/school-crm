# دليل التثبيت والإعداد

## المتطلبات الأساسية
- Node.js >= 16.x
- npm >= 8.x
- Redis Server >= 6.x
- PostgreSQL/MySQL (حسب قاعدة البيانات المستخدمة)

---

## 1. تثبيت Dependencies

### Frontend (admin)
```bash
cd admin
npm install @sentry/react @sentry/tracing web-vitals react-joyride chart.js react-chartjs-2
npm install -D @types/react-joyride
```

### Backend
```bash
cd backend
npm install redis express-rate-limit rate-limit-redis helmet csurf express-validator
```

---

## 2. إعداد المتغيرات البيئية

### Frontend (.env)
```env
# Sentry
REACT_APP_SENTRY_DSN=your_sentry_dsn_here

# Analytics
REACT_APP_GA_MEASUREMENT_ID=your_ga_id_here

# API
REACT_APP_API_URL=http://localhost:5000

# Version
REACT_APP_VERSION=2.0.0
```

### Backend (.env)
```env
# Redis
REDIS_URL=redis://localhost:6379

# Sentry (optional for backend)
SENTRY_DSN=your_sentry_dsn_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
SESSION_SECRET=your_session_secret_here
CSRF_SECRET=your_csrf_secret_here
```

---

## 3. إعداد Redis

### تثبيت Redis (Windows)
```bash
# استخدم WSL أو قم بتحميل Redis for Windows
# https://github.com/microsoftarchive/redis/releases

# أو استخدم Docker
docker run -d -p 6379:6379 redis:latest
```

### تثبيت Redis (Linux/Mac)
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Mac
brew install redis

# تشغيل Redis
redis-server
```

### اختبار Redis
```bash
redis-cli ping
# يجب أن يرجع: PONG
```

---

## 4. إعداد Sentry

1. سجل حساب على [sentry.io](https://sentry.io)
2. أنشئ مشروع جديد (React)
3. انسخ DSN
4. أضفه إلى `.env`

---

## 5. تطبيق Middleware على Routes

### مثال: تطبيق على route المدارس

```javascript
// backend/routes/schools.js
const { errorHandler, asyncHandler } = require('../middleware/errorHandler');
const { validators } = require('../middleware/validation');
const { rateLimiters } = require('../middleware/rateLimiter');
const { cacheMiddlewares, invalidateMiddlewares } = require('../middleware/cache');
const { auditLog } = require('../middleware/security');
const { paginationMiddleware } = require('../utils/pagination');

// GET /schools - مع caching و pagination
router.get('/',
  rateLimiters.api,
  paginationMiddleware,
  cacheMiddlewares.schools,
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = req.pagination;
    
    const { count, rows } = await School.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json(buildPaginationResponse(rows, count, page, limit));
  })
);

// POST /schools - مع validation و audit
router.post('/',
  rateLimiters.api,
  validators.createSchool,
  auditLog('SCHOOL_CREATE'),
  invalidateMiddlewares.schools,
  asyncHandler(async (req, res) => {
    const school = await School.create(req.body);
    res.status(201).json(school);
  })
);

// استخدام error handler
router.use(errorHandler);
```

---

## 6. تفعيل Sentry في Frontend

```typescript
// admin/src/index.tsx
import { initSentry } from './utils/sentry';

// Initialize Sentry
initSentry();

// في App.tsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      {/* Your app */}
    </ErrorBoundary>
  );
}
```

---

## 7. تفعيل Performance Monitoring

```typescript
// admin/src/index.tsx
import { initPerformanceMonitoring } from './utils/performance';

initPerformanceMonitoring();
```

---

## 8. تفعيل Analytics

```typescript
// admin/src/index.tsx
import { initAnalytics, trackPageView } from './utils/analytics';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Initialize
initAnalytics(process.env.REACT_APP_GA_MEASUREMENT_ID);

// في App component
function App() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);

  return (/* ... */);
}
```

---

## 9. تفعيل Redis في Backend

```javascript
// backend/server.js أو app.js
const { initRedis } = require('./utils/cache');

// Initialize Redis
initRedis().then(() => {
  console.log('Redis initialized');
}).catch(err => {
  console.error('Redis initialization failed:', err);
});
```

---

## 10. اختبار التحسينات

### اختبار Pagination
```bash
curl "http://localhost:5000/api/schools?page=1&limit=10"
```

### اختبار Rate Limiting
```bash
# أرسل أكثر من 100 طلب في 15 دقيقة
for i in {1..101}; do curl http://localhost:5000/api/schools; done
```

### اختبار Caching
```bash
# الطلب الأول (Cache MISS)
curl http://localhost:5000/api/schools

# الطلب الثاني (Cache HIT)
curl http://localhost:5000/api/schools
```

### اختبار Validation
```bash
curl -X POST http://localhost:5000/api/schools \
  -H "Content-Type: application/json" \
  -d '{"name": ""}'  # يجب أن يفشل
```

---

## 11. التحقق من التثبيت

### Frontend
```bash
cd admin
npm run dev
# يجب أن يعمل بدون أخطاء
```

### Backend
```bash
cd backend
npm start
# تحقق من الرسائل:
# - Redis: Connected successfully
# - Sentry initialized (إذا كان مفعلاً)
```

---

## 12. الخطوات التالية

- [ ] اختبار جميع الصفحات على أجهزة مختلفة
- [ ] مراجعة Sentry للتأكد من عدم وجود أخطاء
- [ ] مراقبة Performance Metrics
- [ ] مراجعة Analytics للتأكد من التتبع
- [ ] اختبار Rate Limiting
- [ ] التحقق من Cache Hit Rate

---

## ملاحظات مهمة

> [!WARNING]
> - لا تنسَ تغيير `SESSION_SECRET` و `CSRF_SECRET` في الإنتاج
> - تأكد من تشغيل Redis قبل بدء Backend
> - راجع Sentry DSN قبل النشر

> [!TIP]
> - استخدم Redis Desktop Manager لمراقبة Cache
> - استخدم Sentry Dashboard لمراقبة الأخطاء
> - راجع Google Analytics لمراقبة الاستخدام

---

**آخر تحديث:** 2025-12-15
