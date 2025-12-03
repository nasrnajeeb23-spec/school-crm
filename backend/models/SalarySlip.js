const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SalarySlip = sequelize.define('SalarySlip', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  personType: {
    type: DataTypes.STRING, // staff | teacher
    allowNull: false,
  },
  personId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  month: {
    type: DataTypes.STRING, // YYYY-MM
    allowNull: false,
  },
  structureId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  baseAmount: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: false,
    defaultValue: 0,
  },
  allowancesTotal: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: false,
    defaultValue: 0,
  },
  deductionsTotal: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: false,
    defaultValue: 0,
  },
  netAmount: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: false,
    defaultValue: 0,
  },
  allowances: {
    type: DataTypes.JSON, // [{ name, amount }]
    allowNull: true,
  },
  deductions: {
    type: DataTypes.JSON, // [{ name, amount }]
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING, // Draft | Approved
    allowNull: false,
    defaultValue: 'Draft',
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  receiptNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  receiptDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  receiptAttachmentUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['schoolId'] },
    { fields: ['schoolId','month'] },
    { fields: ['personType','personId','month'] }
  ]
});

module.exports = SalarySlip;
