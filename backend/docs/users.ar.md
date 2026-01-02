# دليل المستخدمين (Users)

## عرض وإدارة المستخدمين
- الأعمدة: الاسم، البريد، الدور، الحالة.
- الفلاتر: الدور والحالة.
- الأزرار: إضافة/تعديل/تعطيل.

## إنشاء مستخدم
- حقول (مطابقة لـ `backend/models/User.js`):
  - `email`, `username`, `password`, `name`, `phone`, `role`
  - الربط: `schoolId` (للمدرسي)، `teacherId` (للمعلم)، `parentId` (لولي الأمر)
  - `permissions` (JSON) — تُخزّن قائمة الأذونات.
- تدقيق الأمان: كلمة المرور قوية، و`tokenVersion` يُحدَّث عند تغييرها.

## المسارات ذات الصلة
- الدخول/الخروج: `backend/routes/auth.js:21–103`, `196–210`
- دعوة ولي الأمر وربط حسابه: `backend/routes/auth.js:241–275`
- RBAC والتحقق: `backend/middleware/auth.js`

