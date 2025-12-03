const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PricingConfig = sequelize.define('PricingConfig', {
  id: { type: DataTypes.STRING, primaryKey: true },
  pricePerStudent: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1.5 },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' }
}, { tableName: 'pricing_config' });

module.exports = PricingConfig;
