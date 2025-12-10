const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CommunicationUsage = sequelize.define('CommunicationUsage', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  channel: { type: DataTypes.STRING, allowNull: false },
  units: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  unitPrice: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  amount: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
  context: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'communication_usage',
  indexes: [
    { fields: ['schoolId'] },
    { fields: ['schoolId','channel'] }
  ]
});

module.exports = CommunicationUsage;
