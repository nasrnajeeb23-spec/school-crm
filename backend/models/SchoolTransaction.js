const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SchoolTransaction = sequelize.define('SchoolTransaction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Schools',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('DEPOSIT', 'WITHDRAWAL', 'PURCHASE', 'UPGRADE', 'REFUND'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'External reference like Stripe ID or related entity ID'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  performedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who performed the transaction'
  }
}, {
  tableName: 'SchoolTransactions',
  indexes: [
    { fields: ['schoolId'] },
    { fields: ['type'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = SchoolTransaction;
