# دليل إضافة Routes والـ Integration Hooks

## الجزء 1: إضافة Routes في Frontend

### الخطوة 1: إضافة Imports في ملف الـ Router الرئيسي

أضف هذه الـ imports في أعلى ملف الـ Router (عادة `App.tsx` أو `routes.tsx`):

```typescript
// Accounting Pages
import ChartOfAccounts from './pages/accounting/ChartOfAccounts';
import JournalEntries from './pages/accounting/JournalEntries';
import FinancialReports from './pages/accounting/FinancialReports';
import FiscalPeriods from './pages/accounting/FiscalPeriods';
import AccountingDashboard from './pages/accounting/AccountingDashboard';
```

### الخطوة 2: إضافة Routes

أضف هذه الـ routes في قسم الـ routes (داخل `<Routes>` أو `createBrowserRouter`):

```typescript
// Accounting Routes
<Route path="/accounting/dashboard" element={<AccountingDashboard />} />
<Route path="/accounting/chart-of-accounts" element={<ChartOfAccounts />} />
<Route path="/accounting/journal-entries" element={<JournalEntries />} />
<Route path="/accounting/reports" element={<FinancialReports />} />
<Route path="/accounting/fiscal-periods" element={<FiscalPeriods />} />
```

### الخطوة 3: إضافة روابط في القائمة الجانبية (Sidebar)

أضف قسم المحاسبة في القائمة الجانبية:

```typescript
// في ملف Sidebar أو Navigation
{
  title: 'المحاسبة',
  icon: <AccountBalanceIcon />,
  children: [
    { title: 'لوحة التحكم', path: '/accounting/dashboard', icon: <DashboardIcon /> },
    { title: 'شجرة الحسابات', path: '/accounting/chart-of-accounts', icon: <AccountTreeIcon /> },
    { title: 'القيود اليومية', path: '/accounting/journal-entries', icon: <ReceiptIcon /> },
    { title: 'التقارير المالية', path: '/accounting/reports', icon: <AssessmentIcon /> },
    { title: 'الفترات المالية', path: '/accounting/fiscal-periods', icon: <CalendarIcon /> },
  ]
}
```

---

## الجزء 2: تطبيق Integration Hooks في Backend

### الخطوة 1: إضافة Import في `schoolAdmin.js`

في أعلى ملف `backend/routes/schoolAdmin.js`، أضف:

```javascript
const integrationHooks = require('../services/integrationHooks');
```

### الخطوة 2: ربط الفواتير (Invoices)

ابحث عن route إنشاء الفاتورة وأضف بعد `Invoice.create()`:

```javascript
// بعد: const invoice = await Invoice.create({...});

try {
  await integrationHooks.onInvoiceCreated(invoice, req.user.id);
} catch (error) {
  console.error('Error creating accounting entry for invoice:', error);
}
```

### الخطوة 3: ربط المدفوعات (Payments)

ابحث عن route تسجيل الدفعة وأضف:

```javascript
// بعد: const payment = await Payment.create({...});

try {
  const invoice = await Invoice.findByPk(payment.invoiceId);
  if (invoice) {
    await integrationHooks.onPaymentRecorded(payment, invoice, req.user.id);
  }
} catch (error) {
  console.error('Error creating accounting entry for payment:', error);
}
```

### الخطوة 4: ربط المصروفات (Expenses)

**مهم:** تأكد من أن `accountId` إجباري الآن!

```javascript
// في route إنشاء المصروف
router.post('/:schoolId/expenses', async (req, res) => {
  try {
    const { amount, description, category, date, accountId } = req.body;
    
    // التحقق من accountId
    if (!accountId) {
      return res.status(400).json({ 
        msg: 'يجب تحديد الحساب المحاسبي للمصروف',
        code: 'ACCOUNT_REQUIRED'
      });
    }
    
    // إنشاء المصروف
    const expense = await Expense.create({
      schoolId: req.params.schoolId,
      amount,
      description,
      category,
      date: date || new Date(),
      accountId
    });
    
    // قيد محاسبي تلقائي
    try {
      await integrationHooks.onExpenseRecorded(expense, req.user.id);
    } catch (error) {
      console.error('Error creating accounting entry for expense:', error);
    }
    
    res.status(201).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
});
```

### الخطوة 5: ربط الرواتب (Salaries)

ابحث عن route صرف الراتب وأضف:

```javascript
// بعد تحديث حالة SalarySlip إلى "Paid"

try {
  const salarySlip = await SalarySlip.findByPk(slipId);
  if (salarySlip && salarySlip.status === 'Paid') {
    await integrationHooks.onSalaryPaid(salarySlip, req.user.id);
  }
} catch (error) {
  console.error('Error creating accounting entry for salary:', error);
}
```

### الخطوة 6: إضافة Endpoint لحسابات المصروفات

أضف route جديد في `schoolAdmin.js`:

```javascript
// @route   GET api/school/:schoolId/expense-accounts
// @desc    Get expense accounts for dropdown
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

## الجزء 3: التحديثات في Frontend للمصروفات

### تحديث صفحة إضافة مصروف

أضف dropdown لاختيار الحساب المحاسبي:

```typescript
const [accounts, setAccounts] = useState([]);

// Fetch accounts
useEffect(() => {
  const fetchAccounts = async () => {
    const response = await axios.get(
      `${API_URL}/api/school/${schoolId}/expense-accounts`,
      { headers: { 'x-auth-token': token } }
    );
    setAccounts(response.data);
  };
  fetchAccounts();
}, []);

// في الـ Form
<TextField
  select
  label="الحساب المحاسبي"
  value={formData.accountId}
  onChange={(e) => setFormData({...formData, accountId: e.target.value})}
  required
  fullWidth
>
  {accounts.map((acc) => (
    <MenuItem key={acc.id} value={acc.id}>
      {acc.code} - {acc.name}
    </MenuItem>
  ))}
</TextField>
```

---

## ✅ Checklist للتطبيق

### Frontend:
- [ ] إضافة imports للصفحات المحاسبية
- [ ] إضافة 5 routes للمحاسبة
- [ ] إضافة قسم المحاسبة في Sidebar
- [ ] تحديث صفحة المصروفات لتشمل accountId

### Backend:
- [ ] إضافة `integrationHooks` import في schoolAdmin.js
- [ ] ربط الفواتير (onInvoiceCreated)
- [ ] ربط المدفوعات (onPaymentRecorded)
- [ ] ربط المصروفات (onExpenseRecorded) + جعل accountId إجباري
- [ ] ربط الرواتب (onSalaryPaid)
- [ ] إضافة endpoint لحسابات المصروفات

### Testing:
- [ ] اختبار إنشاء فاتورة → تحقق من القيد المحاسبي
- [ ] اختبار تسجيل دفعة → تحقق من القيد
- [ ] اختبار إضافة مصروف → تحقق من القيد
- [ ] اختبار صرف راتب → تحقق من القيد
- [ ] التحقق من التقارير المالية

---

## 🎯 النتيجة المتوقعة

بعد تطبيق هذه الخطوات:
- ✅ جميع العمليات المالية تُنشئ قيود محاسبية تلقائياً
- ✅ التقارير المالية دقيقة ومحدّثة
- ✅ النظام المحاسبي متكامل بالكامل
- ✅ واجهة المحاسب متاحة وجاهزة للاستخدام

**الوقت المتوقع للتطبيق**: 30-60 دقيقة
