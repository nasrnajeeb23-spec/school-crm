module.exports = {
  up: async ({ queryInterface, models }) => {
    const { DataTypes } = require('sequelize');
    try {
      const t = typeof models?.SchoolSettings?.getTableName === 'function' ? models.SchoolSettings.getTableName() : 'SchoolSettings';
      const info = await queryInterface.describeTable(t);
      if (!info || !info.usedStorage) {
        await queryInterface.addColumn(t, 'usedStorage', {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        });
      }
    } catch (e) {
      console.log('Add usedStorage skipped:', e?.message || e);
    }
  },

  down: async ({ queryInterface, models }) => {
    try {
      const t = typeof models?.SchoolSettings?.getTableName === 'function' ? models.SchoolSettings.getTableName() : 'SchoolSettings';
      const info = await queryInterface.describeTable(t);
      if (info && info.usedStorage) {
        await queryInterface.removeColumn(t, 'usedStorage');
      }
    } catch (e) {
      console.log('Remove usedStorage skipped:', e?.message || e);
    }
  },
};

