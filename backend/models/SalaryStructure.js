const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SalaryStructure = sequelize.define('SalaryStructure', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING, // Fixed, Hourly, PartTime, PerLesson
    allowNull: false,
  },
  baseAmount: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: true,
    defaultValue: 0,
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: true,
  },
  lessonRate: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: true,
  },
  allowances: {
    type: DataTypes.JSON, // [{ name, amount }]
    allowNull: true,
  },
  deductions: {
    type: DataTypes.JSON, // [{ name, amount }]
    allowNull: true,
  },
  absencePenaltyPerDay: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: true,
  },
  latePenaltyPerMinute: {
    type: DataTypes.DECIMAL(12,4),
    allowNull: true,
  },
  overtimeRatePerMinute: {
    type: DataTypes.DECIMAL(12,4),
    allowNull: true,
  },
  appliesTo: {
    type: DataTypes.STRING, // staff | teacher
    allowNull: false,
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  indexes: [
    { fields: ['schoolId'] },
    { fields: ['schoolId','appliesTo'] },
    { fields: ['schoolId','isDefault'] }
  ]
});

module.exports = SalaryStructure;
