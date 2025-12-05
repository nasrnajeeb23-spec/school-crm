module.exports.up = async ({ models }) => {
  const { ModuleCatalog } = models;
  const defs = [
    { id: 'student_management', name: 'إدارة الطلاب', description: 'ملفات الطلاب والحضور والدرجات.', monthlyPrice: 0, oneTimePrice: 0, currency: 'USD', isEnabled: true, isCore: true },
    { id: 'academic_management', name: 'الإدارة الأكاديمية', description: 'الجدول والمواد الدراسية وتنظيم الفصول.', monthlyPrice: 0, oneTimePrice: 0, currency: 'USD', isEnabled: true, isCore: true },
    { id: 'teacher_portal', name: 'بوابة المعلم', description: 'واجهة ويب للمعلم لإدارة الجدول والحضور والدرجات.', monthlyPrice: 0, oneTimePrice: 0, currency: 'USD', isEnabled: true, isCore: true },
    { id: 'finance', name: 'المالية', description: 'فواتير، مدفوعات، تقارير مالية متقدمة (باستثناء جزء الرسوم الدراسية).', monthlyPrice: 49, oneTimePrice: 0, currency: 'USD', isEnabled: true, isCore: false },
    { id: 'transportation', name: 'النقل المدرسي', description: 'إدارة الحافلات والمسارات والطلاب المنقولين.', monthlyPrice: 29, oneTimePrice: 0, currency: 'USD', isEnabled: true, isCore: false },
    { id: 'parent_portal', name: 'بوابة ولي الأمر', description: 'تطبيق ولي الأمر للوصول والمتابعة.', monthlyPrice: 19, oneTimePrice: 0, currency: 'USD', isEnabled: true, isCore: false },
    { id: 'teacher_app', name: 'تطبيق المعلم', description: 'تطبيق جوال للمعلم مع إشعارات.', monthlyPrice: 19, oneTimePrice: 0, currency: 'USD', isEnabled: true, isCore: false },
  ];
  for (const d of defs) {
    const [row] = await ModuleCatalog.findOrCreate({ where: { id: d.id }, defaults: d });
    if (!row) continue;
    row.name = d.name;
    row.description = d.description;
    row.monthlyPrice = d.monthlyPrice;
    row.oneTimePrice = d.oneTimePrice;
    row.currency = d.currency;
    row.isEnabled = d.isEnabled;
    row.isCore = d.isCore;
    await row.save();
  }
};
