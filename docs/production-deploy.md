# نشر مجاني للإنتاج لنظام SchoolSaaS

هذه الخطة تستخدم خدمات مجانية أو ذات طبقة مجانية مناسبة:
- Backend: Render Web Service (Node.js) – مجاني
- قاعدة البيانات: Neon PostgreSQL – مجاني
- جلسات/كاش: Upstash Redis – مجاني
- Frontend: Vercel (Static) – مجاني

## المعمارية المقترحة
- الواجهة (admin) تُبنى إلى مجلد dist وتُنشر على Vercel (HTTPS).
- الخادم الخلفي يُنشر على Render كخدمة ويب Node، ويستقبل طلبات على HTTPS.
- PostgreSQL على Neon، مع اتصال TLS (PG_SSL=true).
- جلسات Express عبر Upstash Redis لتجنب MemoryStore في الإنتاج.
- CORS مضبوط للسماح لمجال الواجهة فقط.

## المتطلبات البيئية
اضبط المتغيرات التالية على Render:
- NODE_ENV=production
- DATABASE_URL=postgres://user:pass@host:port/dbname (من Neon)
- PG_SSL=true
- SESSION_SECRET=قيمة قوية وعشوائية
- JWT_REFRESH_SECRET=قيمة قوية وعشوائية
- FRONTEND_URL=https://your-frontend.vercel.app
- CORS_ORIGIN=https://your-frontend.vercel.app
- REDIS_URL=rediss://:<password>@<host>:<port> (من Upstash)
- LICENSE_KEY=اختياري
- SAML_*=اختياري إذا فعّلت SSO

ملاحظات أمنية:
- تأكد أن SESSION_SECRET وJWT_REFRESH_SECRET غير مكشوفة علناً.
- فعّل HTTPS دائماً للاتصال بين الواجهة والخلفية.
- راجع سياسات Helmet وRate Limit (مفعّلة في الخادم).

## خطوات Neon (PostgreSQL)
1. أنشئ قاعدة جديدة على https://neon.tech
2. انسخ اتصال DATABASE_URL (قم بتمكين TLS).
3. لا تنس PG_SSL=true على Render.

## خطوات Upstash (Redis)
1. أنشئ Redis على https://upstash.com
2. انسخ رابط REDIS_URL (rediss://).
3. أضفه إلى Render، سيستخدمه الخادم لتخزين الجلسات.

## نشر الـ Backend على Render
1. اربط المستودع مع Render كـ Web Service.
2. Build Command: `npm install`
3. Start Command: `npm start` (يشغّل `scripts/migrate.js` ثم `server.js`)
4. اضبط المتغيرات البيئية كما في الأعلى.
5. بعد أول تشغيل، راقب السجلات للتأكد من نجاح المهاجرات وظهور: `Server running on port ...`

## نشر الـ Frontend على Vercel
إما عبر vercel.json الموجود أو بشكل مشروع مستقل لـ admin:
1. استيراد مشروع `admin` في Vercel.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. اضبط متغير REACT_APP_API_URL إلى عنوان Render (مثل https://your-backend.onrender.com/api).
5. انشر، ثم افتح الموقع وتأكد أن طلبات الـ API تعمل.

## ضبط CORS
- في الخلفية، اضبط CORS_ORIGIN وFRONTEND_URL على نطاق Vercel.
- يسمح فقط بطلبات من الواجهة الموثوقة، لمنع أخطاء أمنية.

## فحص الصحة بعد النشر
- الواجهة: يجب أن تتصل بالـ API بدون أخطاء Failed to fetch.
- الخلفية:
  - GET /health يعيد 200
  - GET /api/diagnostics/db يعرض معلومات القاعدة (dialect=postgres، host، database)
- دخول المدير العام:
  - POST /api/auth/superadmin/login يجب أن يعيد 200 مع توكن.

## ملاحظات جاهزية الإنتاج
- لا تستخدم MemoryStore للجلسات في الإنتاج؛ وفّر REDIS_URL.
- لا تشغّل أكثر من نسخة خادم على نفس قاعدة البيانات بدون مزامنة المهاجرات.
- إن استخدمت SAML، فعّل:
  - wantAuthnResponseSigned=true
  - wantAssertionsSigned=true
  - validateInResponseTo=true
  - acceptedClockSkewMs=2000
  - ووفّر شهادات التوقيع وفكّ التشفير.

## استكشاف الأخطاء
- أخطاء CORS: تأكد من FRONTEND_URL وCORS_ORIGIN على Render.
- أخطاء اتصال القاعدة: تحقق من DATABASE_URL وPG_SSL على Render وNeon.
- جلسات لا تعمل: تأكد من REDIS_URL صحيح وTLS مفعّل.

## مراجع
- الخادم: [backend/server.js](file:///d:/school-crm%20(1)/backend/server.js)
- تهيئة SAML: [backend/middleware/samlAuth.js](file:///d:/school-crm%20(1)/backend/middleware/samlAuth.js)
- مثال بيئة: [backend/.env.example](file:///d:/school-crm%20(1)/backend/.env.example)
- بناء الواجهة: [admin/build.js](file:///d:/school-crm%20(1)/admin/build.js)
