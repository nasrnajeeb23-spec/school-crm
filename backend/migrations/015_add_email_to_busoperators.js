const { DataTypes } = require('sequelize');

module.exports = {
  up: async ({ queryInterface, sequelize }) => {
    const transaction = await sequelize.transaction();
    try {
      const desc =
        (await queryInterface.describeTable('BusOperators').catch(() => null)) ||
        (await queryInterface.describeTable('busoperators').catch(() => null)) ||
        null;

      if (desc && !desc.email) {
        await queryInterface.addColumn('BusOperators', 'email', { type: DataTypes.STRING, allowNull: true }, { transaction }).catch(async () => {
          await queryInterface.addColumn('busoperators', 'email', { type: DataTypes.STRING, allowNull: true }, { transaction });
        });
      }

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
};
