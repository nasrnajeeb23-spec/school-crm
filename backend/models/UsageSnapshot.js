const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UsageSnapshot = sequelize.define('UsageSnapshot', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  period: { type: DataTypes.STRING, allowNull: false, defaultValue: 'daily' },
  students: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  teachers: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  invoices: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  storageGB: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  limits: { type: DataTypes.JSON, allowNull: true },
  overageItems: { type: DataTypes.JSON, allowNull: true },
  overageTotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' }
}, {
  tableName: 'usage_snapshots',
  indexes: [
    { fields: ['schoolId'] },
    { fields: ['schoolId', 'date'] },
    { fields: ['schoolId', 'period', 'date'] }
  ]
});

module.exports = UsageSnapshot;
