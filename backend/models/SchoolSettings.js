const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SchoolSettings = sequelize.define('SchoolSettings', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  schoolName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  schoolAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  academicYearStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  academicYearEnd: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  notifications: {
    type: DataTypes.JSON, // { email: bool, sms: bool, push: bool }
    allowNull: false,
  },
  // schoolId FK is added via association
});

module.exports = SchoolSettings;
