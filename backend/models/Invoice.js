const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PAID', 'UNPAID', 'OVERDUE'),
    allowNull: false,
    defaultValue: 'UNPAID',
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
