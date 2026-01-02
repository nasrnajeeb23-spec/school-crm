module.exports.up = async ({ queryInterface, models }) => {
  try {
    const t = typeof models?.SchoolSettings?.getTableName === 'function' ? models.SchoolSettings.getTableName() : 'SchoolSettings';
    const info = await queryInterface.describeTable(t);
    if (info && info.activeModules) {
      await queryInterface.removeColumn(t, 'activeModules');
      console.log('Removed activeModules column from SchoolSettings');
    } else {
      console.log('activeModules column not found; nothing to remove');
    }
  } catch (e) {
    console.log('Remove activeModules skipped:', e.message || e);
  }
};

module.exports.down = async ({ queryInterface, models }) => {
  const Sequelize = require('sequelize');
  try {
    const t = typeof models?.SchoolSettings?.getTableName === 'function' ? models.SchoolSettings.getTableName() : 'SchoolSettings';
    const info = await queryInterface.describeTable(t);
    if (!info || !info.activeModules) {
      await queryInterface.addColumn(t, 'activeModules', { type: Sequelize.DataTypes.JSON, allowNull: true });
      console.log('Restored activeModules column on SchoolSettings');
    } else {
      console.log('activeModules column already exists; nothing to add');
    }
  } catch (e) {
    console.log('Restore activeModules skipped:', e.message || e);
  }
};
