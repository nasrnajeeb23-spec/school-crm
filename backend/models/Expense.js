const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Expense = sequelize.define('Expense', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
<<<<<<< HEAD
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Allow null for backward compatibility
    comment: 'Linked accounting account'
  },
=======
  amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  currencyCode: { type: DataTypes.STRING, allowNull: false, defaultValue: 'SAR' },
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
}, { tableName: 'expenses' });

module.exports = Expense;
