const { DataTypes } = require('sequelize');

module.exports = {
  up: async ({ queryInterface, sequelize }) => {
    const transaction = await sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables();
      const hasRouteStudents = tables.some(t => String(t).toLowerCase() === 'routestudents');
      if (!hasRouteStudents) {
        await queryInterface.createTable('RouteStudents', {
          id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
          routeId: { type: DataTypes.STRING, allowNull: false },
          studentId: { type: DataTypes.STRING, allowNull: false },
          createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        }, { transaction });
      }
      const attendanceDesc = await queryInterface.describeTable('Attendances').catch(() => null);
      if (attendanceDesc && !attendanceDesc.schoolId) {
        await queryInterface.addColumn('Attendances', 'schoolId', { type: DataTypes.INTEGER, allowNull: true }, { transaction });
      }
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
};
