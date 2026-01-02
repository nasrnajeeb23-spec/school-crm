module.exports.up = async ({ queryInterface, models }) => {
  const Sequelize = require('sequelize');
  try {
    const t = typeof models?.SchoolSettings?.getTableName === 'function' ? models.SchoolSettings.getTableName() : 'SchoolSettings';
    const info = await queryInterface.describeTable(t);
    if (!info || !info.operationalStatus) {
      await queryInterface.addColumn(t, 'operationalStatus', { type: Sequelize.DataTypes.STRING, allowNull: false, defaultValue: 'ACTIVE' });
      console.log('Added operationalStatus column to SchoolSettings');
    } else {
      console.log('operationalStatus column already exists on SchoolSettings; skipping add');
    }
  } catch (e) {
    console.log('Add operationalStatus skipped:', e.message || e);
  }
};

module.exports.down = async ({ queryInterface, models }) => {
  try {
    const t = typeof models?.SchoolSettings?.getTableName === 'function' ? models.SchoolSettings.getTableName() : 'SchoolSettings';
    const info = await queryInterface.describeTable(t);
    if (info && info.operationalStatus) {
      await queryInterface.removeColumn(t, 'operationalStatus');
      console.log('Removed operationalStatus column from SchoolSettings');
    } else {
      console.log('operationalStatus column not found; nothing to remove');
    }
  } catch (e) {
    console.log('Remove operationalStatus skipped:', e.message || e);
  }
};
