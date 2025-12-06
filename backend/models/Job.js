const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Job = sequelize.define('Job', {
  id: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('queued','running','completed','failed'), allowNull: false, defaultValue: 'queued' },
  result: { type: DataTypes.TEXT, allowNull: true },
  error: { type: DataTypes.TEXT, allowNull: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'jobs' });

module.exports = Job;
