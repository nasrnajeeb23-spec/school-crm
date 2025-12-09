const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PAID', 'UNPAID', 'PARTIALLY_PAID', 'OVERDUE'),
    allowNull: false,
    defaultValue: 'UNPAID',
  },
  items: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Details of invoice items (tuition, books, etc.)'
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  // Foreign keys are added via associations
  // studentId
}, {
  indexes: [
    { fields: ['studentId'] },
    { fields: ['status'] },
    { fields: ['dueDate'] },
    { fields: ['studentId','dueDate'] }
  ]
});

module.exports = Invoice;
