const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SchoolModule = sequelize.define('SchoolModule', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  moduleId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'TRIAL', 'EXPIRED', 'PENDING_PAYMENT', 'REJECTED'),
    defaultValue: 'ACTIVE',
    allowNull: false,
  },
  paymentProofUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  transactionReference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  tableName: 'school_modules',
  indexes: [
    { fields: ['schoolId', 'moduleId'], unique: true },
    { fields: ['status'] }
  ]
});

module.exports = SchoolModule;