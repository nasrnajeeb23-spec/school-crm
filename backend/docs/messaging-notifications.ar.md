# دليل الرسائل والإشعارات — مطابق للمنصة

## إنشاء محادثة
- المسار: `POST /api/messaging/conversations` (`backend/routes/messaging.js:119–127`).
- الحقول: `title`, `schoolId`, وأحد `teacherId | parentId`.
- التحقق: يجب أن يطابق `schoolId` مدرسة الحساب لغير الـ SUPER_ADMIN.

## إرسال الرسائل
- المسار: `POST /api/messaging/send` (`backend/routes/messaging.js:149–195`).
- الحقول: `conversationId`, `text`, اختياريًا `attachmentUrl/Type/Name`.
- التحقق: يمنع الإرسال خارج مدرسة الحساب أو خارج محادثة لا تخص الطرف.

## الإشعارات
- إعدادات المدرسة تحدد `notifications` (email/sms/push) في `SchoolSettings`.

يح
