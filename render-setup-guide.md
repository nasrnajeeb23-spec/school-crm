# دليل إعداد Render.com خطوة بخطوة

## ✅ الخطوة 1: إنشاء قاعدة البيانات
1. اذهب إلى https://render.com
2. سجل دخول أو أنشئ حساب جديد
3. اضغط "New" → "PostgreSQL"
4. اختر الإعدادات:
   - Name: school-crm-db
   - Database: school_crm
   - Plan: Free
   - Region: Frankfurt (EU Central)
5. انتظر حتى تكون "Available"
6. احفظ "Internal Connection String"

## ✅ الخطوة 2: إنشاء Web Service للـ Backend
1. اضغط "New" → "Web Service"
2. اختر "Build and deploy from a Git repository"
3. اربط حساب GitHub الخاص بك
4. اختر المستودع (Repository) الخاص بالمشروع
5. اختر الإعدادات:
   - Name: school-crm-backend
   - Environment: Node
   - Build Command: cd backend && npm ci
   - Start Command: cd backend && npm start
   - Plan: Free
   - Region: Frankfurt (EU Central)

## ✅ الخطوة 3: إعداد المتغيرات البيئية
في إعدادات الخدمة، أضف هذه المتغيرات:

```
NODE_ENV=production
PORT=5000
JWT_SECRET=f846f66cf2dc8cb5026a70a67ab0e10fc6050d0cd40078f97febadea581c018a
LICENSE_SECRET=a350dba030272cfc979e4a0adbdbe2a6001466f886eb7f0924f099c062c17bca
SESSION_SECRET=ea03441c39faeae8277a9ad7aa28bd76
DATABASE_URL=[استخدم الـ Connection String من الخطوة 1]
CORS_ORIGIN=*
MAX_FILE_SIZE=10485760
MAX_FILES=5
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=300
LOG_LEVEL=info
```

## ✅ الخطوة 4: إنشاء Static Site للواجهة الأمامية
1. اضغط "New" → "Static Site"
2. اختر نفس المستودع من GitHub
3. اختر الإعدادات:
   - Name: school-crm-admin
   - Build Command: npm run build
   - Publish Directory: dist
   - Plan: Free

## ✅ الخطوة 5: الانتظار والاختبار
1. انتظر حتى تنتهي عمليات البناء (5-10 دقائق)
2. اختبر الروابط التي يعطيك إياها Render
3. تحقق من أن كل شيء يعمل بشكل صحيح

## 🔗 الروابط التي ستحصل عليها:
- Backend API: https://school-crm-backend.onrender.com
- Admin Dashboard: https://school-crm-admin.onrender.com

## 📱 للتطبيقات الموبايل:
- عدّل ملف `mobile-parent/api.ts` وغير `API_BASE_URL` إلى رابط الـ Backend
- نفس الشيء لملف `mobile-teacher/api.ts`