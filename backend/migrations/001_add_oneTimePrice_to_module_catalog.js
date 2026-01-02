const { DataTypes } = require('sequelize');

module.exports.up = async ({ queryInterface }) => {
  try {
    await queryInterface.addColumn('module_catalog', 'oneTimePrice', { type: DataTypes.FLOAT, allowNull: true });
  } catch (e) {
    // ignore if exists
  }
};
