const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PricingConfig = sequelize.define('PricingConfig', {
  id: { type: DataTypes.STRING, primaryKey: true },
  pricePerStudent: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1.5 },
  pricePerTeacher: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 2.0 },
  pricePerGBStorage: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.2 },
  pricePerInvoice: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.05 },
  pricePerEmail: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.01 },
  pricePerSMS: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.03 },
  yearlyDiscountPercent: { type: DataTypes.FLOAT, allowNull: true, defaultValue: 0 },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' }
}, { tableName: 'pricing_config' });

module.exports = PricingConfig;
