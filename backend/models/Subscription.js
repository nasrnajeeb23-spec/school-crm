const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'TRIAL', 'CANCELED', 'PAST_DUE'),
    allowNull: false,
    defaultValue: 'TRIAL',
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  renewalDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  // Foreign keys are added via associations in models/index.js
  // schoolId
  // planId
});

module.exports = Subscription;