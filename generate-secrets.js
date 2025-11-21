// سكربت لتوليد مفاتيح أمان آمنة
import crypto from 'crypto';

function generateSecureKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

console.log('🔐 مفاتيح الأمان الآمنة المولدة:');
console.log('=====================================');
console.log(`JWT_SECRET=${generateSecureKey(32)}`);
console.log(`LICENSE_SECRET=${generateSecureKey(32)}`);
console.log(`SESSION_SECRET=${generateSecureKey(16)}`);
console.log('=====================================');
console.log('📋 انسخ هذه المفاتيح واحفظها في مكان آمن');
console.log('⚠️ لا تشارك هذه المفاتيح مع أحد');