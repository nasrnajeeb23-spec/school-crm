module.exports.up = async ({ queryInterface, models }) => {
  const Sequelize = require('sequelize');
  const t = models.SchoolSettings.getTableName();
  try {
    await queryInterface.addColumn(t, 'backupLock', { type: Sequelize.DataTypes.JSON, allowNull: true });
  } catch {}
  try {
    await queryInterface.addColumn(t, 'backupConfig', { type: Sequelize.DataTypes.JSON, allowNull: true });
  } catch {}
};
