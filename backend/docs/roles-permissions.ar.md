# الأدوار والصلاحيات (RBAC)

## الأدوار
- `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `PARENT` (مطابقة لـ `backend/middleware/auth.js:60–68`).

## التحقق
- `verifyToken`: يفحص JWT، الحالة، `tokenVersion`، وسياسات السوبر أدمن.
- `requireRole(...roles)`: يمنع الوصول لمن لا يملك الدور المناسب.
- `requireSameSchoolParam('schoolId')` و`requireSameSchoolQuery('schoolId')`: يضمن مطابقة المدرسة.
- `requirePermission(...perms)`: يُلزم وجود أذونات محددة.

## أذونات نموذجية
- `MANAGE_STUDENTS`, `MANAGE_TEACHERS`, `MANAGE_PARENTS`, `MANAGE_CLASSES`, `MANAGE_FINANCE`, `MANAGE_TRANSPORTATION`, `MANAGE_ATTENDANCE`, `MANAGE_GRADES`, `MANAGE_REPORTS`, `MANAGE_SETTINGS`, `MANAGE_MODULES`.

## أمثلة
- مدير المدرسة للوصول إلى الرسوم: يتطلب `MANAGE_FINANCE` و`requireSameSchoolParam`.
- المعلم للوصول إلى حضور الفصل: الدور `TEACHER` ويجب أن ينتمي للفصل/المدرسة المناسبة.

