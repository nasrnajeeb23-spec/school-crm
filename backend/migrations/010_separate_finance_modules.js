module.exports.up = async ({ models, sequelize }) => {
  const { ModuleCatalog, SchoolSettings } = models;
  const transaction = await sequelize.transaction();
  try {
    // 1. Update 'finance' module to be 'fees' specifically (but keep ID 'finance')
    await ModuleCatalog.update({
      name: 'الرسوم الدراسية',
      description: 'إعداد الرسوم، الفواتير، والمدفوعات.',
      monthlyPrice: 0,
      oneTimePrice: 0,
      isCore: true, // Free
      isEnabled: true
    }, { where: { id: 'finance' }, transaction });

    // 2. Create separate modules for Payroll (Salaries) and Expenses
    const paidModules = [
      { 
        id: 'finance_salaries', 
        name: 'الرواتب وشؤون الموظفين', 
        description: 'إدارة الرواتب، البدلات، الخصومات، وقسائم الرواتب.', 
        monthlyPrice: 29, 
        oneTimePrice: 0, 
        currency: 'SAR', 
        isEnabled: true, 
        isCore: false // Paid
      },
      { 
        id: 'finance_expenses', 
        name: 'المصروفات والمشتريات', 
        description: 'تتبع المصروفات المدرسية، المشتريات، وتقارير التكاليف.', 
        monthlyPrice: 19, 
        oneTimePrice: 0, 
        currency: 'SAR', 
        isEnabled: true, 
        isCore: false // Paid
      },
      { 
        id: 'finance_reports', 
        name: 'التقارير المالية المتقدمة', 
        description: 'تقارير الأرباح والخسائر، الميزانية العمومية، والتدفقات النقدية.', 
        monthlyPrice: 49, 
        oneTimePrice: 0, 
        currency: 'SAR', 
        isEnabled: true, 
        isCore: false // Paid
      }
    ];

    for (const mod of paidModules) {
      const [row, created] = await ModuleCatalog.findOrCreate({
        where: { id: mod.id },
        defaults: mod,
        transaction
      });
      
      if (!created) {
        await row.update(mod, { transaction });
      }
    }

    // 3. Grant new paid modules to existing schools that have 'finance'
    // This prevents them from losing access when we remove the parent-child mapping
    const allSettings = await SchoolSettings.findAll({ transaction });
    for (const settings of allSettings) {
      let active = settings.activeModules || [];
      // Normalize if string
      if (typeof active === 'string') {
        try { active = JSON.parse(active); } catch { active = []; }
      }
      
      // If school has 'finance', grant them the sub-modules explicitly
      if (active.includes('finance')) {
        let changed = false;
        const newModules = ['finance_salaries', 'finance_expenses', 'finance_reports'];
        
        for (const nm of newModules) {
          if (!active.includes(nm)) {
            active.push(nm);
            changed = true;
          }
        }
        
        if (changed) {
          await settings.update({ activeModules: active }, { transaction });
          console.log(`Granted legacy finance modules to school ${settings.schoolId}`);
        }
      }
    }

    await transaction.commit();
    console.log('Separated Finance modules: Fees (Free) vs Payroll/Expenses (Paid) and updated schools.');
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

module.exports.down = async () => {
  // Irreversible safely
};
