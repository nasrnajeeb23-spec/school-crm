// ملف إعداد Render.com
import fs from 'fs';

// قراءة المفاتيح المولدة
const jwtSecret = 'f846f66cf2dc8cb5026a70a67ab0e10fc6050d0cd40078f97febadea581c018a';
const licenseSecret = 'a350dba030272cfc979e4a0adbdbe2a6001466f886eb7f0924f099c062c17bca';
const sessionSecret = 'ea03441c39faeae8277a9ad7aa28bd76';

// إعداد المتغيرات البيئية
const envContent = `# Database Configuration
DATABASE_URL=postgres://postgres:your_secure_password@db:5432/school_crm

# Security Keys - CHANGE THESE IN PRODUCTION!
JWT_SECRET=${jwtSecret}
LICENSE_SECRET=${licenseSecret}

# Server Configuration
PORT=5000
NODE_ENV=production

# CORS Configuration - Update with your actual domain
CORS_ORIGIN=https://your-domain.com

# File Upload Limits
MAX_FILE_SIZE=10485760
MAX_FILES=5

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=300

# Session Configuration
SESSION_SECRET=${sessionSecret}

# Logging
LOG_LEVEL=info

# License Configuration
LICENSE_KEY=

# Email Configuration (Optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@your-domain.com

# Redis Configuration (Optional - for better performance)
REDIS_URL=redis://redis:6379`;

// كتابة ملف .env للإنتاج
fs.writeFileSync('backend/.env.render', envContent);
console.log('✅ تم إنشاء ملف backend/.env.render');

// إنشاء ملف build للـ backend
const buildScript = `#!/bin/bash
echo "Building School CRM Backend..."
npm ci --production=false
npm run build || echo "No build script found, continuing..."
echo "Build completed!"`;

fs.writeFileSync('backend/build.sh', buildScript);
fs.chmodSync('backend/build.sh', '755');
console.log('✅ تم إنشاء ملف backend/build.sh');

console.log('\n🎯 الخطوة التالية:');
console.log('1. أنشئ حساب على Render.com');
console.log('2. أنشئ قاعدة بيانات PostgreSQL مجانية');
console.log('3. أنشئ خدمة Web Service للـ Backend');
console.log('4. ربط الكود من GitHub');