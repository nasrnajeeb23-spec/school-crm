const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BehaviorRecord = sequelize.define('BehaviorRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Schools',
      key: 'id'
    }
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Students',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('Positive', 'Negative'),
    allowNull: false,
    defaultValue: 'Negative'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  recordedBy: {
    type: DataTypes.STRING, // Could be teacher name or ID
    allowNull: true
  },
  actionTaken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  severity: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    defaultValue: 'Low'
  }
}, {
  timestamps: true
});

module.exports = BehaviorRecord;
