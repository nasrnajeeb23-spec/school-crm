# دليل تشغيل المشروع في بيئة الإنتاج

هذا الدليل يوضح خطوات إعداد وتشغيل نظام SchoolSaaS على خادم إنتاجي.

## المتطلبات الأساسية

1.  خادم (Server) يعمل بنظام Linux (مثل Ubuntu 20.04).
2.  `git` مثبت.
3.  `Docker` و `docker-compose` مثبتان.

## خطوات الإعداد

1.  **استنساخ المستودع:**
    ```bash
    git clone <repository-url>
    cd school-crm-production-full
    ```

2.  **إعداد متغيرات البيئة:**
    - اذهب إلى مجلد `backend`: `cd backend`
    - انسخ الملف النموذجي: `cp .env.example .env`
    - حرر الملف `nano .env` واملأ جميع المتغيرات بمعلومات صحيحة وقوية (خاصة كلمات المرور ومفاتيح API)، ومن ضمنها:
        - `DATABASE_URL`، `JWT_SECRET`، `LICENSE_SECRET`، `LICENSE_KEY`.

3.  **بناء وتشغيل الحاويات:**
    ```bash
    docker-compose -f ../docker-compose.prod.yml up --build -d
    ```
    - `--build`: يقوم بإعادة بناء الصور إذا تم تغيير الكود.
    - `-d`: يقوم بتشغيل الحاويات في الخلفية.

4.  **تعبئة البيانات الأولية (اختياري):**
    إذا كنت تحتاج إلى تعبئة قاعدة البيانات ببيانات أولية، قم بتشغيل الأمر التالي:
    ```bash
    docker-compose -f ../docker-compose.prod.yml exec backend npm run db:seed
    ```

## التحقق من الحالة
- لعرض حالة الحاويات: `docker-compose -f ../docker-compose.prod.yml ps`
- لعرض سجلات (logs) خدمة معينة: `docker-compose -f ../docker-compose.prod.yml logs -f backend`

## النسخ الاحتياطي
- تأكد من أن سكربت `deploy/backup_db.sh` لديه صلاحيات التنفيذ (`chmod +x deploy/backup_db.sh`).
- قم بإعداده ليعمل بشكل دوري باستخدام `cron`.
## نظام الترخيص في الإنتاج

- قم بتوليد مفتاح ترخيص من لوحة المدير العام (صفحة "إدارة التراخيص") أو عبر استدعاء `POST /api/license/generate` باستخدام دور المدير العام.
- ضع المفتاح الناتج في متغير البيئة `LICENSE_KEY` قبل تشغيل الخادم.
- نقاط الـ API لوحدات محمية (مثل المالية والنقل المدرسي) لن تعمل بدون ترخيص صالح للوحدة.
