const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SecurityPolicy = sequelize.define('SecurityPolicy', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  enforceMfaForAdmins: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  passwordMinLength: {
    type: DataTypes.INTEGER,
    defaultValue: 8,
  },
  lockoutThreshold: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
  },
  allowedIpRanges: {
    type: DataTypes.TEXT, // JSON string
    defaultValue: '[]',
  },
  sessionMaxAgeHours: {
    type: DataTypes.INTEGER,
    defaultValue: 24,
  }
});

module.exports = SecurityPolicy;
