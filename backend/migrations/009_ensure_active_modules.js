module.exports = {
  up: async ({ sequelize, models }) => {
    const { SchoolSettings } = models;
    const transaction = await sequelize.transaction();
    try {
      // 1. Fetch all school settings
      const allSettings = await SchoolSettings.findAll({ transaction });
    
    for (const settings of allSettings) {
      let active = settings.activeModules || [];
      if (typeof active === 'string') {
        try { active = JSON.parse(active); } catch { active = []; }
      }
      
      let changed = false;
      // Ensure 'finance' is present
      if (!active.includes('finance')) {
        active.push('finance');
        changed = true;
      }

      // Ensure other core modules are present just in case
      const core = ['student_management', 'academic_management', 'parent_portal', 'teacher_portal', 'teacher_app'];
      for (const c of core) {
          if (!active.includes(c)) {
              active.push(c);
              changed = true;
          }
      }

      if (changed) {
        await settings.update({ activeModules: active }, { transaction });
        console.log(`Updated activeModules for school ${settings.schoolId}`);
      }
    }

    await transaction.commit();
    console.log('All schools updated with core modules.');
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
  }
};
