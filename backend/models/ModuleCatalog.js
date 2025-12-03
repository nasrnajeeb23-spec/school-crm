const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ModuleCatalog = sequelize.define('ModuleCatalog', {
  id: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  monthlyPrice: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  annualPrice: { type: DataTypes.FLOAT, allowNull: true },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
  isEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  isCore: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: 'module_catalog' });

module.exports = ModuleCatalog;
