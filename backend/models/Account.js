const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Account = sequelize.define('Account', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Schools',
      key: 'id'
    }
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Account code (e.g., 1010, 2020)'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Account name in Arabic'
  },
  nameEn: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Account name in English'
  },
  type: {
    type: DataTypes.ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'),
    allowNull: false,
    comment: 'Account type'
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Accounts',
      key: 'id'
    },
    comment: 'Parent account for hierarchical structure'
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Level in the account tree (1 = root)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether the account is active'
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Current balance (calculated)'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
    comment: 'Currency code (USD, SAR, etc.)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Account description'
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'System account (cannot be deleted)'
  }
}, {
  tableName: 'accounts',
  indexes: [
    { fields: ['schoolId'] },
    { fields: ['schoolId', 'code'], unique: true },
    { fields: ['type'] },
    { fields: ['parentId'] },
    { fields: ['isActive'] }
  ]
});

module.exports = Account;
