const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Teacher = sequelize.define('Teacher', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  bankAccount: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  salaryStructureId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Active', 'OnLeave'),
    allowNull: false,
  },
  joinDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  // Foreign key schoolId is added via association
});

module.exports = Teacher;
