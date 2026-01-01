const express = require('express');
const router = express.Router();
const { LandingPageContent } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

// Default content generator
const getDefaultContent = (req) => {
    const catalog = Array.isArray(req.app?.locals?.modulesCatalog) ? req.app.locals.modulesCatalog : [];
    const items = (catalog.length
      ? catalog
          .filter(m => m.isEnabled)
          .map(m => ({ id: String(m.id), title: String(m.name), description: String(m.description || '') }))
      : [
          { id: 'student_management', title: 'إدارة الطلاب', description: 'ملفات الطلاب، الحضور، الدرجات، والأنشطة في مكان واحد' },
          { id: 'finance_fees', title: 'إدارة مالية', description: 'فواتير، مدفوعات، وإيرادات مع تقارير مفصلة' },
          { id: 'advanced_reports', title: 'التقارير المتقدمة', description: 'لوحات معلومات وتحليلات لاتخاذ قرارات أفضل' },
          { id: 'messaging', title: 'الرسائل والتواصل', description: 'تواصل داخلي بين الإدارة والمعلمين وأولياء الأمور' },
          { id: 'transportation', title: 'النقل المدرسي', description: 'إدارة الحافلات والمسارات والطلاب المنقولين' },
          { id: 'finance_salaries', title: 'الرواتب وشؤون الموظفين', description: 'إدارة مسيرات الرواتب وهياكل الأجور والحضور' },
          { id: 'finance_expenses', title: 'المصروفات', description: 'تتبع المصروفات والمشتريات' },
          { id: 'parent_portal', title: 'بوابة ولي الأمر', description: 'متابعة حضور ودرجات ورسائل الأبناء' },
          { id: 'teacher_portal', title: 'بوابة المعلم', description: 'إدارة الجدول والحضور والدرجات عبر الويب' },
          { id: 'teacher_app', title: 'تطبيق المعلم', description: 'إشعارات فورية وإدارة المهام من الجوال' }
        ]);

    return {
      hero: {
        title: 'منصة SchoolSaaS لإدارة المدارس باحترافية',
        subtitle: 'حل شامل لتبسيط إدارة الطلاب والمعلمين والمالية والتواصل في مدرسة واحدة'
      },
      features: {
        title: 'أهم الميزات',
        subtitle: 'ميزات عملية تُسهّل عمل الإدارة والمعلمين وأولياء الأمور',
        items
      },
      ads: {
        title: 'عروض وخدمات إضافية',
        slides: [
          { id: 'ad1', title: 'باقات مرنة للمدارس', description: 'اختر الخطة التي تناسب حجم مدرستك واحتياجاتك', ctaText: 'شاهد الباقات', link: '/#pricing', imageUrl: '/favicon.svg' },
          { id: 'ad2', title: 'تجربة مجانية', description: 'جرّب المنصة مجاناً وابدأ إدارة مدرستك اليوم', ctaText: 'ابدأ الآن', link: '/#contact', imageUrl: '/favicon.svg' },
          { id: 'ad3', title: 'حل مستضاف ذاتياً', description: 'امتلك نسخة خاصة من النظام داخل مؤسستك', ctaText: 'اطلب عرض سعر', link: '/#contact', imageUrl: '/favicon.svg' }
        ]
      }
    };
};

router.get('/landing', async (req, res) => {
  try {
    // Ensure table exists (self-healing)
    try { await LandingPageContent.sync(); } catch {}

    const contents = await LandingPageContent.findAll();
    const defaults = getDefaultContent(req);
    
    let result = { ...defaults };
    
    // Merge DB content
    contents.forEach(c => {
        if (c.section && c.content) {
            result[c.section] = c.content;
        }
    });
    
    res.json(result);
  } catch (err) {
    console.error('Get Landing Content Error:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.put('/landing', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const { hero, features, ads } = req.body;
        
        // Ensure table exists
        try { await LandingPageContent.sync(); } catch {}
        
        if (hero) {
            let h = await LandingPageContent.findOne({ where: { section: 'hero' } });
            if (!h) await LandingPageContent.create({ section: 'hero', content: hero });
            else await h.update({ content: hero });
        }
        
        if (features) {
             let f = await LandingPageContent.findOne({ where: { section: 'features' } });
            if (!f) await LandingPageContent.create({ section: 'features', content: features });
            else await f.update({ content: features });
        }
        
        if (ads) {
             let a = await LandingPageContent.findOne({ where: { section: 'ads' } });
            if (!a) await LandingPageContent.create({ section: 'ads', content: ads });
            else await a.update({ content: ads });
        }
        
        // Return the updated full object
        const contents = await LandingPageContent.findAll();
        const defaults = getDefaultContent(req);
        let result = { ...defaults };
        contents.forEach(c => {
            if (c.section && c.content) {
                result[c.section] = c.content;
            }
        });

        res.json(result);
    } catch (err) {
        console.error('Update Landing Content Error:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
