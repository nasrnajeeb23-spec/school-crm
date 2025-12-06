const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SchoolStats = sequelize.define('SchoolStats', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'The date for which these stats are aggregated'
  },
  totalStudents: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  presentStudents: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  attendanceRate: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  totalRevenue: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  totalExpenses: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  newAdmissions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['schoolId', 'date']
    }
  ]
});

module.exports = SchoolStats;
