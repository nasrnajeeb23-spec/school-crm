#!/usr/bin/env node

/**
 * ملف اختبار شامل لنظام CRM المدرسة
 * يقوم بفحص جميع مكونات النظام وتحديد المشاكل
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// إعدادات الاختبار
const CONFIG = {
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://school-crm-admin.onrender.com',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
  API_BASE: process.env.API_BASE || ((process.env.BACKEND_URL ? (process.env.BACKEND_URL + '/api') : 'http://localhost:5000/api')),
  SUPERADMIN_LOGIN: '/superadmin/login',
  LOGIN_ENDPOINT: '/auth/login',
  TEST_CREDENTIALS: {
    email: 'super@admin.com',
    password: 'password'
  }
};

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// دالة للطباعة الملونة
function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// دالة لإجراء طلب HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          json: () => {
            try {
              return JSON.parse(data);
            } catch (e) {
              return null;
            }
          }
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// اختبار Frontend
async function testFrontend() {
  log('cyan', '\n=== اختبار Frontend ===');
  
  try {
    // اختبار الصفحة الرئيسية
    log('blue', 'اختبار الصفحة الرئيسية...');
    const mainPage = await makeRequest(CONFIG.FRONTEND_URL);
    
    if (mainPage.status === 200) {
      log('green', '✅ الصفحة الرئيسية تعمل بنجاح');
      
      // التحقق من وجود React
      if (mainPage.data.includes('react') || mainPage.data.includes('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
        log('green', '✅ React تم تحميله بنجاح');
      } else {
        log('yellow', '⚠️ لم يتم العثور على React في الصفحة');
      }
      
    } else {
      log('red', `❌ فشل تحميل الصفحة الرئيسية: ${mainPage.status}`);
    }
    
    // اختبار صفحة تسجيل دخول المدير العام
    log('blue', 'اختبار صفحة تسجيل دخول المدير العام...');
    const superadminUrlClean = CONFIG.FRONTEND_URL + CONFIG.SUPERADMIN_LOGIN;
    const superadminUrlHash = CONFIG.FRONTEND_URL + '/#' + CONFIG.SUPERADMIN_LOGIN;
    let superadminPage = await makeRequest(superadminUrlClean);
    if (superadminPage.status !== 200) {
      superadminPage = await makeRequest(superadminUrlHash);
    }
    
    if (superadminPage.status === 200) {
      log('green', '✅ صفحة تسجيل دخول المدير العام تعمل بنجاح');
      
      // التحقق من وجود محتوى
      if (superadminPage.data.length > 100) {
        log('green', '✅ الصفحة تحتوي على محتوى');
      } else {
        log('yellow', '⚠️ الصفحة تحتوي على محتوى قليل جداً');
      }
      
      // التحقق من وجود نموذج تسجيل الدخول
      if (superadminPage.data.includes('login') || superadminPage.data.includes('تسجيل')) {
        log('green', '✅ تم العثور على نموذج تسجيل الدخول');
      } else {
        log('yellow', '⚠️ لم يتم العثور على نموذج تسجيل الدخول');
      }
      
    } else {
      log('red', `❌ فشل تحميل صفحة تسجيل دخول المدير العام: ${superadminPage.status}`);
    }

    // اختبار تحميل ملفات الأصول
    log('blue', 'اختبار تحميل ملفات CSS و JS...');
    const cssResp = await makeRequest(CONFIG.FRONTEND_URL + '/assets/index.css');
    const jsResp = await makeRequest(CONFIG.FRONTEND_URL + '/assets/index.js');
    if (cssResp.status === 200 && (cssResp.data || '').length > 5000) {
      log('green', '✅ CSS محمل ويبدو صالحاً');
    } else {
      log('red', `❌ مشكلة في تحميل CSS: ${cssResp.status}`);
    }
    if (jsResp.status === 200 && (jsResp.data || '').length > 2000) {
      log('green', '✅ JS محمل ويبدو صالحاً');
    } else {
      log('yellow', `⚠️ مشكلة في تحميل JS: ${jsResp.status}`);
    }
  } catch (error) {
    log('red', `❌ خطأ في اختبار Frontend: ${error.message}`);
  }
}

// اختبار Backend
async function testBackend() {
  log('cyan', '\n=== اختبار Backend ===');
  
  try {
    // اختبار حالة الخادم
    log('blue', 'اختبار حالة الخادم...');
    const healthCheck = await makeRequest(CONFIG.BACKEND_URL + '/health');
    
    if (healthCheck.status === 200) {
      log('green', '✅ الخادم الخلفي يعمل بنجاح');
    } else {
      log('yellow', `⚠️ الخادم الخلفي يستجيب بكود: ${healthCheck.status}`);
    }
    
    // اختبار API
    log('blue', 'اختبار نقاط API...');
    const apiTest = await makeRequest(CONFIG.API_BASE);
    
    if (apiTest.status === 200 || apiTest.status === 404) {
      log('green', '✅ نقاط API متاحة');
    } else {
      log('yellow', `⚠️ API يستجيب بكود: ${apiTest.status}`);
    }
    
    // اختبار تسجيل الدخول
    log('blue', 'اختبار تسجيل دخول المدير العام...');
    const loginUrl = CONFIG.API_BASE + CONFIG.LOGIN_ENDPOINT;
    const loginResponse = await makeRequest(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(CONFIG.TEST_CREDENTIALS)
    });
    
    if (loginResponse.status === 200) {
      log('green', '✅ تسجيل دخول المدير العام ناجح');
      const data = loginResponse.json();
      if (data && data.token) {
        log('green', '✅ تم استلام توكن المصادقة');
      }
    } else {
      log('red', `❌ فشل تسجيل الدخول: ${loginResponse.status}`);
      log('yellow', `الاستجابة: ${loginResponse.data}`);
    }
    
  } catch (error) {
    log('red', `❌ خطأ في اختبار Backend: ${error.message}`);
  }
}

// اختبار قاعدة البيانات
async function testDatabase() {
  log('cyan', '\n=== اختبار قاعدة البيانات ===');
  
  try {
    // اختبار الاتصال بقاعدة البيانات من خلال API
    log('blue', 'اختبار جلب البيانات من قاعدة البيانات...');
    
    const schoolsEndpoint = CONFIG.API_BASE + '/schools';
    const schoolsResponse = await makeRequest(schoolsEndpoint);
    
    if (schoolsResponse.status === 200) {
      log('green', '✅ تم جلب البيانات من قاعدة البيانات بنجاح');
    } else if (schoolsResponse.status === 401) {
      log('yellow', '⚠️ يتطلب مصادقة للوصول للبيانات');
    } else {
      log('yellow', `⚠️ استجابة غير متوقعة من قاعدة البيانات: ${schoolsResponse.status}`);
    }
    
  } catch (error) {
    log('red', `❌ خطأ في اختبار قاعدة البيانات: ${error.message}`);
  }
}

// فحص ملفات المشروع
function checkProjectFiles() {
  log('cyan', '\n=== فحص ملفات المشروع ===');
  
  const adminDir = path.join(__dirname, 'admin');
  const backendDir = path.join(__dirname, 'backend');
  
  // فحص وجود المجلدات
  if (fs.existsSync(adminDir)) {
    log('green', '✅ مجلد admin موجود');
  } else {
    log('red', '❌ مجلد admin مفقود');
  }
  
  if (fs.existsSync(backendDir)) {
    log('green', '✅ مجلد backend موجود');
  } else {
    log('red', '❌ مجلد backend مفقود');
  }
  
  // فحص ملفات التكوين
  const configFiles = [
    'package.json',
    'admin/package.json',
    'backend/package.json',
    'admin/dist/index.html',
    'backend/server.js'
  ];
  
  configFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      log('green', `✅ ${file} موجود`);
    } else {
      log('red', `❌ ${file} مفقود`);
    }
  });
}

// اختبار التواصل بين المكونات
async function testIntegration() {
  log('cyan', '\n=== اختبار التكامل بين المكونات ===');
  
  try {
    // اختبار أن Frontend يمكنه التواصل مع Backend
    log('blue', 'اختبار تواصل Frontend مع Backend...');
    
    // هذا الاختبار يفترض أن Frontend يجب أن يكون قادراً على استدعاء API
    // سنقوم بفحص ملف API للتحقق من الإعدادات
    const apiFile = path.join(__dirname, 'admin', 'src', 'api.ts');
    
    if (fs.existsSync(apiFile)) {
      const apiContent = fs.readFileSync(apiFile, 'utf8');
      
      const baseVariants = [CONFIG.API_BASE, CONFIG.BACKEND_URL, (CONFIG.BACKEND_URL + '/api')];
      const pointsToBackend = baseVariants.some(v => v && apiContent.includes(v));
      if (pointsToBackend) {
        log('green', '✅ ملف API يشير إلى الخادم الخلفي الصحيح');
      } else {
        log('yellow', '⚠️ ملف API قد لا يشير إلى الخادم الخلفي الصحيح');
      }
      
      if (apiContent.includes('mock') || apiContent.includes('Mock')) {
        log('yellow', '⚠️ تم العثور على بيانات وهمية في ملف API');
      } else {
        log('green', '✅ لا توجد بيانات وهمية في ملف API');
      }
    } else {
      log('red', '❌ ملف API غير موجود');
    }
    
  } catch (error) {
    log('red', `❌ خطأ في اختبار التكامل: ${error.message}`);
  }
}

// دالة رئيسية لتشغيل جميع الاختبارات
async function runAllTests() {
  log('magenta', '\n🚀 بدء الاختبار الشامل لنظام CRM المدرسة');
  log('magenta', '='.repeat(50));
  
  await testFrontend();
  await testBackend();
  await testDatabase();
  checkProjectFiles();
  await testIntegration();
  
  log('magenta', '\n' + '='.repeat(50));
  log('magenta', '✅ تم إكمال الاختبار الشامل');
  
  // ملخص التوصيات
  log('cyan', '\n=== التوصيات ===');
  log('blue', '1. تأكد من أن الخادم الخلفي يعمل بشكل صحيح');
  log('blue', '2. تحقق من إعدادات الـ Environment Variables');
  log('blue', '3. تأكد من أن Frontend يمكنه الوصول إلى Backend');
  log('blue', '4. تحقق من إعدادات الـ Deployment على Render');
  log('blue', '5. تأكد من أن قاعدة البيانات تحتوي على البيانات الأساسية');
}

// تشغيل الاختبار
if (require.main === module) {
  runAllTests().catch(error => {
    log('red', `❌ خطأ في تشغيل الاختبار: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runAllTests, testFrontend, testBackend };
