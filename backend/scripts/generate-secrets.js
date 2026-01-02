const crypto = require('crypto');

/**
 * سكربت لتوليد مفاتيح سرية قوية للإنتاج
 * يُستخدم لإنشاء قيم آمنة لـ JWT_SECRET, SESSION_SECRET, LICENSE_SECRET
 */

function generateSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

function generateSecrets() {
    console.log('🔐 توليد المفاتيح السرية للإنتاج...\n');

    const secrets = {
        JWT_SECRET: generateSecret(64),
        SESSION_SECRET: generateSecret(32),
        LICENSE_SECRET: generateSecret(64),
        ENCRYPTION_KEY: generateSecret(32),
    };

    console.log('✅ تم توليد المفاتيح بنجاح!\n');
    console.log('📋 انسخ هذه القيم إلى ملف .env.production:\n');
    console.log('─'.repeat(80));

    for (const [key, value] of Object.entries(secrets)) {
        console.log(`${key}=${value}`);
    }

    console.log('─'.repeat(80));
    console.log('\n⚠️  تحذير: احفظ هذه المفاتيح في مكان آمن ولا تشاركها مع أحد!');
    console.log('⚠️  لا تضع هذه المفاتيح في Git أو أي نظام تحكم بالإصدارات!');
    console.log('\n💡 نصيحة: استخدم GitHub Secrets أو مدير أسرار موثوق لتخزين هذه القيم.\n');

    return secrets;
}

// تشغيل السكربت
if (require.main === module) {
    generateSecrets();
}

module.exports = { generateSecret, generateSecrets };
