const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ApiKey = sequelize.define('ApiKey', {
  id: { type: DataTypes.STRING, primaryKey: true },
  provider: { type: DataTypes.STRING, allowNull: false },
  hash: { type: DataTypes.STRING, allowNull: false },
  mask: { type: DataTypes.STRING, allowNull: false },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'api_keys' });

module.exports = ApiKey;
