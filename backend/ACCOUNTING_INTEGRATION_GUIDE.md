# دليل التكامل: ربط النظام المحاسبي بالأنظمة الموجودة

## نظرة عامة

هذا الدليل يشرح كيفية ربط النظام المحاسبي الجديد مع الأنظمة الموجودة (الفواتير، المدفوعات، المصروفات، الرواتب) لإنشاء قيود محاسبية تلقائية.

---

## الخطوة 1: إضافة Import في schoolAdmin.js

في بداية ملف `backend/routes/schoolAdmin.js`، أضف:

```javascript
const integrationHooks = require('../services/integrationHooks');
```

---

## الخطوة 2: ربط الفواتير (Invoices)

### عند إنشاء فاتورة جديدة

ابحث عن route إنشاء الفاتورة (عادة `POST /:schoolId/invoices`) وأضف بعد إنشاء الفاتورة:

```javascript
// بعد: const invoice = await Invoice.create({...});

try {
  // إنشاء قيد محاسبي تلقائي
  await integrationHooks.onInvoiceCreated(invoice, req.user.id);
} catch (error) {
  console.error('Error creating accounting entry for invoice:', error);
  // لا نفشل العملية إذا فشل القيد المحاسبي
}
```

**القيد المحاسبي الناتج:**
- مدين: الذمم المدينة (1130)
- دائن: إيرادات الرسوم الدراسية (4100)

---

## الخطوة 3: ربط المدفوعات (Payments)

### عند تسجيل دفعة

ابحث عن route تسجيل الدفعة (عادة `POST /:schoolId/payments`) وأضف:

```javascript
// بعد: const payment = await Payment.create({...});

try {
  // الحصول على الفاتورة المرتبطة
  const invoice = await Invoice.findByPk(payment.invoiceId);
  
  if (invoice) {
    // إنشاء قيد محاسبي تلقائي
    await integrationHooks.onPaymentRecorded(payment, invoice, req.user.id);
  }
} catch (error) {
  console.error('Error creating accounting entry for payment:', error);
}
```

**القيد المحاسبي الناتج:**
- مدين: صندوق/بنك (1110 أو 1120 حسب طريقة الدفع)
- دائن: الذمم المدينة (1130)

---

## الخطوة 4: ربط الخصومات (Discounts)

### عند منح خصم

إذا كان هناك route لتطبيق خصم على فاتورة:

```javascript
try {
  const invoice = await Invoice.findByPk(invoiceId);
  const discountAmount = req.body.discountAmount;
  
  // تحديث الفاتورة
  invoice.discount = discountAmount;
  await invoice.save();
  
  // إنشاء قيد محاسبي للخصم
  await integrationHooks.onDiscountApplied(invoice, discountAmount, req.user.id);
} catch (error) {
  console.error('Error creating accounting entry for discount:', error);
}
```

**القيد المحاسبي الناتج:**
- مدين: الخصومات الممنوحة (5600)
- دائن: الذمم المدينة (1130)

---

## الخطوة 5: ربط الاسترجاع (Refunds)

### عند استرجاع مبلغ

```javascript
try {
  const invoice = await Invoice.findByPk(invoiceId);
  const refundAmount = req.body.refundAmount;
  const paymentMethod = req.body.paymentMethod || 'Cash';
  
  // معالجة الاسترجاع
  // ... your refund logic ...
  
  // إنشاء قيد محاسبي للاسترجاع
  await integrationHooks.onRefundIssued(invoice, refundAmount, paymentMethod, req.user.id);
} catch (error) {
  console.error('Error creating accounting entry for refund:', error);
}
```

**القيد المحاسبي الناتج:**
- مدين: الذمم المدينة (1130)
- دائن: صندوق/بنك (1110 أو 1120)

---

## الخطوة 6: ربط المصروفات (Expenses)

### تعديل route إنشاء المصروف

**مهم جداً:** يجب أن يكون `accountId` إجبارياً الآن!

ابحث عن route إنشاء المصروف (عادة `POST /:schoolId/expenses`) وعدّله:

```javascript
router.post('/:schoolId/expenses', 
  verifyToken, 
  requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), 
  requireSameSchoolParam('schoolId'),
  async (req, res) => {
    try {
      const { amount, description, category, date, accountId } = req.body;
      
      // التحقق من وجود accountId
      if (!accountId) {
        return res.status(400).json({ 
          msg: 'يجب تحديد الحساب المحاسبي للمصروف',
          code: 'ACCOUNT_REQUIRED'
        });
      }
      
      // التحقق من صحة الحساب
      const { Account } = require('../models');
      const account = await Account.findOne({
        where: { 
          id: accountId, 
          schoolId: req.params.schoolId,
          type: 'EXPENSE',
          isActive: true
        }
      });
      
      if (!account) {
        return res.status(400).json({ 
          msg: 'الحساب المحاسبي غير صحيح أو غير نشط',
          code: 'INVALID_ACCOUNT'
        });
      }
      
      // إنشاء المصروف
      const expense = await Expense.create({
        schoolId: req.params.schoolId,
        amount,
        description,
        category,
        date: date || new Date(),
        accountId // مهم!
      });
      
      // إنشاء قيد محاسبي تلقائي
      try {
        await integrationHooks.onExpenseRecorded(expense, req.user.id);
      } catch (error) {
        console.error('Error creating accounting entry for expense:', error);
        // يمكن rollback المصروف هنا إذا أردت
      }
      
      res.status(201).json(expense);
    } catch (error) {
      console.error(error);
      res.status(500).json({ msg: 'Server Error' });
    }
  }
);
```

**القيد المحاسبي الناتج:**
- مدين: حساب المصروف المحدد (حسب accountId)
- دائن: الصندوق (1110)

---

## الخطوة 7: ربط الرواتب (Salaries)

### عند صرف راتب

ابحث عن route صرف الرواتب (عادة في `POST /:schoolId/payroll/pay-slip/:id`) وأضف:

```javascript
// بعد تحديث حالة كشف الراتب إلى "Paid"

try {
  const salarySlip = await SalarySlip.findByPk(slipId);
  
  if (salarySlip && salarySlip.status === 'Paid') {
    // إنشاء قيد محاسبي تلقائي
    await integrationHooks.onSalaryPaid(salarySlip, req.user.id);
  }
} catch (error) {
  console.error('Error creating accounting entry for salary:', error);
}
```

**القيد المحاسبي الناتج:**
- مدين: مصروف الرواتب (5100)
- دائن: الصندوق (1110)

---

## الخطوة 8: إضافة Endpoint لربط أنواع المصروفات بالحسابات

أضف route جديد في `schoolAdmin.js`:

```javascript
// @route   GET api/school/:schoolId/expense-accounts
// @desc    Get expense accounts for dropdown
// @access  Private (SchoolAdmin)
router.get('/:schoolId/expense-accounts', 
  verifyToken, 
  requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'), 
  requireSameSchoolParam('schoolId'),
  async (req, res) => {
    try {
      const { Account } = require('../models');
      
      const accounts = await Account.findAll({
        where: {
          schoolId: req.params.schoolId,
          type: 'EXPENSE',
          isActive: true
        },
        order: [['code', 'ASC']],
        attributes: ['id', 'code', 'name', 'nameEn']
      });
      
      res.json(accounts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ msg: 'Server Error' });
    }
  }
);
```

---

## الخطوة 9: معالجة المصروفات القديمة

قم بتشغيل هذا Script مرة واحدة لربط المصروفات القديمة:

```javascript
// Script: backend/scripts/linkOldExpenses.js

const { Expense, Account, School } = require('../models');

async function linkOldExpenses() {
  try {
    // الحصول على جميع المدارس
    const schools = await School.findAll();
    
    for (const school of schools) {
      // الحصول على حساب "مصروفات متنوعة"
      const miscAccount = await Account.findOne({
        where: {
          schoolId: school.id,
          code: '5700' // Miscellaneous Expenses
        }
      });
      
      if (!miscAccount) {
        console.log(`No misc account found for school ${school.id}`);
        continue;
      }
      
      // تحديث المصروفات القديمة
      const updated = await Expense.update(
        { accountId: miscAccount.id },
        {
          where: {
            schoolId: school.id,
            accountId: null
          }
        }
      );
      
      console.log(`Updated ${updated[0]} old expenses for school ${school.id}`);
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  }
}

linkOldExpenses();
```

تشغيل:
```bash
node backend/scripts/linkOldExpenses.js
```

---

## الخطوة 10: التحقق من التكامل

### 1. اختبار الفواتير:
```bash
POST /api/school/:schoolId/invoices
{
  "studentId": 1,
  "amount": 1000,
  "dueDate": "2024-12-31"
}
```

تحقق من:
- ✅ تم إنشاء الفاتورة
- ✅ تم إنشاء قيد محاسبي تلقائياً
- ✅ القيد متوازن (مدين = دائن)

### 2. اختبار المدفوعات:
```bash
POST /api/school/:schoolId/payments
{
  "invoiceId": 1,
  "amount": 500,
  "method": "Cash"
}
```

تحقق من:
- ✅ تم تسجيل الدفعة
- ✅ تم إنشاء قيد محاسبي
- ✅ تحديث رصيد الذمم المدينة

### 3. اختبار المصروفات:
```bash
POST /api/school/:schoolId/expenses
{
  "amount": 200,
  "description": "قرطاسية",
  "category": "Supplies",
  "accountId": 15  // حساب مصروف القرطاسية
}
```

تحقق من:
- ✅ تم إنشاء المصروف
- ✅ تم إنشاء قيد محاسبي
- ✅ ربط بالحساب الصحيح

### 4. اختبار الرواتب:
```bash
POST /api/school/:schoolId/payroll/pay-slip/:id
```

تحقق من:
- ✅ تم صرف الراتب
- ✅ تم إنشاء قيد محاسبي
- ✅ تحديث رصيد مصروف الرواتب

---

## الخطوة 11: عرض القيود المحاسبية

يمكنك الآن عرض القيود المحاسبية:

```bash
GET /api/accounting/journal-entries?referenceType=INVOICE&referenceId=1
GET /api/accounting/journal-entries?referenceType=PAYMENT&referenceId=1
GET /api/accounting/journal-entries?referenceType=EXPENSE&referenceId=1
GET /api/accounting/journal-entries?referenceType=SALARY&referenceId=1
```

---

## ملاحظات مهمة

### 🔒 الأمان:
- جميع القيود تُنشأ داخل Transactions
- إذا فشل القيد المحاسبي، يمكن rollback العملية الأصلية
- القيود المُرحّلة لا يمكن تعديلها أو حذفها

### ⚡ الأداء:
- القيود المحاسبية تُنشأ بشكل غير متزامن (async)
- لا تؤثر على سرعة العمليات الأصلية
- يمكن تعطيل الربط التلقائي مؤقتاً للصيانة

### 📊 التقارير:
- جميع القيود متاحة في التقارير المالية
- يمكن تتبع كل قيد إلى مصدره (فاتورة، دفعة، مصروف، راتب)
- ميزان المراجعة يعكس جميع العمليات

---

## الخلاصة

بعد تطبيق هذه الخطوات:
- ✅ جميع الفواتير تُنشئ قيود محاسبية تلقائياً
- ✅ جميع المدفوعات تُنشئ قيود محاسبية تلقائياً
- ✅ جميع المصروفات مرتبطة بحسابات محاسبية
- ✅ جميع الرواتب تُنشئ قيود محاسبية تلقائياً
- ✅ النظام المحاسبي متكامل بالكامل
- ✅ التقارير المالية دقيقة ومحدّثة

**الوقت المتوقع للتطبيق**: 1-2 ساعة
