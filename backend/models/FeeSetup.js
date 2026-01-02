const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FeeSetup = sequelize.define('FeeSetup', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  stage: { type: DataTypes.STRING, allowNull: false },
  tuitionFee: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
  bookFees: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
  uniformFees: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
  activityFees: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
  paymentPlanType: { type: DataTypes.ENUM('Monthly','Termly','Installments'), allowNull: false, defaultValue: 'Monthly' },
  paymentPlanDetails: { type: DataTypes.JSON, allowNull: true, defaultValue: {} },
  discounts: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
}, { tableName: 'fee_setups', indexes: [
  { fields: ['schoolId'] },
  { fields: ['schoolId','stage'] }
] });

module.exports = FeeSetup;
