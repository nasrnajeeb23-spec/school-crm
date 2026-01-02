const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TrialRequest = sequelize.define('TrialRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  schoolName: { type: DataTypes.STRING, allowNull: false },
  adminName: { type: DataTypes.STRING, allowNull: false },
  adminEmail: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('NEW','APPROVED','REJECTED'), allowNull: false, defaultValue: 'NEW' },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'trial_requests' });

module.exports = TrialRequest;
