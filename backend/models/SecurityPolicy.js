const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SecurityPolicy = sequelize.define('SecurityPolicy', {
  enforceMfaForAdmins: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  passwordMinLength: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
  lockoutThreshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
  allowedIpRanges: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
  sessionMaxAgeHours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 24 },
}, { tableName: 'security_policies' });

module.exports = SecurityPolicy;
