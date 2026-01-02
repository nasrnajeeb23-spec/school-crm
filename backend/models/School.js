const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const School = sequelize.define('School', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'contactEmail',
    validate: {
      isEmail: true,
    },
  },
  plan: {
    type: DataTypes.ENUM('BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'),
    allowNull: false,
    defaultValue: 'BASIC',
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Active', 'Suspended', 'Inactive'),
    defaultValue: 'Active',
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  studentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  teacherCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
});

module.exports = School;
