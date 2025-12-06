const { DataTypes } = require('sequelize');

module.exports = {
  up: async ({ queryInterface }) => {
    try {
      const tableInfo = await queryInterface.describeTable('Grades');
      if (!tableInfo.total) {
        await queryInterface.addColumn('Grades', 'total', {
          type: DataTypes.INTEGER,
          allowNull: true
        });
      }
    } catch (e) {
      console.log('Migration error (safe to ignore if column exists):', e.message);
    }
  },
  down: async ({ queryInterface }) => {
    try {
      const tableInfo = await queryInterface.describeTable('Grades');
      if (tableInfo.total) {
        await queryInterface.removeColumn('Grades', 'total');
      }
    } catch (e) {
      console.log('Migration error:', e.message);
    }
  }
};
