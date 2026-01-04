const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Expense = sequelize.define('Expense', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  accountId: { type: DataTypes.INTEGER, allowNull: true },
  currencyCode: { type: DataTypes.STRING, allowNull: false, defaultValue: 'SAR' },
}, { tableName: 'expenses' });

module.exports = Expense;
