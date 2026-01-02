# دليل إعداد بوابات الدفع

يدعم النظام التكامل مع بوابات دفع متعددة. هذا الدليل يوضح كيفية إعدادها.

## إعداد متغيرات البيئة

يجب عليك الحصول على مفاتيح API من بوابة الدفع التي تختارها وإضافتها إلى ملف `.env` في مجلد `backend`.

```dotenv
# مثال لبوابة Tap Payments
TAP_API_KEY=sk_test_xxxxxxxxxxxxxxxx

# مثال لـ PayPal
PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxxxxx
```

## تفعيل Webhooks

الـ Webhooks ضرورية لتأكيد عمليات الدفع وتحديث حالة الفواتير تلقائيًا.

1.  **اذهب إلى لوحة تحكم بوابة الدفع.**
2.  **ابحث عن قسم المطورين أو Webhooks.**
3.  **أضف URL جديد للـ Webhook:**
    - **URL:** `https://your-domain.com/api/payments/webhook`
    - **Events:** تأكد من تفعيل الأحداث المتعلقة بالدفع الناجح (e.g., `charge.succeeded`, `payment.captured`).
4.  **احفظ الـ Webhook.**

سيقوم الخادم الآن باستقبال إشعارات تلقائية عند اكتمال أي عملية دفع.
