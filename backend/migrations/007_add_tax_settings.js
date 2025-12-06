const { DataTypes } = require('sequelize');

module.exports = {
  up: async ({ queryInterface }) => {
    try {
      const tableInfo = await queryInterface.describeTable('SchoolSettings');
      
      if (!tableInfo.taxRate) {
        await queryInterface.addColumn('SchoolSettings', 'taxRate', {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0.00
        });
      }

      if (!tableInfo.taxNumber) {
        await queryInterface.addColumn('SchoolSettings', 'taxNumber', {
          type: DataTypes.STRING,
          allowNull: true
        });
      }

    } catch (e) {
      console.log('Migration error (safe to ignore if columns exist):', e.message);
    }
  },

  down: async ({ queryInterface }) => {
    try {
      await queryInterface.removeColumn('SchoolSettings', 'taxRate');
      await queryInterface.removeColumn('SchoolSettings', 'taxNumber');
    } catch (e) {
      console.log('Migration down error:', e.message);
    }
  }
};
