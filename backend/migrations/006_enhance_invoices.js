const { DataTypes } = require('sequelize');

module.exports = {
  up: async ({ queryInterface }) => {
    try {
      const tableInfo = await queryInterface.describeTable('Invoices');
      
      if (!tableInfo.items) {
        await queryInterface.addColumn('Invoices', 'items', {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: []
        });
      }

      if (!tableInfo.taxAmount) {
        await queryInterface.addColumn('Invoices', 'taxAmount', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        });
      }

    } catch (e) {
      console.log('Migration error (safe to ignore if columns exist):', e.message);
    }
  },
  down: async ({ queryInterface }) => {
    try {
      const tableInfo = await queryInterface.describeTable('Invoices');
      if (tableInfo.items) await queryInterface.removeColumn('Invoices', 'items');
      if (tableInfo.taxAmount) await queryInterface.removeColumn('Invoices', 'taxAmount');
    } catch (e) {
      console.log('Migration error:', e.message);
    }
  }
};
